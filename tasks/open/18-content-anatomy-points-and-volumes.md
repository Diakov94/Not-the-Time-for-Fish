zone: src/content
size: M
# The anatomy: hideout, tunnel, storages with fish, doghouse, kennel, spawns, bags, trap pickups

GAME.md, Map Anatomy: the hideout outside the fence (cat spawn, drop-off, the tunnel's far end), 5 fish in 3+ storages with different access costs (table: open; fridge: door, slow and loud; aquarium: lid, needs a teammate), the doghouse in the yard for mine resupply, the kennel next to it with a hatch on top and a latch outside, placed so a dog carries a cat there from any storage within the wiggle-free time. Mystery bags in the house and the yard; trap pickups. Written into `src/content/country-house.ts` as volumes and points of the ADR 0008 schema.

## DoD
- Exactly 5 `fish` points, each inside a `storage` volume; the three access costs all present.
- The kennel's walls are statics a cat cannot climb out of (above a cat's jump plus mantle, card 22: ≥ 2.5 m); its hatch is an opening whose bottom edge a cat cannot reach from inside and a dog's toss reaches from beside the cage (card 21 names the arc; the two cards agree on one height in their reports); its latch point is outside the cage.
- Spawn points: at least 5 `catSpawn` in the hideout and 3 `dogSpawn` in the yard, the largest teams GAME.md hosts.

## Acceptance
- A check over the data prints: fish 5 in storages 3 with costs {open, door, lid}; walking distance (straight line, through doorways) from every storage to the hatch ≤ 20 m (8 s of a carrying dog at card 22's carrying speed: name the number); the tunnel exit and every cat spawn inside the hideout volume; every dog spawn and the doghouse inside the fence; bags ≥ 6, trap pickups ≥ 3.

## Test
- The data check above as part of card 17's Vitest test: red with a fish moved out of its storage.
