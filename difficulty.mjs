const TIME_TO_START_INCREASE = 10; // seconds
const BALL_SPEED_INCREASE_FACTOR = 0.1; // per second

const BASE_MAX_SPEED = 10.0;
const BASE_MANUAL_ROTATION_SPEED = 0.025;
const BASE_AUTO_ROTATION_SPEED = 0.008;

// NEW: Constants for Laser Mechanics
const BASE_LASER_SPEED = 3.5;
const BASE_LASER_WIDTH = 60;
const BASE_LASER_HEIGHT = 12;
export const BASE_LASER_SPAWN_INTERVAL = 4000; // Start at 4 seconds (in ms)

// NEW: Constants for Progressive Laser Spawning
const LASER_SPAWN_DECREASE_FACTOR = 30; // Decrease interval by 100ms per second
const MIN_LASER_SPAWN_INTERVAL = 1200; // Minimum interval of 1 second (1000ms)

let currentMaxSpeed = BASE_MAX_SPEED;
let currentManualRotationSpeed = BASE_MANUAL_ROTATION_SPEED;
let currentAutoRotationSpeed = BASE_AUTO_ROTATION_SPEED; 
let gameStartTime = 0;

// NEW: Current laser spawn interval
let currentLaserSpawnInterval = BASE_LASER_SPAWN_INTERVAL;

/**
 * Initializes the game start time on the first frame.
 * @param {number} timestamp - The current requestAnimationFrame timestamp.
 */
export function initDifficulty(timestamp) {
    if (gameStartTime === 0) {
        gameStartTime = timestamp;
    }
}

/**
 * Resets the difficulty variables to their base values and sets a new game start time.
 * @param {number} timestamp - The current requestAnimationFrame timestamp.
 */
export function resetDifficulty(timestamp) {
    gameStartTime = timestamp;
    currentMaxSpeed = BASE_MAX_SPEED;
    currentAutoRotationSpeed = BASE_AUTO_ROTATION_SPEED;
    // RESET LASER INTERVAL
    currentLaserSpawnInterval = BASE_LASER_SPAWN_INTERVAL;
}

/**
 * Updates dynamic difficulty settings based on elapsed time.
 * @param {number} timestamp - The current requestAnimationFrame timestamp.
 */
export function updateDifficulty(timestamp) {
    const elapsedTime = (timestamp - gameStartTime) / 1000; // time in seconds

    if (elapsedTime > TIME_TO_START_INCREASE) {
        const timeOverThreshold = elapsedTime - TIME_TO_START_INCREASE;

        // Ball speed increases dynamically
        currentMaxSpeed = BASE_MAX_SPEED + (timeOverThreshold * BALL_SPEED_INCREASE_FACTOR);

        // NEW: Laser spawn interval decreases dynamically
        const decrease = timeOverThreshold * LASER_SPAWN_DECREASE_FACTOR;
        currentLaserSpawnInterval = Math.max(
            BASE_LASER_SPAWN_INTERVAL - decrease,
            MIN_LASER_SPAWN_INTERVAL
        );
    } else {
        // Use base speeds for the first 10 seconds
        currentMaxSpeed = BASE_MAX_SPEED;
        currentLaserSpawnInterval = BASE_LASER_SPAWN_INTERVAL; // Use base interval
    }
    
    // Auto rotation speed is now fixed
    currentAutoRotationSpeed = BASE_AUTO_ROTATION_SPEED;
    
    // Manual rotation speed remains fixed
    currentManualRotationSpeed = BASE_MANUAL_ROTATION_SPEED;
}

/**
 * Returns the current dynamic difficulty settings.
 * @returns {{currentMaxSpeed: number, currentManualRotationSpeed: number, currentAutoRotationSpeed: number, laserSpeed: number, laserWidth: number, laserHeight: number, laserSpawnInterval: number}}
 */
export function getDifficultyState() {
    return {
        currentMaxSpeed: currentMaxSpeed,
        currentManualRotationSpeed: currentManualRotationSpeed,
        currentAutoRotationSpeed: currentAutoRotationSpeed,
        // NEW: Export laser constants and the dynamic spawn interval
        laserSpeed: BASE_LASER_SPEED,
        laserWidth: BASE_LASER_WIDTH,
        laserHeight: BASE_LASER_HEIGHT,
        laserSpawnInterval: currentLaserSpawnInterval,
    };
}