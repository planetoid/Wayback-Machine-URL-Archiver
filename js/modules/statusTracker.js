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
        this.updateEta();
        
        // Call progress callback if defined
        if (typeof this.onProgressUpdate === 'function') {
            this.onProgressUpdate(progress, this.processedCount, this.urls.length);
        }
    }
    
    /**
     * Gets the current progress percentage
     * @returns {number} - Progress percentage (0-100)
     */
    getProgressPercentage() {
        if (!this.urls.length) return 0;
        return Math.round((this.processedCount / this.urls.length) * 100);
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
     */
    updateEta() {
        if (this.processedCount === 0) return;
        
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
    }
    
    /**
     * Marks the process as complete
     */
    complete() {
        this.isRunning = false;
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
