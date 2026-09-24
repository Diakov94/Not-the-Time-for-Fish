zone: src/sim
size: M
files: src/sim/round.ts, src/sim/round.test.ts, src/sim/mines.ts
# The balance knobs by player count: one table with a row per count, set from the sweep

GAME.md, Multiplayer: mines per dog, the heist timer and the dig-out time scale with player count; 3–4 players play a different game from 8. Card 27's table has three rows; card 132's sweep gives one line per count.

## DoD
- One table with a row per count 3–8: the heist timer, mines per dog, water bombs per dog (card 129), the dig-out time, and the trap pickups spawned; the round, the mines and the level spawn read it; no second table.
- Rows set from the sweep's lines: the scripted round ends by fish or the timer within 5–12 min at every count and the first grab within 90 s of the heist; a row the sweep gives no reason to move keeps GAME.md's number, said per row.

## Acceptance
- Each row's before → after named beside the sweep line that justified it; the sweep run again ends within 5–12 min at every count.

## Test
- The round tests read `knobs` for each count; red for a count without a row.
