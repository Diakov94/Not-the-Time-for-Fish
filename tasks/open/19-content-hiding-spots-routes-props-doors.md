zone: src/content
size: M
# Hiding spots, cat routes, props, debris and doors

GAME.md, Key Mechanics: cats hide under furniture, in boxes and behind curtains; dogs can't fit in but can wreck the spot. Cats fit through cat flaps, vents and gaps under fences and furniture. Every prop can be pushed; gameplay-relevant props are synced (fish, mines, traps, hiding spots, large furniture), small debris is local. Written into `src/content/country-house.ts`: hiding-spot volumes carried by props (a box, a sofa, a curtain) or by statics (under a bed), cat routes as gaps with `dogs` blockers (a cat flap in a door wall, a vent, a gap under a fence section that is not an exit is not allowed: card 17), synced props with shape and mass, debris (vases, plates, cups) with `synced: false`, doors with hinges on the house's doorways, and light barricade props a dog barges.

## DoD
- At least 6 hiding spots, 4 of them carried by props a dog can shove; at least 3 cat routes into or inside the house; at least 2 doors; at least 20 synced props and 20 debris props.
- Every hiding spot's entrance is a gap a cat's capsule passes and a dog's does not (sizes from card 22, named in the report).

## Acceptance
- A check over the data prints the counts above and that every hiding spot has an entrance narrower than a dog's diameter and wider than a cat's.
- Synced props in the level ≤ 60, so ADR 0005's tick arithmetic holds at 8 players with everything moving.

## Test
- The counts as part of card 17's Vitest test: red with a spot's entrance widened past a dog.
