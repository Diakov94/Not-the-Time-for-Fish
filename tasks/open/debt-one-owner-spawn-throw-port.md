zone: src/sim (grab), read by src/app, tools/headless and src/relay
size: S
# One owner each for the throw speed and the relay port

Found by batch C (its report). Two values each have two owners:
- the throw speed: `THROW_SPEED` in src/sim/grab.ts, and a literal 6 in tools/headless.
- the relay's dev port: 8787 in src/app/main.ts, and the default in src/relay/serve.ts.

Spawn points, the third value, are closed by card 26 (batch S2): src/sim/level.ts is deleted; the points are the content level's `catSpawn` and `dogSpawn` (src/content), read only through `spawnPoint(level, side, n)` in src/sim/build.ts; the app and the headless client call it (the app with the count of cats already in the room, the headless client with its lane), so two players who enter at once stand at different points.

## DoD
- Each value is written once. The port goes where both the browser and Node can import it.

## Acceptance
- `grep -rn "8787\|= 6\b" src tools` finds each value once, in its owner. Before: two places each.

## Test
- None: the grep and the gates.
