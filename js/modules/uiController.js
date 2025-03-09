/**
 * UIController module
 * Manages UI updates and interactions
 */
export default class UIController {
    constructor() {
        // UI Elements
        this.elements = {
            urlListTextarea: document.getElementById('urlList'),
            fileInput: document.getElementById('fileInput'),
            apiKeyInput: document.getElementById('apiKey'),
            startButton: document.getElementById('startButton'),
            stopButton: document.getElementById('stopButton'),
            resultsDiv: document.getElementById('results'),
            logEntriesDiv: document.getElementById('logEntries'),
            progressContainer: document.getElementById('progressContainer'),
            progressBar: document.getElementById('progressBar'),
            etaDisplay: document.getElementById('eta'),
            statusTableBody: document.getElementById('statusTableBody')
        };
        
        // All callbacks for UI events
        this.callbacks = {
            onStart: null,
            onStop: null,
            onFileUpload: null
        };
        
        // Initialize UI event listeners
        this.initEventListeners();
    }
    
    /**
     * Initializes UI event listeners
     */
    initEventListeners() {
        // Start button event
        this.elements.startButton.addEventListener('click', () => {
            if (typeof this.callbacks.onStart === 'function') {
                const urlText = this.elements.urlListTextarea.value.trim();
                const apiKey = this.elements.apiKeyInput.value.trim();
                
                if (!urlText) {
                    this.showAlert('Please enter URLs or upload a file.');
                    return;
                }
                
                this.callbacks.onStart(urlText, apiKey);
            }
        });
        
        // Stop button event
        this.elements.stopButton.addEventListener('click', () => {
            if (typeof this.callbacks.onStop === 'function') {
                this.callbacks.onStop();
            }
        });
        
        // File input event
        this.elements.fileInput.addEventListener('change', (e) => {
            const file = e.target.files[0];
            if (!file) return;
            
            if (typeof this.callbacks.onFileUpload === 'function') {
                this.callbacks.onFileUpload(file);
            }
        });
    }
    
    /**
     * Sets a callback for the start button
     * @param {Function} callback - Function to call when start button is clicked
     */
    setStartCallback(callback) {
        this.callbacks.onStart = callback;
    }
    
    /**
     * Sets a callback for the stop button
     * @param {Function} callback - Function to call when stop button is clicked
     */
    setStopCallback(callback) {
        this.callbacks.onStop = callback;
    }
    
    /**
     * Sets a callback for file uploads
     * @param {Function} callback - Function to call when a file is uploaded
     */
    setFileUploadCallback(callback) {
        this.callbacks.onFileUpload = callback;
    }
    
    /**
     * Updates the URL textarea with text
     * @param {string} text - Text to set in the URL textarea
     */
    setUrlText(text) {
        this.elements.urlListTextarea.value = text;
    }
    
    /**
     * Shows an alert to the user
     * @param {string} message - Message to display
     */
    showAlert(message) {
        alert(message);
    }
    
    /**
     * Shows a confirmation dialog and returns the result
     * @param {string} message - Message to display
     * @returns {boolean} - Whether the user confirmed
     */
    showConfirm(message) {
        return confirm(message);
    }
    
    /**
     * Resets the UI to initial state
     */
    resetUI() {
        this.elements.startButton.style.display = 'inline-block';
        this.elements.stopButton.style.display = 'none';
        this.elements.progressContainer.style.display = 'none';
        this.elements.progressBar.style.width = '0%';
        this.elements.progressBar.textContent = '0%';
        this.elements.etaDisplay.textContent = '';
    }
    
    /**
     * Sets the UI to processing state
     */
    setProcessingState() {
        this.elements.startButton.style.display = 'none';
        this.elements.stopButton.style.display = 'inline-block';
        this.elements.resultsDiv.style.display = 'block';
        this.elements.statusTableBody.innerHTML = '';
        this.elements.progressContainer.style.display = 'block';
        this.elements.progressBar.style.width = '0%';
        this.elements.progressBar.textContent = '0%';
        this.elements.etaDisplay.textContent = 'Estimating...';
    }
    
    /**
     * Updates the progress bar
     * @param {number} percentage - Progress percentage (0-100)
     */
    updateProgress(percentage) {
        this.elements.progressBar.style.width = `${percentage}%`;
        this.elements.progressBar.textContent = `${percentage}%`;
    }
    
    /**
     * Updates the ETA display
     * @param {number} timeRemaining - Estimated time remaining in milliseconds
     */
    updateEta(timeRemaining) {
        if (timeRemaining > 0) {
            const minutes = Math.floor(timeRemaining / 60000);
            const seconds = Math.floor((timeRemaining % 60000) / 1000);
            this.elements.etaDisplay.textContent = `Estimated time remaining: ${minutes}m ${seconds}s`;
        } else {
            this.elements.etaDisplay.textContent = 'Complete!';
        }
    }
    
    /**
     * Adds a log entry to the status table
     * @param {Object} data - Log entry data
     */
    addLogEntry(data) {
        const { message, type, url, details } = data;
        
        // If this is a system message (no URL), just log to console
        if (!url) {
            console.log(`[${type.toUpperCase()}] ${message}`);
            return null;
        }
        
        // Get the status table body
        const tableBody = this.elements.statusTableBody;
        
        // Find if we already have an entry for this URL
        let existingRow = null;
        const rows = tableBody.getElementsByTagName('tr');
        for (let i = 0; i < rows.length; i++) {
            if (rows[i].dataset.url === url) {
                existingRow = rows[i];
                break;
            }
        }
        
        // If no existing row, create a new one
        if (!existingRow) {
            // Count current rows for numbering
            const rowNumber = tableBody.getElementsByTagName('tr').length / 2 + 1;
            
            // Create main row
            const row = document.createElement('tr');
            row.dataset.url = url;
            row.className = 'status-row';
            
            // Add number cell
            const numberCell = document.createElement('td');
            numberCell.textContent = rowNumber;
            row.appendChild(numberCell);
            
            // Add URL cell
            const urlCell = document.createElement('td');
            urlCell.className = 'url-cell';
            urlCell.title = url;
            urlCell.textContent = url;
            row.appendChild(urlCell);
            
            // Add status cell
            const statusCell = document.createElement('td');
            row.appendChild(statusCell);
            
            // Add view archive cell
            const viewCell = document.createElement('td');
            viewCell.textContent = '—';
            row.appendChild(viewCell);
            
            // Add details cell
            const detailsCell = document.createElement('td');
            const detailsToggle = document.createElement('span');
            detailsToggle.className = 'details-toggle';
            detailsToggle.textContent = 'Expand';
            detailsToggle.onclick = function