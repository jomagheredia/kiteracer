# kiteracer — ASCII animation tool

## Stack
- Single HTML file, vanilla JS, Canvas 2D API
- No external libraries (no GSAP, no WebGL)
- Font: Geist Mono (Google Fonts CDN)
- Easing: manual easeOutExpo, smoothStep

## Rules
- Everything stays in ONE self-contained HTML file
- All easing is hand-rolled — no animation libraries
- Canvas 2D only — no WebGL
- Keep file under 800 lines; if it grows, organize into
  clearly separated <script> blocks with comment banners
- Commit after each working change

## Current state
- Entry: ship and open `src/index.html` (Netlify publishes `src/`; `/kiteracer.html` redirects to `/`).
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
- Export: PNG download; self-contained HTML player export (embedded palette + config)
- Pending: UI/UX polish