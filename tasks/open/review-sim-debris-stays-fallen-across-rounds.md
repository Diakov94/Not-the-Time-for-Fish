zone: src/sim
size: S
files: src/sim/round.ts, src/sim/world.ts, src/sim/round.test.ts
# Round 2 starts with round 1's debris on the floor: `phase prep` respawns the props, the doors and the characters, not the 26 local plates, cups, vases and pots

ADR 0007: a round's entities are spawned at prep and dropped at the next prep. `turned` resets the doors (`barged`, the table's `doors`) and the host respawns the synced props at their content poses, but the debris bodies (`sim.debris`, built once by `build`) move back only when the map changes (`follow`). So the kitchen's six plates and four cups knocked off the counter in round 1 lie on the floor when the sides swap, and the vase on the coffee table is on the floor while the table returns to its pose. The noise a cat's first knock makes in round 2 is spent before the round starts: the evidence Pillar 1 counts on ("every plate on the floor is a clue") is stale, and the two rounds of a match differ in what is left to knock over.

Owner: the same place that resets the doors at prep, `turned`, from content's `prop.p`; no message, since every client holds the same content.

## DoD
- At `phase prep` every debris body returns to its content pose and rests, on every client; nothing else changes.

## Acceptance
- After a round of knocking and the next prep, debris at their content pose: the measured count today → 26 of 26.

## Test
- A round test: a plate pushed off the counter in round 1 is back on it after `phase prep` of round 2. Red without the fix.
