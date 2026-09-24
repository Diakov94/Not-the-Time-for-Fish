zone: src/render
size: S
# The camera follows a target the app names

Card 51 lets a captured cat spectate a teammate or free-look around the kennel; the choice is the app's, the camera is render's. `draw` takes the entity to follow (or a fixed point and a free look) instead of finding the player's own character itself; the app passes the own character until it has a reason not to.

## DoD
- Render no longer decides whom to follow; the default (the own character) is the app's one line.

## Acceptance
- With the app naming another character, the camera orbits it and the own character is visible in the scene; with a fixed point named, the camera orbits the point. Before: the own character only.

## Test
- None: a browser check named in the report.
