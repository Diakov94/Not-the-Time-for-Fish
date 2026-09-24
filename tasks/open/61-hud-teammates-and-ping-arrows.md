zone: src/hud
size: M
# Teammate status, and ping arrows at the screen's edge for dogs

GAME.md, HUD: teammate status (free / grabbed / captured); noise pings dogs see on screen. A row of teammates with their look and one of three states: grabbed is the ownership table (held by a dog), captured the round table, free otherwise. For dogs, a ping whose source is off screen (card 32 marks the on-screen ones) shows as an arrow at the edge toward it, fading with the ping; the projection of a world point to the screen is a function render exposes, so the HUD holds no camera of its own.

## DoD
- The three states come from the two tables and no third place; the arrow reads the event list and render's projection only.

## Acceptance
- A teammate grabbed shows grabbed within one frame on every cat's HUD, captured on capture, free on rescue (the three words in Ukrainian); a dog's HUD shows no teammate of the other side.
- A crate shoved behind the dog: an arrow at the bottom edge within one frame, gone with the ping (~2 s); the same impact in front: no arrow, the in-world marker only.

## Test
- None: screenshots in the report.
