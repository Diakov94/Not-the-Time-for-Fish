zone: src/net
size: XS
# The tick sender keeps its 20 Hz at a 60 Hz frame rate

Found by batch H2 (card 63's QA scenario). The runner steps every client at 60 frames a second, a 60 Hz display's rate. At that rate every client sends a tick every third or fourth frame: 16.4–17.1 ticks/s while it has something to send, at 2, 3, 4, 6 and 8 clients. ADR 0006 and GAME.md say ~20 Hz, and card 63 asks for 19–21. The cause is in `frame` (src/net/client.ts): it stamps `lastTick = now` on the first frame at or past TICK_MS. The interval is therefore the first frame boundary past 50 ms, which is 50.0 or 66.7 ms, and a frame's jitter picks 66.7 more often than not. A browser at 60 Hz does the same.

The same gaps cost sync at a handoff. When more than 2 × TICK_MS pass between an entity's last tick from one owner and the first from the next, the receiver restarts its buffer from the copy's pose (src/net/ticks.ts), which adds up to 50 ms of lag. In card 65's run, a bystander's copy of the carried cat was 0.321 m off at the grab (limit 0.25): it started to rise 50 ms after the carrier's first tick.

## DoD
- The tick schedule keeps its own clock: the next tick is due TICK_MS after the previous one was due, not TICK_MS after the frame that sent it. The mean interval is then TICK_MS at any frame rate.

## Acceptance
- `npm run headless -- --scenario round --clients 8`: the ticking/s column reads 19–21 on every client. Before: 16.5–16.8.

## Test
- The runner's column is the measurement.
