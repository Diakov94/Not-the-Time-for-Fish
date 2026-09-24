zone: src/sim
size: M
# The roster: names, teams, looks, and a known name is a rejoin

ADR 0007: the round table's roster maps a player's name to its team, its current client, its look and whether it is captured. `hello {name}` is a joining client's first game message; the host answers a first-time name with `roster {name, team}` by GAME.md's auto-balance (3 → 1 vs 2, 4 → 1 vs 3, 5 → 2 vs 3, 6 → 2 vs 4, 7 → 2 vs 5, 8 → 3 vs 5, about one dog per two cats) and reassigns by hand with the same message; a known name whose client left keeps its team and gets the new client; a name a connected client already holds is refused (the refusal is a message the room screen shows, card 50). A player's `look {side, look}` picks its look for that side (three per side, GAME.md's Characters); the default is by its position on the team, so five cats show three looks with repeats. Team A is cats in round 1. The table starts here in `src/sim/round.ts`; card 27 grows it.

## DoD
- The roster is written only by the round fold, on every client, from `hello`, `roster` and `look`; the host decides teams but its decision is a message like any other.
- The side a client plays this round is a query over the roster and the round number; nothing else answers it (card 20 spawns the kind from it).

## Acceptance
- Six hellos through the relay: every client's roster shows 2 dogs and 4 cats, the same names on the same teams, within one message of the last hello; three hellos: 1 vs 2.
- The host moves one name: all clients agree at that message; a non-host's `roster` is rejected everywhere.
- A client leaves and a new client hellos with its name: the same team on every client; a hello with a name in use is refused on every client and the roster is unchanged.

## Test
- Vitest through the relay for auto-balance at 3 and 6 and for the rejoin by name, red with the known-name rule removed.
