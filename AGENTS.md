# AGENTS.md

kiteracer is a vanilla-JS ASCII animation tool. See `README.md`, `CLAUDE.md`, `DESIGN.md`, and `PRODUCT.md` for product/design context and project rules.

## Cursor Cloud specific instructions

This repo is a dependency-free static site: no bundler, no `package.json`/lockfile, no build step, and no automated test suite. There is nothing to install — the startup update script is intentionally a no-op.

- Run (dev): serve the `src/` folder with any static server, e.g. `python3 -m http.server 8000` from `src/`, then open `http://localhost:8000/index.html`. Python 3 is preinstalled.
- Do not open the app via `file://`. The "Export Code" (HTML player) feature `fetch()`es the engine files, which fails on `file://`; it must be served over HTTP. On first load the app also `fetch()`es a random felid texture from Wikimedia Commons and falls back to the procedural engine field if that network request fails, so the canvas still animates offline.
- Lint: there is no linter. The only checks are the shell steps in `.github/workflows/checks.yml` (each `src/` file must be under 800 lines; no remote `<script src>` except Google Fonts; no WebGL / Canvas 2D only). Run those same commands locally to reproduce CI.
- Build: none. Netlify publishes `src/` directly (see `netlify.toml`).
