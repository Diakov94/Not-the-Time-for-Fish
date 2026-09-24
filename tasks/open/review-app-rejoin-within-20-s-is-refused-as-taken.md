zone: src/app
size: S
files: src/app/screens/room.ts
# A rejoin after a dropped connection is refused as "your name is taken" for up to 20 s

A connection that drops without a close frame (Wi-Fi, a lid, a tab that crashed) is terminated by the relay after 15–20 s of unanswered pings (card 46: PING_MS 5 s, DEAD_MS 15 s). Until its `left`, the roster still holds the name with a client, so the fold refuses the same name from the reopened tab as `taken`, and the room screen tells the player "Це ім’я вже зайняте в цій кімнаті. Оберіть інше." about their own name. A player who obeys and types another name joins as a new player: no team until the host answers, no character until the next prep (round.ts: a name with no team waits for the next prep), while their old frozen character stands for 60 s. The fold's reason is right; the screen's advice is wrong for this case.

Owners: the reason stays the fold's (`taken`). The screen has a fact of its own, the remembered name and room (ADR 0012: incidental memory stays with its screen): a `taken` for exactly those is a rejoin inside the dead-socket window. It then says "Ваше попереднє з’єднання ще закривається. Спробуємо ще раз…" and retries the same join every 3 s until the `left` lands or the player edits the name.

## DoD
- On `taken` for the remembered name and room: the line above and a retry every 3 s, at most 8 times; the inputs stay editable and an edit stops the retry.
- Any other refusal: as today.

## Acceptance
- Two tabs; B's socket cut without a close (DevTools offline), B reloaded and joined within 5 s: B is back in the round under its own name within 25 s and no edit (before: refused, a new name needed, a character only at the next prep).

## Test
- None beyond two tabs: the fold's refusal has its test (card 44); the screen only chooses what to say and when to try again.
