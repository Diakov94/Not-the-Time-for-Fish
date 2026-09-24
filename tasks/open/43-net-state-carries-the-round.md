zone: src/net
size: M
# The joiner's state carries the round table; events are not replayed

ADR 0007: a joiner's `state` carries the round table beside the ownership table, with the current phase's elapsed time so the joiner's timer is off by at most a hop; a rejoiner mid-round therefore lands in the right phase with the right count. ADR 0010: events (`noise`, `mark`, `bark`, `sprung`) held in the joiner's buffer before its `state` are dropped, not replayed: a ping from before the join is stale. The message union is the sim's (card 20); net carries it and folds nothing.

## DoD
- `state` is built from the sim's tables and nothing else; net keeps no round fact of its own (the `host` field stays the relay's fact as today).
- A held event older than the `state` never reaches the sim's event list.

## Acceptance
- Three clients, a joiner during heist: its round table deep-equals the host's within 500 ms of `connect` (as card 08 measures), its remaining heist time within 250 ms of the host's, its secured count equal; before: the joiner holds no round.
- 20 pings sent before the joiner's `state`: 0 in the joiner's event list; a ping after it: 1.

## Test
- Vitest through the relay for the round in `state`, red with the round field removed.
