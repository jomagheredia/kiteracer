//#region Static base layer (offscreen cache)
// ═══════════════════════════════════════════════════════════════════════
// ── Static base layer (OffscreenCanvas) ───────────────────────────────
// ═══════════════════════════════════════════════════════════════════════
// Caches the idle, no-influence appearance of every cell.
// Rebuilt only on config changes; composited via drawImage each frame.

function initStaticBase() {
    staticBase = document.createElement('canvas');
    staticBase.width = canvas.width;
    staticBase.height = canvas.height;
    staticBaseCtx = staticBase.getContext('2d', { alpha: false });
    staticBaseDirty = true;
}

function rebuildStaticBase() {
    const bg = config.lightMode ? currentPalette.cursor : currentPalette.bg;
    staticBaseCtx.fillStyle = bg;
    staticBaseCtx.fillRect(0, 0, canvas.width, canvas.height);
    const fs = Math.floor(Math.round(config.cellSize * config.cellHeightRatio) * 0.9);
    staticBaseCtx.font = `300 ${fs}px "Geist Mono"`;
    staticBaseCtx.textAlign = 'center';
    staticBaseCtx.textBaseline = 'middle';
    for (let i = 0; i < grid.length; i++) {
        const cell = grid[i];
        if (cell.baseChar === ' ') continue;
        staticBaseCtx.fillStyle = cell.getIdleColor();
        staticBaseCtx.fillText(cell.baseChar, cell.x + cell.cw * 0.5, cell.y + cell.ch * 0.5);
    }
    staticBaseDirty = false;
}
//#endregion
//#region Cell
// ═══════════════════════════════════════════════════════════════════════
// ── Cell class (state machine, draw) ──────────────────────────────────
// ═══════════════════════════════════════════════════════════════════════

class Cell {
    constructor(col, row, cw, ch) {
        this.col = col;
        this.row = row;
        this.cw = cw;
        this.ch = ch;
        this.x = col * cw;
        this.y = row * ch;
        this.baseDensity = 0;
        this.baseChar = " ";
        this.displayChar = " ";
        this.state = "idle"; // idle | waking | encoding | crystallizing | resolved | fading
        this.startTime = 0;
        this.delay = 0;
        this.lastVisited = 0;
        this.mutationTimer = 0;
        this.color = currentPalette.base;
        this.uuidChar = "";
        this.currentScale = 1.0;
        this.triggerStrength = 1.0;
        this.dx = 0;
        this.dy = 0;
    }

    trigger(now, dist) {
        if (this.state !== "idle") return;
        const effR = bloomRadius || (config.influenceRadius * config.cursorInfluence);
        // Dead zone: skip cells inside the inner exclusion ring
        if (config.cursorDeadZone > 0 && dist < effR * config.cursorDeadZone) return;
        // Lines filter: skip rows that aren't on an active band
        if (config.cursorLines < 20) {
            const radiusRows = Math.max(1, Math.ceil(effR / this.ch));
            const stride = Math.max(1, Math.ceil(radiusRows / config.cursorLines));
            const cursorRow = Math.round(frame.cy / this.ch);
            const phaseOffset = Math.round(config.cursorLinePhase * stride);
            if ((Math.abs(this.row - cursorRow) + phaseOffset) % stride !== 0) return;
        }
        // Cone angle filter
        if (config.cursorConeAngle < 360) {
            const halfCone = config.cursorConeAngle * 0.5 * Math.PI / 180;
            const cellAngle = Math.atan2(this.dy, this.dx);
            const travelAngle = Math.atan2(velocityDir.y, velocityDir.x);
            let diff = cellAngle - travelAngle;
            diff = Math.atan2(Math.sin(diff), Math.cos(diff));
            if (Math.abs(diff) > halfCone) return;
        }
        const norm = dist / effR;
        this.state = "waking";
        this.startTime = now;
        // Activation curve
        let rawCurve;
        switch (config.cursorActivationCurve) {
            case 'quadratic': rawCurve = (1 - norm) * (1 - norm); break;
            case 'cubic':     rawCurve = (1 - norm) ** 3; break;
            case 'step2':     rawCurve = norm < 0.5 ? 1 : 0; break;
            case 'step3':     rawCurve = norm < 0.33 ? 1 : norm < 0.66 ? 0.5 : 0; break;
            default:          rawCurve = 1 - norm; // linear
        }
        this.triggerStrength = Math.pow(rawCurve, 1.0 / config.cursorSoftness);
        this.delay = norm * 150;
        this.lastVisited = now;
    }

