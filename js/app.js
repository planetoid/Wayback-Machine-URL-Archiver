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
        // Initialize all modules with improved options
        this.waybackAPI = new WaybackAPI({
            timeout: 15000, // Increased timeout for better reliability
            normalizeUrls: true // Enable URL normalization
        });
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
        this.statusTracker.setProgressCallback((progress, processedCount, totalCount) => {
            // Pass the exact percentage to ensure accuracy
            this.uiController.updateProgress(progress);

            console.log(`Progress update: ${processedCount}/${totalCount} (${progress}%)`);
        });

        // Update ETA display when ETA changes
        this.statusTracker.setEtaCallback((estimatedTimeRemaining, remainingUrls) => {
            this.uiController.updateEta(estimatedTimeRemaining);
        });

        // Share the status tracker with UI controller for synchronized state
        this.uiController.initializeProgressTracking(this.statusTracker);
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
        // Always reset the UI completely when starting a new archiving process
        // This ensures any previous progress state is cleared
        this.uiController.completeReset();

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

        // Only reset button states without hiding progress
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
                // The improved API will now try multiple methods to find archives
                const archiveInfo = await this.waybackAPI.checkIfArchived(url);

                if (archiveInfo.isArchived) {
                    // URL is already archived
                    const source = archiveInfo.source ? `via ${archiveInfo.source}` : '';
                    this.uiController.addLogEntry({
                        message: 'URL already archived',
                        type: 'success',
                        url: url,
                        details: `Already archived on ${archiveInfo.formattedDate} ${source}\nView archive: ${archiveInfo.archiveUrl}`,
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
                    // Check if there was a specific error during the check
                    if (archiveInfo.error) {
                        console.warn(`Warning during archive check: ${archiveInfo.error}`);
                    }

                    // Add a "processing" entry to the table
                    this.uiController.addLogEntry({
                        message: 'Archive request sent',
                        type: 'info',
                        url: url,
                        details: 'Processing...'
                    });

                    // Send archive request
                    const archiveResult = await this.waybackAPI.archiveUrl(url);

                    // Wait a bit longer before verifying (increased from 5000ms to 8000ms)
                    // Recent archives may take slightly longer to become available in the APIs
                    await new Promise(resolve => setTimeout(resolve, 8000));

                    // Verify archiving with more attempts and longer delays
                    // 5 attempts with 3 second delays = up to 15 seconds of waiting
                    const verificationResult = await this.waybackAPI.verifyArchive(url, 5, 3000);

                    if (verificationResult.success) {
                        // Archive verified
                        const source = verificationResult.archiveInfo.source
                            ? `(found ${verificationResult.archiveInfo.source})`
                            : '';

                        this.uiController.addLogEntry({
                            message: 'Successfully archived',
                            type: 'success',
                            url: url,
                            details: `Archived on ${verificationResult.archiveInfo.formattedDate} ${source}\nView archive: ${verificationResult.archiveInfo.archiveUrl}`,
                            archiveUrl: verificationResult.archiveInfo.archiveUrl
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
                        // If verification failed, try to fetch the recent history as a last resort
                        try {
                            const historyResult = await this.waybackAPI.getArchiveHistory(url);

                            if (historyResult.success && historyResult.captureCount > 0) {
                                // Found archives in history that weren't detected by verification
                                const mostRecent = historyResult.captures[0];

                                this.uiController.addLogEntry({
                                    message: 'Found in archive history',
                                    type: 'success',
                                    url: url,
                                    details: `Recently archived on ${mostRecent.formattedDate}\nView archive: ${mostRecent.archiveUrl}`,
                                    archiveUrl: mostRecent.archiveUrl
                                });

                                // Update progress
                                this.statusTracker.updateProgress({
                                    url: url,
                                    success: true,
                                    archiveUrl: mostRecent.archiveUrl,
                                    formattedDate: mostRecent.formattedDate,
                                    message: 'Found in history'
                                });
                            } else {
                                // Still no archives found, show verification failed
                                this.uiController.addLogEntry({
                                    message: 'Archive verification failed',
                                    type: 'warning',
                                    url: url,
                                    details: `Archive request was sent but could not be verified.\nIt may still be processing - check manually later at: ${verificationResult.manualUrl}`,
                                    manualUrl: verificationResult.manualUrl
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
                        } catch (historyError) {
                            // History check failed, fall back to the original verification result
                            console.error("Error checking archive history:", historyError);

                            this.uiController.addLogEntry({
                                message: 'Archive verification failed',
                                type: 'warning',
                                url: url,
                                details: `Archive request was sent but could not be verified.\nIt may still be processing - check manually later at: ${verificationResult.manualUrl}`,
                                manualUrl: verificationResult.manualUrl
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
                }
            } catch (error) {
                // Error processing URL
                this.uiController.addLogEntry({
                    message: 'Error processing URL',
                    type: 'error',
                    url: url,
                    details: `Error: ${error.message}\nTry archiving manually: https://web.archive.org/save/${encodeURIComponent(url)}`
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

            // Add a small delay between requests to prevent overwhelming the API
            // Increased from 1000ms to 1500ms for better reliability
            await new Promise(resolve => setTimeout(resolve, 1500));
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

    /**
     * Adds a feature to check all recent archives for a URL
     * This can be useful when troubleshooting verification issues
     * @param {string} url - The URL to check history for
     * @returns {Promise<Object>} - Promise resolving to archive history
     */
    async checkArchiveHistory(url) {
        try {
            return await this.waybackAPI.getArchiveHistory(url);
        } catch (error) {
            console.error("Error checking archive history:", error);
            return {
                success: false,
                error: error.message
            };
        }
    }
}

// Initialize application when DOM is fully loaded
document.addEventListener('DOMContentLoaded', () => {
    window.waybackArchiver = new WaybackArchiver();
});

// Export for testing
export default WaybackArchiver;