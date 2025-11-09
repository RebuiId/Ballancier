import { step } from "./js/physics.mjs"
import { ScoreTracker } from "./js/utils.mjs"
// Import all drawing functions, including the laser and arrow drawing
import { drawBall, drawPlatform, drawScore, drawOffscreenArrow, drawLaser } from "./js/draw.mjs";
// MODIFIED: Import BASE_LASER_SPAWN_INTERVAL for consistent initial spawn time
import { initDifficulty, resetDifficulty, updateDifficulty, getDifficultyState, BASE_LASER_SPAWN_INTERVAL } from "./js/difficulty.mjs";
import { OverlayManager } from "./js/overlay.mjs";
// NEW: Import the TouchInputManager
import { TouchInputManager } from "./js/touch.mjs";

window.onload = () => {
    const cnv = document.getElementById("cnv");
    const ctx = cnv.getContext("2d");

    // Initialize OverlayManager
    const overlayManager = OverlayManager(cnv);

    // Initialize ScoreTracker
    const scoreTracker = ScoreTracker();

    // Variable to track the highest score achieved
    let highScore = 0;

    // NEW: Variable to track the currently selected ball design (default to 0)
    let ballDesignId = 0;

    // layout / geometry that depends on canvas size
    let lineX1, lineY1, lineX2, lineY2, lineThickness;
    // additional precomputed values for rotating the slope around its center
    let lineCenterX, lineCenterY, lineHalfLen, lineBaseAngle;

    // NEW: Reference height for physics scaling
    const SCALE_FACTOR_REF_HEIGHT = 1000;
    // NEW: Physics scaling factor, updated on resize
    let scaleFactor = 1.0;
    // NEW: Arrow size, scaled by canvas height
    let arrowSize;

    // NEW: Array to hold active laser objects
    let lasers = [];
    // NEW: Timer for laser spawning
    let nextLaserSpawnTime = 0;

    function updateLayout() {
        lineX1 = cnv.width * 1/5;
        lineX2 = cnv.width * 4/5;

        // slope endpoints (y1 > y2 -> downward slope left->right)
        lineY1 = cnv.height * 3/5;
        lineY2 = cnv.height * 2/5;
        lineThickness = Math.max(6, cnv.height * 1/40); // keep reasonable min thickness

        // compute center, half-length and base angle for the slope so we can rotate around center
        lineCenterX = (lineX1 + lineX2) / 2;
        lineCenterY = (lineY1 + lineY2) / 2;
        const dx = lineX2 - lineX1, dy = lineY2 - lineY1;
        const len = Math.hypot(dx, dy) || 1;
        lineHalfLen = len / 2;
        lineBaseAngle = Math.atan2(dy, dx);
    }

    let r;
    let speed = 3; // overall speed factor
    let dx = 0;
    let dy = 0;
    let x = null;
    let y = null;
    let vx = 0; // Velocity components
    let vy = 0; // Velocity components
    let alpha = 0; // Slope rotation angle

    // Jump permission flag.
    let canJump = true;

    // NEW: Setter for ball design
    function setBallDesign(id) {
        ballDesignId = id;
    }

    // Function to reset the game state, called by OverlayManager
    function resetBallAndGame(timestamp) {
         // reset position above the slope center and restore initial velocity
        x = lineCenterX;
        y = lineCenterY - lineThickness - r - 2;
        vx = 0;
        vy = 0;
        dx = 0; dy = 0;
        alpha = 0;
        canJump = true; // Allow jump immediately after respawn

        // NEW: Clear lasers and reset spawn timer
        lasers = [];
        // FIX: Use the imported BASE_LASER_SPAWN_INTERVAL (4000ms) for consistency
        nextLaserSpawnTime = timestamp + BASE_LASER_SPAWN_INTERVAL;

        // Reset dynamic speeds and game timer (Modularized)
        resetDifficulty(timestamp);

        scoreTracker.start(); // Reset the current score
    }

    function resize() {
        cnv.width = window.innerWidth;
        cnv.height = window.innerHeight;
        // NEW: Calculate the scale factor based on height
        scaleFactor = cnv.height / SCALE_FACTOR_REF_HEIGHT;
        r = Math.max(15, cnv.height / 18);
        // Arrow size is r * 0.5
        arrowSize = r * 0.5;
        updateLayout();
        // ensure ball stays above slope after resize
        if (x == null || overlayManager.getGameState() !== 'playing') {
            x = lineCenterX;
            y = lineCenterY - lineThickness - r - 2;
            // Ensure initial velocity is zero to let gravity take over smoothly
            vx = 0;
            vy = 0;
            canJump = true; // Reset jump permission on initial placement
        }
    }
    addEventListener("resize", resize);
    resize();

    // MODIFIED: Initialize the Overlay Manager with the reset function, the design setter, and the initial high score
    overlayManager.init(
        () => { // resetGameCallback
            resetBallAndGame(performance.now());
        },
        setBallDesign, // onDesignChangeCallback
        highScore // PASSING HIGH SCORE TO INIT (NEW)
    );

    // NEW: Initialize the Touch Input Manager
    const touchManager = TouchInputManager(cnv, overlayManager.getGameState);

    // Adjusted jump impulse strength for stability
    const JUMP_STRENGTH_Y = -10;

    // Flag to track if the game has ever started (i.e., not the initial 'menu' state)
    let gameHasStarted = false;

    /**
     * Checks for collision between the ball and a rectangular laser.
     * Uses simple AABB (Axis-Aligned Bounding Box) for the laser and ball.
     * @param {{x: number, y: number, r: number}} ball - Ball state.
     * @param {{x: number, y: number, width: number, height: number}} laser - Laser object.
     * @returns {boolean} True if collision occurred.
     */
    function checkLaserCollision(ball, laser) {
        // Find the closest point on the laser rect to the ball center
        const closestX = Math.max(laser.x, Math.min(ball.x, laser.x + laser.width));
        const closestY = Math.max(laser.y, Math.min(ball.y, laser.y + laser.height));

        // Calculate the distance between the closest point and the ball center
        const distX = ball.x - closestX;
        const distY = ball.y - closestY;

        // If the distance is less than the ball's radius, there is a collision
        return (distX * distX + distY * distY) < (ball.r * ball.r);
    }

    // Store the last timestamp for time-based movement calculation
    let lastTimestamp = 0;

    function draw(timestamp) {
        ctx.resetTransform();
        ctx.clearRect(0, 0, cnv.width, cnv.height);

        // Calculate delta time for consistent movement across different frame rates
        const deltaTime = (timestamp - lastTimestamp) / 1000; // in seconds
        lastTimestamp = timestamp;

        // Get current game state
        const gameState = overlayManager.getGameState();

        // Compute/Draw static elements regardless of game state
        // compute current rotated endpoints of the sloped line (rotate around center)
        const currentAngle = lineBaseAngle + alpha;
        const hx = Math.cos(currentAngle) * lineHalfLen;
        const hy = Math.sin(currentAngle) * lineHalfLen;
        const rx1 = lineCenterX - hx, ry1 = lineCenterY - hy;
        const rx2 = lineCenterX + hx, ry2 = lineCenterY + hy;

        // --- DRAWING ---
        // Draw the platform and score unconditionally
        drawPlatform(ctx, rx1, ry1, rx2, ry2, lineThickness);
        drawScore(ctx, cnv.width, scoreTracker, highScore);

        // Draw lasers only if playing
        if (gameState === 'playing') {
            lasers.forEach(laser => drawLaser(ctx, laser));
        }

        // --- BALL & ARROW DRAWING ---
        // Condition for the ENTIRE ball being off the top of the screen: y < -r.
        const ballIsEntirelyOffScreen = y < -r;

        if (gameState === 'playing') {
            if (ballIsEntirelyOffScreen) {
                // Arrow is ON, Ball is OFF (entirely off-screen)
                drawOffscreenArrow(ctx, x, arrowSize);
            } else {
                // Arrow is OFF, Ball is ON (partially or fully visible, drawn at true position)
                drawBall(ctx, x, y, r, ballDesignId);
            }
        } else {
            // Game is not playing (menu/gameover): Ball is always visible
            drawBall(ctx, x, y, r, ballDesignId);
        }

        // --- GAME LOGIC (ONLY IF PLAYING) ---
        if (gameState === 'playing') {

            gameHasStarted = true; // Mark that the game is now active.

            // --- DIFFICULTY/SCORE LOGIC (Modularized) ---
            initDifficulty(timestamp);
            updateDifficulty(timestamp);
            const {
                currentMaxSpeed, currentManualRotationSpeed, currentAutoRotationSpeed,
                laserSpeed, laserWidth, laserHeight, laserSpawnInterval
            } = getDifficultyState();

            scoreTracker.update(timestamp);
            highScore = Math.max(highScore, scoreTracker.getScore());

            // NEW: Get touch input state from the manager
            const rotatingLeft = touchManager.getRotatingLeft();
            const rotatingRight = touchManager.getRotatingRight();
            const jumpInput = touchManager.getJump();

            // Determine the angular velocity for this frame (using dynamic speed)
            let angularVelocity = 0;
            if (rotatingLeft) {
                angularVelocity = -currentManualRotationSpeed;
            } else if (rotatingRight) {
                angularVelocity = currentManualRotationSpeed;
            } else { // No manual rotation input (either no touch, or two-finger jump)
                // currentAutoRotationSpeed is now a fixed, positive value (rotating right)
                angularVelocity = currentAutoRotationSpeed;
            }

            const obstacles = [
                {
                    type: "segment", x1: rx1, y1: ry1, x2: rx2, y2: ry2, thickness: lineThickness,
                    centerX: lineCenterX,
                    centerY: lineCenterY,
                    angularVelocity: angularVelocity
                }
            ];

            // 1. APPLY JUMP/PUSH LOGIC:
            const isJumpRequested = jumpInput; // Use the value from the touch manager

            // Scale the jump strength
            const scaledJumpStrengthY = JUMP_STRENGTH_Y * scaleFactor;

            if (isJumpRequested && canJump) {

                // Add the impulse to the existing vertical velocity (vy)
                if(dy > 0) {vy = scaledJumpStrengthY; }
                else { vy += scaledJumpStrengthY; }
                canJump = false;
            }

            // 2. Perform physics step with current state, including vx/vy
            const physicsResult = step(
                { x, y, dx, dy, speed, r, vx, vy },
                obstacles,
                // Pass the scaleFactor to the physics step function
                { gravity: 0.2 * scaleFactor, friction: 0.995, bounds: { width: cnv.width, height: cnv.height }, stopThreshold: 0.05 * scaleFactor }
            );

            // 3. Update state from physics result
            const contact = physicsResult.contact; // Get contact status directly from physics

            // Extract updated position and velocity variables
            ({ x, y, dx, dy, speed, vx, vy } = physicsResult);

            // 4. Update velocity vectors from the returned speed/direction.
            if (speed < 0.05 * scaleFactor) { // Scale the minimum speed check
                vx = 0;
                vy = 0;
            } else {
                speed = Math.hypot(vx, vy);
                dx = vx / speed;
                dy = vy / speed;
            }

            // Scale the maximum allowed speed by the screen scale factor.
            const scaledMaxSpeed = currentMaxSpeed * scaleFactor;

            // Max Speed Check - Use scaledMaxSpeed
            const totalVelocity = Math.hypot(vx, vy);
            if (totalVelocity > scaledMaxSpeed) {
                const ratio = scaledMaxSpeed / totalVelocity;
                vx *= ratio;
                vy *= ratio;
                // Update speed, dx, dy after clamping
                speed = scaledMaxSpeed;
                dx = vx / speed;
                dy = vy / speed;
            }

            // 5. JUMP PERMISSION LOGIC: (Using the reliable contact flag)
            if (contact) {
                canJump = true; // Direct contact with the surface allows a jump
            }

            // --- LASER LOGIC ---
            const scaledLaserSpeed = laserSpeed * scaleFactor;
            const scaledLaserWidth = laserWidth * scaleFactor;
            const scaledLaserHeight = laserHeight * scaleFactor;

            // Spawn new laser
            if (timestamp >= nextLaserSpawnTime) {
                const direction = Math.random() < 0.5 ? 1 : -1; // 1: L->R, -1: R->L
                const startX = direction === 1 ? -scaledLaserWidth : cnv.width;
                // Spawn laser in the top 75% of the screen, away from the floor/platform center
                const startY = Math.random() * (cnv.height * 0.75 - scaledLaserHeight) + 1;

                lasers.push({
                    x: startX,
                    y: startY,
                    width: scaledLaserWidth,
                    height: scaledLaserHeight,
                    speed: scaledLaserSpeed,
                    direction: direction,
                    color: null // Use default from draw.mjs
                });

                nextLaserSpawnTime = timestamp + laserSpawnInterval;
            }

            // Move lasers and check for collision
            let hitByLaser = false;
            lasers = lasers.filter(laser => {
                // Move
                laser.x += laser.speed * laser.direction * 60 * deltaTime; // Multiply by 60 for speed compensation

                // Check Collision
                if (checkLaserCollision({x, y, r}, laser)) {
                    hitByLaser = true;
                    // Keep the laser for one frame to be drawn at collision point
                    return true;
                }

                // Check if off-screen (and remove if so)
                if (laser.direction === 1) { // Moving right
                    return laser.x < cnv.width;
                } else { // Moving left
                    return laser.x + laser.width > 0;
                }
            });

            if (hitByLaser) {
                // Game Over Logic
                const finalScore = scoreTracker.getScore();
                highScore = Math.max(highScore, finalScore);
                // MODIFIED: Pass 'laser' as cause
                overlayManager.setGameState('gameOver', finalScore, highScore, 'laser');
            }

            // respawn if the ball touches the ground (bottom of canvas)
            const groundY = cnv.height - r;
            if (y >= groundY) {
                // Game Over Logic - Use OverlayManager
                const finalScore = scoreTracker.getScore();
                highScore = Math.max(highScore, finalScore);
                // MODIFIED: Pass 'ground' as cause
                overlayManager.setGameState('gameOver', finalScore, highScore, 'ground');

                // The next game will be reset when the user clicks 'start' again
            }
             if (x + r > cnv.width || x - r < 0) vx *= -1;

            // ROTATION: Use the pre-calculated angular velocity to update alpha
            alpha += angularVelocity;

        } else if (gameState === 'gameOver' || (gameState === 'menu' && gameHasStarted)) {
            // The overlay now handles the score display and unlock status update
            overlayManager.updateScoreDisplay(highScore, scoreTracker.getScore());
        }


        window.requestAnimationFrame(draw);
    }

    window.requestAnimationFrame(draw);
}