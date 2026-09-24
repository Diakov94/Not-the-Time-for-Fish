zone: src/sim
size: S
files: src/sim/messages.ts, src/sim/round.ts, src/sim/round.test.ts
# Worn cosmetics travel in the roster's look

ADR 0013: what a player wears is the round table's, so every client draws it, and the sim validates nothing about unlocks. The `look` message (ADR 0007) is the one place a player says what it looks like.

## DoD
- `look` gains `worn: {hat?: string, accessory?: string}`, catalogue ids as strings; the fold stores them per side beside the look; any string is accepted.
- `state` carries them by carrying the round table; net changes nothing.

## Acceptance
- Three headless clients: a look with a hat sent by one is in every round table (3 of 3), and in a joiner's after `state`.

## Test
- The round fold test: worn stored per side and overwritten by the next look; red without.
