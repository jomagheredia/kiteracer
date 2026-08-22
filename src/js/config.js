const PALETTES = {
    original:         { bg:"#080808", base:"#141412", sprite:"#7a7a76", cursor:"#f0f0ee", stops:["#080808","#7a7a76","#f0f0ee"] },
    monochrome:       { bg:"#000000", base:"#1a1a1a", sprite:"#444444", cursor:"#ffffff", stops:["#000000","#444444","#ffffff"] },
    nord:             { bg:"#2e3440", base:"#3b4252", sprite:"#88c0d0", cursor:"#eceff4", stops:["#2e3440","#88c0d0","#eceff4"] },
    ghostty:          { bg:"#1a1b26", base:"#24283b", sprite:"#bb9af7", cursor:"#c0caf5", stops:["#1a1b26","#bb9af7","#c0caf5"] },
    ghosttyDracula:   { bg:"#282a36", base:"#44475a", sprite:"#bd93f9", cursor:"#f8f8f2", stops:["#282a36","#bd93f9","#f8f8f2"] },
    ghosttyCatppuccin:{ bg:"#1e1e2e", base:"#313244", sprite:"#cba6f7", cursor:"#cdd6f4", stops:["#1e1e2e","#cba6f7","#cdd6f4"] },
    zed:              { bg:"#18181b", base:"#27272a", sprite:"#3b82f6", cursor:"#e2e8f0", stops:["#18181b","#3b82f6","#e2e8f0"] },
    zedRose:          { bg:"#191724", base:"#26233a", sprite:"#c4a7e7", cursor:"#e0def4", stops:["#191724","#c4a7e7","#e0def4"] },
    zedAndromeda:     { bg:"#23262e", base:"#2b2d37", sprite:"#ee5d43", cursor:"#d5ced9", stops:["#23262e","#ee5d43","#d5ced9"] },
    cursorDark:       { bg:"#1e1e1e", base:"#2d2d2d", sprite:"#569cd6", cursor:"#d4d4d4", stops:["#1e1e1e","#569cd6","#d4d4d4"] },
    cursorEmber:      { bg:"#1c1917", base:"#292524", sprite:"#d97706", cursor:"#fef3c7", stops:["#1c1917","#d97706","#fef3c7"] },
};

const DITHER_SETS = {
    characters:      " 0123456789ABCDEF!@#$%&",
    classic:         " .:-=+*#%@",
    unicode:         " ·∘∙○●◉■█",
    redacted:        " ░▒▓█",
    squares:         " ▫▪□■◼",
    circles:         " ◌○◎●⬤",
    crt:             " ▂▃▄▅▆▇█",
    organic:         " .,;~∞❀✿",
    stars:           " ·✧✦★✶✹",
    verticalLines:   " ╎│╏┃║",
    horizontalLines: " ╌─╍━═",
    verticalJitter:  " ¡|ǁ‖⦀",
    horizontalJitter:" -–—═≡",
    waffle:          " ⠁⠃⠇⠏⠟⠿",
    porthole:        " ·◦○◎◉●",
    zigzag:          " ~∽≈⋰╳",
    eyes:            " ◌◍◎⊙⦿",
    blueNoiseish:    " ░▒▞▚▓█",
    diagonals:       " ╱╲╳▞▚▓",
};
const WAKE_SET = "·-_=~";
const HEX_SET = "0123456789abcdef-";
let currentPalette = PALETTES.original;
let paletteRgb = {};
function updatePaletteRgb() {
    paletteRgb.bg     = hexToRgb(currentPalette.bg);
    paletteRgb.base   = hexToRgb(currentPalette.base);
    paletteRgb.sprite = hexToRgb(currentPalette.sprite);
    paletteRgb.cursor = hexToRgb(currentPalette.cursor);
    paletteRgb.black  = [0, 0, 0];
}
const config = {
    gamma:1.2, bgIntensity:1.0, sprite:"none", spriteSubtype:"fluid", spriteSize:180,
    cellSize:4, cellHeightRatio:1.6, influenceRadius:200, cursorInfluence:1.0,
    interactionCharScale:3.0, spreadFactor:0.4, cursorSoftness:2.0, cursorMode:"default",
    uuidCount:4, seed:0, lightMode:false, gradientMap:false,
    gradientStops:[...PALETTES.original.stops], gradientPhase:0,
    dither:"classic", glyphDitherEnabled:false,
    ditherMode:"blueNoise", ditherEnabled:false, ditherStrength:1.0,
    animationSpeed:1.0, cursorLines:10,
    // Shape
    cursorEllipseX:1.0, cursorEllipseY:1.0, cursorRotation:0, cursorDeadZone:0,
    // Cone
    cursorConeAngle:360,
    // Trail / temporal
    cursorTrailDecay:"linear", cursorEchoCount:0, cursorEchoDecay:0.6,
    cursorIdleBloom:0,
    // Field distortion
    cursorNoiseWarp:0, cursorVortexStrength:0,
    // New motion params
    cursorSpiralTightness:2.0, shockwaveActive:false,
    // Activation
    cursorActivationCurve:"linear", cursorLinePhase:0,
    // Pin
    cursorPinned:false, cursorPinX:0, cursorPinY:0,
};
