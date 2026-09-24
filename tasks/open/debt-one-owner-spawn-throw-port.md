zone: src/sim (level), read by src/app, tools/headless and src/relay
size: S
# One owner each for spawn points, the throw speed and the relay port

Found by batch C (its report). Three values each have two owners:
- spawn points: the app picks a random x in ±4 m, and the headless clients keep their own lanes. The level names none.
- the throw speed: `THROW_SPEED` in src/sim/grab.ts, and a literal 6 in tools/headless.
- the relay's dev port: 8787 in src/app/main.ts, and the default in src/relay/serve.ts.

## DoD
- Each value is written once. Spawn points belong to the level (src/sim/level.ts), and the port goes where both the browser and Node can import it.

## Acceptance
- `grep -rn "8787\|= 6\b" src tools` finds each value once, in its owner. Before: two places each.
- Two players who enter at once start at different level spawn points in the browser and in the headless runner.

## Test
- None: the grep and the gates.
