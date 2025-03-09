/**
 * WaybackAPI module - Improved version
 * Handles all interactions with the Wayback Machine API
 * with better handling for recent archives and encoding issues
 */
export default class WaybackAPI {
    constructor(options = {}) {
        this.apiKey = options.apiKey || null;
        this.timeout = options.timeout || 10000; // Default timeout of 10 seconds

        // Add new property to control URL normalization
        this.normalizeUrls = options.normalizeUrls !== undefined ? options.normalizeUrls : true;

        // CDX API endpoint for more direct archive searching
        this.cdxUrl = 'https://web.archive.org/cdx/search/cdx';
    }

    /**
     * Sets the API key
     * @param {string} apiKey - The API key to use
     */
    setApiKey(apiKey) {
        this.apiKey = apiKey;
    }

    /**
     * Sets the timeout for API requests
     * @param {number} timeout - Timeout in milliseconds
     */
    setTimeout(timeout) {
        this.timeout = timeout;
    }

    /**
     * Normalizes a URL to improve archive matching
     * @param {string} url - URL to normalize
     * @returns {string} - Normalized URL
     */
    normalizeUrl(url) {
        if (!this.normalizeUrls) return url;

        try {
            // Parse the URL
            const parsedUrl = new URL(url);

            // Remove fragment (hash) as they're not typically archived
            parsedUrl.hash = '';

            // Recompose the URL without redundant port specs
            return parsedUrl.toString();
        } catch (error) {
            console.warn('Error normalizing URL:', error);
            return url; // Return original if parsing fails
        }
    }

    /**
     * Checks if a URL is already archived using the availability API
     * @param {string} url - The URL to check
     * @returns {Promise<Object>} - Promise resolving to archive status info
     */
    async checkIfArchived(url) {
        // Try the standard availability API first
        const availabilityResult = await this._checkViaAvailabilityApi(url);

        // If it's archived, return immediately
        if (availabilityResult.isArchived) {
            return availabilityResult;
        }

        // If not found, try the CDX API as a fallback for more recent archives
        return this._checkViaCdxApi(url);
    }

