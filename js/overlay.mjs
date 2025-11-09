import { getBallDesigns, drawDesignPreview } from "./draw.mjs";

/**
 * Manages the game overlay (menu and game over screens) and the overall game state.
 * @param {HTMLCanvasElement} cnv - The main game canvas element.
 */
export function OverlayManager(cnv) {
    // Map design ID (index) to required high score. Design ID 0 is always unlocked (score: 0).
    const UNLOCK_SCORES = [0, 20, 50, 100, 200]; 
    
    let gameState = 'menu'; // 'menu', 'playing', 'gameOver'
    let startButton;
    let overlayTitle, overlayMessage, scoreDisplay, overlay;
    let designContainer; // Reference to the button container
    let designButtons = []; // Array to hold button references
    let currentDesignId = 0; // Track the currently selected design ID
    let designChangeCallback = null; // Store the callback for re-use
    let lastKnownHighScore = 0; // Track the high score used to render the buttons

    // 1. Initial DOM Creation
    const createOverlayDOM = () => {
        overlay = document.createElement('div');
        overlay.id = 'overlay';
        
        // Inject basic styles for the design buttons AND core overlay centering
        const style = document.createElement('style');
        style.innerHTML = `
            /* --- CORE OVERLAY CENTERING STYLES --- */
            #overlay {
                position: fixed;
                top: 0; left: 0;
                width: 100%;
                height: 100%;
                background-color: rgba(0, 0, 0, 0.8);
                color: #94d2bd; /* Pale text color */
                display: flex;
                flex-direction: column;
                justify-content: center;
                align-items: center;
                z-index: 100 !important; /* CRITICAL: Ensure overlay always has high Z-index */
            }
            
            #overlay-content {
                text-align: center; 
                padding: 3vh 3vw; /* SCALING FIX: Use viewport units for padding */
                background: #001219; /* Dark background for the card */
                border: 3px solid #94d2bd; 
                border-radius: 10px;
                max-width: 90%;
                max-height: 90%; /* SCALING FIX: Limit height */
                overflow-y: auto; /* SCALING FIX: Allow scrolling if content is too tall */
            }

            /* --- TEXT SCALING FIXES --- */
            #overlay-title {
                font-size: 5vw; /* SCALING FIX: Scale title with viewport width */
                min-font-size: 24px;
                margin-bottom: 0.5em;
            }
            #overlay-message, #score-display {
                font-size: 2.5vw; /* SCALING FIX: Scale message and score text */
                min-font-size: 14px;
            }

            /* --- START BUTTON CENTERING FIX & SCALING --- */
            #start-button {
                display: block; /* Treat as a block element */
                margin: 2vh auto 0 auto; /* SCALING FIX: Use vh for vertical margin */
                padding: 1.5vh 3vw; /* SCALING FIX: Scale padding */
                font-size: 3vw; /* SCALING FIX: Scale font size */
                min-font-size: 16px;
                background-color: #94d2bd; 
                color: #001219;
                border: none;
                border-radius: 5px;
                cursor: pointer;
                transition: background-color 0.2s;
            }
            #start-button:hover {
                background-color: #94d2bd; 
            }

            /* --- DESIGN BUTTON STYLES & SCALING --- */
            #design-container {
                display: flex;
                gap: 2vw; /* SCALING FIX: Scale gap between buttons */
                margin: 2vh 0; /* SCALING FIX: Scale vertical margin */
                flex-wrap: wrap;
                justify-content: center;
            }
            .design-button {
                /* SCALING FIX: Scale button dimensions with viewport, but cap at 70px */
                width: 10vw;
                height: 10vw;
                max-width: 70px; 
                max-height: 70px;
                padding: 0;
                
                border: 2px solid #005f73; /* Dark accent border */
                background-color: #94d2bd; /* Pale background */
                cursor: pointer;
                border-radius: 5px;
                transition: all 0.1s;
                
                display: flex;
                align-items: center;
                justify-content: center;
                position: relative; /* Crucial for z-index layering */
            }
            .design-button.selected {
                border-color: #94d2bd; /* Vivid Orange highlight */
                background-color: #94d2bd; /* Dark Teal background for selection */
                box-shadow: 0 0 10px #94d2bd;
                transform: scale(1.1); 
            }
            .design-button:hover:not(.selected):not(.locked) {
                 background-color: #94d2bd; /* Pale Teal hover */
            }
            
            /* --- LOCKED BUTTON STYLES (NEW) --- */
            .design-button.locked {
                opacity: 1; 
                cursor: not-allowed;
                position: relative;
                background-color: #001219; 
            }
            .design-button.locked:hover {
                 transform: none;
                 box-shadow: none;
            }
            .design-button.locked::before {
                content: attr(data-unlock-score); /* Display score from data attribute */
                position: absolute;
                top: 50%;
                left: 50%;
                transform: translate(-50%, -50%);
                color: #94d2bd; /* Bright orange text */
                font-weight: bold;
                font-size: 3vw; /* Scales well on small/medium screens */
                z-index: 10; 
                text-shadow: 0 0 5px #001219;
                line-height: 1; /* Explicitly set line height */
            }

            /* FIX: Cap the font size on larger screens (e.g., 800px and up) to prevent it from getting too large */
            @media (min-width: 800px) {
                .design-button.locked::before {
                    font-size: 24px; /* Cap font size at a fixed size that fits well within the 70px button */
                }
            }

            .design-preview-canvas {
                width: 100%;
                height: 100%;
                display: block;
                position: absolute;
                top: 0;
                left: 0;
                z-index: 1; 
            }

            /* --- CRITICAL FIX: Dim the canvas when locked for contrast --- */
            .design-button.locked .design-preview-canvas {
                opacity: 0.2; 
            }
        `;
        document.head.appendChild(style);


        overlay.innerHTML = `
            <div id="overlay-content">
                <h1 id="overlay-title">Ball Runner</h1>
                <p id="overlay-message">Instructions: Touch left/right half to rotate. Touch with two fingers to jump.</p>
                
                <div id="design-selector-container">
                    <label>Ball Design:</label>
                    <div id="design-container"></div>
                </div>
                
                <p id="score-display"></p>
                <button id="start-button">Tap to Start</button>
            </div>
        `;
        document.body.appendChild(overlay);

        // Get references to the overlay components
        overlayTitle = document.getElementById("overlay-title");
        overlayMessage = document.getElementById("overlay-message");
        startButton = document.getElementById("start-button");
        scoreDisplay = document.getElementById("score-display");
        designContainer = document.getElementById("design-container"); 

        // Initial display of the menu overlay is deferred to init.
    };

    /**
     * Creates and attaches the design buttons, and sets up listeners.
     * @param {number} currentHighScore - The player's current high score.
     */
    const createDesignButtons = (currentHighScore) => { 
        designContainer.innerHTML = ''; 
        designButtons = []; 
        const designs = getBallDesigns();
        
        const CANVAS_SIZE = 64; 

        designs.forEach(design => {
            const designId = design.id;
            // Use the UNLOCK_SCORES array for required score
            const requiredScore = UNLOCK_SCORES[designId] !== undefined ? UNLOCK_SCORES[designId] : 9999;
            const isLocked = currentHighScore < requiredScore; 
            
            const button = document.createElement('button');
            button.className = 'design-button';
            button.dataset.designId = designId;
            
            // Add locking attributes and class
            if (isLocked) {
                button.classList.add('locked');
                button.dataset.unlockScore = requiredScore; // Score to display
            }

            const canvas = document.createElement('canvas');
            canvas.width = CANVAS_SIZE;
            canvas.height = CANVAS_SIZE;
            canvas.className = 'design-preview-canvas';
            
            const ctx = canvas.getContext('2d');
            // Draw the design preview
            drawDesignPreview(ctx, designId); 
            
            button.appendChild(canvas);
            
            // We still use a click listener here for desktop compatibility
            button.addEventListener('click', () => {
                const newDesignId = parseInt(button.dataset.designId, 10);
                
                // Check lock status based on class before selecting
                if (button.classList.contains('locked')) {
                    return; 
                }
                setCurrentDesign(newDesignId); 
                if (designChangeCallback) { // Use stored callback
                    designChangeCallback(newDesignId); 
                }
            });

            // Add a touchend listener for mobile compatibility (REMOVED: The button only uses 'click' in the original version)

            designContainer.appendChild(button);
            designButtons.push(button);
        });
        
        // Ensure that the currently selected design is not a newly locked design
        if (currentDesignId >= UNLOCK_SCORES.length || currentHighScore < UNLOCK_SCORES[currentDesignId]) {
             currentDesignId = 0; // Fallback to design 0 if the current one is now locked
             if(designChangeCallback) designChangeCallback(0); // Notify main.mjs
        }
        
        // Update the current selection
        setCurrentDesign(currentDesignId);
        
        // Update the last known high score
        lastKnownHighScore = currentHighScore;
    };
    
    /**
     * Updates the local state and applies the 'selected' class to the correct button.
     */
    const setCurrentDesign = (newDesignId) => {
        // Find the button to check if it's locked before setting
        const targetButton = designButtons.find(b => parseInt(b.dataset.designId, 10) === newDesignId);
        if (targetButton && targetButton.classList.contains('locked')) {
            // Should not happen if createDesignButtons's logic is correct, but safe guard.
            return; 
        }
        
        currentDesignId = newDesignId;
        designButtons.forEach(button => {
            if (parseInt(button.dataset.designId, 10) === newDesignId) {
                button.classList.add('selected');
            } else {
                button.classList.remove('selected');
            }
        });
    };


    const hideOverlay = () => {
        overlay.style.display = 'none';
        cnv.focus();
    };

    const showOverlay = (title, message, finalScore, currentHighScore) => {
        overlayTitle.textContent = title;
        overlayMessage.textContent = message;
        
        // Show the start button if the title is the initial menu OR the game over screen
        const isMenuState = title === 'Ball Runner' || title === 'Game Over!'; 
        startButton.style.display = isMenuState ? 'block' : 'none';

        // Always show design buttons in menu/game over state
        document.getElementById('design-selector-container').style.display = 'block'; 

        if (finalScore !== undefined) {
             scoreDisplay.textContent = `High Score: ${currentHighScore} | Your Score: ${finalScore}`;
             scoreDisplay.style.display = 'block';
        } else {
             scoreDisplay.textContent = `High Score: ${currentHighScore}`; // Display High Score even without final score
             scoreDisplay.style.display = 'block';
        }
        
        overlay.style.display = 'flex';
        
        // Recreate the buttons to ensure the correct lock state is shown
        createDesignButtons(currentHighScore);
    };
    
    /**
     * Initializes the overlay, creates the DOM, and sets up event listeners.
     * @param {function} resetGameCallback - Callback to reset the game state.
     * @param {function} onDesignChangeCallback - Callback to change ball design in main.mjs.
     * @param {number} initialHighScore - The player's initial high score (from persistence). 
     */
    const init = (resetGameCallback, onDesignChangeCallback, initialHighScore) => { 
        createOverlayDOM();
        
        designChangeCallback = onDesignChangeCallback; // Store the callback

        // Create buttons with initial high score
        createDesignButtons(initialHighScore); 

        // Initial display of the menu overlay
        showOverlay('Ball Runner', 'Instructions: Touch left/right half to rotate. Touch with two fingers to jump.', undefined, initialHighScore);

        // --- Reverted Start Button Listener to only use click ---
        const startGame = () => {
            setGameState('playing');
            resetGameCallback();
        }

        // 1. Desktop/Mouse Compatibility (Original only had click)
        startButton.addEventListener('click', startGame);

        // REMOVED: Mobile/Touch Compatibility listener (touchend)
    };

    /**
     * Sets the game state and updates the overlay if needed.
     * @param {'menu'|'playing'|'gameOver'} newState - The new state to transition to.
     * @param {number} [finalScore] - The score achieved if transitioning to 'gameOver'.
     * @param {number} [currentHighScore] - The current highest score.
     * @param {string} [cause] - The cause of game over ('laser' or 'ground'). 
     */
    const setGameState = (newState, finalScore, currentHighScore, cause) => {
        gameState = newState;
        if (newState === 'gameOver') {
            let message = 'You were hit by a laser or fell to the ground!'; 
            if (cause === 'laser') {
                message = 'You were vaporized by a laser!';
            } else if (cause === 'ground') {
                message = 'You fell to the ground!';
            }
            showOverlay('Game Over!', message, finalScore, currentHighScore);
        } else if (newState === 'menu') {
            showOverlay('Ball Runner', 'Instructions: Touch left/right half to rotate. Touch with two fingers to jump.', undefined, currentHighScore);
        } else if (newState === 'playing') {
            hideOverlay();
        }
    };
    
    /**
     * @returns {'menu'|'playing'|'gameOver'} The current game state.
     */
    const getGameState = () => gameState;

    /**
     * Updates the score display and unlock status on the overlay while in 'menu' or 'gameOver' state.
     * @param {number} currentHighScore - The current highest score.
     * @param {number} [currentScore] - The score from the previous game, if applicable.
     */
    const updateScoreDisplay = (currentHighScore, currentScore) => {
        if (gameState !== 'playing') {
             // Re-use logic from showOverlay to update the score display text
             if (currentScore !== undefined) {
                 scoreDisplay.textContent = `High Score: ${currentHighScore} | Your Score: ${currentScore}`;
             } else {
                 scoreDisplay.textContent = `High Score: ${currentHighScore}`;
             }
             scoreDisplay.style.display = 'block';
             document.getElementById('design-selector-container').style.display = 'block';

             // Only refresh buttons if the high score has actually increased and we're in a menu state.
             if (currentHighScore > lastKnownHighScore) {
                 createDesignButtons(currentHighScore);
             }
        }
    };

    return { init, getGameState, setGameState, updateScoreDisplay };
}