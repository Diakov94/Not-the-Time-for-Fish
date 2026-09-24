zone: src/net
size: M
# The snapshot budget for eight players

Live only if card 37's number is over budget (≥ 100 KB/s down per client at 8 clients with 40 props moving); otherwise it closes with that number and no change. If live: compact the tick's snapshots (fewer digits, no angular velocity for a body that is not spinning, a short key set) until the budget holds, without moving ADR 0006's thresholds or the 20 Hz rate.

## DoD
- The rate stays 20 Hz and the interpolation delay 100 ms; the compaction is in the codec (`encode`/`decode`) or the tick's reader, in `src/net` only.

## Acceptance
- Card 37's scenario: bytes/s down per client ≤ 100 KB/s (before: card 37's number); `npm run headless -- --clients 2 --seconds 20`: moving ≤ 0.25 m, resting ≤ 0.02 m, unchanged from before within 0.01 m.

## Test
- None beyond the gates and the headless numbers.
