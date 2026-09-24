zone: src/content
size: L
files: src/content/maps/high-rise.ts (new), src/content/maps/high-rise.test.ts (new)
# The high-rise as data: the map anatomy on a new theme

GAME.md, Beta: the second map proves the map anatomy on a new theme. Map Anatomy names the mapping: hideout = the neighbour's balcony, fence = balconies and vents, yard = the hallway. Content's schema (ADR 0008) is frozen for the four maps: a role the schema lacks goes in the report, not in the schema.

## DoD
- Hideout: the neighbour's balcony, outside; fence: the balcony rails and the vent shafts, opaque, nobody climbs; 4+ exits (a gap between balconies, a vent, the stairwell door, a drainpipe with climb volumes), more than the largest dog team (3); yard: the hallway and the landing with the doghouse (a storage nook) and the kennel (a barred storeroom) within carry range of every storage; house: the apartment, cluttered, with 3+ storages of three access costs (the kitchen table, the fridge, the aquarium), hiding spots (under the bed, the wardrobe, the curtains), cat routes (vents, gaps under furniture), doors, synced props and debris.
- The labels the theme (card 143) must draw are listed in the file's header (balcony rail, vent, lift, radiator, stairs, mailboxes, carpet, tv, cabinet, ...); until it lands they draw as palette boxes.
- The anatomy function (card 101) passes; synced props within the snapshot budget of card 45.

## Acceptance
- Exits 4 > dogs 3; every storage within the named carry distance of the hatch; the fence ≥ 4 m; 5 fish in 3 storages; synced props ≤ 26 (the house's count) or the down kB/s at 8 clients ≤ 100 measured with card 135.

## Test
- The anatomy test over the data; red with an exit removed.
