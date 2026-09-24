zone: src/sim
size: M
# The Rapier world in Node

`init`, `createWorld(level)` with the Prototype room (floor, four walls, ten crates), a fixed 60 Hz `step(dt)` with an accumulator (time is passed in; the sim never reads a clock), and the entity table in `src/sim/entities.ts` (ADR 0004).

## DoD
- The sim runs under plain `node`; if `@dimforge/rapier3d-compat` cannot initialise there, ADR 0003 is refuted: say so and stop.

## Acceptance
- A crate dropped from 2 m rests at y = 0.50 ± 0.01 within 120 steps.
- The zone greps print nothing.

## Test
- One Vitest test for the drop, under Node.
