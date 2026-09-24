zone: src/render
size: S
# The camera does not see through walls

GAME.md, Camera: "a player-controlled orbit camera following the character, with tight collision against walls." The Prototype's camera has none (batch C's report).

## DoD
- The camera is pulled in along its ray when a wall or prop stands between it and the character.

## Acceptance
- With the character backed against a wall and the camera turned toward it, the view shows the character, not the room behind the wall. Before: the camera passes through.

## Test
- None: a browser check named in the report.
