zone: src/sim
size: S
files: src/sim/touch.ts, src/sim/grab.ts, src/sim/ownership.test.ts, src/net/client.test.ts
# A touch or a grab on an entity the table says another client holds sends a claim and simulates the carried fish here for a round trip: it drops from the carrier's hand and snaps back

The fold's first rule refuses a claim on a row held by anyone but the sender (ownership.ts, `claim`). `touchClaims` skips only characters, what it simulates and what it owns; `reach` skips only what `mayHold` and `locked` refuse. So a body brushing the fish in a teammate's hand, or a dog's lunge at a cat another dog carries, sends the claim; for a prop it also goes in flight and turns dynamic on this client until the refusal comes back: the fish falls out of the carrier's hand on the toucher's screen (5 cm over a 100 ms round trip, 20 cm over 200 ms), then snaps back, again every 500 ms while they touch. A cat passing a fish to a teammate, or a dog meeting a carrier head-on, sees it.

Measured: the round at 8 clients, 6 claims sent, 1 sent while the sender's own table showed the target held by another (a touch on the fish c1:67 held by c1, at 58.4 s), refused. The runner's doomed-claim judge folds each claim against a fresh unheld row and cannot see this class.

ADR 0009's "the doomed claim never leaves" reads the predicate on the sender; this card reads the fold's first rule on the sender too, from the same table. A claim on a held row is not doomed in every order (a `release` delivered in between would let it in), but it is worthless: the toucher touches again within TOUCH_GAP after the release and claims then. The fold does not change.

## DoD
- `touchClaims` and `reach` send nothing for a row the table holds for another client, and put nothing in flight for it.

## Acceptance
- Claims sent while the sender's table showed the target held by another, in the round at 8 clients: 1 of 6 → 0; on a scripted brush against a carried fish, frames the fish's copy is dynamic on the toucher: ≥ 1 → 0.

## Test
- A touch test: a character walking into a fish another client's cat holds produces 0 claims and the fish's body stays kinematic on the toucher. Red without the fix.
