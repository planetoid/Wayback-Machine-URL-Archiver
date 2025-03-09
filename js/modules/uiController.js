/**
 * UIController module
 * Manages UI updates and interactions
 */
export default class UIController {
    constructor() {
        // UI Elements
        this.elements = {
            urlListTextarea: document.getElementById('urlList'),
            urlListMsg: document.getElementById('urlListMsg'),
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

        // Status tracker reference
        this.statusTracker = null;

        // Initialize UI state
        this.initUI();

        // Initialize UI event listeners
        this.initEventListeners();

        // Initialize drag-and-drop functionality
        this.initDragAndDrop();
    }

    /**
     * Initialize default UI state
     */
    initUI() {
        // Make sure progress container is hidden initially
        this.elements.progressContainer.style.display = 'none';
        this.elements.progressBar.style.width = '0%';
        this.elements.progressBar.textContent = '0%';
        this.elements.etaDisplay.textContent = '';

        // Make sure results div is hidden initially
        this.elements.resultsDiv.style.display = 'none';

        // Set up message element styling
        if (this.elements.urlListMsg) {
            this.elements.urlListMsg.style.marginLeft = '10px';
            this.elements.urlListMsg.style.display = 'inline-block';
            this.elements.urlListMsg.style.transition = 'opacity 0.5s ease-in-out';
        }
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
                    this.showMessage('Please enter URLs or upload a file.', 'error');
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
     * Initializes drag-and-drop functionality for the URL textarea
     */
    initDragAndDrop() {
        const textarea = this.elements.urlListTextarea;

        // Add visual cues for drag events
        textarea.addEventListener('dragover', (e) => {
            e.preventDefault();
            textarea.style.borderColor = '#4CAF50';
            textarea.style.backgroundColor = 'rgba(76, 175, 80, 0.1)';
            this.showMessage('Drop file to upload', 'info');
        });

        textarea.addEventListener('dragleave', () => {
            textarea.style.borderColor = '';
            textarea.style.backgroundColor = '';
            this.clearMessage();
        });

        textarea.addEventListener('drop', (e) => {
            e.preventDefault();

            // Reset styling
            textarea.style.borderColor = '';
            textarea.style.backgroundColor = '';

            // Get the file from the drop event
            const files = e.dataTransfer.files;
            if (!files || files.length === 0) return;

            const file = files[0];
            this.showMessage(`Processing file: ${file.name}`, 'info');

            // Process the dropped file if we have a callback
            if (typeof this.callbacks.onFileUpload === 'function') {
                this.callbacks.onFileUpload(file);
            }
        });

        // Add a message to the textarea to indicate drag-and-drop functionality
        const originalPlaceholder = textarea.getAttribute('placeholder') || '';
        textarea.setAttribute('placeholder', `${originalPlaceholder}`);

        // Also add this functionality to the document body for a larger drop area
        document.body.addEventListener('dragover', (e) => {
            // Only prevent default if the file is being dragged over the body
            // This allows for normal text selection drag behavior
            if (e.dataTransfer.types.includes('Files')) {
                e.preventDefault();
            }
        });

        document.body.addEventListener('drop', (e) => {
            // Only handle file drops
            if (e.dataTransfer.types.includes('Files')) {
                e.preventDefault();

                const files = e.dataTransfer.files;
                if (!files || files.length === 0) return;

                const file = files[0];
                this.showMessage(`Processing file: ${file.name}`, 'info');

                // Process the dropped file if we have a callback
                if (typeof this.callbacks.onFileUpload === 'function') {
                    this.callbacks.onFileUpload(file);
                }
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
     * Shows a message in the urlListMsg element
     * @param {string} message - Message to display
     * @param {string} type - Type of message (success, error, info, warning)
     * @param {number} autoHideTimeout - Optional time in ms to auto-hide the message
     */
    showMessage(message, type = 'info', autoHideTimeout = 0) {
        if (!this.elements.urlListMsg) {
            // Fallback to alert if message element doesn't exist
            alert(message);
            return;
        }

        // Clear any existing timeouts
        if (this._messageTimeoutId) {
            clearTimeout(this._messageTimeoutId);
            this._messageTimeoutId = null;
        }

        // Set message text and style
        this.elements.urlListMsg.textContent = message;
        this.elements.urlListMsg.style.opacity = '1';

        // Remove any existing classes
        this.elements.urlListMsg.classList.remove('message-success', 'message-error', 'message-info', 'message-warning');

        // Set color based on message type
        switch (type) {
            case 'success':
                this.elements.urlListMsg.style.color = '#4CAF50';
                this.elements.urlListMsg.classList.add('message-success');
                break;
            case 'error':
                this.elements.urlListMsg.style.color = '#F44336';
                this.elements.urlListMsg.classList.add('message-error');
                break;
            case 'warning':
                this.elements.urlListMsg.style.color = '#FF9800';
                this.elements.urlListMsg.classList.add('message-warning');
                break;
            case 'info':
            default:
                this.elements.urlListMsg.style.color = '#2196F3';
                this.elements.urlListMsg.classList.add('message-info');
                break;
        }

        // Auto-hide if specified
        if (autoHideTimeout > 0) {
            this._messageTimeoutId = setTimeout(() => {
                this.clearMessage();
            }, autoHideTimeout);
        }

        // Log to console as well
        console.log(`[${type.toUpperCase()}] ${message}`);
    }

    /**
     * Clears the message display
     */
    clearMessage() {
        if (!this.elements.urlListMsg) return;

        this.elements.urlListMsg.style.opacity = '0';

        // Clear any existing timeouts
        if (this._messageTimeoutId) {
            clearTimeout(this._messageTimeoutId);
            this._messageTimeoutId = null;
        }
    }

    /**
     * Shows an alert or message to the user
     * @param {string} message - Message to display
     */
    showAlert(message) {
        // Use the message display if possible, otherwise fall back to alert
        if (this.elements.urlListMsg) {
            this.showMessage(message, 'error', 5000);
        } else {
            alert(message);
        }
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
        // Do not hide the progress container here to maintain progress visibility after completion
        //this.elements.progressContainer.style.display = 'none';
        //this.elements.progressBar.style.width = '0%';
        //this.elements.progressBar.textContent = '0%';
        //this.elements.etaDisplay.textContent = '';
    }

    /**
     * Sets the UI to processing state and preloads all URLs into the results table
     * @param {Array} urls - List of URLs to be processed
     */
    setProcessingState(urls = []) {
        this.elements.startButton.style.display = 'none';
        this.elements.stopButton.style.display = 'inline-block';
        this.elements.resultsDiv.style.display = 'block';
        this.elements.statusTableBody.innerHTML = '';

        // If URLs were provided, preload them all with "Pending" status
        if (urls && urls.length > 0) {
            for (let i = 0; i < urls.length; i++) {
                const url = urls[i];
                this.addInitialEntry(url, i + 1);
            }
        }
    }

    /**
     * Adds an initial entry with "Pending" status to the results table
     * @param {string} url - URL to add
     * @param {number} rowNumber - Row number for display
     * @returns {HTMLTableRowElement} - The created table row
     */
    addInitialEntry(url, rowNumber) {
        // Get the status table body
        const tableBody = this.elements.statusTableBody;

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

        // Add status cell with "Pending" status
        const statusCell = document.createElement('td');
        const statusLabel = document.createElement('span');
        statusLabel.className = 'status-label status-pending';
        statusLabel.textContent = 'Pending';
        statusCell.appendChild(statusLabel);
        row.appendChild(statusCell);

        // Add empty view archive cell
        const viewCell = document.createElement('td');
        viewCell.textContent = '—';
        row.appendChild(viewCell);

        // Add placeholder for details cell
        const detailsCell = document.createElement('td');
        const detailsToggle = document.createElement('span');
        detailsToggle.className = 'details-toggle';
        detailsToggle.textContent = 'Expand';
        detailsToggle.style.opacity = '0.5'; // Dimmed until there are actual details

        // Create details row (initially hidden)
        const detailsRow = document.createElement('tr');
        detailsRow.className = 'details-row';

        const detailsContentCell = document.createElement('td');
        detailsContentCell.colSpan = 5;
        detailsContentCell.className = 'details-content';
        detailsContentCell.textContent = 'Waiting to be processed...';
        detailsRow.appendChild(detailsContentCell);

        // Fix: Define the onclick function properly
        detailsToggle.onclick = function() {
            if (detailsRow.style.display === 'table-row') {
                detailsRow.style.display = 'none';
                detailsToggle.textContent = 'Expand';
            } else {
                detailsRow.style.display = 'table-row';
                detailsToggle.textContent = 'Collapse';
            }
        };

        detailsCell.appendChild(detailsToggle);
        row.appendChild(detailsCell);

        // Add rows to table
        tableBody.appendChild(row);
        tableBody.appendChild(detailsRow);

        return row;
    }

    /**
     * Initialize the progress tracker with the current status
     * @param {StatusTracker} statusTracker - The status tracker instance
     */
    initializeProgressTracking(statusTracker) {
        this.statusTracker = statusTracker;

        // Set initial progress if we have URLs to process
        if (statusTracker.urls.length > 0) {
            const initialProgress = statusTracker.getProgressPercentage();
            this.updateProgress(initialProgress);

            // Only show "Estimating..." if we're actually running
            if (statusTracker.isRunning) {
                this.elements.etaDisplay.textContent = 'Estimating...';
            } else if (statusTracker.processedCount >= statusTracker.urls.length) {
                this.elements.etaDisplay.textContent = 'Complete!';
            } else {
                this.elements.etaDisplay.textContent = '';
            }
        } else {
            // No URLs, reset to 0%
            this.elements.progressBar.style.width = '0%';
            this.elements.progressBar.textContent = '0%';
            this.elements.etaDisplay.textContent = '';
        }
    }

    /**
     * Completely resets the UI including hiding progress
     * Use this when starting a new archiving session
     */
    completeReset() {
        this.elements.startButton.style.display = 'inline-block';
        this.elements.stopButton.style.display = 'none';

        // Reset progress state and hide
        this.elements.progressContainer.style.display = 'none';
        this.elements.progressBar.style.width = '0%';
        this.elements.progressBar.textContent = '0%';
        this.elements.etaDisplay.textContent = '';

        // Clear any messages
        this.clearMessage();
    }

    /**
     * Updates the progress bar
     * @param {number} percentage - Progress percentage (0-100)
     */
    updateProgress(percentage) {
        // Make sure we have a numeric value
        let validPercentage = Number(percentage);

        // Handle NaN or invalid values
        if (isNaN(validPercentage)) {
            console.error('Invalid percentage value:', percentage);
            validPercentage = 0;
        }

        // Ensure the progress bar percentage is a valid value between 0 and 100
        validPercentage = Math.max(0, Math.min(100, validPercentage));

        // Round to ensure we have a clean integer
        validPercentage = Math.round(validPercentage);

        // Force DOM update for the progress bar width
        this.elements.progressBar.style.width = `${validPercentage}%`;

        // Update the text content
        this.elements.progressBar.textContent = `${validPercentage}%`;

        // Ensure progress bar container is visible when there's actual progress to show
        if (validPercentage > 0 || (this.statusTracker && this.statusTracker.isRunning)) {
            this.elements.progressContainer.style.display = 'block';
        }

        console.log(`Update progress bar: ${validPercentage}%`);
    }

    /**
     * Updates the ETA display
     * @param {number} timeRemaining - Estimated time remaining in milliseconds
     */
    updateEta(timeRemaining) {
        if (!this.elements.etaDisplay) {
            console.error("ETA display element not found");
            return;
        }

        if (timeRemaining > 0) {
            const minutes = Math.floor(timeRemaining / 60000);
            const seconds = Math.floor((timeRemaining % 60000) / 1000);
            this.elements.etaDisplay.textContent = `Estimated time remaining: ${minutes}m ${seconds}s`;
        } else {
            this.elements.etaDisplay.textContent = 'Complete!';
        }
    }

    /**
     * Adds a log entry to the status table or updates an existing entry
     * @param {Object} data - Log entry data
     * @returns {Object} - Object containing entry row and details div for updates
     */
    addLogEntry(data) {
        const { message, type, url, details, archiveUrl } = data;

        // If this is a system message (no URL), just log to console
        if (!url) {
            console.log(`[${type.toUpperCase()}] ${message}`);
            return null;
        }

        // Get the status table body
        const tableBody = this.elements.statusTableBody;

        // Find if we already have an entry for this URL
        let existingRow = null;
        let existingDetailsRow = null;
        const rows = tableBody.getElementsByTagName('tr');
        for (let i = 0; i < rows.length; i++) {
            if (rows[i].dataset && rows[i].dataset.url === url) {
                existingRow = rows[i];
                // The details row should be the next row
                if (i + 1 < rows.length) {
                    existingDetailsRow = rows[i + 1];
                }
                break;
            }
        }

        // If no existing row, create a new one (this shouldn't happen with preloading, but keep as fallback)
        if (!existingRow) {
            // Count current rows for numbering
            const rowNumber = Math.floor(tableBody.getElementsByTagName('tr').length / 2) + 1;

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

            // Create details row (must be created before the toggle button)
            const detailsRow = document.createElement('tr');
            detailsRow.className = 'details-row';

            const detailsContentCell = document.createElement('td');
            detailsContentCell.colSpan = 5;
            detailsContentCell.className = 'details-content';
            detailsRow.appendChild(detailsContentCell);

            // Add details cell with toggle
            const detailsCell = document.createElement('td');
            const detailsToggle = document.createElement('span');
            detailsToggle.className = 'details-toggle';
            detailsToggle.textContent = 'Expand';

            // Important: Proper closure with direct reference to detailsRow
            detailsToggle.onclick = function() {
                if (detailsRow.style.display === 'table-row') {
                    detailsRow.style.display = 'none';
                    detailsToggle.textContent = 'Expand';
                } else {
                    detailsRow.style.display = 'table-row';
                    detailsToggle.textContent = 'Collapse';
                }
            };

            detailsCell.appendChild(detailsToggle);
            row.appendChild(detailsCell);

            // Add rows to table
            tableBody.appendChild(row);
            tableBody.appendChild(detailsRow);

            existingRow = row;
            existingDetailsRow = detailsRow;
        } else {
            // Fix the event listener on the existing toggle button
            const detailsToggle = existingRow.querySelector('.details-toggle');
            if (detailsToggle && existingDetailsRow) {
                detailsToggle.style.opacity = '1';
                detailsToggle.style.cursor = 'pointer';

                // Re-establish the onclick handler with a proper reference
                detailsToggle.onclick = function() {
                    if (existingDetailsRow.style.display === 'table-row') {
                        existingDetailsRow.style.display = 'none';
                        detailsToggle.textContent = 'Expand';
                    } else {
                        existingDetailsRow.style.display = 'table-row';
                        detailsToggle.textContent = 'Collapse';
                    }
                };
            }
        }

        // Update the status cell with current status
        const statusCell = existingRow.children[2];
        const statusLabel = document.createElement('span');
        statusLabel.className = `status-label status-${type}`;

        let statusText = '';
        switch(type) {
            case 'success':
                statusText = 'Archived';
                break;
            case 'warning':
                statusText = 'Warning';
                break;
            case 'error':
                statusText = 'Failed';
                break;
            case 'info':
                statusText = 'Processing';
                break;
            default:
                statusText = 'Unknown';
        }

        statusLabel.textContent = statusText;
        statusCell.innerHTML = '';
        statusCell.appendChild(statusLabel);

        // Update "View Archive" cell if we have an archive URL
        if (type === 'success' && statusText === 'Archived' && archiveUrl) {
            const viewCell = existingRow.children[3];
            viewCell.innerHTML = '';

            const viewLink = document.createElement('a');
            viewLink.href = archiveUrl;
            viewLink.textContent = 'View';
            viewLink.target = '_blank';
            viewCell.appendChild(viewLink);
        }

        // Get details content cell
        if (!existingDetailsRow) {
            console.error("Details row not found for", url);
            return { entry: existingRow, detailsDiv: null };
        }

        const detailsContentCell = existingDetailsRow.firstChild;

        // Add the main message
        const messageElement = document.createElement('div');
        messageElement.innerHTML = `<strong>${message}</strong>`;

        // Clear previous details when updating status
        detailsContentCell.innerHTML = '';
        detailsContentCell.appendChild(messageElement);

        // Add any additional details
        if (details) {
            const detailsElement = document.createElement('div');
            detailsElement.style.marginTop = '8px';

            if (typeof details === 'string') {
                // Check for URLs and make them clickable
                if (details.includes('https://web.archive.org/')) {
                    // Split by newlines first to handle multiple lines
                    const lines = details.split('\n');
                    for (const line of lines) {
                        const lineElement = document.createElement('div');

                        if (line.includes('https://web.archive.org/')) {
                            // This line contains a URL - make it clickable
                            // Improved regex to better match URLs without breaking layout
                            const urlMatch = line.match(/(https:\/\/web\.archive\.org\/[^\s"]+)/);
                            if (urlMatch) {
                                const url = urlMatch[1];
                                // Clean up URL by removing trailing punctuation that might have been caught
                                const cleanUrl = url.replace(/[.,;:)]$/, '');
                                const beforeUrl = line.substring(0, line.indexOf(url));
                                const afterUrl = line.substring(line.indexOf(url) + url.length);

                                lineElement.textContent = beforeUrl;

                                const linkElement = document.createElement('a');
                                linkElement.href = cleanUrl;
                                linkElement.textContent = cleanUrl;
                                linkElement.target = '_blank';
                                linkElement.style.wordBreak = 'break-all'; // Allow breaks within long URLs
                                lineElement.appendChild(linkElement);

                                lineElement.appendChild(document.createTextNode(afterUrl));

                                // If this contains the archive URL, also update the "View Archive" cell
                                if (line.includes('View archive') || line.includes('Already archived')) {
                                    const viewCell = existingRow.children[3];
                                    viewCell.innerHTML = '';

                                    const viewLink = document.createElement('a');
                                    viewLink.href = cleanUrl;
                                    viewLink.textContent = 'View';
                                    viewLink.target = '_blank';
                                    viewCell.appendChild(viewLink);
                                }
                            } else {
                                lineElement.textContent = line;
                            }
                        } else {
                            lineElement.textContent = line;
                        }

                        detailsElement.appendChild(lineElement);
                    }
                } else {
                    // Regular text without URLs
                    detailsElement.innerText = details;
                }
            } else if (Array.isArray(details)) {
                // Handle array of details (e.g., verification attempts)
                details.forEach(item => {
                    const itemElement = document.createElement('div');
                    itemElement.textContent = item;
                    detailsElement.appendChild(itemElement);
                });
            } else if (typeof details === 'object') {
                // JSON data
                const pre = document.createElement('pre');
                pre.style.overflowX = 'auto';
                pre.style.maxWidth = '100%';
                pre.textContent = JSON.stringify(details, null, 2);
                detailsElement.appendChild(pre);
            }

            detailsContentCell.appendChild(detailsElement);
        }

        // Auto-expand for errors only, not for warnings
        if (type === 'error') {
            existingDetailsRow.style.display = 'table-row';
            const detailsToggle = existingRow.querySelector('.details-toggle');
            if (detailsToggle) {
                detailsToggle.textContent = 'Collapse';
            }
        }

        // For manual archive links in error/warning cases
        if (type === 'error' || type === 'warning') {
            // Create a container for manual links if needed
            let manualLinkContainer = detailsContentCell.querySelector('.manual-link-container');
            if (!manualLinkContainer) {
                manualLinkContainer = document.createElement('div');
                manualLinkContainer.className = 'manual-link-container';
                manualLinkContainer.style.marginTop = '10px';
                detailsContentCell.appendChild(manualLinkContainer);
            }

            // Add manual archive link if not already added
            if (!manualLinkContainer.querySelector('.manual-archive-link')) {
                const archiveUrl = `https://web.archive.org/save/${encodeURIComponent(url)}`;
                const linkElement = document.createElement('a');
                linkElement.href = archiveUrl;
                linkElement.className = 'manual-archive-link';
                linkElement.textContent = 'Try archiving manually';
                linkElement.target = '_blank';
                linkElement.style.display = 'inline-block';
                linkElement.style.marginTop = '5px';
                linkElement.style.color = '#0066cc';
                manualLinkContainer.appendChild(linkElement);
            }
        }

        // Log to console as well
        console.log(`[${type.toUpperCase()}] ${url}: ${message}`);

        // Return elements that might be needed for updates
        return {
            entry: existingRow,
            detailsDiv: detailsContentCell
        };
    }

    /**
     * Adds an export results button
     * @param {Function} callback - Function to call when export button is clicked
     */
    addExportButton(callback) {
        // Check if button already exists
        if (document.getElementById('exportButton')) {
            return;
        }

        const exportButton = document.createElement('button');
        exportButton.id = 'exportButton';
        exportButton.textContent = 'Export Results';
        exportButton.style.marginTop = '10px';
        exportButton.addEventListener('click', callback);

        this.elements.resultsDiv.appendChild(exportButton);
    }

    /**
     * Disables or enables the start button
     * @param {boolean} disabled - Whether to disable the button
     */
    setStartButtonDisabled(disabled) {
        this.elements.startButton.disabled = disabled;
    }

    /**
     * Clears the results table
     */
    clearResults() {
        this.elements.statusTableBody.innerHTML = '';
        this.elements.resultsDiv.style.display = 'none';
    }
}