    update(now) {
        const tn = t(now); // scaled animation time
        this.dx = this.x + this.cw * 0.5 - frame.cx;
        this.dy = this.y + this.ch * 0.5 - frame.cy;

        // ── Effective distance (accounts for ellipse + rotation + noise warp) ──
        let edx = this.dx, edy = this.dy;
        if (config.cursorNoiseWarp > 0) {
            const nw = config.cursorNoiseWarp * config.influenceRadius * 0.3;
            edx += Math.sin(this.x * 0.006 + frame.tn * 0.0009) * Math.cos(this.y * 0.004) * nw;
            edy += Math.cos(this.x * 0.005 + frame.tn * 0.0007) * Math.sin(this.y * 0.006) * nw;
        }
        if (config.cursorRotation !== 0) {
            const ra = -config.cursorRotation * Math.PI / 180;
            const cosR = Math.cos(ra), sinR = Math.sin(ra);
            const rdx = edx * cosR - edy * sinR;
            const rdy = edx * sinR + edy * cosR;
            edx = rdx; edy = rdy;
        }
        const dist = Math.sqrt((edx / config.cursorEllipseX) ** 2 + (edy / config.cursorEllipseY) ** 2)
                   * Math.sqrt(config.cursorEllipseX * config.cursorEllipseY);

        const effRadius = bloomRadius || (config.influenceRadius * config.cursorInfluence);
        if (dist < effRadius) this.trigger(tn, dist);

        const elapsed = tn - this.startTime - this.delay;

        if (this.state === "waking" && elapsed >= 0) {
            this.displayChar =
                WAKE_SET[
                    Math.floor(rng() * WAKE_SET.length)
                ];
            this.currentScale =
                1.0 +
                (config.interactionCharScale - 1.0) *
                    this.triggerStrength *
                    (elapsed / 200);
            this.color = lerpRgb(
                this.getIdleRgb(),
                this.getActiveSpriteRgb(),
                Math.min(1, elapsed / 200) * this.triggerStrength,
            );
            if (elapsed >= 200) this.state = "encoding";
        } else if (this.state === "encoding") {
            if (tn - this.mutationTimer > 40) {
                this.displayChar =
                    HEX_SET[
                        Math.floor(rng() * HEX_SET.length)
                    ];
                this.mutationTimer = tn;
            }
            this.currentScale = 1.0 + (config.interactionCharScale - 1.0) * this.triggerStrength;
            this.color = lerpRgb(this.getIdleRgb(), this.getActiveSpriteRgb(), this.triggerStrength);
            if (elapsed >= 600) {
                this.state = "crystallizing";
                crystallizeUUID(this, tn);
            }
        } else if (this.state === "resolved") {
            this.displayChar = this.uuidChar;
            this.color = lerpRgb(this.getIdleRgb(), this.getActiveCursorRgb(), this.triggerStrength);
            this.currentScale = 1.0 + (config.interactionCharScale - 1.0) * this.triggerStrength;
            if (tn - this.startTime > 800) {
                this.state = "fading";
                this.startTime = tn;
            }
        } else if (this.state === "fading") {
            const fadeProg = (tn - this.startTime) / 400;
            const idleRgb   = this.getIdleRgb();
            const cursorRgb = this.getActiveCursorRgb();
            const ts = this.triggerStrength;
            const innerRgb = [
                Math.round(idleRgb[0] + ts * (cursorRgb[0] - idleRgb[0])),
                Math.round(idleRgb[1] + ts * (cursorRgb[1] - idleRgb[1])),
                Math.round(idleRgb[2] + ts * (cursorRgb[2] - idleRgb[2])),
            ];
            this.color = lerpRgb(innerRgb, idleRgb, Math.min(1, fadeProg));
            this.currentScale =
                1.0 +
                (config.interactionCharScale - 1.0) *
                    this.triggerStrength *
                    (1.0 - Math.min(1, fadeProg));
            if (fadeProg >= 1) {
                this.state = "idle";
                this.displayChar = this.baseChar;
                this.currentScale = 1.0;
            }
        }

        if (this.state === "idle") {
            const timeSinceVisit = tn - this.lastVisited;
            const sVal = getSpriteInfluence(this.x, this.y, now);

            if (timeSinceVisit < 600) {
                let trailProgress;
                const raw = timeSinceVisit / 600;
                switch (config.cursorTrailDecay) {
                    case 'exponential': trailProgress = easeOutExpo(raw); break;
                    case 'step':        trailProgress = raw < 0.5 ? 0 : 1; break;
                    case 'sine':        trailProgress = 0.5 - 0.5 * Math.cos(Math.PI * raw); break;
                    default:            trailProgress = raw; // linear
                }
                this.color = lerpRgb(
                    this.getActiveCursorRgb(),
                    this.getIdleRgb(),
                    trailProgress,
                );
                this.displayChar = this.baseChar;
            } else if (sVal > 0.01) {
                const s = smoothStep(0, 1, sVal);
                this.color = lerpRgb(
                    this.getIdleRgb(),
                    this.getActiveSpriteRgb(),
                    s,
                );
                const intensity = this.getFinalIntensity(s);
                this.displayChar = quantizeChar(intensity, this.col, this.row);
            } else {
                this.color = this.getIdleColor();
                this.displayChar = this.baseChar;
            }
        }
    }

