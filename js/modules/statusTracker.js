/**
 * StatusTracker module
 * Tracks processing status and calculates progress
 */
export default class StatusTracker {
    constructor() {
        this.reset();
    }
    
    /**
     * Resets the status tracker
     */
    reset() {
        this.urls = [];
        this.processedCount = 0;
        this.successCount = 0;
        this.warningCount = 0;
        this.errorCount = 0;
        this.results = [];
        this.startTime = null;
        this.isRunning = false;
        this.shouldStop = false;
        this.avgTimePerUrl = null;
        this.onProgressUpdate = null;
        this.onEtaUpdate = null;
    }
    
    /**
     * Initializes the tracker with URLs to process
     * @param {Array} urls - Array of URLs to track
     */
    initialize(urls) {
        this.reset();
        this.urls = [...urls];
        this.startTime = Date.now();
        this.isRunning = true;
        this.shouldStop = false;
        
        // Immediately call progress update (0%) when initializing
        if (typeof this.onProgressUpdate === 'function') {
            this.onProgressUpdate(0, 0, this.urls.length);
        }
    }
    
    /**
     * Updates progress when a URL is processed
     * @param {Object} result - Result object for the processed URL
     */
    updateProgress(result) {
        this.processedCount++;
        this.results.push(result);
        
        // Update counts by result type
        if (result.success) {
            this.successCount++;
        } else if (result.warning) {
            this.warningCount++;
        } else {
            this.errorCount++;
        }
        
        // Calculate progress percentage
        const progress = this.getProgressPercentage();
        
        // Update ETA
        const estimatedTimeRemaining = this.updateEta();
        
        // Ensure progress callback is called on every update
        if (typeof this.onProgressUpdate === 'function') {
            this.onProgressUpdate(progress, this.processedCount, this.urls.length);
        }
        
        // Log progress for debugging
        console.log(`Progress update: ${progress}%, processed ${this.processedCount}/${this.urls.length}`);
        return progress;
    }
    
    /**
     * Gets the current progress percentage
     * @returns {number} - Progress percentage (0-100)
     */
    getProgressPercentage() {
        if (!this.urls.length) return 0;
        const percentage = Math.round((this.processedCount / this.urls.length) * 100);
        // Ensure it's between 0-100
        return Math.max(0, Math.min(100, percentage));
    }
    
    /**
     * Gets a summary of the processing status
     * @returns {Object} - Status summary object
     */
    getStatusSummary() {
        return {
            total: this.urls.length,
            processed: this.processedCount,
            success: this.successCount,
            warning: this.warningCount,
            error: this.errorCount,
            isComplete: this.processedCount >= this.urls.length,
            isStopped: this.shouldStop,
            progress: this.getProgressPercentage(),
            elapsedTime: Date.now() - this.startTime
        };
    }
    
    /**
     * Updates the estimated time remaining
     * @returns {number} - Estimated time remaining in milliseconds
     */
    updateEta() {
        if (this.processedCount === 0) return 0;
        
        const elapsedTime = Date.now() - this.startTime;
        const timePerUrl = elapsedTime / this.processedCount;
        
        // Use a weighted average for more stable ETA
        this.avgTimePerUrl = this.avgTimePerUrl === null 
            ? timePerUrl 
            : this.avgTimePerUrl * 0.7 + timePerUrl * 0.3;
        
        const remainingUrls = this.urls.length - this.processedCount;
        const estimatedTimeRemaining = this.avgTimePerUrl * remainingUrls;
        
        // Call ETA callback if defined
        if (typeof this.onEtaUpdate === 'function') {
            this.onEtaUpdate(estimatedTimeRemaining, remainingUrls);
        }
        
        return estimatedTimeRemaining;
    }
    
    /**
     * Sets the callback for progress updates
     * @param {Function} callback - Function to call when progress updates
     */
    setProgressCallback(callback) {
        this.onProgressUpdate = callback;
    }
    
    /**
     * Sets the callback for ETA updates
     * @param {Function} callback - Function to call when ETA updates
     */
    setEtaCallback(callback) {
        this.onEtaUpdate = callback;
    }
    
    /**
     * Marks the process as stopped
     */
    stop() {
        this.shouldStop = true;
        this.isRunning = false;
        
        // When process is stopped, ensure progress bar shows the current progress
        if (this.processedCount > 0 && typeof this.onProgressUpdate === 'function') {
            // Use actual processing progress, don't force 100%
            const progress = this.getProgressPercentage();
            this.onProgressUpdate(progress, this.processedCount, this.urls.length);
        }
    }
    
    /**
     * Marks the process as complete
     */
    complete() {
        this.isRunning = false;
        
        // When process is complete, ensure progress bar shows the correct percentage
        if (typeof this.onProgressUpdate === 'function') {
            // If all URLs were processed, set to 100%
            if (this.processedCount >= this.urls.length) {
                this.onProgressUpdate(100, this.processedCount, this.urls.length);
            } else {
                // Otherwise show actual progress
                const progress = this.getProgressPercentage();
                this.onProgressUpdate(progress, this.processedCount, this.urls.length);
            }
        }
        
        // Update ETA display to show completion
        if (typeof this.onEtaUpdate === 'function') {
            this.onEtaUpdate(0, 0);
        }
    }
    
    /**
     * Gets results for all processed URLs
     * @returns {Array} - Array of result objects
     */
    getResults() {
        return [...this.results];
    }
    
    /**
     * Gets formatted time string from milliseconds
     * @param {number} ms - Time in milliseconds
     * @returns {string} - Formatted time string (e.g., "5m 30s")
     */
    formatTime(ms) {
        if (ms < 1000) return "Less than 1 second";
        
        const seconds = Math.floor((ms / 1000) % 60);
        const minutes = Math.floor((ms / (1000 * 60)) % 60);
        const hours = Math.floor(ms / (1000 * 60 * 60));
        
        const parts = [];
        if (hours > 0) parts.push(`${hours}h`);
        if (minutes > 0) parts.push(`${minutes}m`);
        if (seconds > 0 || parts.length === 0) parts.push(`${seconds}s`);
        
        return parts.join(' ');
    }
}
