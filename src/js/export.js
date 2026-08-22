//#region Export PNG & self-contained player HTML
// ═══════════════════════════════════════════════════════════════════════
// ── Export helpers & download handlers ────────────────────────────────
// ═══════════════════════════════════════════════════════════════════════
function exportTimestamp() {
    const d = new Date();
    const pad = n => String(n).padStart(2, '0');
    return `${d.getFullYear()}${pad(d.getMonth()+1)}${pad(d.getDate())}-${pad(d.getHours())}${pad(d.getMinutes())}${pad(d.getSeconds())}`;
}

function downloadBlob(blob, filename) {
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = filename;
    a.click();
    URL.revokeObjectURL(a.href);
}

const PLAYER_SOURCES = [
    'js/math.js',
    'js/cursor.js',
    'js/field.js',
    'js/cell.js',
    'js/engine.js',
];

// Export PNG — hide the panel so it does not appear in the frame
document.getElementById('export-png-btn').addEventListener('click', () => {
    const prev = panelMode;
    setPanelMode('closed');
    requestAnimationFrame(() => {
        canvas.toBlob(blob => {
            downloadBlob(blob, `kiteracer-${exportTimestamp()}.png`);
            setPanelMode(prev);
        }, 'image/png');
    });
});

// Export Code — fetch live engine modules and inline them into one HTML file
document.getElementById('export-code-btn').addEventListener('click', async () => {
    let imageDataURL = 'null';
    if (imageBuffer) {
        const tmp = document.createElement('canvas');
        tmp.width = imageBuffer.width; tmp.height = imageBuffer.height;
        tmp.getContext('2d').putImageData(imageBuffer, 0, 0);
        imageDataURL = "'" + tmp.toDataURL('image/png') + "'";
    }
    let paletteKey = 'original';
    for (const [k, v] of Object.entries(PALETTES)) {
        if (v === currentPalette) { paletteKey = k; break; }
    }
    const sources = await Promise.all(
        PLAYER_SOURCES.map(src => fetch(src).then(r => {
            if (!r.ok) throw new Error(src + ' ' + r.status);
            return r.text();
        }))
    );
    const sc = '<' + '/script>';
    const html = '<!DOCTYPE html>\n<html lang="en"><head><meta charset="UTF-8">'
        + '<meta name="viewport" content="width=device-width,initial-scale=1.0">'
        + '<title>Kiteracer Player</title>'
        + '<link href="https://fonts.googleapis.com/css2?family=Geist+Mono:wght@300;400&display=swap" rel="stylesheet">'
        + '<style>body,html{margin:0;padding:0;width:100%;height:100%;background:'
        + (config.lightMode ? '#f0f0ee' : currentPalette.bg)
        + ";font-family:'Geist Mono',monospace;overflow:hidden;display:flex;align-items:center;justify-content:center}"
        + 'canvas{display:block;border:1px solid #1c1c1c;background:#000}</style></head>'
        + '<body' + (config.lightMode ? ' class="light-mode"' : '') + '>'
        + '<canvas id="main-canvas"></canvas>'
        + '<script>const PALETTES=' + JSON.stringify(PALETTES) + ';'
        + 'const DITHER_SETS=' + JSON.stringify(DITHER_SETS) + ';'
        + 'const WAKE_SET=' + JSON.stringify(WAKE_SET) + ';'
        + 'const HEX_SET=' + JSON.stringify(HEX_SET) + ';'
        + 'let currentPalette=PALETTES[' + JSON.stringify(paletteKey) + '];'
        + 'let paletteRgb={};'
        + 'function updatePaletteRgb(){paletteRgb.bg=hexToRgb(currentPalette.bg);'
        + 'paletteRgb.base=hexToRgb(currentPalette.base);'
        + 'paletteRgb.sprite=hexToRgb(currentPalette.sprite);'
        + 'paletteRgb.cursor=hexToRgb(currentPalette.cursor);'
        + 'paletteRgb.black=[0,0,0];}'
        + 'const config=' + JSON.stringify(config) + ';' + sc
        + '<script>' + sources.join('\n') + sc
        + '<script>'
        + 'updatePaletteRgb();'
        + 'imageAspectRatio=' + JSON.stringify(imageAspectRatio) + ';'
        + 'applySeed();'
        + 'const embeddedImage=' + imageDataURL + ';'
        + 'if(embeddedImage){const img=new Image();img.onload=()=>{const tmp=document.createElement("canvas");'
        + 'tmp.width=img.width;tmp.height=img.height;tmp.getContext("2d").drawImage(img,0,0);'
        + 'imageBuffer=tmp.getContext("2d").getImageData(0,0,img.width,img.height);'
        + 'initGrid();requestAnimationFrame(loop)};img.src=embeddedImage}'
        + 'else{initGrid();requestAnimationFrame(loop)}'
        + 'addEventListener("mousemove",e=>{mouse.x=e.clientX;mouse.y=e.clientY});'
        + 'addEventListener("resize",initGrid);' + sc
        + '</body></html>';
    const blob = new Blob([html], { type: 'text/html' });
    downloadBlob(blob, `kiteracer-player-${exportTimestamp()}.html`);
});
//#endregion
