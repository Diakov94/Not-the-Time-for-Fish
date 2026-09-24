zone: src/relay (port), read by src/app
size: S
# One owner for the relay port

Found by batch C (its report). Three values each had two owners; two are closed:
- the throw speed: `THROW_SPEED` in src/sim/grab.ts, and a literal 6 in tools/headless. Closed: since batch S1 the speed is the held kind's row in src/sim/grab.ts (`CRATE` 6 m/s, `HELD` for a fish and a cat) and `throwCarried(sim)` takes none; since batch H1 every headless scenario presses `throw` and passes no speed, so `grep -rnE "speed: 6|THROW_SPEED" src tools` finds the crate's 6 once, in src/sim/grab.ts, and nothing in tools.
- spawn points: the app picked a random x in ±4 m, and the headless clients kept their own lanes. Closed by card 26 (batch S2): src/sim/level.ts is deleted; the points are the content level's `catSpawn` and `dogSpawn` (src/content), read only through `spawnPoint(level, side, n)` in src/sim/build.ts; the app calls it with the count of cats already in the room, the headless default scenario with the player's position on its side, so two players who enter at once stand at different points.

Open:
- the relay's dev port: 8787 in src/app/main.ts, and the default in src/relay/serve.ts.

## DoD
- The port is written once, where both the browser and Node can import it.

## Acceptance
- `grep -rn "8787" src tools` finds the port once, in its owner. Before: two places (src/app/main.ts, src/relay/serve.ts).

## Test
- None: the grep and the gates.
