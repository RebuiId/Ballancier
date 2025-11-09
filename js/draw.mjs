import { circle, circle2, line } from "./grafics.mjs";

// NEW COLOR PALETTE (From User)
const COLORS = {
    C0_DARK_ACCENT: "#001219", // 0. Very Dark Blue/Black (Pupils, Text)
    C1_DARK_TEAL: "#005f73",   // 1. Dark Teal
    C2_MEDIUM_TEAL: "#0a9396", // 2. Medium Teal
    C3_PALE_TEAL: "#94d2bd",   // 3. Pale Teal
    C4_PALE_BEIGE: "#e9d8a6",  // 4. Pale Yellow/Beige (Ball Eyes)
    C5_VIVID_ORANGE: "#ee9b00", // 5. Vivid Yellow-Orange (Laser, Arrow)
    C6_DARKER_ORANGE: "#ca6702",// 6. Darker Orange (Ball Mouth Inner)
    C7_DARK_RED_ORANGE: "#bb3e03",// 7. Dark Red-Orange (Ball Mouth Outer)
    C8_DARK_RED: "#ae2012",    // 8. Dark Red
    C9_DEEP_RED: "#9b2226",    // 9. Deep Red
};

const C_DARK_ACCENT = COLORS.C0_DARK_ACCENT;
const C_MAIN_STRUCT = COLORS.C1_DARK_TEAL;
const C_HAZARD_VIVID = COLORS.C5_VIVID_ORANGE;

/**
 * Defines the drawing function for a single ball design at (0, 0).
 * @param {CanvasRenderingContext2D} ctx - The canvas rendering context.
 * @param {number} r - Ball's radius.
 * @param {Object} colors - A design-specific color object.
 */
function drawBallDesign(ctx, r, colors) {
    // Ball Body
    circle(ctx, 0, 0, r, colors.body); 
    ctx.rotate(3.14);
    
    // Eyes (White part / Base detail)
    circle(ctx, -0.25 * r, 0.3 * r, r / 5, colors.eyeBase);
    circle(ctx, 0.25 * r, 0.3 * r, r / 5, colors.eyeBase);
    
    // Pupils (Black part / Main detail)
    circle(ctx, 0.25 * r, 0.3 * r, r / 10, colors.eyePupil);
    circle(ctx, -0.25 * r, 0.3 * r, r / 10, colors.eyePupil);
    
    // Ball Mouth Outer (Detail 3)
    if (colors.mouthOuter) {
        circle2(ctx, 0, -0.1 * r, r / 2, COLORS.C0_DARK_ACCENT); 
    }
    // Ball Mouth Inner (Detail 4)
    if (colors.body) {
        circle2(ctx, 0, -0 * r, r / 2.5, colors.body); 
    }
}

// Ball Design Definitions
const BALL_DESIGNS = [
    { 
        name: "Teal Default", 
        colors: {
            body: COLORS.C1_DARK_TEAL,
            eyeBase: null,
            eyePupil: null,
            mouthOuter: null,
            mouthInner: null,
        }
    },
    { 
        name: "Jade Glitch", 
        colors: {
            body: COLORS.C1_DARK_TEAL,
            eyeBase: COLORS.C3_PALE_TEAL,
            eyePupil: COLORS.C0_DARK_ACCENT,
            mouthOuter: COLORS.C9_DEEP_RED,
            mouthInner: COLORS.C8_DARK_RED,
        }
    },
    { 
        name: "Lava Core", 
        colors: {
            body: COLORS.C8_DARK_RED,
            eyeBase: COLORS.C0_DARK_ACCENT,
            eyePupil: COLORS.C8_DARK_RED,
            mouthOuter: COLORS.C7_DARK_RED_ORANGE,
            mouthInner: COLORS.C6_DARKER_ORANGE,
        }
    },
    { 
        name: "Ghost Ball", 
        colors: {
            body: COLORS.C3_PALE_TEAL,
            eyeBase: COLORS.C0_DARK_ACCENT,
            eyePupil: COLORS.C0_DARK_ACCENT,
            mouthOuter: null, // Minimal design, no mouth
            mouthInner: null,
        }
    },
    { 
        name: "Solar Flare", 
        colors: {
            body: COLORS.C5_VIVID_ORANGE,
            eyeBase: COLORS.C4_PALE_BEIGE,
            eyePupil: COLORS.C0_DARK_ACCENT,
            mouthOuter: COLORS.C1_DARK_TEAL,
            mouthInner: COLORS.C2_MEDIUM_TEAL,
        }
    }
];

/**
 * Returns the array of ball designs for the selector.
 */
export function getBallDesigns() {
    return BALL_DESIGNS.map((design, id) => ({ id, name: design.name }));
}

/**
 * Draws the ball at the current position with the specified design.
 * @param {CanvasRenderingContext2D} ctx - The canvas rendering context.
 * @param {number} x - Ball's x-coordinate.
 * @param {number} y - Ball's y-coordinate.
 * @param {number} r - Ball's radius.
 * @param {number} designId - The ID of the ball design to use.
 */
