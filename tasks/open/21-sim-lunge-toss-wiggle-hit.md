zone: src/sim
size: L
# Lunge-grab, toss, wiggle-free, hit-to-free

GAME.md, Grab & carry: a dog's lunge-grab has a short cooldown; the carrying dog walks slowly (card 22) and can't sniff or plant; it can toss the cat a short distance, into the kennel hatch, and a physics throw can miss. The cat wiggles free after ~8 s; a teammate frees it instantly by hitting the dog with a thrown object. The lunge is a short dash of the dog's own body; the toss is a release with a velocity; the wiggle-free is a `release` from the carrier's own clock; the hit is `hit {dog}` from the client that owns the thrown prop, and the fold releases what the dog holds (ADR 0009). "Thrown" is a state of the thrower's client: a prop it released with a velocity in the last ~2 s.

## DoD
- Only a dog lunges; the lunge covers ~1.5 m and ends in card 05's grab; a second lunge inside the cooldown does nothing.
- The carrier's client sends the wiggle-free `release` 8 s after its claim was accepted, whatever the cat's client does; a carried cat's own client sends nothing for its body meanwhile (ADR 0006).
- A pushed prop (no throw) hitting a dog frees nothing.

## Acceptance
- Two clients: the dog's lunge from 2.5 m reaches and grabs the cat; the cat is `held` on both clients within 150 ms; the cat is free on both 8.0 ± 0.15 s after the grab's message. Before: a hold never ends.
- A toss lands the cat 1.5–2.5 m from the dog; a cat tossed at the level's hatch from 1 m beside the cage enters it (card 18's height; name the arc, and the height the two cards agree on).
- A third client's thrown crate hits the carrying dog: the cat is free on all three clients within 150 ms of the impact on the thrower; a crate merely pushed against the dog changes nothing.

## Test
- Vitest through the relay for the 8 s release and for the hit, each red with the rule removed.
