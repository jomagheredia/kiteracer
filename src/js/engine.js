//#region Setup — canvas, grid, frame buffers
// ═══════════════════════════════════════════════════════════════════════
// ── Canvas, grid state, frame buffers ──────────────────────────────────
// ═══════════════════════════════════════════════════════════════════════
const canvas = document.getElementById("main-canvas");
const ctx = canvas.getContext("2d", { alpha: false });

let cols, rows;
let grid = [];
let mouse = { x: -2000, y: -2000 };
let imageBuffer = null;
let imageAspectRatio = 1.0;
let activeUUIDGroups = [];

// ── Performance: frame state & render buffers ───────────────────────
const frame = { mx: 0, my: 0, cx: 0, cy: 0, tn: 0, lastAnimSpeed: 1.0 };
let staticBase = null, staticBaseCtx = null;
let staticBaseDirty = true;
const _iBuf = []; let _iCount = 0;   // interaction cells
const _dBuf = []; let _dCount = 0;   // dynamic idle cells
const _cd = [0, 0]; // cursor displacement output

// ── Cursor extended state (module-level, updated in loop()) ────────
let prevMouse = { x: -2000, y: -2000 };
let velocityDir = { x: 0, y: 1 }; // normalized travel direction
// Shockwave
let shockwaveOrigin = { x: 0, y: 0 };
let shockwaveTime = 0;
// Echo buffer — circular buffer of past mouse positions
const echoPositions = []; // {x, y, t} entries
let echoTimer = 0;
// Idle bloom
let idleStart = 0;
let lastMoveTime = 0;
let bloomRadius = 0; // current bloom-expanded radius
const canvasOffset = { left: 0, top: 0 };
function updateCanvasOffset() {
    const box = canvas.getBoundingClientRect();
    canvasOffset.left = box.left;
    canvasOffset.top = box.top;
}
//#endregion
//#region Grid — viewport, density, init
// ═══════════════════════════════════════════════════════════════════════
// ── Grid management ───────────────────────────────────────────────────
// ═══════════════════════════════════════════════════════════════════════

function adaptViewport() {
    const margin = 0.92;
    const winW = window.innerWidth * margin;
    const winH = window.innerHeight * margin;
    const winAspect = winW / winH;
    let finalW, finalH;
    if (imageAspectRatio > winAspect) {
        finalW = winW;
        finalH = finalW / imageAspectRatio;
    } else {
        finalH = winH;
        finalW = finalH * imageAspectRatio;
    }
    canvas.width = Math.floor(finalW);
    canvas.height = Math.floor(finalH);
    canvas.style.width = `${canvas.width}px`;
    canvas.style.height = `${canvas.height}px`;
    updateCanvasOffset();
}

function initGrid() {
    adaptViewport();
    const cw = config.cellSize;
    const ch = Math.round(cw * config.cellHeightRatio);
    cols = Math.ceil(canvas.width / cw);
    rows = Math.ceil(canvas.height / ch);
    grid = [];
    for (let r = 0; r < rows; r++)
        for (let c = 0; c < cols; c++)
            grid.push(new Cell(c, r, cw, ch));
    generateDensity();
    initStaticBase();
    const pinX = document.getElementById('cursor-pin-x-control');
    const pinY = document.getElementById('cursor-pin-y-control');
    if (pinX) { pinX.max = canvas.width; }
    if (pinY) { pinY.max = canvas.height; }
}

function generateDensity() {
    for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
            let v;
            if (imageBuffer) {
                const ix = Math.floor(
                    (c / cols) * imageBuffer.width,
                );
                const iy = Math.floor(
                    (r / rows) * imageBuffer.height,
                );
                const p =
                    (Math.min(iy, imageBuffer.height - 1) *
                        imageBuffer.width +
                        Math.min(ix, imageBuffer.width - 1)) *
                    4;
                v =
                    (imageBuffer.data[p] +
                        imageBuffer.data[p + 1] +
                        imageBuffer.data[p + 2]) /
                    765;
            } else {
                v =
                    (Math.sin(c * 0.045) * Math.cos(r * 0.085) +
                        Math.sin(c * 0.1) * 0.5) /
                    1.5;
                v = (v + 1) / 2;
            }
            const cell = grid[r * cols + c];
            cell.baseDensity = v;
            cell.baseChar = quantizeChar(cell.getFinalIntensity(0), c, r);
            cell.displayChar = cell.baseChar;
        }
    }
    staticBaseDirty = true;
}
//#endregion
//#region Render loop
// ═══════════════════════════════════════════════════════════════════════
// ── Phased render loop ──────────────────────────────────────────────────
// ═══════════════════════════════════════════════════════════════════════
//
//  Phase 1  Update with spatial culling — skip idle cells outside
//           cursor radius, sprite zone, and recently-visited window.
//  Phase 2  Composite the cached static base via drawImage.
//  Phase 3  Overdraw dynamic idle cells (sprite/cursor influenced)
//           with a single font setting — no save/restore.
//  Phase 4  Draw interaction cells (font-batched where possible).

