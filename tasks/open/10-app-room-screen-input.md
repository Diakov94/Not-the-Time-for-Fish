zone: src/app
size: M
# The room screen, input and the desync dump

The Vite entry; a room screen to create or join by code (player-facing text in Ukrainian); WASD and mouse turned into sim intents; the rAF loop with a fixed-step accumulator; F9 downloads the desync dump.

## DoD
- The app wires the zones; it holds no game fact of its own.

## Acceptance
- Two tabs join one room code and each sees the other player move.
- F9 downloads a dump in the schema the headless runner compares.

## Test
- None beyond the gates: the two-tab check is done by hand and named in the report.
