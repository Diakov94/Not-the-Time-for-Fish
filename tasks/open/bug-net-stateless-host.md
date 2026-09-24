zone: src/net
size: S
# A host named before it holds a state stalls the room

Found by batch C (its report). When a host leaves before answering, the relay names the next member in join order. If that member is itself still owed a state, nobody in the room holds the world: it waits on the room screen for ever. Two members is the plain case. Anyone who does hold a state joined earlier and would have been named first, so a stateless new host means nobody holds the world.

## DoD
- A host without a state spawns the level fresh and answers every member still owed a state.

## Acceptance
- Two members, and the host leaves before answering: the remaining client is playing, with the level spawned, within 500 ms of the `left`. Before: it waits for ever.
- Three members, with both joiners owed: both hold deep-equal tables within 500 ms of the `left`.

## Test
- One Vitest test through the relay, red without the fix.
