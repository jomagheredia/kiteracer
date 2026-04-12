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
- Working: image import, 5 palettes, 5 dither sets,
  sprite presets (scan/pulse/wave), UUID crystallization,
  gradient mapping, mouse interaction with spread/scale
- Pending: animation speed control, export (image + code),
  UI/UX polish