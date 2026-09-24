zone: src/sim
size: XS
# The round fold names why a hello is refused

Batch N1 (card 44) reports a refused join as `{code: 'refused'}`, because foldRound's hello case returns only a boolean and net must not restate the fold's condition. The fold has two refusal branches: the name is held by a connected client, or this client is already named.

## DoD
- foldRound's hello case yields its reason; net passes it through unchanged; the room screen shows it in Ukrainian.

## Acceptance
- A second client asking for a name in use sees the "name taken" reason on the room screen. Before: a generic refusal.

## Test
- The existing hello tests assert the reason; red without it.