function loop(now) {
    // ── Frame state cache ──
    frame.mx = mouse.x - canvasOffset.left;
    frame.my = mouse.y - canvasOffset.top;
    frame.cx = config.cursorPinned ? config.cursorPinX : frame.mx;
    frame.cy = config.cursorPinned ? config.cursorPinY : frame.my;
    if (config.cursorPinned) {
        const adx = frame.mx - config.cursorPinX;
        const ady = frame.my - config.cursorPinY;
        config.cursorRotation = Math.atan2(ady, adx) * 180 / Math.PI;
    }

    // ── Smooth animation speed transitions ──
    if (frame.lastAnimSpeed !== config.animationSpeed) {
        const diff = config.animationSpeed - frame.lastAnimSpeed;
        const step = diff * 0.06;
        const next = (Math.abs(diff) < 0.005)
            ? config.animationSpeed
            : frame.lastAnimSpeed + step;
        const delta = now * (next - frame.lastAnimSpeed);
        for (let i = 0; i < grid.length; i++) {
            const c = grid[i];
            c.startTime    += delta;
            c.mutationTimer += delta;
            c.lastVisited  += delta;
        }
        for (let i = 0; i < activeUUIDGroups.length; i++) {
            activeUUIDGroups[i].startTime += delta;
        }
        frame.lastAnimSpeed = next;
    }

    frame.tn = t(now);

    // ── Velocity direction tracker (exponentially smoothed) ──
    const vdx = frame.mx - prevMouse.x, vdy = frame.my - prevMouse.y;
    const vlen = Math.sqrt(vdx * vdx + vdy * vdy);
    if (vlen > 1) {
        velocityDir.x += (vdx / vlen - velocityDir.x) * 0.2;
        velocityDir.y += (vdy / vlen - velocityDir.y) * 0.2;
        const vn = Math.sqrt(velocityDir.x ** 2 + velocityDir.y ** 2);
        if (vn > 0.001) { velocityDir.x /= vn; velocityDir.y /= vn; }
        lastMoveTime = frame.tn;
        idleStart = 0;
    }
    prevMouse.x = frame.mx; prevMouse.y = frame.my;

    // ── Idle bloom ──
    if (config.cursorIdleBloom > 0) {
        if (vlen <= 1) {
            if (idleStart === 0) idleStart = frame.tn;
            const idleDur = frame.tn - idleStart;
            if (idleDur > 800) {
                const progress = Math.min(1, (idleDur - 800) / 2000);
                bloomRadius = config.influenceRadius * config.cursorInfluence *
                    (1 + config.cursorIdleBloom * 0.5 * progress);
            } else {
                bloomRadius = config.influenceRadius * config.cursorInfluence;
            }
        } else {
            idleStart = 0;
            bloomRadius = config.influenceRadius * config.cursorInfluence;
        }
    } else {
        bloomRadius = 0; // 0 = use default effR everywhere
    }

    // ── Echo buffer (update every 80ms) ──
    if (config.cursorEchoCount > 0) {
        if (frame.tn - echoTimer > 80) {
            echoPositions.unshift({ x: frame.cx, y: frame.cy });
            while (echoPositions.length > config.cursorEchoCount)
                echoPositions.pop();
            echoTimer = frame.tn;
        }
    } else {
        echoPositions.length = 0;
    }

    // ── Shockwave expiry ──
    if (config.shockwaveActive) {
        const waveDist = frame.tn - shockwaveTime;
        const eR = bloomRadius || (config.influenceRadius * config.cursorInfluence);
        if (waveDist * 0.4 > eR * 2) config.shockwaveActive = false;
    }

    const spriteZone = computeSpriteZone(now);
    const effR = bloomRadius || (config.influenceRadius * config.cursorInfluence);
    // Expand culling radius for ellipse stretch + noise warp margin
    const cullR = effR * Math.max(config.cursorEllipseX, config.cursorEllipseY, 1)
                + config.cursorNoiseWarp * config.influenceRadius * 0.3;
    const rSq = cullR * cullR;

    // ── Phase 1: Update with spatial culling ──
    _iCount = 0; _dCount = 0;
    for (let i = 0; i < grid.length; i++) {
        const cell = grid[i];
        if (cell.state === 'idle') {
            const dx = cell.x + cell.cw * 0.5 - frame.cx;
            const dy = cell.y + cell.ch * 0.5 - frame.cy;
            if (dx * dx + dy * dy >= rSq
                && !cellInZone(cell, spriteZone)
                && frame.tn - cell.lastVisited >= 600) continue;
            cell.update(now);
            _dBuf[_dCount++] = cell;
        } else {
            cell.update(now);
            if (cell.state !== 'idle') _iBuf[_iCount++] = cell;
            else _dBuf[_dCount++] = cell; // just transitioned to idle
        }
    }

    // ── Phase 2: Composite static base ──
    if (staticBaseDirty) rebuildStaticBase();
    ctx.drawImage(staticBase, 0, 0);

    // ── Phase 3: Overdraw dynamic idle cells ──
    const bg = config.lightMode ? currentPalette.cursor : currentPalette.bg;
    const baseFontSize = Math.floor(Math.round(config.cellSize * config.cellHeightRatio) * 0.9);
    ctx.font = `300 ${baseFontSize}px "Geist Mono"`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    for (let i = 0; i < _dCount; i++) {
        const cell = _dBuf[i];
        ctx.fillStyle = bg;
        ctx.fillRect(cell.x, cell.y, cell.cw, cell.ch);
        if (cell.displayChar === ' ') continue;
        const cd = fullDisplacement(cell.dx, cell.dy, cell.x, cell.y);
        ctx.fillStyle = cell.color;
        ctx.fillText(cell.displayChar, cell.x + cell.cw * 0.5 + cd[0], cell.y + cell.ch * 0.5 + cd[1]);
    }

    // ── Phase 4: Interaction cells ──
    for (let i = 0; i < _iCount; i++) {
        _iBuf[i].draw("interaction");
    }

    requestAnimationFrame(loop);
}
//#endregion
