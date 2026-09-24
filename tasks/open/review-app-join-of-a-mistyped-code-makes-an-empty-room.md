zone: src/app
size: S
files: src/app/screens/room.ts, src/app/main.ts
# "Приєднатися" with a mistyped code makes the player the host of an empty room, silently

The relay makes a room for any code (ADR 0005: keyed by the path, alive until its last member leaves), so a friend who hears "1234" as "1243" joins nothing, becomes the host of a room of one, sees the lobby with "Керування хоста" and waits for the others, while the others see nobody arrive. Codes travel by voice, so this will happen at most sessions. The mirror case, "Створити кімнату" landing on a code in use (1 in 9000), joins a stranger's room as a guest.

Owners: whether the player pressed create or join is the room screen's fact. Who is in the room is the relay's, folded into the roster, which `state` carries to a joiner: once `enter` resolves, a join whose roster holds no other name and whose host is this client is a join of no room. The screen then closes the session and says "Кімнати 1243 немає. Перевірте код." with the code kept; a create that finds another name already there tries a second code once, then says so. The relay stays ADR 0005's: no new message.

## DoD
- Join: a roster with no other name → the socket closes, the screen stays with the message, the typed code stays in its input.
- Create: a roster with another name → a new code, once; then the message.

## Acceptance
- Two tabs: A creates 1234; B joins 1243: B stays on the room screen with the message within 1 s (before: B is the host of room 1243 with "Керування хоста"); B joins 1234: in the lobby.

## Test
- None: the flow is checked in two tabs; the roster and the host are the fold's and the relay's, already tested.
