# Done

- 01 toolchain: `npm run gates` exit 0 in 3.07 s on the empty suite; a planted `import 'three'` in src/sim turns it red. Batch A, 2026-09-24.
- 02 Rapier world: a crate dropped from 2 m rests at y = 0.4999 by step 120 under plain node. Batch A, 2026-09-24.
- 03 character movement: a 2 s walk covers 7.9995 of 8 m, a sprint 13.9997 of 14 m; a crate is pushed 3.38 m. Batch A, 2026-09-24.
- 04 ownership fold: all five fold rules hold, each test red with its rule removed (one re-checked by the Producer). Batch A, 2026-09-24.
- 05 grab, carry, throw: 4.8e-5 m off the anchor over 3 m; a 6 m/s throw touches down 3.55 m away; a grabbed character follows within 4.8e-5 m. Batch A, 2026-09-24.
- 06 relay room module: 3 members × 100 messages in the same order and seq, each sender included; `left` names the next host; state is exactly {members, seq}. Batch B+D, 2026-09-24.
- 07 codec, client, ticks: a shoved crate shows on the other client 91–109 ms later (150 allowed); a resting crate sends 0 ticks/s. Batch B+D, 2026-09-24.
- 08 join and host migration: a mid-run joiner is deep-equal to the host 3–7 ms after connect (500 allowed), also after a departure before the join; the next host answers the next joiner in 2 ms. Batch B+D, 2026-09-24.
- 11 headless runner: 2 clients × 20 s exit 0, moving 0.084 m (0.25), resting 0.000 m (0.02); ticks disabled: 11.11 m, exit 1. Moving is judged against the owner's path within one tick of 100 ms back (the exact −100 ms number, 0.64 m at a grab snap, is printed, not judged). Producer: 14 of 14 runs passed. Batch B+D, 2026-09-24.
- 12 gates game: `npm run gates` exit 0 in 25.6 s with a 10 s two-client game (Producer: 26.9 s); it fails with the game. Batch B+D, 2026-09-24.
- 13 touch claims: a pushed crate passes 0.2 m in 245–422 ms on both clients; at most 1.95 claims/s; a rejected claim is back on the owner's pose in one frame. Batch B+D, 2026-09-24.
