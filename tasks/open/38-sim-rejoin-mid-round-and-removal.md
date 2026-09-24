zone: src/sim
size: M
# Rejoin mid-round, and a gone player's character is removed after 60 s

GAME.md, Disconnects: the character freezes in place for 60 s (a carried fish drops, a carried cat is released: ADR 0006's `left` does both); the player can rejoin by room code into the same round; after that the character is removed; no mid-round rebalancing. Card 25 keeps the name and team; this card makes the round side of it: on a known name's `hello` the host sends `despawn` for the old character and the rejoiner spawns its own with its side, at its side's spawn or, if the roster marks it captured, inside the kennel; without a rejoin the host sends `despawn` 60 s after the `left`. `despawn` is folded by `receive` (the entity gone) and by the ownership fold (its rows gone), on every client.

## DoD
- The 60 s clock and the `despawn` are the host's duty and move with the host; a client never removes an entity on its own.
- Captured-ness survives the disconnect: a captured cat's player comes back captured, with a fresh dig-out timer.

## Acceptance
- Three clients, a cat leaves mid-heist: its body is a frozen kinematic on the others for 60 s and gone from every table at 60.0–60.5 s after the `left`; its fish dropped at the `left`.
- The same name hellos again at 20 s: the old body is gone and a new cat stands at a cat spawn on every client within 500 ms of the hello; captured at the time of leaving: back inside the kennel, captured on every client, and it digs out 60 s after the rejoin, not after the capture.

## Test
- Vitest through the relay for the rejoin into the kennel, red with the captured rule removed.
