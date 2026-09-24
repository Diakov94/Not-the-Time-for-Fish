zone: src/net
size: M
# Join handshake and host migration

`welcome` → the host spawns → `state` to the joiner → buffered replay by `seq` (ADR 0006, Join); net ids `<client>:<n>`.

## DoD
- A joiner learns every pose from that pose's owner, never from the host's copy.

## Acceptance
- A third client joining mid-run ends with an ownership table and entity list deep-equal to the host's within 500 ms.
- After the host leaves, the next host answers the next joiner.

## Test
- Vitest for both.