    getFinalIntensity(additive = 0) {
        const l =
            Math.pow(
                this.baseDensity,
                1 / Math.max(0.1, config.gamma),
            ) * config.bgIntensity;
        return Math.max(0, Math.min(0.99, l + additive));
    }

    getIdleRgb() {
        const luminance = this.getFinalIntensity(0);
        if (config.gradientMap && config.gradientStops.length > 1) {
            const stops = config.gradientStops;
            const phased =
                (luminance + config.gradientPhase) % 1.00001;
            const i = Math.floor(phased * (stops.length - 1));
            const frac = (phased * (stops.length - 1)) % 1;
            const a = hexToRgb(stops[i]);
            const b = hexToRgb(stops[Math.min(i + 1, stops.length - 1)]);
            return [
                Math.round(a[0] + frac * (b[0] - a[0])),
                Math.round(a[1] + frac * (b[1] - a[1])),
                Math.round(a[2] + frac * (b[2] - a[2])),
            ];
        }
        const cBG  = config.lightMode ? paletteRgb.cursor : paletteRgb.bg;
        const cACC = config.lightMode ? paletteRgb.bg     : paletteRgb.cursor;
        const l = luminance * 0.4;
        return [
            Math.round(cBG[0] + l * (cACC[0] - cBG[0])),
            Math.round(cBG[1] + l * (cACC[1] - cBG[1])),
            Math.round(cBG[2] + l * (cACC[2] - cBG[2])),
        ];
    }

    getIdleColor() {
        const c = this.getIdleRgb();
        return "#" + (0x1000000 + c[0] * 0x10000 + c[1] * 0x100 + c[2]).toString(16).slice(1);
    }

    getActiveSpriteRgb() {
        if (config.gradientMap) {
            return hexToRgb(
                config.gradientStops[
                    Math.floor(config.gradientStops.length * 0.5)
                ] || currentPalette.sprite
            );
        }
        return config.lightMode
            ? [
                Math.round(paletteRgb.sprite[0] + 0.2 * (paletteRgb.black[0] - paletteRgb.sprite[0])),
                Math.round(paletteRgb.sprite[1] + 0.2 * (paletteRgb.black[1] - paletteRgb.sprite[1])),
                Math.round(paletteRgb.sprite[2] + 0.2 * (paletteRgb.black[2] - paletteRgb.sprite[2])),
            ]
            : paletteRgb.sprite;
    }

    getActiveSpriteColor() {
        if (config.gradientMap)
            return (
                config.gradientStops[
                    Math.floor(config.gradientStops.length * 0.5)
                ] || currentPalette.sprite
            );
        return config.lightMode
            ? lerpColor(currentPalette.sprite, "#000000", 0.2)
            : currentPalette.sprite;
    }

    getActiveCursorRgb() {
        if (config.gradientMap) {
            return hexToRgb(
                config.gradientStops[
                    config.gradientStops.length - 1
                ] || currentPalette.cursor
            );
        }
        return config.lightMode ? paletteRgb.bg : paletteRgb.cursor;
    }

    getActiveCursorColor() {
        if (config.gradientMap)
            return (
                config.gradientStops[
                    config.gradientStops.length - 1
                ] || currentPalette.cursor
            );
        return config.lightMode
            ? currentPalette.bg
            : currentPalette.cursor;
    }

    draw(pass) {
        if (this.displayChar === ' ') return;
        const isInteraction = this.state !== "idle";
        if (pass === "base" && isInteraction) return;
        if (pass === "interaction" && !isInteraction) return;
        const baseFS = Math.floor(this.ch * 0.9);
        const cd = fullDisplacement(this.dx, this.dy, this.x, this.y);
        let sx = cd[0], sy = cd[1];
        if (isInteraction) {
            sx += this.dx * (this.currentScale - 1.0) * config.spreadFactor;
            sy += this.dy * (this.currentScale - 1.0) * config.spreadFactor;
        }
        ctx.save();
        ctx.fillStyle = this.color;
        ctx.translate(this.x + this.cw / 2 + sx, this.y + this.ch / 2 + sy);
        ctx.font = `${this.currentScale > 2.5 ? "400" : "300"} ${Math.floor(baseFS * this.currentScale)}px "Geist Mono"`;
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText(this.displayChar, 0, 0);
        ctx.restore();
    }
}
//#endregion