    /**
     * Checks archive status using the availability API
     * @param {string} url - The URL to check
     * @returns {Promise<Object>} - Archive status info
     * @private
     */
    async _checkViaAvailabilityApi(url) {
        const normalizedUrl = this.normalizeUrl(url);
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), this.timeout);

        try {
            const response = await fetch(`https://archive.org/wayback/available?url=${encodeURIComponent(normalizedUrl)}`, {
                signal: controller.signal,
                headers: {
                    'Cache-Control': 'no-cache',
                    'Pragma': 'no-cache'
                }
            });

            clearTimeout(timeoutId);

            if (!response.ok) {
                throw new Error(`HTTP error ${response.status}`);
            }

            const data = await response.json();
            console.log("Availability API response:", data);

            const isArchived = data &&
                data.archived_snapshots &&
                data.archived_snapshots.closest &&
                data.archived_snapshots.closest.available === true;

            let archiveInfo = {
                isArchived,
                url: url,
                archiveUrl: null,
                timestamp: null,
                formattedDate: null,
                source: 'availability_api'
            };

            if (isArchived) {
                // Extract archive URL and date
                archiveInfo.archiveUrl = data.archived_snapshots.closest.url;
                archiveInfo.timestamp = data.archived_snapshots.closest.timestamp;

                // Format the timestamp (YYYYMMDDHHMMSS) to a readable date
                archiveInfo.formattedDate = this._formatTimestamp(archiveInfo.timestamp);
            }

            return archiveInfo;
        } catch (error) {
            clearTimeout(timeoutId);

            if (error.name === 'AbortError') {
                console.error("Timeout while checking archive status via availability API for:", url);
                return {
                    isArchived: false,
                    url: url,
                    error: 'Request timed out. The Wayback Machine API is responding slowly.',
                    checkUrl: `https://web.archive.org/web/*/${url}`,
                    timeout: true,
                    source: 'availability_api'
                };
            }

            console.error("Error checking archive status via availability API:", error);
            return {
                isArchived: false,
                url: url,
                error: error.message,
                checkUrl: `https://web.archive.org/web/*/${url}`,
                source: 'availability_api'
            };
        }
    }

    /**
     * Checks archive status using the CDX API (more comprehensive for recent archives)
     * @param {string} url - The URL to check
     * @returns {Promise<Object>} - Archive status info
     * @private
     */
    async _checkViaCdxApi(url) {
        const normalizedUrl = this.normalizeUrl(url);
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), this.timeout);

        try {
            // Configure CDX API to get the most recent capture
            const params = new URLSearchParams({
                url: normalizedUrl,
                output: 'json',
                limit: 1,            // Just get the most recent capture
                fl: 'timestamp,original,statuscode',  // Fields we want
                collapse: 'timestamp:6', // Collapse by year/month
                filter: '!statuscode:5..'  // Filter out 5xx errors
            });

            const response = await fetch(`${this.cdxUrl}?${params.toString()}`, {
                signal: controller.signal
            });

            clearTimeout(timeoutId);

            if (!response.ok) {
                throw new Error(`HTTP error ${response.status}`);
            }

            const data = await response.json();
            console.log("CDX API response:", data);

            // If we have valid data and at least one entry
            if (data && Array.isArray(data) && data.length >= 2) {
                // First item is usually the header row, second item is the data
                const headerRow = data[0];
                const dataRow = data[1];

                // Find indices of the fields
                const timestampIndex = headerRow.indexOf('timestamp');
                const originalIndex = headerRow.indexOf('original');
                const statuscodeIndex = headerRow.indexOf('statuscode');

                if (timestampIndex >= 0 && originalIndex >= 0 && statuscodeIndex >= 0) {
                    const timestamp = dataRow[timestampIndex];
                    const original = dataRow[originalIndex];
                    const statuscode = dataRow[statuscodeIndex];

                    // Check if the status code indicates a successful archive (usually 2xx)
                    const isSuccessful = String(statuscode).startsWith('2');

                    if (isSuccessful) {
                        return {
                            isArchived: true,
                            url: url,
                            archiveUrl: `https://web.archive.org/web/${timestamp}/${original}`,
                            timestamp: timestamp,
                            formattedDate: this._formatTimestamp(timestamp),
                            source: 'cdx_api'
                        };
                    }
                }
            }

            // If we didn't find a valid archive or couldn't parse the response
            return {
                isArchived: false,
                url: url,
                checkUrl: `https://web.archive.org/web/*/${url}`,
                source: 'cdx_api'
            };
        } catch (error) {
            clearTimeout(timeoutId);

            if (error.name === 'AbortError') {
                console.error("Timeout while checking archive status via CDX API for:", url);
                return {
                    isArchived: false,
                    url: url,
                    error: 'Request timed out. The CDX API is responding slowly.',
                    checkUrl: `https://web.archive.org/web/*/${url}`,
                    timeout: true,
                    source: 'cdx_api'
                };
            }

            console.error("Error checking archive status via CDX API:", error);
            return {
                isArchived: false,
                url: url,
                error: error.message,
                checkUrl: `https://web.archive.org/web/*/${url}`,
                source: 'cdx_api'
            };
        }
    }

    /**
     * Formats a Wayback Machine timestamp into a readable date
     * @param {string} timestamp - Timestamp in YYYYMMDDHHMMSS format
     * @returns {string} - Formatted date string
     * @private
     */
    _formatTimestamp(timestamp) {
        if (!timestamp || timestamp.length < 14) return 'Unknown date';

        const year = timestamp.slice(0, 4);
        const month = timestamp.slice(4, 6);
        const day = timestamp.slice(6, 8);
        const hour = timestamp.slice(8, 10);
        const minute = timestamp.slice(10, 12);
        const second = timestamp.slice(12, 14);

        return `${year}-${month}-${day} ${hour}:${minute}:${second}`;
    }

    /**
     * Archives a URL using the Wayback Machine
     * @param {string} url - The URL to archive
     * @returns {Promise<Object>} - Promise resolving to archive results
     */
    async archiveUrl(url) {
        // Create an AbortController to handle timeouts
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), this.timeout);

        try {
            // Prepare fetch options
            const fetchOptions = {
                method: 'GET',
                mode: 'no-cors',
                signal: controller.signal,
                headers: {
                    'Cache-Control': 'no-cache',
                    'Pragma': 'no-cache'
                }
            };

            // Add authorization header if API key is provided
            if (this.apiKey) {
                fetchOptions.headers['Authorization'] = `LOW ${this.apiKey}`;
            }

            // Use no-cors mode (this will make the request but won't give access to the response details)
            await fetch(`https://web.archive.org/save/${encodeURIComponent(url)}`, fetchOptions);

            // Clear the timeout as the request completed
            clearTimeout(timeoutId);

            // Return a manual archive URL since we can't check the actual response with no-cors
            return {
                success: true,
                url: url,
                archiveUrl: `https://web.archive.org/web/*/${url}`,
                manualUrl: `https://web.archive.org/save/${url}`
            };
        } catch (error) {
            // Clear the timeout as the request completed or errored
            clearTimeout(timeoutId);

            // Check if it's a timeout error
            if (error.name === 'AbortError') {
                console.error("Timeout while archiving URL:", url);
                return {
                    success: false,
                    url: url,
                    error: 'Request timed out. The archiving process took too long.',
                    manualUrl: `https://web.archive.org/save/${url}`,
                    timeout: true
                };
            }

            console.error("Error during archiving:", error);
            return {
                success: false,
                url: url,
                error: error.message,
                manualUrl: `https://web.archive.org/save/${url}`
            };
        }
    }

    /**
     * Verifies if a URL was successfully archived after an archive request
     * @param {string} url - The URL to verify
     * @param {number} attempts - Number of verification attempts
     * @param {number} delay - Delay between attempts in ms
     * @returns {Promise<Object>} - Promise resolving to verification results
     */
    async verifyArchive(url, attempts = 3, delay = 2000) {
        let verificationDetails = [];
        let timeoutCount = 0;

        for (let attempt = 1; attempt <= attempts; attempt++) {
            const attemptMessage = `Verification attempt ${attempt}/${attempts}...`;
            verificationDetails.push(attemptMessage);

            // First try to check via CDX API for most recent results
            let checkResult = await this._checkViaCdxApi(url);

            // If not found, try the standard availability API
            if (!checkResult.isArchived) {
                checkResult = await this._checkViaAvailabilityApi(url);
            }

            // Track timeouts for backoff
            if (checkResult.timeout) {
                timeoutCount++;
                verificationDetails.push(`Attempt ${attempt} timed out. Will try again.`);
            }

            if (checkResult.isArchived) {
                verificationDetails.push(`Success! Found archive via ${checkResult.source}.`);
                return {
                    success: true,
                    url: url,
                    verified: true,
                    details: verificationDetails,
                    archiveInfo: checkResult
                };
            }

            // If not found and we have more attempts, wait and try again
            if (attempt < attempts) {
                // Increase the delay if we've had timeout issues
                const currentDelay = timeoutCount > 0 ? delay * 1.5 : delay;
                verificationDetails.push(`No archive found yet, waiting ${currentDelay}ms before next attempt...`);
                await new Promise(resolve => setTimeout(resolve, currentDelay));
            }
        }

        verificationDetails.push("Verification failed after all attempts. The URL may still be in the archive processing queue.");

        // As a final fallback, provide a direct link to check manually
        return {
            success: false,
            url: url,
            verified: false,
            details: verificationDetails,
            manualUrl: `https://web.archive.org/web/*/${url}`,
            timeoutIssues: timeoutCount > 0,
            message: "Archive request was sent but verification failed. Check manually later."
        };
    }

    /**
     * Gets the most recent archives for a URL (last 10 captures)
     * @param {string} url - The URL to get history for
     * @returns {Promise<Object>} - Promise resolving to archive history
     */
    async getArchiveHistory(url) {
        const normalizedUrl = this.normalizeUrl(url);
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), this.timeout);

        try {
            // Configure CDX API to get recent captures
            const params = new URLSearchParams({
                url: normalizedUrl,
                output: 'json',
                limit: 10, // Get the 10 most recent captures
                fl: 'timestamp,original,statuscode',
                collapse: 'timestamp:8', // Group by day
                filter: '!statuscode:5..' // Filter out error codes
            });

            const response = await fetch(`${this.cdxUrl}?${params.toString()}`, {
                signal: controller.signal
            });

            clearTimeout(timeoutId);

            if (!response.ok) {
                throw new Error(`HTTP error ${response.status}`);
            }

            const data = await response.json();
            console.log("Archive history response:", data);

            // If we have data and at least a header row
            if (data && Array.isArray(data) && data.length >= 1) {
                const headerRow = data[0];
                const captures = [];

                // Find indices of each field
                const timestampIndex = headerRow.indexOf('timestamp');
                const originalIndex = headerRow.indexOf('original');
                const statuscodeIndex = headerRow.indexOf('statuscode');

                // Skip the header row and process each capture
                for (let i = 1; i < data.length; i++) {
                    const row = data[i];

                    if (row && row.length >= headerRow.length) {
                        captures.push({
                            timestamp: row[timestampIndex],
                            formattedDate: this._formatTimestamp(row[timestampIndex]),
                            originalUrl: row[originalIndex],
                            statusCode: row[statuscodeIndex],
                            archiveUrl: `https://web.archive.org/web/${row[timestampIndex]}/${row[originalIndex]}`
                        });
                    }
                }

                return {
                    success: true,
                    url: url,
                    captureCount: captures.length,
                    captures: captures
                };
            }

            return {
                success: true,
                url: url,
                captureCount: 0,
                captures: [],
                message: "No archive history found."
            };
        } catch (error) {
            clearTimeout(timeoutId);

            if (error.name === 'AbortError') {
                console.error("Timeout while fetching archive history for:", url);
                return {
                    success: false,
                    url: url,
                    error: 'Request timed out while fetching archive history.',
                    timeout: true
                };
            }

            console.error("Error fetching archive history:", error);
            return {
                success: false,
                url: url,
                error: error.message
            };
        }
    }
}