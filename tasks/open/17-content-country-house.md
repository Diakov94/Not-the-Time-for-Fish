zone: src/content
size: L
# The country house: fence, exits, yard, house and rooms

GAME.md, Map Anatomy and Setting: a Ukrainian country house with a yard inside an opaque fence, 3–4 exits (a gate, gaps, a drainpipe), the house with cluttered rooms, and the hideout outside the fence. `src/content/country-house.ts` writes the statics of the house as an ADR 0008 `Level`: the floor, the fence with its exits as gaps plus `dogs` blockers, the house walls, doorways, floors and a second level if the design wants one, the yard's few obstacles, the drainpipe as a `climb` volume where the design places it (its route from the hideout into the yard is the content worker's, as long as it is an exit and not a way over the fence). Placeholder geometry: boxes with a label; the look is render's (card 31).

## DoD
- Every exit is a gap in the fence that a cat passes and a dog's blocker closes; the fence has no other gap and stands taller than a fish thrown from any point a cat can reach inside it: a toss releases about 1.2 m up (card 05's anchor), a jump adds about 1.3 m (card 22), so the fence is ≥ 3 m and no ledge a cat can mantle (card 22) stands within 3 m of its inside. Props a cat can stack there are party-game slack, as GAME.md accepts for the camera.
- The number of exits exceeds the largest dog team GAME.md hosts (3 at 8 players): at least 4.
- The house holds at least three rooms and the yard sits between fence and house on every side that has an exit.

## Acceptance
- A check over the data prints: exits 4 (≥ 4), fence height ≥ 3 m, no mantle ledge within 3 m of it, no opening in the fence outside the exits (every gap in the fence's boxes is inside an `exit` volume), rooms ≥ 3.
- Straight-line distance from the hideout's drop-off point to the nearest exit ≤ 15 m, so a fish carried out reaches safety in one sprint.

## Test
- The data check above as one Vitest test over the level: red when an exit's blocker is removed or the fence is lowered.
