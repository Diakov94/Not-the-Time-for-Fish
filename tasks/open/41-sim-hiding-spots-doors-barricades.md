zone: src/sim
size: M
# Hiding spots, doors and barricades

GAME.md: cats hide under furniture, in boxes and behind curtains; dogs can't fit in but can wreck the spot (flip the box, pull the curtain, shove the sofa); cats open doors slowly and loudly, dogs open them instantly and barge through light barricades. `hidden(sim, cat)` is the query (ADR 0010): the body is inside a hiding-spot volume, which moves with the prop that carries it (card 19); a dog's push moves the prop and the spot with it. A door (card 19) stops a cat until its interact (E tap, ~2 s, a noise ping) opens it, and swings open for a dog that walks into it. A barricade is a heavy prop a dog's barge shoves and a cat cannot move. Card 42's Bark reads `hidden`; card 56's peek camera reads it.

## DoD
- "Hidden" is derived from the pose and the spot on every client; no flag travels.
- A dog's push force exceeds a cat's by the ratio that moves a barricade for one and not the other (one constant per kind, in card 22's table).

## Acceptance
- Two clients: a cat inside a box spot is `hidden` on both; the dog cannot enter (0 m of progress into the entrance); the dog shoves the box 1 m: the cat is `hidden: false` on both within 150 ms.
- A cat at a closed door: 0 m through it until its 2 s interact, then 1 `noise`; a dog walks through a closed door at ≥ 90 % of its walking speed, the door open behind it.
- A 20 kg barricade before a door moves ≥ 0.5 m for a dog in 2 s and < 0.1 m for a cat.

## Test
- One Vitest test for the wrecked spot (hidden flips when the prop moves), red with the moving-volume rule removed.
