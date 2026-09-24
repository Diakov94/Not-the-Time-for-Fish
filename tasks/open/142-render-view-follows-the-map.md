zone: src/render
size: M
files: src/render/view.ts, src/render/level.ts
# The view follows the round's map

Card 128 rebuilds the world at prep from the table's map; the view of card 09 draws the level once at creation. ADR 0003: render is a view of the sim; the level it draws is `sim.level`.

## DoD
- When `sim.level` changes, the view drops the old level's meshes and draws the new one through its theme (card 109); the doors' and debris' index arrays are rebuilt; the shader compile-ahead of card 57 runs again for the new theme.

## Acceptance
- Switching the house to the prototype room in two tabs redraws within 1 frame of prep with 0 stale meshes (the scene's children = the new level's parts + characters + overlays, counted).

## Test
- None: the count is the check.
