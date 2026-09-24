zone: src/render
size: S
# Juice: camera shake and impact stars

GAME.md, Game Feel: cartoon impact stars, camera shake on explosions. From card 23's events: a shake of the camera proportional to a nearby loud impact (a blast, card 39, later feeds the same path), and a burst of stars at an impact above the ping threshold, gone in ~0.5 s. A reduced-motion toggle is Beta scope; the amplitude is one constant so it can become one.

## DoD
- Both read the event list only; the camera's shake is an offset added in `follow`, never a change to the camera's target.

## Acceptance
- A crate dropped from 2 m next to the player: stars at the impact for 0.4–0.6 s and a camera shake of ≤ 0.1 m that ends within 0.3 s; a crate dropped 20 m away: stars, no shake. Before: nothing.

## Test
- None: a browser check named in the report.
