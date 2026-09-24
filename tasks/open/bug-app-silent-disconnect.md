zone: src/app
size: S
files: src/net/client.ts, src/app/main.ts, src/app/screens/room.ts
# A lost connection shows nothing: the HUD keeps counting and the character moves for its player alone

Found by the shell review of 2026-09-24 (headless Chrome, three tabs). `connect` sets `onerror` for the handshake only and no `onclose`; the app's loop keeps calling `frame` on a closed socket, and a browser's `send` on a closed socket is silent. With the relay killed mid-heist, 6 s later every tab's HUD still counted (7:57 → 7:51), the player could walk, there was no message and no way back but a reload, which the player has no reason to try. The same for a lost Wi-Fi, a laptop lid, or the relay's own termination of a silent socket (card 46: 15–20 s). GAME.md promises "the player can rejoin by room code into the same round"; today the player learns of the drop from the voice channel.

Owners: the socket's close is born in `src/net`, which holds the socket: `connect` gives the session a `closed` promise (or callback) that settles once on the socket's close, whatever closed it, with no game fact in it. What to show is the app's: the room screen returns with the name and code kept and one line, "З’єднання втрачено. Приєднайтеся знову", so one click rejoins (the reload rejoin already works: the HUD was back 63 ms after the click and a teammate's list showed the name free). While a join waits past 10 s for `welcome` or the host's `state`, the same screen says so instead of an inert "З’єднання…" with no end.

## DoD
- `Session.closed` in net: settles once, on the socket's close.
- The app on `closed`: the loop stops sending, the pointer is freed, the room screen shows the reason with the code kept; the next join is a rejoin.
- A join with no `welcome` or no `state` within 10 s rejects with a reason the room screen shows.

## Acceptance
- Relay killed mid-heist: the room screen with the reason within 1 s on every tab (before: the HUD counted on with no message 6 s later); one click rejoins once the relay is back.

## Test
- Net: a session whose relay closes settles `closed` within 100 ms; red without the handler. The screen is checked in two tabs.
