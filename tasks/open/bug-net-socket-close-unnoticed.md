zone: src/net
size: S
files: src/net/client.ts, src/net/client.test.ts, tools/headless/run.ts
# A client never learns its socket died: after the relay drops it, `frame` steps and sends into a closed socket for ever

`connect` sets `onerror` for the welcome only and never sets `onclose`; nothing in src/app reads the socket either (no `onclose`, no `readyState`). Measured (this review's script): the relay closed under a connected client (a lost tunnel, a dead relay, or the relay's own 15 s ping timeout on a Wi-Fi drop): `ws.readyState` 3, `onclose` null; 30 frames later `frame` had run silently, counted 11 ticks as sent, and the sim had stepped the cat 2 m on. In the browser the same: every other character freezes, the player's own inputs "work", no message, no way back. GAME.md's disconnect rule ("the player can rejoin by room code into the same round") has no trigger on the client that lost the room.

The fact "the room is gone" has one owner, the socket's `close` in net. What the room screen does with it (a line in Ukrainian, a rejoin by the remembered name) is the app's, in the app review's slice; the app cannot draw what net does not expose.

## DoD
- `Session` exposes the loss: a `closed` fact set from the socket's `close` (with the close code), or a callback the app registers; `frame` on a closed session steps and sends nothing; `send` never throws.
- The headless runner treats a closed session as a seat gone (as a `leave`), so a relay death shows in a run instead of counting ticks.

## Acceptance
- The script's sequence: ticks counted after the close: 11 → 0; the session reports closed within one frame of the socket's close: 1 of 1.

## Test
- A net test: the relay closes; within 100 ms the session reports closed and its next `frame` sends 0 messages. Red without the fix.
