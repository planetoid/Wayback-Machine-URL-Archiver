/**
 * Wayback Machine URL Archiver - Main Application
 * 
 * This is the main entry point for the application that coordinates
 * all modules and handles the main archiving workflow.
 */

// Import modules
import WaybackAPI from './modules/waybackAPI.js';
import URLProcessor from './modules/urlProcessor.js';
import UIController from './modules/uiController.js';
import FileHandler from './modules/fileHandler.js';
import StatusTracker from './modules/statusTracker.js';

// Main application class
class WaybackArchiver {
    constructor() {
        // Initialize all modules
        this.waybackAPI = new WaybackAPI();
        this.urlProcessor = new URLProcessor();
        this.uiController = new UIController();
        this.fileHandler = new FileHandler(this.urlProcessor);
        this.statusTracker = new StatusTracker();
        
        // Setup UI callbacks
        this.setupUICallbacks();
        
        // Setup status tracker callbacks
        this.setupStatusTrackerCallbacks();
    }
    
    /**
     * Sets up UI callbacks to handle user interactions
     */
    setupUICallbacks() {
        // Handle start button click
        this.uiController.setStartCallback((urlText, apiKey) => {
            this.startArchiving(urlText, apiKey);
        });
        
        // Handle stop button click
        this.uiController.setStopCallback(() => {
            this.stopArchiving();
        });
        
        // Handle file upload
        this.uiController.setFileUploadCallback((file) => {
            this.handleFileUpload(file);
        });
    }
    
    /**
     * Sets up status tracker callbacks for progress and ETA updates
     */
    setupStatusTrackerCallbacks() {
        // Update progress bar when progress changes
        this.statusTracker.setProgressCallback((progress) => {
            this.uiController.updateProgress(progress);
        });
        
        // Update ETA display when ETA changes
        this.statusTracker.setEtaCallback((estimatedTimeRemaining) => {
            this.uiController.updateEta(estimatedTimeRemaining);
        });
    }
    
    /**
     * Handles file upload and processes the file
     * @param {File} file - The uploaded file
     */
    async handleFileUpload(file) {
        try {
            // Validate the file
            const validation = this.fileHandler.validateFile(file);
            if (!validation.valid) {
                this.uiController.showAlert(validation.error);
                return;
            }
            
            // Process the file and extract URLs
            const urls = await this.fileHandler.processFile(file);
            
            if (urls.length === 0) {
                this.uiController.showAlert('No valid URLs found in the file.');
                return;
            }
            
            // Set the extracted URLs in the textarea
            this.uiController.setUrlText(urls.join('\n'));
            
            // Show success message
            this.uiController.showAlert(`Successfully extracted ${urls.length} URLs from the file.`);
        } catch (error) {
            console.error('Error processing file:', error);
            this.uiController.showAlert(`Error processing file: ${error.message}`);
        }
    }
    
    /**
     * Starts the archiving process
     * @param {string} urlText - Text containing URLs to archive
     * @param {string} apiKey - Optional Wayback Machine API key
     */
    async startArchiving(urlText, apiKey) {
        // Parse URLs from the text
        const urls = this.urlProcessor.parseUrlsFromText(urlText);
        
        if (urls.length === 0) {
            this.uiController.showAlert('No valid URLs found.');
            return;
        }
        
        // Set API key if provided
        if (apiKey) {
            this.waybackAPI.setApiKey(apiKey);
            console.log('Using provided API key for requests');
        } else {
            console.log('No API key provided, using public access (rate limits may apply)');
        }
        
        // Initialize status tracker with URLs
        this.statusTracker.initialize(urls);
        
        // Set UI to processing state
        this.uiController.setProcessingState();
        
        // Check for duplicates
        const duplicateCheck = this.urlProcessor.findDuplicates(urls);
        if (duplicateCheck.hasDuplicates) {
            console.log(`Found ${duplicateCheck.duplicates.length} duplicate URLs that will be processed only once.`);
        }
        
        // Process each URL
        try {
            await this.processUrls(duplicateCheck.uniqueUrls);
            
            if (this.statusTracker.shouldStop) {
                this.uiController.showAlert('Process stopped by user.');
            } else {
                this.uiController.showAlert('All URLs have been processed!');
            }
        } catch (error) {
            console.error(`Error: ${error.message}`);
            this.uiController.showAlert(`Error: ${error.message}`);
        }
        
        // Reset UI when done
        this.statusTracker.complete();
        this.uiController.resetUI();
    }
    
