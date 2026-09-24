zone: src/sim (level), read by src/app, tools/headless and src/relay
size: S
# One owner each for spawn points, the throw speed and the relay port

Found by batch C (its report). Three values each have two owners:
- spawn points: the app picks a random x in ±4 m, and the headless clients keep their own lanes. The level names none.
- the throw speed: `THROW_SPEED` in src/sim/grab.ts, and a literal 6 in tools/headless. Closed: since batch S1 the speed is the held kind's row in src/sim/grab.ts (`CRATE` 6 m/s, `HELD` for a fish and a cat) and `throwCarried(sim)` takes none; since batch H1 every headless scenario presses `throw` and passes no speed, so `grep -rnE "speed: 6|THROW_SPEED" src tools` finds the crate's 6 once, in src/sim/grab.ts, and nothing in tools.
- the relay's dev port: 8787 in src/app/main.ts, and the default in src/relay/serve.ts.

## DoD
- Each value is written once. Spawn points belong to the level (src/sim/level.ts), and the port goes where both the browser and Node can import it.

## Acceptance
- `grep -rn "8787" src tools` finds the port once, in its owner. Before: two places (src/app/main.ts, src/relay/serve.ts); the throw speed's half is closed (above).
- Two players who enter at once start at different level spawn points in the browser and in the headless runner.

## Test
- None: the grep and the gates.
