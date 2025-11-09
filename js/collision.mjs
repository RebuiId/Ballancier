export function closestPointOnSegment(px, py, x1, y1, x2, y2) {
    const vx = x2 - x1, vy = y2 - y1;
    const denom = vx * vx + vy * vy;
    if (denom === 0) return { x: x1, y: y1, t: 0 };
    let t = ((px - x1) * vx + (py - y1) * vy) / denom;
    t = Math.max(0, Math.min(1, t));
    return { x: x1 + vx * t, y: y1 + vy * t, t };
}

export function checkCircleCollisions(cx, cy, cr, obstacles) {
    const hits = [];

    for (const o of obstacles) {
        if (o.type === "segment") {
            // segment treated as a capsule (segment + half-thickness)
            const cp = closestPointOnSegment(cx, cy, o.x1, o.y1, o.x2, o.y2);
            const dxp = cx - cp.x, dyp = cy - cp.y;
            const dist2 = dxp * dxp + dyp * dyp;
            const dist = Math.sqrt(dist2);
            const rEff = cr + (o.thickness || 0) / 2;
            if (dist2 <= rEff * rEff) {
                const nx = dist === 0 ? 0 : dxp / dist;
                const ny = dist === 0 ? 0 : dyp / dist;
                hits.push({ source: o, kind: "segment", cp, dist, nx, ny, penetration: rEff - dist });
            }

        } else if (o.type === "rect") {
            // axis-aligned rectangle collision
            const closestX = Math.max(o.x, Math.min(cx, o.x + o.w));
            const closestY = Math.max(o.y, Math.min(cy, o.y + o.h));
            const dx = cx - closestX, dy = cy - closestY;
            const d2 = dx*dx + dy*dy;
            if (d2 <= cr*cr) {
                const dist = Math.sqrt(d2) || 0;
                const nx = dist === 0 ? 0 : dx/dist;
                const ny = dist === 0 ? 0 : dy/dist;
                hits.push({ source: o, kind: "rect", cp: {x: closestX, y: closestY}, dist, nx, ny, penetration: cr - dist });
            }
        }
    }

    return hits;
}
