zone: src/sim
size: M
files: src/sim/grab.ts, src/sim/grab.test.ts
# A grab's cast passes through every entity the grabber may not hold: a dog grabs a hidden cat through the box or the curtain

`ahead` in grab.ts hands Rapier's shape cast the predicate `holdable`, which is false for every entity the side rule refuses. Rapier skips a collider its predicate refuses rather than stopping at it, so a dog's 1.5 m reach passes through props (the sofa, a box, the curtain, a barricade, a crate) and a cat's passes through dogs and other cats. Only statics and doors (no entity) stop it.

Measured on the country house (this review's script, `grab` then the lunge's 12 steps): the dog west of the yard's cardboard box (prop 3, x 9.55–10.35) and a cat hidden in the slot between the box and the shed at x 10.62: the lunge's end sends `claim {hold: true}` on the cat, `hidden` true. The same with the curtain (prop 1) between them in the bedroom: a claim. A static of the box's size in the box's place: no claim.

GAME.md, Hiding spots: "Dogs can't fit in, but can wreck the spot: flip the box, pull the curtain, shove the sofa." The wreck is the counter and its noise the cat's warning; a grab through the box skips both. ADR 0010 derives "hidden" from the pose alone and says a dog's client "only fails to see it"; with the cast passing through, the dog's client reaches it too. The owner does not move: the side rule stays `mayHold` at its two call sites (ADR 0009). What changes is the cast: it stops at the first solid it meets, and that hit alone is tested with `mayHold` and `locked`; a refused first hit is no claim.

## DoD
- The forward cast stops at the first non-sensor collider (a static, a door, any entity); only that hit can become a claim, and only if `mayHold` and `locked` allow it.
- A dog against the yard box, or the curtain, with a cat in the slot behind sends no claim; after it has shoved the box a metre aside (its 100 kg push), the same lunge claims the cat.
- `mayHold` is untouched and not copied.

## Acceptance
- Claims through the yard box and through the curtain: 1 → 0 each; the dog's claim on a cat in the open and a cat's on a fish in the open: still 1 (grab-toss-wiggle-hit at 3 clients and the round at 3 and 8 clients pass 3 of 3, ADR 0009 signs 0, doomed claims 0).

## Test
- A grab test in src/sim: a dog, the yard box, a hidden cat behind it: no claim; the box moved 1 m aside: a claim. Red without the fix (today the first case yields a claim).