    /**
     * Stops the archiving process
     */
    stopArchiving() {
        this.statusTracker.stop();
        this.uiController.addLogEntry({
            message: 'Stopping the process...',
            type: 'warning'
        });
    }
    
    /**
     * Processes a list of URLs for archiving
     * @param {Array} urls - Array of URLs to process
     */
    async processUrls(urls) {
        for (let i = 0; i < urls.length; i++) {
            if (this.statusTracker.shouldStop) break;
            
            const url = urls[i];
            
            try {
                // First check if the URL is already archived
                const archiveInfo = await this.waybackAPI.checkIfArchived(url);
                
                if (archiveInfo.isArchived) {
                    // URL is already archived
                    this.uiController.addLogEntry({
                        message: 'URL already archived',
                        type: 'success',
                        url: url,
                        details: `Already archived on ${archiveInfo.formattedDate}\nView archive: ${archiveInfo.archiveUrl}`,
                        archiveUrl: archiveInfo.archiveUrl
                    });
                    
                    // Update progress
                    this.statusTracker.updateProgress({
                        url: url,
                        success: true,
                        archiveUrl: archiveInfo.archiveUrl,
                        formattedDate: archiveInfo.formattedDate,
                        message: 'Already archived'
                    });
                } else {
                    // URL needs to be archived
                    // Add a "processing" entry to the table
                    this.uiController.addLogEntry({
                        message: 'Archive request sent',
                        type: 'info',
                        url: url,
                        details: 'Processing...'
                    });
                    
                    // Send archive request
                    const archiveResult = await this.waybackAPI.archiveUrl(url);
                    
                    // Wait a bit before verifying
                    await new Promise(resolve => setTimeout(resolve, 5000));
                    
                    // Verify archiving
                    const verificationResult = await this.waybackAPI.verifyArchive(url, 3, 2000);
                    
                    if (verificationResult.success) {
                        // Archive verified
                        this.uiController.addLogEntry({
                            message: 'Successfully archived',
                            type: 'success',
                            url: url,
                            details: `Archived on ${verificationResult.archiveInfo.formattedDate}\nView, archive: ${verificationResult.archiveInfo.archiveUrl}`,
                            archiveUrl: verificationResult.archiveInfo.archiveUrl // 傳遞存檔URL給UI控制器
                        });
                        
                        // Update progress
                        this.statusTracker.updateProgress({
                            url: url,
                            success: true,
                            archiveUrl: verificationResult.archiveInfo.archiveUrl,
                            formattedDate: verificationResult.archiveInfo.formattedDate,
                            message: 'Successfully archived'
                        });
                    } else {
                        // Could not verify archive
                        this.uiController.addLogEntry({
                            message: 'Archive verification failed',
                            type: 'warning',
                            url: url,
                            details: `Archive request was sent but could not be verified.\nIt may still be processing - check manually later at: ${verificationResult.manualUrl}`
                        });
                        
                        // Update progress
                        this.statusTracker.updateProgress({
                            url: url,
                            success: false,
                            warning: true,
                            manualUrl: verificationResult.manualUrl,
                            details: verificationResult.details,
                            message: 'Verification failed'
                        });
                    }
                }
            } catch (error) {
                // Error processing URL
                this.uiController.addLogEntry({
                    message: 'Error processing URL',
                    type: 'error',
                    url: url,
                    details: `Error: ${error.message}\nTry archiving manually: https://web.archive.org/save/${url}`
                });
                
                // Update progress
                this.statusTracker.updateProgress({
                    url: url,
                    success: false,
                    error: true,
                    message: 'Error',
                    details: [error.message]
                });
            }
            
            // Add a small delay to prevent overwhelming the API
            await new Promise(resolve => setTimeout(resolve, 1000));
        }
    }
    
    /**
     * Gets the current results of the archiving process
     * @returns {Array} - Array of results
     */
    getResults() {
        return this.statusTracker.getResults();
    }
    
    /**
     * Exports results to a CSV file
     */
    exportResultsToCsv() {
        const results = this.statusTracker.getResults();
        if (results.length === 0) {
            this.uiController.showAlert('No results to export.');
            return;
        }
        
        const csvContent = this.fileHandler.exportToCsv(results);
        this.fileHandler.generateDownloadableFile(csvContent, 'wayback-archive-results.csv', 'text/csv');
    }
}

// Initialize application when DOM is fully loaded
document.addEventListener('DOMContentLoaded', () => {
    window.waybackArchiver = new WaybackArchiver();
});

// Export for testing
export default WaybackArchiver;
