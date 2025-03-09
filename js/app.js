// 在 processUrls 方法中，URL 已存檔的處理邏輯
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
                    archiveUrl: archiveInfo.archiveUrl // 傳遞存檔URL給UI控制器
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
                        details: `Archived on ${verificationResult.archiveInfo.formattedDate}\nView archive: ${verificationResult.archiveInfo.archiveUrl}`,
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
