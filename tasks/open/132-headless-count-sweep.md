zone: tools/headless
size: M
files: tools/headless/main.ts, tools/headless/run.ts
# The player-count sweep: one table for the balance knobs

GAME.md, Multiplayer: balance knobs scale with player count, 3–8; 1 vs 2 is a first-class configuration. Card 148 sets the rows; this card gives it numbers.

## DoD
- `--counts 3,4,5,6,7,8` runs the named round scenario once per count and prints one line each: the round's length, fish secured, first grab into the heist, mines armed and defused, blasts, captures, rescues, the winner and why.
- One command, one table; the runs sequential.

## Acceptance
- One table of 6 lines from one command; wall time ≤ 6 × one round's; the 3-player line shows a 1 vs 2 game (sides as the auto-balance says).

## Test
- None: the sweep is the measurement.
