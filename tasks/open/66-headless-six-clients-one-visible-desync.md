zone: tools/headless
size: M
# Six clients for 120 s: at most one visible desync

GAME.md, Vertical Slice: 6 players with at most one visible desync per round, checked with the desync report hotkey; a visible desync is an object or player clearly in a different place for two players. The runner defines it as a synced entity whose copy is more than 0.5 m off its owner's path for more than 1 s, counts such episodes over a run, and prints them by entity. Six clients over the country house, card 63's script, 120 s of real time, at 60 Hz stepping, with ticks and the interpolation as they are.

## DoD
- The count is an instrument's number, not a threshold moved: ADR 0006's limits stay; this is a second, coarser judge for GAME.md's criterion.

## Acceptance
- 6 clients × 120 s: visible desyncs ≤ 1 (name the number and the entity); moving ≤ 0.25 m, resting ≤ 0.02 m; wall time ≤ 130 s.
- The same run with the interpolation delay halved or the tick rate halved: ≥ 2 visible desyncs, exit 1 (the judge is live).

## Test
- The negative above is the test.
