/**
 * WaybackAPI module
 * Handles all interactions with the Wayback Machine API
 */
export default class WaybackAPI {
    constructor(options = {}) {
        this.apiKey = options.apiKey || null;
        this.timeout = options.timeout || 10000; // 默認逾時為 10 秒
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
     * Checks if a URL is already archived
     * @param {string} url - The URL to check
     * @returns {Promise<Object>} - Promise resolving to archive status info
     */
    async checkIfArchived(url) {
        // Create an AbortController to handle timeouts
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), this.timeout);

        try {
            // The availability API usually doesn't have CORS issues
            const response = await fetch(`https://archive.org/wayback/available?url=${encodeURIComponent(url)}`, {
                signal: controller.signal,
                headers: {
                    'Cache-Control': 'no-cache',
                    'Pragma': 'no-cache'
                }
            });

            // Clear the timeout as the request completed
            clearTimeout(timeoutId);

            if (!response.ok) {
                throw new Error(`HTTP error ${response.status}`);
            }

            const data = await response.json();
            console.log("Archive check response:", data);

            const isArchived = data &&
                data.archived_snapshots &&
                data.archived_snapshots.closest &&
                data.archived_snapshots.closest.available === true;

            let archiveInfo = {
                isArchived,
                url: url,
                archiveUrl: null,
                timestamp: null,
                formattedDate: null
            };

            if (isArchived) {
                // Extract archive URL and date
                archiveInfo.archiveUrl = data.archived_snapshots.closest.url;
                archiveInfo.timestamp = data.archived_snapshots.closest.timestamp;

                // Format the timestamp (YYYYMMDDHHMMSS) to a readable date
                const year = archiveInfo.timestamp.slice(0, 4);
                const month = archiveInfo.timestamp.slice(4, 6);
                const day = archiveInfo.timestamp.slice(6, 8);
                const hour = archiveInfo.timestamp.slice(8, 10);
                const minute = archiveInfo.timestamp.slice(10, 12);
                const second = archiveInfo.timestamp.slice(12, 14);

                archiveInfo.formattedDate = `${year}-${month}-${day} ${hour}:${minute}:${second}`;
            }

            return archiveInfo;
        } catch (error) {
            // Clear the timeout as the request completed or errored
            clearTimeout(timeoutId);

            // Check if it's a timeout error
            if (error.name === 'AbortError') {
                console.error("Timeout while checking archive status for:", url);
                return {
                    isArchived: false,
                    url: url,
                    error: 'Request timed out. The Wayback Machine API is responding slowly.',
                    checkUrl: `https://web.archive.org/web/*/${url}`,
                    timeout: true
                };
            }

            console.error("Error checking archive status:", error);
            // Return an object with error info
            return {
                isArchived: false,
                url: url,
                error: error.message,
                checkUrl: `https://web.archive.org/web/*/${url}`
            };
        }
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
                signal: controller.signal
            };

            // Add authorization header if API key is provided
            if (this.apiKey) {
                fetchOptions.headers = {
                    'Authorization': `LOW ${this.apiKey}`
                };
            }

            // Use no-cors mode (this will make the request but won't give access to the response details)
            await fetch(`https://web.archive.org/save/${url}`, fetchOptions);

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

            const checkResult = await this.checkIfArchived(url);

            // If we got a timeout, note it but continue
            if (checkResult.timeout) {
                timeoutCount++;
                verificationDetails.push(`Attempt ${attempt} timed out. Will try again.`);
            }

            if (checkResult.isArchived) {
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
                await new Promise(resolve => setTimeout(resolve, currentDelay));
            }
        }

        return {
            success: false,
            url: url,
            verified: false,
            details: verificationDetails,
            manualUrl: `https://web.archive.org/save/${url}`,
            timeoutIssues: timeoutCount > 0
        };
    }
}