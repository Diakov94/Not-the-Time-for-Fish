zone: src/render
size: M
# The level from content

Render draws the country house from the content `Level` (card 17–19) and the sim's colliders: statics as boxes with a warm palette by label (GAME.md, Art Direction: stylized low-poly, flat shading, homey colours; placeholder, not final), the fence opaque (nothing of the property visible from the hideout except through exits), volumes as translucent tints in dev only (a toggle key), doors and cat routes visibly different from walls, the kennel readable as a cage with its hatch and latch, the doghouse as a doghouse, storages readable as a table, a fridge and an aquarium. Card 14 (camera collision) sits in this zone and may ride with this batch.

## DoD
- Nothing is drawn that is not in content or the sim: no render-side list of walls; a level change in content changes the picture with no render change.
- The fence's material is opaque and the camera's far side of it shows nothing of the yard from the hideout.

## Acceptance
- From the hideout at any of the five cat spawns, the yard is visible through the exits only (a screenshot per spawn: name what is seen).
- The three storages, the kennel, the doghouse and every door and cat route are named by a tester from a screenshot without a legend (the Producer checks: 10 of 10).
- 60+ FPS with the whole house drawn at 1080p in one tab.

## Test
- None: screenshots and the FPS number in the report.
