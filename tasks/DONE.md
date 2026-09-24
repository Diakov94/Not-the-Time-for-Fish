# Done

- 01 toolchain: `npm run gates` exit 0 in 3.07 s on the empty suite; a planted `import 'three'` in src/sim turns it red. Batch A, 2026-09-24.
- 02 Rapier world: a crate dropped from 2 m rests at y = 0.4999 by step 120 under plain node. Batch A, 2026-09-24.
- 03 character movement: a 2 s walk covers 7.9995 of 8 m, a sprint 13.9997 of 14 m; a crate is pushed 3.38 m. Batch A, 2026-09-24.
- 04 ownership fold: all five fold rules hold, each test red with its rule removed (one re-checked by the Producer). Batch A, 2026-09-24.
- 05 grab, carry, throw: 4.8e-5 m off the anchor over 3 m; a 6 m/s throw touches down 3.55 m away; a grabbed character follows within 4.8e-5 m. Batch A, 2026-09-24.
