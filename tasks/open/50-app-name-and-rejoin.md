zone: src/app
size: M
# The player's name, and rejoin by code

GAME.md, Disconnects: the player can rejoin by room code into the same round. The room screen asks for a name (kept in `localStorage`, the only save GAME.md allows) and passes it to `connect` (card 44); a refused name shows the reason and lets the player change it; on reload the name is filled in and the last room code offered, so a rejoin is two clicks. All text in Ukrainian.

## DoD
- The name lives in the input and in `localStorage`; nothing else in the app stores it; the sim's roster is the fact once joined.
- The rejoin path is the join path with the name: no second code.

## Acceptance
- A player reloads the tab during heist and re-enters the code: back in the round within 3 s on its old team and side, in the kennel if it was captured (card 38); before: a new player with a random spawn.
- Two tabs with one name: the second is told the name is taken (in Ukrainian) and stays on the room screen; changing the name joins.

## Test
- None: a browser check named in the report.
