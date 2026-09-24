zone: src/sim
size: XS
files: src/sim/heist.ts, src/sim/round.ts, src/sim/round.test.ts
# `sim.securing` is a one-shot: a `secured` the fold refuses leaves that cat unable to secure that fish for the rest of the round

`roundStep` adds a fish to `securing` the step it sends `secured` and nothing removes it before the next prep. The fold refuses a `secured` whose row the sender no longer holds at the fold: a throw or a drop pressed in the same frame and delivered first, or a grab landing at the line. The same cat carrying the same fish into the hideout later sends nothing; a teammate has to carry it in, and nobody sees why. `capturing` already takes the table's answer (`roundStep`: cleared once `me.captured` says so); `securing` needs the same: forgotten when this client's own `secured` folds refused, or when the fish leaves its hand.

## DoD
- A fish whose `secured` was refused, or that was dropped, can be secured by the same cat on its next carry.

## Acceptance
- A cat whose first `secured` was refused (its throw delivered first) secures the same fish on its next carry: 0 of 1 → 1 of 1.

## Test
- A round test with the throw delivered before the `secured`, then a second carry. Red without the fix.
