//#region Panel state machine (closed / peek / open) & gradient list UI
// ═══════════════════════════════════════════════════════════════════════
// ── Side panel: closed (pin alone) ↔ peek (hover overlay) ↔ open (locked)
// ═══════════════════════════════════════════════════════════════════════
const fileInput  = document.getElementById('file-input');
const panel      = document.getElementById('panel');
const trigger    = document.getElementById('panel-trigger');
const pinBtn     = document.getElementById('pin-btn');
const fineHover  = window.matchMedia('(hover: hover) and (pointer: fine)');
const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');

let panelMode = 'closed';
let peekCloseTimer = null;

function setPanelMode(next) {
    if (panelMode === next) return;
    panelMode = next;
    if (peekCloseTimer) {
        clearTimeout(peekCloseTimer);
        peekCloseTimer = null;
    }
    const visible = panelMode !== 'closed';
    panel.classList.toggle('peek', panelMode === 'peek');
    panel.classList.toggle('open', panelMode === 'open');
    document.body.classList.toggle('panel-peek', panelMode === 'peek');
    document.body.classList.toggle('panel-open', panelMode === 'open');
    panel.setAttribute('aria-hidden', String(!visible));
    trigger.setAttribute('aria-expanded', String(visible));
    trigger.setAttribute('aria-label', visible ? 'Close controls panel' : 'Open controls panel');
    pinBtn.setAttribute('aria-pressed', String(panelMode === 'open'));
    pinBtn.classList.toggle('pinned', panelMode === 'open');
    pinBtn.setAttribute(
        'aria-label',
        panelMode === 'open'
            ? 'Close controls panel — keyboard shortcut: backslash'
            : 'Open controls panel — keyboard shortcut: backslash'
    );
    requestAnimationFrame(updateCanvasOffset);
}

function schedulePeekClose() {
    if (panelMode !== 'peek') return;
    if (peekCloseTimer) clearTimeout(peekCloseTimer);
    peekCloseTimer = setTimeout(() => {
        peekCloseTimer = null;
        if (panelMode === 'peek') setPanelMode('closed');
    }, reduceMotion.matches ? 0 : 280);
}

function maybePeek() {
    if (panelMode === 'closed' && fineHover.matches) setPanelMode('peek');
}

trigger.addEventListener('pointerenter', maybePeek);
panel.addEventListener('pointerenter', () => {
    if (peekCloseTimer) {
        clearTimeout(peekCloseTimer);
        peekCloseTimer = null;
    }
    maybePeek();
});
panel.addEventListener('pointerleave', schedulePeekClose);
trigger.addEventListener('pointerleave', schedulePeekClose);

trigger.addEventListener('keydown', e => {
    if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        setPanelMode(panelMode === 'open' ? 'closed' : 'open');
    }
});

trigger.addEventListener('click', () => {
    if (!fineHover.matches) setPanelMode(panelMode === 'closed' ? 'open' : 'closed');
});

pinBtn.addEventListener('click', () => {
    setPanelMode(panelMode === 'open' ? 'closed' : 'open');
});

document.addEventListener('keydown', e => {
    if (e.target.matches('input, textarea, select')) return;
    if (e.key === '\\' && !e.metaKey && !e.ctrlKey && !e.altKey) {
        e.preventDefault();
        setPanelMode(panelMode === 'open' ? 'closed' : 'open');
    } else if (e.key === 'Escape' && panelMode !== 'closed') {
        setPanelMode('closed');
    }
});

document.addEventListener('pointerdown', e => {
    if (fineHover.matches) return;
    if (panelMode === 'closed') return;
    if (panel.contains(e.target) || pinBtn.contains(e.target) || trigger.contains(e.target)) return;
    setPanelMode('closed');
});

