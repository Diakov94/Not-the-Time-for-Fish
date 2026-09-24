zone: src/net
size: M
# Hello on join, a refused name, a rejoiner's state

Card 25's `hello {name}` is sent by `connect` right after `welcome`, before the joiner waits for its `state`; the host's refusal of a name in use (card 25) reaches the joiner as a rejected promise with a reason the room screen shows (card 50), and the socket closes; a rejoiner's `state` (card 43) carries its captured-ness through the roster, so card 38 puts it in the kennel. `connect(url, level, name)` is the one entry for the app and the headless client.

## DoD
- The name travels once, in `hello`; no other message carries it; the client id stays the relay's.
- A refused join leaves no session behind: no sim, no character spawned, the socket closed.

## Acceptance
- Two clients with the same name: the second's `connect` rejects within 500 ms with the refusal's reason; the first plays on; the room's member count is 1 after the close.
- A client that left and reconnects with its name during heist: `connect` resolves with its team's side in the roster and the round in its table within 500 ms.

## Test
- Vitest through the relay for the refusal, red with the refusal path removed.
