zone: src/net
size: S
# A joiner whose host leaves before answering waits for ever

Found by batch B+D (its report): a client that joins between the host's departure and the host's `state` never gets a state, because the next host does not track unanswered joiners (ADR 0006, Join).

## DoD
- A joiner always receives a `state`, from whichever client is host when it is owed one.

## Acceptance
- A joiner whose host leaves between its `joined` and the host's `state` holds the host's table and entity list, deep-equal, within 500 ms of the `left`. Before: it waits for ever.

## Test
- One Vitest test through the relay, red without the fix.
