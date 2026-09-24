zone: src/meta
size: XS
files: src/meta/progress.ts, src/meta/progress.test.ts
# The progress save counts a round won by the side this player played and a match at its last round

ADR 0014, after cards 160–161. `record` reads `Player.team` and `Result.cats` to count a win per side, and `ev.round === 2` for a match; the table has `Player.side`, `Result.winner: Side` and `r.rounds` now. The `captured` counter may now count only catches by this player (`caught[].by === me`), which the ADR 0013 comment about "the dogs catch as a team" no longer needs.

## DoD
- A round won counts under `wins[side]` when `result.winner === me.side`; `matches++` when `ev.round === r.rounds`; `captured` counts this player's catches.

## Acceptance
- A scripted 3-round match at 5 players: `matches` 1 (before: 1 at round 2, 0 at round 3), `wins` per the sides played, `captured` = this player's catches (before: every capture while a dog).

## Test
- The progress tests; red with `matches` still counted at round 2.
