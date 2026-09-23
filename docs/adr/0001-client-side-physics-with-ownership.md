---
status: accepted
---

# Client-side physics with per-prop ownership over a stateless relay

The game is a physics sandbox for 3–8 trusted friends with no budget or appetite for dedicated game servers. Every client runs the full Rapier simulation; the player who last grabbed or pushed a prop owns it and broadcasts its state, everyone else applies snapshots, and a contested claim is settled by the order in which the WebSocket relay delivered the messages. The relay stores nothing beyond room membership. We accept occasional desync and trivially easy cheating in exchange for zero server logic, no hosting cost and physics that feels local.

## Considered options

- **Host-authoritative physics**: one client simulates everything, the rest are views. Kept as the fallback if ownership desync proves unplayable in the Prototype milestone.
- **Server-authoritative simulation** on a Node or Workers backend: rejected. It doubles the implementation, puts WASM physics on a metered platform, and buys anti-cheat that a friend group doesn't need.

## Consequences

- No anti-cheat; GAME.md lists it as a non-goal.
- Round state (timers, secured fish, win conditions) lives on the host client and is re-derived by the next host on migration; the relay only keeps the room alive.
- Desync tooling is a first-class dev feature: headless test clients and the "report desync" hotkey.
- Only gameplay-relevant props are synced; small debris stays local and may differ between players.
