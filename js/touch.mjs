/**
 * Manages all touch-based input for rotation and jumping.
 * @param {HTMLCanvasElement} cnv - The game canvas element.
 * @param {function(): string} getGameState - Function to retrieve the current game state from OverlayManager.
 * @returns {{
 * getRotatingLeft: function(): boolean,
 * getRotatingRight: function(): boolean,
 * getJump: function(): boolean
 * }} The interface for the main loop to read input state.
 */
export function TouchInputManager(cnv, getGameState) {
    let rotatingLeft = false;
    let rotatingRight = false;
    let jump = false;

    /**
     * Updates the internal input state based on the current set of touches.
     * @param {TouchList} touches - The list of active touch points.
     */
    function updateTouchRotationFromTouches(touches) {
        // Only process input if the game is 'playing'
        if (getGameState() !== 'playing') {
            rotatingLeft = false;
            rotatingRight = false;
            jump = false;
            return;
        }

        let hasLeft = false;
        let hasRight = false;
        const screenWidth = cnv.clientWidth;

        for (let i = 0; i < touches.length; i++) {
            const t = touches[i];
            const xPos = t.clientX;
            // Determine touch zone based on screen half
            if (xPos < (screenWidth / 2)) hasLeft = true;
            else hasRight = true;
        }

        // Logic:
        // 1. Two-finger jump: set 'jump' true. This overrides rotation.
        jump = hasLeft && hasRight;

        // 2. Rotation: set flags only if it's a single-finger input (not a jump)
        if (!jump) {
             rotatingLeft = hasLeft;
             rotatingRight = hasRight;
        } else {
             // If jumping, explicitly stop rotation
             rotatingLeft = false;
             rotatingRight = false;
        }
    }

    // --- Touch Event Handlers ---
    cnv.addEventListener("touchstart", (ev) => {
        // Update rotation/jump logic
        updateTouchRotationFromTouches(ev.touches);
    });

    cnv.addEventListener("touchmove", (ev) => {
        ev.preventDefault(); // Unconditional preventDefault to maintain game control
        updateTouchRotationFromTouches(ev.touches);
    });

    cnv.addEventListener("touchend", (ev) => {
        ev.preventDefault(); // Unconditional preventDefault to maintain game control
        updateTouchRotationFromTouches(ev.touches);
        // If all touches are gone, ensure input flags are cleared
        if (ev.touches.length === 0) { rotatingLeft = false; rotatingRight = false; jump = false; }
    });

    cnv.addEventListener("touchcancel", (ev) => {
        ev.preventDefault(); // Unconditional preventDefault to maintain game control
        updateTouchRotationFromTouches(ev.touches);
        if (ev.touches.length === 0) { rotatingLeft = false; rotatingRight = false; jump = false; }
    });

    return {
        getRotatingLeft: () => rotatingLeft,
        getRotatingRight: () => rotatingRight,
        getJump: () => jump,
    };
}