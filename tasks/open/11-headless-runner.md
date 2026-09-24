zone: tools/headless
size: L
# The headless client and runner

The headless client (sim + net + a scripted input source) and the runner behind `npm run headless -- --clients N --seconds S`: starts the Node relay on an ephemeral port, drives the scripted scenario (walk, grab, carry, throw, push), prints per-entity maximum divergence between clients and per-client tick counts, and exits 1 above threshold (moving 0.25 m, resting 0.02 m).

## DoD
- The runner needs no browser and no jsdom.

## Acceptance
- Exit 0 at 2 clients, with the divergence numbers in the report.
- With the tick sender disabled, divergence exceeds 1 m and the exit code is 1.

## Test
- The negative above is the test.
