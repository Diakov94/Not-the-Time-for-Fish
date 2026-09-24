zone: src/render
size: M
# The peek camera in a hiding spot

GAME.md, Camera: in a hiding spot the camera switches to a fixed peek view, so cats can't look through walls. When the sim's `hidden` query (card 41) is true for the player's own cat, the camera leaves its orbit for a fixed view from the spot's entrance looking out, and returns to the orbit within a short blend when the cat leaves or the spot is wrecked. Card 14's collision stays in force outside the spot.

## DoD
- The switch is driven by the sim's query; render decides nothing about being hidden.
- In the peek view the camera never sees the far side of the spot's walls (the view is inside the spot, looking out).

## Acceptance
- A cat under the sofa: the view is from under the sofa within one frame; the dog walking past is seen; the room behind the sofa's back is not (a screenshot); the dog shoving the sofa 1 m: the orbit is back within 0.3 s.
- 60+ FPS unchanged.

## Test
- None: screenshots in the report.
