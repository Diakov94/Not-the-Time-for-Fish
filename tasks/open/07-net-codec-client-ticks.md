zone: src/net
size: M
# Codec, client, ticks and interpolation

A JSON codec for ADR 0006's messages; the client over the global `WebSocket` (Node and browser alike); the ~20 Hz tick sender (owned and moved entities only, the rest flag, a resend on `joined`); the receiver with a 100 ms interpolation buffer; the state-dump format shared by the desync hotkey and the headless comparison.

## DoD
- One client code path for Node and the browser; `ws` stays a relay-host dependency.

## Acceptance
- Two in-process clients through the Node relay: a crate moved on one shows on the other within 150 ms.
- A resting crate produces 0 ticks per second.

## Test
- Vitest for both numbers.
