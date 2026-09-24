zone: src/hud
size: XS
files: src/hud/hud.ts
# The HUD's teammate panel lists the players on the same side this round

ADR 0014, after card 160. The panel filters the roster by `team`; the table has `side` now. Nothing else in the HUD reads a team.

## DoD
- `mates` = the roster's other players whose `side` equals the viewer's; a viewer with `side: null` sees no panel.

## Acceptance
- At 8 players a dog's panel lists 2 names and a cat's 4 (before: the team's 2 or 4 by round); a newcomer with no side lists 0.

## Test
- None: a filter over the table.
