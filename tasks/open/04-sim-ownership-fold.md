zone: src/sim
size: L
# The ownership fold and tick snapshots

ADR 0006: `claim`, `release` and `left` folded over the relay's order into `{owner, held}` per entity, home owners, `setBodyType` on the fold's decision on every client, snapshots read from and applied to bodies with the rest flag. The fold is a pure function of the message list; nothing else decides who owns an entity.

## DoD
- Every fact has the owner ADR 0006's table names.

## Acceptance
- Two simultaneous grabs: the first delivered wins. A touch claim on a held prop is rejected.
- A touch claim on a character is rejected; only a grab takes a character, and its release returns it home.
- `left`: the leaver's props go to the host; a character the leaver carried goes back to its home.
- The same message list folded twice gives deep-equal tables.

## Test
- A Vitest test per rule above, each red with its rule removed; the report names which ones were checked that way.
