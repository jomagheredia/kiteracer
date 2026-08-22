# kiteracer design

Monochrome instrument around a black stage. Precise. Quiet. Alive.

## Users

Solo creator, full attention on the canvas. Controls are opened on purpose, not left on screen.

## Principles

1. **The canvas is the product.** Default state is no visible panel.
2. **Reveal on intent.** Hover peeks; pin locks open. Never intrudes.
3. **Monochrome discipline.** UI colors are tints of the canvas palette. No independent accent.
4. **Density without clutter.** Compact controls, quiet labels, grouped by function.
5. **Same material.** Geist Mono, shared CSS variables, the same language as the cells.

Anti-references: glassmorphism, neon-accent dark UIs, mobile settings drawers.

## Color

| Token | Night | Day |
| --- | --- | --- |
| void / page | `#080808` | `#f0f0ee` |
| panel | `rgba(9,9,9,0.97)` | `rgba(242,242,240,0.98)` |
| rail / border | `#1c1c1c` | `#d0d0ce` |
| ink | `#f0f0ee` | `#080808` |
| tame / accent | `#363636` | `#b4b4b2` |
| stage | `#000000` | `#000000` |

Mapped in CSS as `--bg`, `--ui-bg`, `--border`, `--text`, `--accent`. Light mode inverts surfaces, not the stage.

## Type

Geist Mono throughout.

- Wordmark: 10px, tracking 0.22em, 40% ink
- Section markers: 10px, uppercase, tracking 0.18em
- Control labels: 10px, uppercase, tracking 0.1em
- Data / selects: 9px, tabular nums on sliders

## Panel states

| State | Body class | Behavior |
| --- | --- | --- |
| closed | — | Panel off-screen. Pin sits at the left of the header row. Trigger strip is hot. |
| peek | `panel-peek` | Hover/focus overlay. Trigger disabled. Pin moves to the panel header right. |
| open | `panel-open` | Locked. Stage is padded left by 252px so the canvas recenters. |

Keyboard: `\` toggles open/closed. Escape returns to closed. Enter/Space on the trigger strip toggles open.

Coarse pointers skip peek: tap the edge or pin to open; tap the stage to dismiss.

`prefers-reduced-motion` kills panel and theme transitions.

## Stage

No drop shadow. 1px border using `--border`. The grid is the object; the page is the void around it.

## Controls

Sliders are a 1px rail and a 7px thumb. Selects are underline-only. Toggles are 30×17 tracks. Ghost and import buttons are square-cornered, full-width, uppercase.

Focus rings are 1px `--text` outlines. Hover raises opacity; it does not recolor.

## Export

PNG captures the stage with the panel forced closed. The HTML player is a single file: live palette + config + engine sources, no panel.

## Files

Tokens also live in `.impeccable/design.json`. Implementation: `src/css/app.css`, `src/js/ui.js`.
