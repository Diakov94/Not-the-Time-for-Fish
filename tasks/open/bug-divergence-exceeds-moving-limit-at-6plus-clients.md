src/sim

M

Entity c47 (cat) moving divergence exceeds 0.25 m limit under 6+ client loads during round scenario. Repeats in 3 runs: clients=8 run 2 (0.294 m), clients=8 run 3 (0.261 m), clients=6 120s 2-round run (0.350 m). All other judges pass (tables, sides, visible desyncs, doomed claims).

Command: `npm run headless -- --scenario round --clients 8` (and `--clients 6 --seconds 120 --rounds 2`)