export function drawBall(ctx, x, y, r, designId) {
    // Clamp designId to the available range
    const id = Math.min(Math.max(0, designId), BALL_DESIGNS.length - 1);
    const design = BALL_DESIGNS[id];

    // FIX: Save the canvas state before translation/rotation
    ctx.save(); 
    
    // draw ball (translate to ball center then draw at origin)
    ctx.translate(x, y);
    
    drawBallDesign(ctx, r, design.colors);
    
    ctx.restore(); // Restore the canvas state
}

/**
 * NEW: Draws a ball design centered on a preview canvas.
 * This is used for the design selection buttons.
 * @param {CanvasRenderingContext2D} ctx - The canvas rendering context (assumed to be square).
 * @param {number} designId - The ID of the ball design to use.
 */
export function drawDesignPreview(ctx, designId) {
    // The canvas is assumed to be square (width == height)
    const size = ctx.canvas.width;
    const r = size * 0.35; // Set radius to 40% of canvas size
    const centerX = size / 2;
    const centerY = size / 2;
    
    // Clear canvas
    ctx.clearRect(0, 0, size, size);

    // Clamp designId
    const id = Math.min(Math.max(0, designId), BALL_DESIGNS.length - 1);
    const design = BALL_DESIGNS[id];

    ctx.save();
    
    // Translate to center of the preview area
    ctx.translate(centerX, centerY);
    
    drawBallDesign(ctx, r, design.colors);
    
    ctx.restore();
}


/**
 * Draws the sloped platform.
 * @param {CanvasRenderingContext2D} ctx - The canvas rendering context.
 * @param {number} rx1 - x-coordinate of rotated endpoint 1.
 * @param {number} ry1 - y-coordinate of rotated endpoint 1.
 * @param {number} rx2 - x-coordinate of rotated endpoint 2.
 * @param {number} ry2 - y-coordinate of rotated endpoint 2.
 * @param {number} lineThickness - Thickness of the line.
 */
export function drawPlatform(ctx, rx1, ry1, rx2, ry2, lineThickness) {
    // draw rotated sloped thick line around its center
    line(ctx, rx1, ry1, rx2, ry2, C_MAIN_STRUCT, lineThickness);
}

/**
 * Draws the current score and high score in the top right.
 * @param {CanvasRenderingContext2D} ctx - The canvas rendering context.
 * @param {number} cnvWidth - Canvas width.
 * @param {{getScore: function(): number}} scoreTracker - ScoreTracker instance.
 * @param {number} highScore - The high score value.
 */
export function drawScore(ctx, cnvWidth, scoreTracker, highScore) {
    // Score drawing logic is clean and relative to cnvWidth (Responsive)
    ctx.fillStyle = C_DARK_ACCENT; // Use dark accent color for text
    ctx.textAlign = "right";
    ctx.textBaseline = "top";
    const padding = cnvWidth * 0.02; // Padding relative to width
    
    // Dynamic Font Size
    const fontSize = Math.max(16, cnvWidth * 0.035); // Max 3.5% of width, min 16px

    // Draw Current Score
    ctx.font = `bold ${fontSize}px sans-serif`; // Use dynamic size
    const scoreText = "Score: " + scoreTracker.getScore();
    ctx.fillText(scoreText, cnvWidth - padding, padding);

    // Draw High Score
    ctx.font = `${fontSize * 0.75}px sans-serif`; // Slightly smaller font
    const highScoreText = "High Score: " + highScore;
    ctx.fillText(highScoreText, cnvWidth - padding, padding + fontSize + 5);
}


/**
 * Draws an arrow at the top of the screen pointing down to the off-screen ball.
 * @param {CanvasRenderingContext2D} ctx - The canvas rendering context.
 * @param {number} ballX - Ball's x-coordinate.
 * @param {number} arrowSize - Size of the arrow (proportional to screen size).
 */
export function drawOffscreenArrow(ctx, ballX, arrowSize) {
    ctx.save();
    ctx.fillStyle = C_HAZARD_VIVID; // Use the vivid hazard color
    
    // Position the arrow 1/2 of its size down from the top edge
    const arrowY = arrowSize / 2;
    
    // Draw an inverted triangle (arrow) centered at ballX, arrowY
    ctx.beginPath();
    ctx.moveTo(ballX, arrowY + arrowSize / 2); // Bottom point
    ctx.lineTo(ballX - arrowSize, arrowY - arrowSize / 2); // Top left point
    ctx.lineTo(ballX + arrowSize, arrowY - arrowSize / 2); // Top right point
    ctx.closePath();
    ctx.fill();
    ctx.restore();
}

/**
 * Draws a laser beam.
 * @param {CanvasRenderingContext2D} ctx - The canvas rendering context.
 * @param {{x: number, y: number, width: number, height: number, color: string}} laser - Laser object.
 */
export function drawLaser(ctx, laser) {
    ctx.save();
    // Laser will now default to the vivid hazard color
    ctx.fillStyle = laser.color || COLORS.C9_DEEP_RED; 
    // Draw a rectangle for the laser
    ctx.fillRect(laser.x, laser.y, laser.width, laser.height);
    ctx.restore();
}