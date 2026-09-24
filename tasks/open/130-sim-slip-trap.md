zone: src/sim
size: M
files: src/sim/messages.ts, src/sim/entities.ts, src/sim/traps.ts, src/sim/traps.test.ts, src/sim/ownership.ts, src/sim/movement.ts, src/sim/world.ts
# The slip trap: the cats' second trap type

GAME.md, Mine / trap types: 2+ per side at release, TBD. The Architect's assumption, stated to be refuted by play: a banana peel. It is planted like the noise maker (one trap in play per cat stays) and needs no setting off: a dog that steps on it slips, tumbles for 1.5 s, drops a carried cat, and pings. A sniffing dog sees and clears it like a noise maker. The message union is the same batch's as card 128.

## DoD
- `spawn` of a trap carries `variant` (noise or slip); trap pickups alternate variants by their point's order in the level (the schema is frozen: no new field); a cat's Q with a slip trap planted does nothing (it springs by itself).
- `sprung` for a slip trap comes from the dog's client that stepped on it; the fold accepts it from a non-owner for that variant only; the slipped dog's intent is ignored for 1.5 s (its own fact), its held cat released by an ordinary `release`, the noise loud 0.5.

## Acceptance
- Headless: a dog through a slip trap at a sprint: slipped 1.5 s (≤ 0.5 m moved meanwhile), the carried cat released within 1 step; a sniffing dog 1.5 m away clears it; the house's 3 pickups give 2 noise makers and 1 slip trap.

## Test
- The fold: `sprung` on a slip trap from a dog's client accepted, on a noise maker rejected; red without.