function renderGradientStops() {
    const list = document.getElementById("gradient-stops-list");
    list.innerHTML = "";
    config.gradientStops.forEach((color, i) => {
        const item = document.createElement("div");
        item.className = "stop-item";
                    item.innerHTML = `<input type="color" aria-label="Gradient stop ${i + 1} color" value="${color}" data-index="${i}"><button type="button" class="remove-stop" aria-label="Remove stop ${i + 1}" data-index="${i}">×</button>`;
        list.appendChild(item);
    });
    list.querySelectorAll('input[type="color"]').forEach(
        (input) => {
            input.addEventListener("input", (e) => {
                config.gradientStops[e.target.dataset.index] =
                    e.target.value;
                staticBaseDirty = true;
            });
        },
    );
    list.querySelectorAll(".remove-stop").forEach((btn) => {
        btn.addEventListener("click", (e) => {
            if (config.gradientStops.length > 2) {
                config.gradientStops.splice(
                    e.target.dataset.index,
                    1,
                );
                renderGradientStops();
            }
        });
    });
}
//#endregion
//#region Global input, import & resize
// ═══════════════════════════════════════════════════════════════════════
// ── Global pointer, resize, file import ───────────────────────────────
// ═══════════════════════════════════════════════════════════════════════
window.addEventListener("mousemove", (e) => {
    mouse.x = e.clientX;
    mouse.y = e.clientY;
});
window.addEventListener("resize", initGrid);

// File import
fileInput.addEventListener("change", (e) => {
    const f = e.target.files[0];
    if (!f) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
        const img = new Image();
        img.onload = () => {
            imageAspectRatio = img.width / img.height;
            const tmp = document.createElement("canvas");
            tmp.width = img.width;
            tmp.height = img.height;
            tmp.getContext("2d").drawImage(img, 0, 0);
            imageBuffer = tmp
                .getContext("2d")
                .getImageData(0, 0, img.width, img.height);
            initGrid();
        };
        img.src = ev.target.result;
    };
    reader.readAsDataURL(f);
});
//#endregion
//#region Control bindings — palette through light mode
// ═══════════════════════════════════════════════════════════════════════
// ── Palette, dither, grid, cursor, sprite, theme ───────────────────────
// ═══════════════════════════════════════════════════════════════════════
document
    .getElementById("palette-select")
    .addEventListener("change", (e) => {
        currentPalette = PALETTES[e.target.value];
        updatePaletteRgb();
        config.gradientStops = [...currentPalette.stops];
        staticBaseDirty = true;
        renderGradientStops();
    });
// Glyph Dither toggle + set
document
    .getElementById("glyph-dither-toggle")
    .addEventListener("change", (e) => {
        config.glyphDitherEnabled = e.target.checked;
        document.getElementById("glyph-dither-controls").style.display =
            config.glyphDitherEnabled ? "flex" : "none";
        generateDensity();
    });
document
    .getElementById("dither-select")
    .addEventListener("change", (e) => {
        config.dither = e.target.value;
        generateDensity();
    });

// Dither toggle + mode + strength
document
    .getElementById("dither-toggle")
    .addEventListener("change", (e) => {
        config.ditherEnabled = e.target.checked;
        document.getElementById("dither-controls").style.display =
            config.ditherEnabled ? "flex" : "none";
        generateDensity();
    });
document
    .getElementById("dither-mode-select")
    .addEventListener("change", (e) => {
        config.ditherMode = e.target.value;
        generateDensity();
    });
bindSlider("dither-strength-control", "dither-strength-val", "ditherStrength", parseFloat, { after: generateDensity });

// Numeric controls — helper to bind slider → config + value readout
function bindSlider(id, valId, prop, parse, opts) {
    const el = document.getElementById(id);
    const val = document.getElementById(valId);
    el.addEventListener("input", (e) => {
        const v = parse(e.target.value);
        config[prop] = v;
        val.textContent = Number.isInteger(v) ? v : v.toFixed(1);
        if (opts && opts.after) opts.after();
    });
}
bindSlider("bg-intensity-control", "bg-intensity-val", "bgIntensity", parseFloat, { after: generateDensity });
bindSlider("gamma-control", "gamma-val", "gamma", parseFloat, { after: generateDensity });
bindSlider("grid-size-control", "grid-size-val", "cellSize", parseFloat, { after: initGrid });
bindSlider("cursor-influence-control", "cursor-influence-val", "cursorInfluence", parseFloat);
bindSlider("mouse-radius-control", "mouse-radius-val", "influenceRadius", parseInt);
bindSlider("cursor-softness-control", "cursor-softness-val", "cursorSoftness", parseFloat);
bindSlider("interaction-scale-control", "interaction-scale-val", "interactionCharScale", parseFloat);
bindSlider("spread-control", "spread-val", "spreadFactor", parseFloat);
bindSlider("uuid-count-control", "uuid-count-val", "uuidCount", parseInt);
bindSlider("cursor-lines-control", "cursor-lines-val", "cursorLines", parseInt);
bindSlider("anim-speed-control", "anim-speed-val", "animationSpeed", parseFloat);
document
    .getElementById("seed-control")
    .addEventListener("input", (e) => {
        config.seed = parseInt(e.target.value);
        document.getElementById("seed-val").textContent = config.seed;
        applySeed();
    });
