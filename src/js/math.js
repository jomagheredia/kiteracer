//#region Math, PRNG & color utilities
// ═══════════════════════════════════════════════════════════════════════
// ── Math helpers, PRNG, hex / RGB ───────────────────────────────────
// ═══════════════════════════════════════════════════════════════════════

const easeOutExpo = (t) => (t === 1 ? 1 : 1 - Math.pow(2, -10 * t));

const smoothStep = (e0, e1, x) => {
    const t = Math.max(0, Math.min(1, (x - e0) / (e1 - e0)));
    return t * t * (3 - 2 * t);
};

// ── Seeded PRNG (mulberry32) ────────────────────────────────────
function mulberry32(a) {
    return function() {
        a |= 0; a = a + 0x6D2B79F5 | 0;
        let t = Math.imul(a ^ a >>> 15, 1 | a);
        t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
        return ((t ^ t >>> 14) >>> 0) / 4294967296;
    };
}
let rng = Math.random;
function applySeed() {
    rng = config.seed === 0 ? Math.random : mulberry32(config.seed);
}

function pseudoUUID() {
    const hex = '0123456789abcdef';
    let u = '';
    for (let i = 0; i < 36; i++) {
        if (i === 8 || i === 13 || i === 18 || i === 23) u += '-';
        else u += hex[Math.floor(rng() * 16)];
    }
    return u;
}

function hexToRgb(hex) {
    const h = parseInt(hex.replace("#", ""), 16);
    return [h >> 16, (h >> 8) & 255, h & 255];
}

function lerpRgb(a, b, n) {
    const r = Math.round(a[0] + n * (b[0] - a[0]));
    const g = Math.round(a[1] + n * (b[1] - a[1]));
    const bl = Math.round(a[2] + n * (b[2] - a[2]));
    return "#" + (0x1000000 + r * 0x10000 + g * 0x100 + bl).toString(16).slice(1);
}

function lerpColor(a, b, n) {
    return lerpRgb(hexToRgb(a), hexToRgb(b), n);
}
//#endregion
//#region Animation time, dither tables & quantization
// ═══════════════════════════════════════════════════════════════════════
// ── Scaled time, Bayer / noise, quantizeChar ─────────────────────────
// ═══════════════════════════════════════════════════════════════════════
// ── Animation speed scaler ──────────────────────────────────────────
// t(now) converts wall-clock ms to scaled animation time.
// All state timestamps and thresholds operate in this domain.
const t = now => now * config.animationSpeed;

// ── Dither modifier (spatial threshold patterns) ────────────────────
// Inspired by Unicorn Studio's dither pipeline:
//   quantized = floor(intensity * levels + noise * strength) / levels

// ── Bayer matrices (procedural hierarchical) ───────────────────────
const BAYER = {};
(function() {
    function gen(n) {
        if (n === 1) return [[0]];
        const h = gen(n >> 1), hn = n >> 1;
        const m = Array.from({length: n}, () => new Float32Array(n));
        for (let y = 0; y < hn; y++)
            for (let x = 0; x < hn; x++) {
                const v = h[y][x];
                m[y][x] = 4*v; m[y][x+hn] = 4*v+2;
                m[y+hn][x] = 4*v+3; m[y+hn][x+hn] = 4*v+1;
            }
        return m;
    }
    [4, 8, 16].forEach(n => {
        const m = gen(n), n2 = n * n;
        for (let y = 0; y < n; y++)
            for (let x = 0; x < n; x++)
                m[y][x] = (m[y][x] + 0.5) / n2 - 0.5;
        BAYER[n] = m;
    });
})();

// ── PCG2D hash (from Unicorn Studio — high-quality integer noise) ──
function pcg2d(x, y) {
    let vx = (x * 1664525 + 1013904223) | 0;
    let vy = (y * 1664525 + 1013904223) | 0;
    vx = (vx + Math.imul(vy, vy) * 1664525 + 1013904223) | 0;
    vy = (vy + Math.imul(vx, vx) * 1664525 + 1013904223) | 0;
    vx ^= vx >>> 16; vy ^= vy >>> 16;
    vx = (vx + Math.imul(vy, vy) * 1664525 + 1013904223) | 0;
    return ((vx ^ vy) >>> 0) / 4294967296;
}

// ── R2 low-discrepancy sequence (blue-noise-like) ──────────────────
function r2Noise(x, y) {
    const a1 = 0.7548776662466927, a2 = 0.5698402909980532;
    return ((x * a1 + y * a2) % 1) - 0.5;
}

// ── IGN — Interleaved Gradient Noise (Jorge Jimenez) ───────────────
function ignNoise(x, y) {
    return ((52.9829189 * ((0.06711056 * x + 0.00583715 * y) % 1)) % 1) - 0.5;
}

function getDitherOffset(col, row) {
    if (!config.ditherEnabled) return 0;
    switch (config.ditherMode) {
        case 'blueNoise':     return r2Noise(col, row);
        case 'blueNoise2x':   return r2Noise(col * 2, row * 2);
        case 'blueNoise05x':  return r2Noise(col * 0.5, row * 0.5);
        case 'bayer4':        return BAYER[4][row & 3][col & 3];
        case 'bayer8':        return BAYER[8][row & 7][col & 7];
        case 'bayer16':       return BAYER[16][row & 15][col & 15];
        case 'random':        return pcg2d(col, row) - 0.5;
        case 'ign':           return ignNoise(col, row);
        case 'halftone': {
            const p = 6, cx = (col % p) - p * 0.5, cy = (row % p) - p * 0.5;
            return Math.sqrt(cx * cx + cy * cy) / (p * 0.707) - 0.5;
        }
        case 'crosshatch': {
            const a = (col + row) % 4, b = (col - row + 400) % 4;
            return ((a === 0 || b === 0) ? -0.35 : 0.35);
        }
        case 'checkerboard':  return ((col + row) & 1) ? 0.4 : -0.4;
        default:              return 0;
    }
}

// ── Character quantization with dither + glyph toggle ──────────────
// Follows Unicorn's pattern: floor(intensity * levels + noise * str)
// Glyph Dither OFF → classic ramp    Glyph Dither ON → alternate glyph set
// Dither OFF → noise = 0 (getDitherOffset returns 0 when disabled)
function quantizeChar(intensity, col, row) {
    const dset = config.glyphDitherEnabled
        ? DITHER_SETS[config.dither]
        : DITHER_SETS.classic;
    const n = dset.length;
    const noise = getDitherOffset(col, row) * config.ditherStrength;
    const idx = Math.max(0, Math.min(n - 1, Math.floor(intensity * n + noise)));
    return dset[idx];
}
//#endregion
