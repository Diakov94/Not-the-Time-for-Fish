zone: src/render
size: S
files: src/render/view.ts, src/render/looks.ts
# The look of an entity that left play is removed from the scene but never freed from the GPU

`draw` removes the Object3D of an entity that left the entity table (a secured fish, a blasted mine, a sprung trap, a picked bag, every character at the next prep) and of a character whose look changed, and drops it from `objects`; nothing disposes its geometries and materials, and every look is built from geometries of its own (`ball`, `rod`, `cone`, `block`, `geometry` make a new BufferGeometry each). Three.js keeps a WebGL buffer per attribute until `dispose`. Measured in a two-tab session with WebGL's `createBuffer` and `deleteBuffer` counted: 1423 buffers alive after round 1's spawn, 1482 after round 2's, 0 deleted in the session (created = alive at every reading); the +59 are the two new characters only, because the props and fish of round 2 reuse nothing either and upload again when first drawn. At 8 players a round leaves about 30 buffers per character and 3 per prop part behind, so a session of two matches at 8 grows by roughly 2 000 buffers and never shrinks. The juice, the pings and the markers already dispose what they remove; the entity looks do not.

## DoD
- When `draw` removes an entity's look (gone from the table, or rebuilt for a new look) it disposes every geometry and every material the look owns that no other look shares (the palette materials of `material()` are shared and stay).

## Acceptance
- Buffers alive after round 2's prep equal those after round 1's prep within the count of buffers the frustum newly drew (name both; before +59 with 0 deleted), and `deleteBuffer` is called at least once per removed look.

## Test
- None: the buffer counts are the check.
