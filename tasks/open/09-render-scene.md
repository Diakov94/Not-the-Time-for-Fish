zone: src/render
size: L
# The three.js scene

A view of the entity table: one `Object3D` per entity keyed by net id, placeholder geometry per kind, the third-person camera, frame interpolation between the sim's previous and current poses. Render holds no game fact (ADR 0003).

## DoD
- Every pose drawn comes from a Rapier body; every entity drawn comes from the entity table.

## Acceptance
- Two tabs on `vite dev` plus `npm run relay`, 2 characters and 10 crates: at least 60 FPS in Chrome's frame stats.
- A remote crate moves without visible 20 Hz stepping.

## Test
- None beyond the gates: the numbers are measured in the browser and named in the report.
