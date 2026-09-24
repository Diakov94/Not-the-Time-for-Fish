zone: src/sim
size: S
files: src/sim/ownership.ts, src/sim/grab.ts, src/sim/grab.test.ts, src/sim/ownership.test.ts
# A cat carries and throws any prop: the 60 kg sofa, the 25 kg armchair and the 20 kg barricade a dog is meant to barge

`mayHold(cat, 'prop')` is true for every content prop; nothing in the sim reads `prop.mass` at a grab. Measured (this review's script, the house's props in the prototype room): a cat facing the sofa (60 kg), the barricade (20 kg) or an armchair (25 kg) presses grab: a hold claim leaves and the fold accepts it (`{owner: cat, held: true}`); the throw sends it at 6 m/s like a crate.

GAME.md, Movement asymmetry, and `SPEED.cat.push = 0.1`: "a cat moves light props only"; country-house.ts: "Barricades a dog barges and a cat cannot move". So a cat carries the barricade out of the bedroom doorway, walks the sofa across the room with its hiding spot on its back, and throws an armchair at a dog to free a teammate (`hit` counts any thrown prop). The sides lose their asymmetry on exactly the props the level places for it.

The owner stays ADR 0009's one predicate at its two call sites; the fold reads identities only, so the mass reaches it as an identity (the entity's `prop` index is already on the row and the level is the sim's; or a `heavy` identity set at spawn). The cap is a design number: the fish is 1 kg, a chair 5, the bin 3, a stool 4, a crate 10, the wheelbarrow 15, the boxes 15, the barricades 20. Architect's assumption for the Producer: a cat carries up to 5 kg, the "light props"; the crate (10 kg) then stays a push, which is what the yard's crate stack is for.

## DoD
- One predicate decides, in the fold and before the cast: a cat's hold claim on a prop above the cap is refused by the fold and never sent by `grab`; touch claims are unchanged (a cat still shoves at 0.1 kg of push).
- The cap is one named constant beside `mayHold`; content is untouched.

## Acceptance
- Hold claims accepted on the sofa, the barricade, an armchair: 3 of 3 → 0 of 3; on the fish, a chair, a stool, the bin: 4 of 4 stay; doomed claims 0 in the round scenario at 3 and 8 clients.

## Test
- An ownership test: the fold refuses a cat's hold on a 20 kg prop and accepts one on a 5 kg prop; a grab test: no claim leaves for the barricade. Red without the fix.
