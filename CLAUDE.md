# kiteracer — ASCII animation tool

## Stack
- Vanilla JS, Canvas 2D API, classic `<script src>` (no bundler)
- No external libraries (no GSAP, no WebGL)
- Font: Geist Mono (Google Fonts CDN)
- Easing: manual easeOutExpo, smoothStep

## Rules
- All easing is hand-rolled — no animation libraries
- Canvas 2D only — no WebGL
- Keep each file under `src/` under 800 lines
- Commit after each working change

## Layout
- Entry: `src/index.html` (Netlify publishes `src/`; `/kiteracer.html` redirects to `/`)
- Styles: `src/css/app.css`
- Scripts: `src/js/config.js`, `math.js`, `cursor.js`, `field.js`, `cell.js`, `engine.js`, `ui.js`, `export.js`
- HTML player export fetches the engine modules and inlines them into one file

## Current state
- Entry: ship and open `src/index.html`
- Shipped: image import; first load fetches a random felid texture
  from Wikimedia Commons (remote boot, falls back to engine if fetch fails)
- Palettes: standalone presets plus optgrouped sets (Ghostty, Zed, Cursor)
- Dither: pixel modes (blue noise variants, Bayer, IGN, halftone, etc.) and
  many glyph character sets; gradient map with stops; UUID crystallization
- Motion: sprite presets (scan / pulse / wave + flow), animation speed slider
  (smooth speed ramp)
- Cursor: interaction modes, pin, trails/echoes, field controls; mouse radius,
  spread, interaction scale, softness
- Theme: light mode toggle (surface inversion)
- Panel: closed / peek / open; pin or `\` to lock; canvas-first default
- Export: PNG download; self-contained HTML player export (embedded palette + config)
