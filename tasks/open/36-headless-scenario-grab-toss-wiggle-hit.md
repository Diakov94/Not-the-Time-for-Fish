zone: tools/headless
size: M
# Scenario: grab, toss, wiggle, hit at 3 clients

Cards 20–22 in play through three headless clients: a dog lunges at a cat carrying a fish, the fish drops, the dog carries and tosses the cat, a second cat frees it with a thrown crate, then the dog holds the other cat until it wiggles free. The scenario judges the ownership tables against ADR 0009's signs and prints the timings.

## DoD
- Every claim in the stream is one the predicate allows (the runner counts doomed claims: 0).

## Acceptance
- Exit 0 at 3 clients over 30 s; the fish is `held: false` on all three at the grab's message; the hit frees the cat within 150 ms on all three; the wiggle-free at 8.0 ± 0.15 s; divergence within the Prototype's limits with a carried cat.
- Doomed claims: 0 (before this batch: not counted).

## Test
- The scenario is the test; its exit code goes into the report, not the gates.
