# kiteracer

ASCII animation lab. Vanilla JS and Canvas 2D — no bundler, no animation libraries.

Open [`src/index.html`](src/index.html) in a browser, or serve `src/` (Netlify publishes that folder). Hover the left edge to peek the panel; click the pin or press `\` to lock it open.

HTML player export fetches the engine files, so run it from a local static server or a deploy — not from `file://`.

## Stack

- Classic `<script src>` files under `src/js/`
- Canvas 2D only
- Geist Mono from Google Fonts
- Hand-rolled easing (`easeOutExpo`, `smoothStep`)

## Export

- **PNG** — current frame
- **HTML player** — one-file snapshot with the live palette, config, and texture

## Project rules

Each file under `src/` stays under 800 lines. No external JS libraries. No WebGL.
