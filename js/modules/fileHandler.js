/**
 * FileHandler module
 * Manages file uploads and processing
 */
export default class FileHandler {
    /**
     * Constructor
     * @param {URLProcessor} urlProcessor - Instance of URLProcessor class
     */
    constructor(urlProcessor) {
        this.urlProcessor = urlProcessor;
    }
    
    /**
     * Processes an uploaded file and extracts URLs
     * @param {File} file - The file object from a file input
     * @returns {Promise<Array>} - Promise resolving to an array of URLs
     */
    async processFile(file) {
        return new Promise((resolve, reject) => {
            if (!file) {
                reject(new Error('No file provided'));
                return;
            }
            
            // Only accept TXT or CSV files
            const validTypes = ['text/plain', 'text/csv', 'application/vnd.ms-excel', 'application/csv'];
            if (!validTypes.includes(file.type) && !file.name.endsWith('.txt') && !file.name.endsWith('.csv')) {
                reject(new Error('Invalid file type. Please upload a TXT or CSV file.'));
                return;
            }
            
            const reader = new FileReader();
            
            reader.onload = (e) => {
                try {
                    const content = e.target.result;
                    const extractedUrls = this.urlProcessor.extractUrlsFromFile(content);
                    resolve(extractedUrls);
                } catch (error) {
                    reject(new Error(`Error processing file: ${error.message}`));
                }
            };
            
            reader.onerror = () => {
                reject(new Error('Error reading file'));
            };
            
            reader.readAsText(file);
        });
    }
    
    /**
     * Validates a file based on size and type
     * @param {File} file - The file to validate
     * @returns {Object} - Object with validation result and any error message
     */
    validateFile(file) {
        if (!file) {
            return {
                valid: false,
                error: 'No file selected'
            };
        }
        
        // Check file size (10MB max)
        const maxSize = 10 * 1024 * 1024; // 10MB in bytes
        if (file.size > maxSize) {
            return {
                valid: false,
                error: `File is too large. Maximum size is 10MB.`
            };
        }
        
        // Check file type
        const validTypes = ['text/plain', 'text/csv', 'application/vnd.ms-excel', 'application/csv'];
        if (!validTypes.includes(file.type) && !file.name.endsWith('.txt') && !file.name.endsWith('.csv')) {
            return {
                valid: false,
                error: 'Invalid file type. Please upload a TXT or CSV file.'
            };
        }
        
        return {
            valid: true
        };
    }
    
    /**
     * Exports results to a CSV file
     * @param {Array} results - Array of archiving results
     * @returns {string} - CSV content as a string
     */
    exportToCsv(results) {
        if (!results || !results.length) {
            return '';
        }
        
        // CSV Header
        const csvRows = ['URL,Status,Archive URL,Archive Date,Details'];
        
        // Add each result as a row
        for (const result of results) {
            const status = result.success ? 'Success' : 'Failed';
            const archiveUrl = result.archiveUrl || '';
            const archiveDate = result.formattedDate || '';
            const details = result.details ? result.details.join(' ').replace(/,/g, ';') : '';
            
            // Escape fields that might contain commas
            const escapedUrl = `"${result.url.replace(/"/g, '""')}"`;
            const escapedDetails = `"${details.replace(/"/g, '""')}"`;
            
            csvRows.push(`${escapedUrl},${status},${archiveUrl},${archiveDate},${escapedDetails}`);
        }
        
        return csvRows.join('\n');
    }
    
    /**
     * Generates a downloadable file from content
     * @param {string} content - File content
     * @param {string} filename - Name for the download file
     * @param {string} type - MIME type of the file
     */
    generateDownloadableFile(content, filename, type = 'text/csv') {
        const blob = new Blob([content], { type });
        const url = URL.createObjectURL(blob);
        
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        a.style.display = 'none';
        
        document.body.appendChild(a);
        a.click();
        
        // Clean up
        setTimeout(() => {
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
        }, 100);
    }
}
