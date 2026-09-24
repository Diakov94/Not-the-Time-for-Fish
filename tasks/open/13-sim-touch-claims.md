zone: src/sim
size: M
# Touch claims, and local simulation while a claim is in flight

ADR 0006: on the first contact between a body this client simulates and a prop another client owns, a claim with `hold: false`, at most once per prop per 500 ms. While that claim or a grab is in flight, this client simulates the prop and ignores incoming snapshots for it until the fold decides. The sim produces the claims; the caller's loop sends them. No card owned this after batch A (its report).

## DoD
- A character can push a prop another client owns, and the fold still decides who owns it.

## Acceptance
- Two clients through the relay: a character walking into a crate the other client owns moves it more than 0.2 m on both clients within 1 s.
- Touch claims for one prop go out at most twice per second.
- When the fold rejects the claim (the prop is held), the prop returns to its owner's snapshots within 150 ms.

## Test
- Vitest for each number, red with its rule removed.
