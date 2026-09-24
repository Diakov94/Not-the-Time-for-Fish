zone: src/sim
size: M
files: src/sim/messages.ts, src/sim/entities.ts, src/sim/mines.ts, src/sim/mines.test.ts, src/sim/world.ts, src/sim/events.ts
# The water bomb: the dogs' second mine type

GAME.md, Mines: MVP has the firecracker; water bombs are release scope, TBD. The rule here is the Architect's assumption, stated so a playtest can refute it: a water bomb soaks instead of stunning. A soaked cat cannot be quiet: for 20 s its steps ping at a dog's loudness whatever its mode. The message union is the same batch's as card 128.

## DoD
- `spawn` of a mine carries `variant` (firecracker or water); a dog's hand holds them in order firecracker, firecracker, water (the count per resupply is a knob row, card 148; until then 2 + 1); the HUD's next-mine word is card 146's, the look card 144's.
- A cat on a water bomb: no stun, no launch; wet for 20 s (its own client's fact, a query for the HUD and render); its steps ping at the dog's loudness while wet, sneaking or not; the splash is a `blast` with the variant, loud 0.6, and pushes nothing.
- Defusing and the whisker cue work the same for both variants.

## Acceptance
- Headless mines-and-traps: a cat over a water bomb: stun 0 s (firecracker 3), wet 20.0 s, 4 pings in 8 m of sneaking (before 0); a dog's third plant is a water bomb (variant named in the dump).

## Test
- A sim test: wet steps ping while sneaking and stop at 20 s; red without the rule.
