zone: src/net
size: S
# A copy freezes for up to DELAY_MS when its entity changes hands

Found by batch H2 (the QA scenarios of cards 63 and 65). When a dog grabs a cat, every screen but the carrier's shows the cat standing still for up to ~100 ms at the spot where the grab reached that screen. The cat then snaps to the dog's mouth. Traced at a grab of cat c47:0 by dog c44 (runner time in ms):
- The cat's own client, c47, had three of its own echoed ticks in its buffer (26767, 26830 and 26881, y 0.46).
- The bystander, c1, had the same three from c47.
- The carrier's first tick arrived at 26898 (y 1.01).
- On both c47 and c1 the copy stayed at y 0.46 until 26977, stood at 0.905 at 26994 and reached 1.01 at 27011.

The runner's judge measured such a copy up to 0.256 m off the carried cat's path (limit 0.25): 1 run in 3 at 8 clients, on the cat's own client.

The cause is in `interpolate` (src/net/ticks.ts). Once the fold gives the entity to the carrier, `applySnapshot` drops every buffered snapshot from the previous owner. The same goes for the client's own echoes, which `handle` buffers like any other tick. The copy therefore gets no target until the interpolation time passes the last of them, and only then blends from that pose to the new owner's. Those entries also keep the buffer younger than 2 × TICK_MS, so the rule written for this case never fires: "after a pause (the body rested, or this client simulated it) the buffer restarts from the copy's current pose, so the copy moves off without a jump". A carrier's screen does the same at a toss.

## DoD
- At an ownership change a copy keeps moving: the previous owner's buffered snapshots still carry it until the new owner's take over, or it restarts from its current pose. A client's own ticks do not enter its receiver.

## Acceptance
- Card 63's round at 8 clients, 5 runs: the grabbed cat's moving divergence is at most 0.15 m on every client. Before: 0.227–0.256 m on its own client.

## Test
- A net test: at an ownership change, a copy with the previous owner's snapshots still buffered moves on the next frame instead of standing still until DELAY_MS past the last of them. It goes red without the fix.
