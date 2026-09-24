zone: src/art
size: M
files: src/art/patterns.ts (new), src/art/decals.ts (new), src/art/themes/country-house.ts
# Procedural patterns and SVG decals, normalized to the palette

GAME.md, Art Direction, step 3: detail by code, procedural patterns (embroidery, rugs, tiles) generated on a canvas, SVG decals; no raster in git. ADR 0011 puts them in `src/art` for themes, props and characters to use.

## DoD
- `patterns.ts`: tileable textures drawn on a canvas at load (an embroidery band, a wall rug, kitchen tiles, wood grain), every colour a palette slot, each generated once and cached.
- `decals.ts`: an SVG string to a texture, for a character's or a prop's marking.
- The proof on the country house's theme (card 109 creates it; land after it or in the same batch): the sofa's cloth, a rug on the bedroom wall, the kitchen's tiles.

## Acceptance
- Generation at load ≤ 50 ms for all patterns together (name the number); three house parts show a pattern in a screenshot; `git ls-files | grep -Ec '\.(png|jpg|webp)$'` → 0.

## Test
- None; the load number and the screenshot are the check.
