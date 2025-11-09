export function hasMethods(obj, methodNames) {
    if (!obj || !Array.isArray(methodNames)) {
        return false;
    }
    return methodNames.every(name => typeof obj[name] === 'function');
}


/**
 * Manages the game score, incrementing it based on elapsed time.
 */
export function ScoreTracker() {
    let score = 0;
    // Timestamp of the last score update (in ms).
    // Initialized to 0, will be set on the first start/update call.
    let lastUpdateTime = 0; 
    const updateInterval = 1000; // Update every 1000 milliseconds (1 second)

    /**
     * Resets the score and starts tracking time. 
     * Call this once at game start or reset.
     */
    function start() {
        score = 0;
        lastUpdateTime = performance.now(); // Use performance.now() for high-resolution time
    }

    /**
     * Updates the score based on elapsed time. Call this in the main game loop.
     * @param {number} timestamp - The current timestamp (e.g., from requestAnimationFrame callback).
     */
    function update(timestamp) {
        if (lastUpdateTime === 0) {
            // Initialize on first update call if start() wasn't used
            lastUpdateTime = timestamp; 
        }

        if (timestamp >= lastUpdateTime + updateInterval) {
            // Calculate how many full seconds have passed
            const elapsedSeconds = Math.floor((timestamp - lastUpdateTime) / updateInterval);
            
            // Increment score by the number of seconds passed
            score += elapsedSeconds;
            
            // Update lastUpdateTime by adding the accounted time to avoid time drift
            lastUpdateTime += elapsedSeconds * updateInterval;
        }
    }

    /**
     * Gets the current score.
     * @returns {number} The current score.
     */
    function getScore() {
        return score;
    }

    return { start, update, getScore };
}