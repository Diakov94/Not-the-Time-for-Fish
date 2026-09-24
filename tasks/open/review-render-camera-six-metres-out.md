zone: src/render
size: S
files: src/render/view.ts
# At 6 m the camera makes the cat 12 % of the screen and a mine 15 px tall

`follow` keeps the camera DISTANCE 6 m from the point EYE 1 m over the character, at a 60° vertical field. Measured in a two-tab session at 1280×720: the own cat spans 85 px, 12 % of the height; by the same geometry a mine at the cat's feet (0.5 × 0.1 m) is 15 px tall at 1080p and a fish 25 px: the props the game asks a player to read (GAME.md, pillar 2: mines are visible props, a knocked plate is a clue; Art Direction: readable at a glance). Ratty Catty and Untitled Goose Game, the references, orbit at about 3–4 m. The wall collision, the peek view and the shake stay; two numbers move, and the dogs' overview of the yard is the price to weigh (name it in the report).

## DoD
- DISTANCE and EYE tuned to a party-game size, about 3.5–4 m and 0.7 m, with a screenshot before and after at 1280×720 for each side.

## Acceptance
- The own cat spans ≥ 20 % of the screen height standing on flat ground (before 12 %); a mine at the cat's feet ≥ 24 px at 1080p (before 15); the camera still never sees through a wall (card 14's check).

## Test
- None: the screenshots are the check.