document
    .getElementById("cursor-mode-select")
    .addEventListener("change", (e) => {
        config.cursorMode = e.target.value;
        document.getElementById("spiral-tightness-row").style.display =
            config.cursorMode === "spiral" ? "flex" : "none";
    });

// ── Cursor Shape controls ──
bindSlider("cursor-ellipse-x-control", "cursor-ellipse-x-val", "cursorEllipseX", parseFloat);
bindSlider("cursor-ellipse-y-control", "cursor-ellipse-y-val", "cursorEllipseY", parseFloat);
bindSlider("cursor-rotation-control", "cursor-rotation-val", "cursorRotation", parseInt);
bindSlider("cursor-cone-angle-control", "cursor-cone-angle-val", "cursorConeAngle", parseInt);
bindSlider("cursor-dead-zone-control", "cursor-dead-zone-val", "cursorDeadZone", parseFloat);
bindSlider("cursor-line-phase-control", "cursor-line-phase-val", "cursorLinePhase", parseFloat);
document
    .getElementById("cursor-activation-curve-select")
    .addEventListener("change", (e) => { config.cursorActivationCurve = e.target.value; });

// ── Cursor extended controls ──
bindSlider("cursor-spiral-tightness-control", "cursor-spiral-tightness-val", "cursorSpiralTightness", parseFloat);
document
    .getElementById("cursor-trail-decay-select")
    .addEventListener("change", (e) => { config.cursorTrailDecay = e.target.value; });
bindSlider("cursor-echo-count-control", "cursor-echo-count-val", "cursorEchoCount", parseInt, {
    after: () => {
        document.getElementById("echo-decay-row").style.display =
            config.cursorEchoCount > 0 ? "flex" : "none";
    }
});
bindSlider("cursor-echo-decay-control", "cursor-echo-decay-val", "cursorEchoDecay", parseFloat);
bindSlider("cursor-idle-bloom-control", "cursor-idle-bloom-val", "cursorIdleBloom", parseFloat);

// ── Cursor Field controls ──
bindSlider("cursor-noise-warp-control", "cursor-noise-warp-val", "cursorNoiseWarp", parseFloat);
bindSlider("cursor-vortex-strength-control", "cursor-vortex-strength-val", "cursorVortexStrength", parseFloat);

// ── Pin Cursor controls ──
let _savedRotation = 0;
document.getElementById('cursor-pin-toggle').addEventListener('change', (e) => {
    config.cursorPinned = e.target.checked;
    document.getElementById('cursor-pin-controls').style.display =
        config.cursorPinned ? 'flex' : 'none';
    if (config.cursorPinned) {
        _savedRotation = config.cursorRotation;
        config.cursorPinX = canvas.width / 2;
        config.cursorPinY = canvas.height / 2;
        const xEl = document.getElementById('cursor-pin-x-control');
        const yEl = document.getElementById('cursor-pin-y-control');
        xEl.max = canvas.width; yEl.max = canvas.height;
        xEl.value = Math.round(config.cursorPinX);
        yEl.value = Math.round(config.cursorPinY);
        document.getElementById('cursor-pin-x-val').textContent = Math.round(config.cursorPinX);
        document.getElementById('cursor-pin-y-val').textContent = Math.round(config.cursorPinY);
    } else {
        config.cursorRotation = _savedRotation;
    }
});
bindSlider('cursor-pin-x-control', 'cursor-pin-x-val', 'cursorPinX', parseInt);
bindSlider('cursor-pin-y-control', 'cursor-pin-y-val', 'cursorPinY', parseInt);

// ── Shockwave click listener ──
            canvas.addEventListener("mousedown", () => {
                const cx = mouse.x - canvasOffset.left;
                const cy = mouse.y - canvasOffset.top;
    if (config.cursorPinned) {
        config.cursorPinX = cx;
        config.cursorPinY = cy;
        document.getElementById('cursor-pin-x-control').value = Math.round(cx);
        document.getElementById('cursor-pin-x-val').textContent = Math.round(cx);
        document.getElementById('cursor-pin-y-control').value = Math.round(cy);
        document.getElementById('cursor-pin-y-val').textContent = Math.round(cy);
        return;
    }
    if (config.cursorMode === 'shockwave') {
        shockwaveOrigin.x = cx;
        shockwaveOrigin.y = cy;
        shockwaveTime = frame.tn;
        config.shockwaveActive = true;
    }
});

