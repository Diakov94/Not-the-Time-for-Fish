zone: src/sim
size: L
# Noise pings, team markers and the sim's event list

ADR 0008 and 0010: `sim.events` is the one per-frame list of what happened, appended by the sim's own step and by `receive`, read by every view and drained by the loop. A noise ping is born at the client that simulates the body that made the noise (a contact above a force threshold on a body it owns; its own character's steps: a dog's always, a cat's when running, never when sneaking; one ping per impact by the lower-net-id rule) and travels as `noise {p, loud}`; a team marker is `mark {p}`, the point found by a ray the sim casts for the app; both are events, never table rows. GAME.md: small debris is local, but the noise it makes is broadcast; dogs are always loud.

## DoD
- The list holds noise, marks and the game's other events (grab, throw, drop, and from later cards: blast, sprung, phase, secured, captured, pickup) as one type; a view reads it, the loop drains it, nothing else writes it.
- A `noise` is sent by exactly one client per impact and appended on every client, the sender included, from the echoed message and not locally, so every dog sees the same ping at the same moment.
- A `mark` reaches the marker's side only (the receiving client filters by kind).

## Acceptance
- Two clients, a crate shoved into another client's crate: exactly 1 `noise` in the relay's stream for the impact (before: 0, no pings exist), and both clients' lists carry it. A crate knocked into local debris: 1 `noise`, from the crate's owner.
- A sprinting cat over 20 m: 8–12 pings; sneaking: 0; a walking dog: pings at the cat's sprinting rate or higher.
- The list is empty at the start of every frame after the loop drained it (the headless runner reads it each frame: 0 growth over 20 s).

## Test
- One Vitest test for one-ping-per-impact through the relay, red with the lower-net-id rule removed.
