/**
 * URLProcessor module
 * Handles URL validation, normalization, and processing
 */
export default class URLProcessor {
    /**
     * Parses a string with multiple URLs into an array of valid URLs
     * @param {string} urlText - String containing URLs (one per line)
     * @returns {Array} - Array of valid URLs
     */
    parseUrlsFromText(urlText) {
        if (!urlText || urlText.trim() === '') {
            return [];
        }
        
        return urlText
            .split('\n')
            .map(url => url.trim())
            .filter(url => url && this.isValidUrl(url));
    }
    
    /**
     * Extracts URLs from a file content (CSV or TXT)
     * @param {string} fileContent - Content of the file
     * @returns {Array} - Array of extracted URLs
     */
    extractUrlsFromFile(fileContent) {
        // Extract anything that looks like a URL
        const extractedUrls = fileContent.match(/https?:\/\/[^\s,;"']+/g) || [];
        return extractedUrls.filter(url => this.isValidUrl(url));
    }
    
    /**
     * Validates if a string is a proper URL
     * @param {string} url - URL to validate
     * @returns {boolean} - Whether URL is valid
     */
    isValidUrl(url) {
        try {
            // Basic validation - must start with http:// or https://
            if (!url.match(/^https?:\/\//i)) {
                return false;
            }
            
            // Use URL constructor for validation
            new URL(url);
            return true;
        } catch (e) {
            return false;
        }
    }
    
    /**
     * Sanitizes a URL (removes trailing slashes, etc.)
     * @param {string} url - URL to sanitize
     * @returns {string} - Sanitized URL
     */
    sanitizeUrl(url) {
        try {
            // Parse URL
            const urlObj = new URL(url);
            
            // Remove trailing slash from pathname if present
            if (urlObj.pathname.length > 1 && urlObj.pathname.endsWith('/')) {
                urlObj.pathname = urlObj.pathname.slice(0, -1);
            }
            
            return urlObj.toString();
        } catch (e) {
            // If URL parsing fails, return original
            return url;
        }
    }
    
    /**
     * Checks for duplicate URLs in an array
     * @param {Array} urls - Array of URLs to check
     * @returns {Object} - Object with unique URLs and info about duplicates
     */
    findDuplicates(urls) {
        const seen = new Map();
        const uniqueUrls = [];
        const duplicates = [];
        
        for (const url of urls) {
            // Normalize URL for comparison (lowercase, remove www. if present)
            const normalizedUrl = this.normalizeUrlForComparison(url);
            
            if (seen.has(normalizedUrl)) {
                duplicates.push({
                    originalUrl: url,
                    duplicateOf: seen.get(normalizedUrl)
                });
            } else {
                seen.set(normalizedUrl, url);
                uniqueUrls.push(url);
            }
        }
        
        return {
            uniqueUrls,
            duplicates,
            hasDuplicates: duplicates.length > 0
        };
    }
    
    /**
     * Normalizes a URL for comparison (lowercase, remove www., etc.)
     * @param {string} url - URL to normalize
     * @returns {string} - Normalized URL for comparison
     */
    normalizeUrlForComparison(url) {
        try {
            const urlObj = new URL(url);
            
            // Remove 'www.' from hostname if present
            let hostname = urlObj.hostname.toLowerCase();
            if (hostname.startsWith('www.')) {
                hostname = hostname.substring(4);
            }
            
            // Build a normalized URL for comparison
            return `${urlObj.protocol}//${hostname}${urlObj.pathname}${urlObj.search}`;
        } catch (e) {
            // If URL parsing fails, just lowercase the URL
            return url.toLowerCase();
        }
    }
}
