zone: src/relay
size: M
# The room module and its Node host

ADR 0005: the pure module `src/relay/room.ts` (members in join order, the host, a per-room `seq`, fan-out to every member including the sender, `welcome` / `joined` / `left`), its Node host on `ws`, and `npm run relay`. The game payload is opaque to it.

## DoD
- The module's whole state is `{members, seq}`.

## Acceptance
- Three members receive the same 100 messages in the same order with the same `seq`, each sender included.
- When the host leaves, `left` names the next host.

## Test
- Vitest: the order test above and a serialisability test of the module's state.
