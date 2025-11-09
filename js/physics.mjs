import { checkCircleCollisions } from "./collision.mjs";

/**
 * Perform one physics step for a circular body and resolve collisions.
 * state: { x, y, dx, dy, speed, r }
 * obstacles: array of obstacle objects (same format used in main)
 * opts: { gravity, friction, bounds: { width, height }, stopThreshold, restitution, tangentialFriction }
 * returns updated state { x, y, dx, dy, speed, vx, vy, contact }
 */
export function step(state, obstacles, opts = {}) {
	// The gravity value is now expected to be pre-scaled in main.mjs
	const gravity = opts.gravity ?? 0.2; 
	const friction = opts.friction ?? 0.995;
	const bounds = opts.bounds || { width: 0, height: 0 };
	// The stopThreshold value is now expected to be pre-scaled in main.mjs
	const stopThreshold = opts.stopThreshold ?? 0.02; 
	// Reduced restitution from 0.5 to 0.3 for a softer, less impactful rebound
	const restitution = opts.restitution ?? 0.3; 
	const tangentialFriction = opts.tangentialFriction ?? friction;
	// how much of the pre-contact tangential speed to retain (0..1). Higher = retain more sideways momentum
	const tangentialRetention = opts.tangentialRetention ?? 0.6;

	let { x, y, dx, dy, speed, r } = state;

	// preserve explicit velocity components across frames if present (prevents loss of vx when leaving surfaces)
	let vx = typeof state.vx === 'number' ? state.vx : dx * speed;
	let vy = typeof state.vy === 'number' ? state.vy : dy * speed;

	// simple bounds handling (prevent leaving canvas)
	if (x >= bounds.width - r && dx > 0) dx = -Math.abs(dx);
	if (x <= r && dx < 0) dx = Math.abs(dx);
	if (y >= bounds.height - r && dy > 0) dy = -Math.abs(dy);
	if (y <= r && dy < 0) dy = Math.abs(dy);

	// base velocity (without gravity) taken from vx,vy
	const vx0 = vx;
	const vy0 = vy;

	// include gravity for integration/detection so falling into contact is detected
	const vxFor = vx0;
	const vyFor = vy0 + gravity;
	let newX = x + vxFor;
	let newY = y + vyFor;

	const hits = checkCircleCollisions(newX, newY, r, obstacles);

    // NEW: Determine if there is contact/collision
    const isInContact = hits.length > 0;

	if (isInContact) {
		// pick the strongest penetration
		if (hits.type === "rect") {
			newY -= gravity; // revert gravity for collision resolution
		}
		hits.sort((a, b) => (b.penetration || 0) - (a.penetration || 0));
		const h = hits[0];
		const nx = h.nx ?? 0;
		const ny = h.ny ?? -1;
		const pen = Math.max(0, h.penetration || 0);

		// push out of penetration
		newX += nx * pen;
		newY += ny * pen;

		// tangent vector (unit)
		let tx = -ny, ty = nx;
		const tlen = Math.hypot(tx, ty) || 1;
		tx /= tlen; ty /= tlen;


		// --- START of MOVING PLATFORM COLLISION LOGIC ---

		// Get obstacle velocity at the contact point (cp)
		let obsVx = 0;
		let obsVy = 0;
		const o = h.source; // Get the obstacle object from the collision hit result

		// Check if the obstacle is rotating (has angularVelocity property from main.mjs)
		if (o.angularVelocity !== undefined && o.angularVelocity !== 0) {
			// Calculate the linear velocity of the contact point (cp)
			const dx_center = h.cp.x - o.centerX;
			const dy_center = h.cp.y - o.centerY;

			// Linear velocity vector is perpendicular to the radius vector (dx_center, dy_center)
			// v = omega x r (2D cross product: v_x = -omega * r_y, v_y = omega * r_x)
			obsVx = -o.angularVelocity * dy_center;
			obsVy = o.angularVelocity * dx_center;
		}

		// 1. Calculate the ball's velocity RELATIVE to the obstacle (without gravity)
		const v_rel_x = vx0 - obsVx; 
		const v_rel_y = vy0 - obsVy; 

		// 2. Calculate the velocity of the ball relative to the obstacle ALONG the normal
		const vDotN_rel = v_rel_x * nx + v_rel_y * ny;

		// 3. Calculate the obstacle's velocity ALONG the normal
		const vObsDotN = obsVx * nx + obsVy * ny;

        // NEW: Calculate ball velocity with gravity along the normal (vDotN_gravity)
        const vDotN_gravity = vxFor * nx + vyFor * ny; // vxFor=vx0, vyFor=vy0+gravity

		// 4. Calculate the FINAL normal velocity scalar:
        const ENERGY_DAMPING_THRESHOLD = -0.10; 
        let new_vn_scalar;

		if (vDotN_rel < ENERGY_DAMPING_THRESHOLD) { 
			// Clear impact: use reflection + transfer platform velocity
			new_vn_scalar = -vDotN_rel * restitution + vObsDotN; 
		} else {
            // Resting or slow contact.
            
            // If the ball is trying to separate (moving away from the surface, vDotN_gravity > 0),
            // allow it to separate naturally by using its gravity-affected velocity.
            if (vDotN_gravity > 0) {
                new_vn_scalar = vDotN_gravity; 
            } else {
                // Ball is pressing in or resting. Force inelastic collision relative to obstacle (no bounce).
                // Final normal velocity is equal to the obstacle's normal velocity.
                new_vn_scalar = vObsDotN;
            }
		}
		
		const new_vn_x = nx * new_vn_scalar;
		const new_vn_y = ny * new_vn_scalar;
		
		// --- END of MOVING PLATFORM COLLISION LOGIC ---

		// --- START of NEW TANGENTIAL LOGIC (Relative Velocity) ---

		// 1. Gravity projected along tangent (gravity vector = [0, gravity])
		const gravityAlong = gravity * ty;

		// 2. Calculate obstacle's tangential velocity scalar (vObsDotT)
		const vObsDotT = obsVx * tx + obsVy * ty;
		
		// 3. Tangential component of the relative velocity (without gravity)
		// v_rel_x and v_rel_y are already calculated above.
		const vDotT_rel_base = v_rel_x * tx + v_rel_y * ty;
		
		// 4. Tangential speed along the slope: relative base tangent projection + gravity projection
		let vAlong_rel = vDotT_rel_base + gravityAlong;
		
		// 5. Apply tangential damping/retention to the RELATIVE speed
		vAlong_rel *= tangentialFriction;
		
		// Preserve some of the pre-contact relative tangential speed (retention)
		vAlong_rel = vAlong_rel * (1 - tangentialRetention) + vDotT_rel_base * tangentialRetention; 
		
		// 6. The final absolute tangential speed (vAlong) is the new relative speed plus the obstacle's tangential speed.
		let vAlong = vAlong_rel + vObsDotT;

		// --- END of NEW TANGENTIAL LOGIC ---

		// Clamp very small uphill tangential creeping: detect downhill direction via ty
		// If vAlong is uphill (opposite sign of ty) and tiny, clamp to 0 to avoid creeping uphill
		if (Math.abs(vAlong) < 0.02 && vAlong * ty < 0) vAlong = 0;

		// (no uphill decay) leave vAlong as computed; tiny uphill creeping already clamped above

		// outgoing velocity = tangent direction * vAlong + normal component
		let outVx = tx * vAlong + new_vn_x;
		let outVy = ty * vAlong + new_vn_y;

		// defensive: remove any residual velocity pushing into the surface (negative normal)
		const outDotN = outVx * nx + outVy * ny;
		if (outDotN < 0) {
			// subtract the penetrating normal component
			outVx -= nx * outDotN;
			outVy -= ny * outDotN;
		}

		// set current velocity components to outgoing values so they persist into the next frame
		vx = outVx; vy = outVy;

		const newSpeed = Math.hypot(vx, vy);
		if (newSpeed < stopThreshold) {
			dx = 0; dy = 0; speed = 0; vx = 0; vy = 0;
		} else {
			speed = newSpeed; dx = vx / speed; dy = vy / speed;
		}

		x = newX; y = newY;
	} else {
		// airborne: use vx carried forward and apply gravity to vy
		vx = vxFor; // unchanged horizontal
		vy = vyFor; // vertical with gravity
		x = newX; y = newY;
		const actualSpeed = Math.hypot(vx, vy);
		if (actualSpeed < stopThreshold) {
			dx = 0; dy = 0; speed = 0; vx = 0; vy = 0;
		} else {
			speed = actualSpeed; dx = vx / speed; dy = vy / speed;
		}
	}

	return { x, y, dx, dy, speed, vx, vy, contact: isInContact };
}