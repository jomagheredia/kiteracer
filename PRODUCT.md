# kiteracer

ASCII animation lab. A darkened canvas is the product; a monochrome instrument panel is how you steer it.

## Who it is for

A solo creator or developer who wants to turn a texture into a living glyph field — dither, palette, cursor, export — without a build step or a framework.

## What it does

- Map an image (or a procedural field) onto a glyph grid
- Dither with pixel modes and character sets; optional gradient map
- Drive motion with sprite presets and a cursor field (warp, trails, pin)
- Export a PNG still or a self-contained HTML player that embeds the live config

## Job to be done

Open the stage, import or accept the boot texture, tune until it feels alive, take a still or a player, close the panel.

## Principles

1. The canvas is the product. Default state is no visible panel.
2. Reveal on intent — peek on hover, pin to lock open.
3. Same material as the cells: Geist Mono, palette tints, no decorative chrome.
