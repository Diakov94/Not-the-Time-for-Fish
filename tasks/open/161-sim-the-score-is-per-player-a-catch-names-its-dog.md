zone: src/sim
size: M
files: src/sim/round.ts, src/sim/round.test.ts, src/sim/messages.ts, src/sim/heist.ts, src/sim/world.ts
# The score is per player: a fish for the cat that secured it, a catch for the dog that last held the cat

ADR 0014, after card 160. `r.secured` rows carry `by` (the sender's roster name); `captured {at, by}` carries the client that last held the captured cat's character, the cat's own sim's note of the accepted hold claim on its own character (null if never held), and the fold keeps `r.caught: {cat, by, at}[]` for the round, `by` a name; a `by` that is not a dog of this round scores nothing. At `over` the `Result` gets `points: Record<name, {n, last}>` (a point per fish as a cat, per catch as a dog, and the `at` of the last point). `scoreOf(r, name)` sums the results and the current round; at the last round's `over` the fold writes `r.match` as the top name (equal: the sooner last point; equal again: `'draw'`) and `r.score[name]++` for the life of the room. `r.score` starts empty and gains a name on its first win.

## DoD
- `secured.by`, `caught`, `captured.by`, `Result.points`, `scoreOf`, `r.match: string | 'draw' | null`, `r.score: Record<string, number>`; `Decider` keeps `more`, `sooner`, `level`.
- The last holder of the own character is one field of the sim, written where the hold claim on it is accepted, cleared at prep.

## Acceptance
- A scripted match at 5 players: p3 secures 2 fish, p0 catches 1 cat, p1 catches 2 → scores 2, 1, 2, and p3 wins by the sooner last point (before: a team won by fish count); a `captured` with `by` naming a cat's client scores 0.
- A wiggle-free or a hit before the kennel scores 0 catches (the `by` of a later `captured` is the dog that held the cat last, not the first).

## Test
- The round tests above; red without `by` in the fold's credit, and red with the tiebreak removed.
