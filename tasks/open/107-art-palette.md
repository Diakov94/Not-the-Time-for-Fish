zone: src/art
size: M
files: src/art/palette.ts (new), src/render/level.ts, src/render/juice.ts, src/render/senses.ts, src/render/markers.ts, src/render/work.ts
# The palette: every colour a named slot, the team pair with colour-blind variants

ADR 0011: the palette is one file in `src/art`; a colour literal outside it is rejected. GAME.md, Art Direction: warm, homey colours, flat shading. GAME.md, Accessibility: colour-blind-friendly team colours.

## DoD
- `src/art/palette.ts`: named slots for the home range (walls, wood, cloth, metal, glass, greenery, ink, gold), the kinds, the overlays, and the team pair with a variant per common deficiency (deuteranopia, protanopia, tritanopia); `material(slot)` flat-shaded and cached moves here from render/level.ts.
- The literals in render's level, juice, senses, markers and work become slots; render/looks.ts is left alone (its placeholder colours leave with the characters in card 110).

## Acceptance
- `grep -cE '0x[0-9a-f]{6}' src/render/level.ts src/render/juice.ts src/render/senses.ts src/render/markers.ts src/render/work.ts` → 0 (before: about 60).
- The team pair's luminance contrast in every variant ≥ 3:1 under a simulated deficiency (name the four numbers and the simulation used).

## Test
- None: a move and a table; the grep and the numbers are the check.
