zone: src/sim
size: S
files: src/sim/messages.ts, src/sim/events.ts, src/sim/ownership.ts, src/sim/emotes.ts (new), src/sim/emotes.test.ts (new)
# The emote message and event

ADR 0013: an emote is an event, never stored. GAME.md, Controls: keys 1–4 and the d-pad. The sim owns the call and the message; the look of an emote is art's (cards 112–115), the sound audio's (147), the keys input's (125).

## DoD
- `emote {n}` from a player's client, in play only, with `n` below the character's emote count from the roster (card 100); the sender drops a second emote within the first one's duration (its own fact).
- On arrival every client appends `emote {n, from}` to its event list; nothing is folded or stored; a joiner never sees an old one.
- `emote(sim, n)` for the input, answered by kind like the other calls of card 49.

## Acceptance
- Two headless clients: one emote sent appears once in each event list; a third client joining after it sees 0.

## Test
- A receive test: the event appears once and no table changes; red without the case.
