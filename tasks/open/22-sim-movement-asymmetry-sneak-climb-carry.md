zone: src/sim
size: M
# Movement asymmetry, sneak, climb, and carrying slows you down

GAME.md, Movement asymmetry and the base kits: dogs are faster on open ground; cats sneak (a toggle: slow, near-silent, the only mode with the whisker cue), jump and climb (vertical routes, tight gaps); the fence is climbed by nobody. A carrying cat is slower; a carrying dog walks. Cats and dogs differ in size, which is what the cat routes gate on (card 19, card 26). The `Intent` gains `sneak`; the sim's walk and sprint speeds become per kind; a cat mantles a ledge in front of it on jump; a `climb` volume lets a cat move up while inside it.

## DoD
- Speeds per kind and per state (walking, sprinting, sneaking, carrying) live in one table in the sim; nothing else holds a speed.
- A dog's capsule is wider than a cat's; the dog cannot pass a gap the cat passes (the numbers go to card 19's check).
- Nobody climbs the fence: a cat's mantle height stays below card 17's fence.

## Acceptance
- Over 20 m of open floor a sprinting dog beats a sprinting cat by ≥ 1 s; a sneaking cat covers 20 m in ≥ 2× the walking time; a cat carrying a fish sprints at ≤ 75 % of its free sprint; a dog carrying a cat covers 10 m in ≥ 2× its walking time and cannot sprint.
- A cat jumps onto a 1.0 m ledge and fails a 1.5 m one; a dog fails the 1.0 m ledge; a cat in a `climb` volume rises 3 m in ≤ 3 s; a dog in it does not rise.

## Test
- One Vitest test for the ledge (red with the mantle removed); the speeds are numbers in the report.
