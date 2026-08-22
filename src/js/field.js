//#region Sprite field, UUID crystallization & culling zones
// ═══════════════════════════════════════════════════════════════════════
// ── Sprite influence, UUID groups, spatial zones ────────────────────
// ═══════════════════════════════════════════════════════════════════════

function getSpriteInfluence(x, y, now) {
    if (config.sprite === "none") return 0;
    const tn = t(now);

    if (config.sprite === "scan") {
        const pos = ((tn / 3500) % 1.6) - 0.3;
        const dist = Math.abs(y / canvas.height - pos);
        const size = config.spriteSize / canvas.height;
        return dist < size ? Math.pow(1 - dist / size, 2) : 0;
    }

    if (config.sprite === "pulse") {
        const radius =
            (tn / 10) %
            (Math.max(canvas.width, canvas.height) * 1.3);
        const dx = x - canvas.width / 2;
        const dy = y - canvas.height / 2;
        const dist = Math.abs(
            Math.sqrt(dx * dx + dy * dy) - radius,
        );
        return dist < config.spriteSize
            ? Math.pow(1 - dist / config.spriteSize, 2)
            : 0;
    }

    if (config.sprite === "wave") {
        const nx = x * 0.002,
            ny = y * 0.002,
            wt = tn * 0.0008;
        let val = 0;

        if (config.spriteSubtype === "fluid") {
            val =
                Math.sin(nx + wt) * Math.cos(ny + wt * 0.5) +
                Math.sin(nx * 0.5 - wt) * 0.5;
        } else if (config.spriteSubtype === "chaos") {
            val =
                Math.sin(nx * 4 + wt) * 0.3 +
                Math.sin(ny * 5 - wt * 1.5) * 0.3 +
                Math.sin((nx + ny) * 2 + wt) * 0.4;
        } else {
            const dx = x - canvas.width / 2,
                dy = y - canvas.height / 2;
            const d = Math.sqrt(dx * dx + dy * dy) * 0.01;
            val = Math.sin(d - wt * 5) * Math.cos(nx * 2 + wt);
        }

        const threshold = config.spriteSize / 500;
        const d = Math.abs(val);
        return d < threshold ? 1 - d / threshold : 0;
    }

    return 0;
}

// ── UUID crystallization ─────────────────────────────────────────────

function crystallizeUUID(cell, now) {
    if (cell.state !== "crystallizing") return;

    const uuid = config.seed === 0 ? crypto.randomUUID() : pseudoUUID();
    const group = { cells: [], startTime: now };

    for (let i = 0; i < uuid.length; i++) {
        const target =
            grid[cell.row * cols + ((cell.col + i) % cols)];
        if (!target) continue;
        target.state = "resolved";
        target.startTime = now;
        target.uuidChar = uuid[i];
        group.cells.push(target);
    }

    activeUUIDGroups.push(group);

    while (activeUUIDGroups.length > config.uuidCount) {
        const oldest = activeUUIDGroups.shift();
        oldest.cells.forEach((c) => {
            if (c.state === "resolved") {
                c.state = "fading";
                c.startTime = now;
            }
        });
    }
}

// ── Sprite zone pre-computation ─────────────────────────────────────
// Returns bounding geometry so the render loop can skip cells
// outside the sprite's active area without calling getSpriteInfluence.

function computeSpriteZone(now) {
    if (config.sprite === 'none') return null;
    const tn = t(now);
    if (config.sprite === 'scan') {
        const pos = ((tn / 3500) % 1.6) - 0.3;
        const size = config.spriteSize / canvas.height;
        return { yMin: (pos - size) * canvas.height, yMax: (pos + size) * canvas.height };
    }
    if (config.sprite === 'pulse') {
        const radius = (tn / 10) % (Math.max(canvas.width, canvas.height) * 1.3);
        return { cx: canvas.width * 0.5, cy: canvas.height * 0.5, rMin: radius - config.spriteSize, rMax: radius + config.spriteSize };
    }
    return { full: true }; // wave — cannot pre-bound cheaply
}

function cellInZone(cell, zone) {
    if (!zone) return false;
    if (zone.full) return true;
    if (zone.yMin !== undefined) return cell.y + cell.ch >= zone.yMin && cell.y <= zone.yMax;
    const dx = cell.x + cell.cw * 0.5 - zone.cx, dy = cell.y + cell.ch * 0.5 - zone.cy;
    const d = Math.sqrt(dx * dx + dy * dy);
    return d >= zone.rMin && d <= zone.rMax;
}
//#endregion
