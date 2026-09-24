zone: src/art
size: M
files: src/art/themes.ts (new), src/art/themes/country-house.ts (new), src/render/level.ts
# A theme per map, found by its path; the house's shapes move out of render

ADR 0011: a label's shape in a map is the map's theme, one file under `src/art/themes/` keyed by the map's file name and found by a glob, so five map themes never touch one index. render/level.ts keeps the drawing loop and loses its tables.

## DoD
- `themes.ts`: `themeOf(name)` over a Vite glob of `themes/*.ts`; a theme is a record label → shape builder; a label with no shape is a palette box (today's rule); an unknown map name gives the empty theme, no throw.
- `themes/country-house.ts`: the `SHAPES` table of render/level.ts, unchanged in output; `shaped(label, box)` stays exported from render/level.ts and delegates, so render/looks.ts is untouched.
- render/level.ts draws statics, doors, points and volumes through the theme of the map's name (the name the app took in card 101).

## Acceptance
- The house draws the same: the scene's mesh count before and after equal (name it); `themeOf('nope')` draws every label as a box with 0 errors in the console.

## Test
- None: a move.
