zone: src/net
size: S
files: src/net/client.test.ts, src/relay/node.test.ts, src/relay/node.ts
# The gates' 40 s: 25 s is one test file run in real time, 15 s one test waiting for a dead socket

`npm run gates`: exit 0 in 40, 40 and 42 s (3 of 3 runs, 2026-09-24). Vitest is 25.5 s of that and runs files in parallel, so its wall time is its slowest file's: `src/net/client.test.ts`, 18 tests in real time (`play(ms)` loops on a 16 ms timer), 24.9 s. Next is `src/relay/node.test.ts`, one test that waits 15–20 s of real time for the relay's DEAD_MS. Everything else is under 9 s (round.test.ts 8.8 s, the runner's own test 3.7 s). Typecheck, lint and zones take about 5 s together; the 10 s headless game 10.4 s. No flake in 3 gates runs and 8 scenario runs.

Two instrument changes, no norm moved:

- `startRelay(port, { pingMs, deadMs })` with today's values as defaults: the dead-socket test passes 50 ms and 150 ms and finishes under a second; the constants stay the relay's.
- `client.test.ts` split by topic into three files (join and state; ticks and touch claims; grab, hit and rejoin) so its tests run on three workers, about 9 s each.

## DoD
- The two changes above; no assertion or timing budget changes; the relay's ping constants keep their names and values.

## Acceptance
- `npm run test` ≤ 12 s (before: 25.5 s); `npm run gates` ≤ 30 s in 3 of 3 runs (before: 40–42 s).

## Test
- None: the suite is the instrument; the numbers are the check.
