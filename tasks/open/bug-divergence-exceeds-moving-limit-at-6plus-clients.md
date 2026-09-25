zone: tools/headless
size: S
files: tools/headless/run.ts
# The moving judge holds a grabbed cat's copy on its own client to the path DELAY_MS earlier, while that copy shows its own last pose by design

Found by QA at 6+ clients: the cat's moving divergence exceeds the 0.25 m limit (8 clients: 0.294, 0.261 m; 6 clients, 120 s, 2 rounds: 0.350 m). Traced by batch KNOBS to two mechanisms, both at the dog's grab. The net one (a carrier's first tick re-spaced ahead of its time on every copy, 0.299 and 0.311 m) is fixed in src/net/ticks.ts. This one remains: 0.253 and 0.268 m over the limit in 2 of 13 runs at 8 clients before the net fix, 0.227 and 0.236 m in passing runs after it.

On the grabbed cat's own client, the fold gives the cat to the carrier, and the copy holds the pose that client last simulated until the carrier's first pose shows (src/net/ticks.ts: the previous owner's last until the new owner's first; a client's own ticks never enter its receiver). That pose is on the truth path at the fold, but the judge holds every copy against the path within TICK_MS of DELAY_MS before. For up to 50 ms after the fold, the copy is ahead of that window by the cat's own motion: 6 m/s × (50 ms − the frame gap) ≈ 0.2–0.3 m. Against the path up to the moment that client last owned the cat, the same runs measure 0.092–0.141 m. The only in-game fix would jump the player's own cat back 50–100 ms along its path at every grab.

## DoD
- A copy on the client that owned the entity within the last DELAY_MS is held against the owner's path up to the moment it last owned it, not just the window DELAY_MS ± TICK_MS; other copies are judged as now.

## Acceptance
- `round --clients 8`, 5 runs: max moving ≤ 0.25 m in 5 of 5, the grabbed cat's own copy ≤ 0.15 m.

## Test
- run.test.ts: a former owner's copy that holds its last own pose at a handoff passes the moving judge, and a copy on another client 0.3 m ahead of the path still fails. Red without the change.
