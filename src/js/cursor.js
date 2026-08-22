//#region Cursor displacement & echo stack
// ═══════════════════════════════════════════════════════════════════════
// ── Cursor displacement (modes, warp, vortex, echoes) ─────────────────
// ═══════════════════════════════════════════════════════════════════════
// Pure function — returns _cd[]. No side effects.
function cursorDisplacement(dx, dy, x, y) {
    _cd[0] = 0; _cd[1] = 0;
    if (config.cursorMode === 'default' || config.cursorInfluence <= 0) return _cd;

    // ── Noise warp: distort the effective cursor position ──
    let edx = dx, edy = dy;
    if (config.cursorNoiseWarp > 0) {
        const nw = config.cursorNoiseWarp * config.influenceRadius * 0.3;
        const noiseX = Math.sin(x * 0.006 + frame.tn * 0.0009) * Math.cos(y * 0.004);
        const noiseY = Math.cos(x * 0.005 + frame.tn * 0.0007) * Math.sin(y * 0.006);
        edx += noiseX * nw;
        edy += noiseY * nw;
    }

    // ── Rotation: rotate [edx, edy] by -cursorRotation ──
    if (config.cursorRotation !== 0) {
        const ra = -config.cursorRotation * Math.PI / 180;
        const cosR = Math.cos(ra), sinR = Math.sin(ra);
        const rdx = edx * cosR - edy * sinR;
        const rdy = edx * sinR + edy * cosR;
        edx = rdx; edy = rdy;
    }

    // ── Ellipse distance ──
    const eR = bloomRadius || config.influenceRadius;
    const dist = Math.sqrt((edx / config.cursorEllipseX) ** 2 + (edy / config.cursorEllipseY) ** 2)
               * Math.sqrt(config.cursorEllipseX * config.cursorEllipseY);

    if (dist >= eR || dist <= 1) return _cd;

    // ── Dead zone ──
    if (config.cursorDeadZone > 0 && dist < eR * config.cursorDeadZone) return _cd;

    // ── Cone angle filter ──
    if (config.cursorConeAngle < 360) {
        const halfCone = config.cursorConeAngle * 0.5 * Math.PI / 180;
        const cellAngle = Math.atan2(edy, edx);
        const travelAngle = Math.atan2(velocityDir.y, velocityDir.x);
        let diff = cellAngle - travelAngle;
        diff = Math.atan2(Math.sin(diff), Math.cos(diff)); // normalize to [-PI, PI]
        if (Math.abs(diff) > halfCone) return _cd;
    }

    const norm = dist / eR;
    const f = Math.pow(1 - norm, config.cursorSoftness);
    const nx = edx / dist, ny = edy / dist;
    const str = eR * 0.15 * config.cursorInfluence;

    // ── Mode-specific primary displacement ──
    if (config.cursorMode === 'attract') { _cd[0] = -nx*f*str; _cd[1] = -ny*f*str; }
    else if (config.cursorMode === 'repel') { _cd[0] = nx*f*str; _cd[1] = ny*f*str; }
    else if (config.cursorMode === 'orbit') {
        const a = frame.tn * 0.002, ca = Math.cos(a), sa = Math.sin(a);
        _cd[0] = (-ny*ca + nx*sa)*f*str*0.7; _cd[1] = (nx*ca + ny*sa)*f*str*0.7;
    } else if (config.cursorMode === 'drift') {
        const nf = 0.008;
        _cd[0] = Math.sin(x*nf + frame.tn*0.0012)*Math.cos(y*nf*1.3 + frame.tn*0.0007)*f*str;
        _cd[1] = Math.cos(x*nf*1.2 + frame.tn*0.0009)*Math.sin(y*nf + frame.tn*0.0011)*f*str;
    } else if (config.cursorMode === 'spiral') {
        const spiralAngle = config.cursorSpiralTightness * dist / eR;
        const cs = Math.cos(spiralAngle), ss = Math.sin(spiralAngle);
        const rx = nx * cs - ny * ss, ry = nx * ss + ny * cs;
        _cd[0] = rx*f*str; _cd[1] = ry*f*str;
    } else if (config.cursorMode === 'gravity') {
        const dot = edx * velocityDir.x + edy * velocityDir.y;
        const sign = dot < 0 ? -1 : 1; // behind = attract, ahead = repel
        _cd[0] = sign*nx*f*str; _cd[1] = sign*ny*f*str;
    } else if (config.cursorMode === 'shockwave') {
        if (config.shockwaveActive) {
            const waveDist = frame.tn - shockwaveTime;
            const waveRadius = waveDist * 0.4;
            const waveWidth = 60;
            const delta = Math.abs(dist - waveRadius);
            if (delta < waveWidth) {
                const waveFalloff = 1 - delta / waveWidth;
                const age = Math.min(1, waveDist / 2000);
                _cd[0] = nx * waveFalloff * (1 - age) * str; _cd[1] = ny * waveFalloff * (1 - age) * str;
            }
        }
    }

    // ── Vortex overlay: rotate _cd by vortex angle ──
    if (config.cursorVortexStrength !== 0) {
        const va = config.cursorVortexStrength * f * Math.PI * 0.5;
        const cv = Math.cos(va), sv = Math.sin(va);
        const vx = _cd[0] * cv - _cd[1] * sv;
        const vy = _cd[0] * sv + _cd[1] * cv;
        _cd[0] = vx; _cd[1] = vy;
    }

    return _cd;
}

// ── Echo-aware displacement (primary + ghost positions) ──────────
// Returns [sx, sy]. Stacks echo ghost displacements on top of primary.
const _ecd = [0, 0];
function fullDisplacement(dx, dy, x, y) {
    const cd = cursorDisplacement(dx, dy, x, y);
    _ecd[0] = cd[0]; _ecd[1] = cd[1];
    for (let i = 0; i < echoPositions.length; i++) {
        const ep = echoPositions[i];
        const gdx = x - ep.x, gdy = y - ep.y;
        const gcd = cursorDisplacement(gdx, gdy, x, y);
        const decay = Math.pow(config.cursorEchoDecay, i + 1);
        _ecd[0] += gcd[0] * decay;
        _ecd[1] += gcd[1] * decay;
    }
    return _ecd;
}
//#endregion