document
    .getElementById("gradient-phase-control")
    .addEventListener("input", (e) => {
        config.gradientPhase = parseFloat(e.target.value);
        document.getElementById("gradient-phase-val").textContent = config.gradientPhase.toFixed(1);
        staticBaseDirty = true;
    });

// Gradient toggle
document
    .getElementById("gradient-toggle")
    .addEventListener("change", (e) => {
        config.gradientMap = e.target.checked;
        staticBaseDirty = true;
        document.getElementById("gradient-controls").style.display =
            config.gradientMap ? "flex" : "none";
    });
document
    .getElementById("add-stop-btn")
    .addEventListener("click", () => {
        config.gradientStops.push("#ffffff");
        renderGradientStops();
    });

// Sprite preset & wave type
document
    .getElementById("sprite-preset")
    .addEventListener("change", (e) => {
        config.sprite = e.target.value;
        document.getElementById("wave-type-row").style.display =
            config.sprite === "wave" ? "flex" : "none";
    });
document
    .getElementById("wave-type-select")
    .addEventListener("change", (e) => {
        config.spriteSubtype = e.target.value;
    });

// Light mode
document
    .getElementById("light-mode-toggle")
    .addEventListener("change", (e) => {
        config.lightMode = e.target.checked;
        staticBaseDirty = true;
        document.body.classList.toggle(
            "light-mode",
            config.lightMode,
        );
    });
//#endregion
//#region Boot — default texture & engine start
// ═══════════════════════════════════════════════════════════════════════
// ── Boot — Wikimedia felid or engine fallback ───────────────────────────
// ═══════════════════════════════════════════════════════════════════════
const DEFAULT_IMAGES = [
    'https://upload.wikimedia.org/wikipedia/commons/thumb/7/73/Panthera_tigris_tigris_edit2.jpg/800px-Panthera_tigris_tigris_edit2.jpg',
    'https://upload.wikimedia.org/wikipedia/commons/thumb/0/0a/Canadian_lynx_by_Keith_Williams.jpg/800px-Canadian_lynx_by_Keith_Williams.jpg',
    'https://upload.wikimedia.org/wikipedia/commons/thumb/f/f7/Ocelot_%28Leopardus_pardalis%29-8.jpg/800px-Ocelot_%28Leopardus_pardalis%29-8.jpg',
    'https://upload.wikimedia.org/wikipedia/commons/thumb/e/e5/Serval_%28Leptailurus_serval%29_%2814034520905%29.jpg/800px-Serval_%28Leptailurus_serval%29_%2814034520905%29.jpg',
    'https://upload.wikimedia.org/wikipedia/commons/thumb/f/fa/Sisters_grooming_%289997099123%29.jpg/800px-Sisters_grooming_%289997099123%29.jpg',
    'https://upload.wikimedia.org/wikipedia/commons/thumb/f/f4/%27Lex%27_%285628421693%29.jpg/800px-%27Lex%27_%285628421693%29.jpg',
    'https://upload.wikimedia.org/wikipedia/commons/thumb/5/5f/Cougar.jpg/800px-Cougar.jpg',
];
updatePaletteRgb();
renderGradientStops();
function bootEngine() { initGrid(); requestAnimationFrame(loop); }
(function loadDefaultImage() {
    const url = DEFAULT_IMAGES[Math.floor(Math.random() * DEFAULT_IMAGES.length)];
    fetch(url).then(r => {
        if (!r.ok) throw new Error(r.status);
        return r.blob();
    }).then(blob => {
        const objUrl = URL.createObjectURL(blob);
        const img = new Image();
        img.onload = () => {
            imageAspectRatio = img.width / img.height;
            const tmp = document.createElement('canvas');
            tmp.width = img.width;
            tmp.height = img.height;
            tmp.getContext('2d').drawImage(img, 0, 0);
            imageBuffer = tmp.getContext('2d').getImageData(0, 0, img.width, img.height);
            URL.revokeObjectURL(objUrl);
            bootEngine();
        };
        img.onerror = () => { URL.revokeObjectURL(objUrl); bootEngine(); };
        img.src = objUrl;
    }).catch(() => bootEngine());
})();
//#endregion
