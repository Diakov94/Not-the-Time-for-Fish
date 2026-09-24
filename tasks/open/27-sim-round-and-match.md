zone: src/sim
size: XL
# The round and the match

ADR 0007, in code: the round table's phases (`lobby`, `prep`, `heist`, `overtime`, `over`), the host's clock duty (`phase` at expiry, accepted only as the successor and only from the host the relay names), the folding of `secured`, `captured`, `rescue` and `dugOut` (cards 28 and 29 send them; this card folds them and their acceptance rules), the win conditions derived in the fold (three fish secured: cats; every cat captured: dogs; the heist timer out with no fish held, or overtime with none held or capped: dogs), the match of two rounds with sides swapped by respawn at `prep`, the winner by secured count, the tiebreak by the sender-carried time of the last secure, 0–0 a draw, the session's match score, and the balance knobs by player count (heist timer, mines per dog, dig-out time; a table with a row for 3–4, 5–6 and 7–8 players). GAME.md's numbers: prep 45 s, heist 10 min (the knob), overtime ≤ 60 s.

## DoD
- The round table is written only by its fold; `receive` clears the entity table on `phase prep` and the ownership fold clears its rows on the same message; the host spawns the level anew and every client its character with its side (card 25).
- Remaining time is derived from each client's own phase start and never sent; the fold stores the times messages carry.
- The next host continues the clock from its own phase start; two hosts cannot both advance a phase.

## Acceptance
- Three clients through the relay, time stepped in the sim: `prep` lasts 45.0 ± 0.1 s of sim time on every client; three `secured` end the round with cats on every client at the same message; every cat `captured` ends it with dogs; the heist timer out with a cat holding a fish gives `overtime`, its `release` gives `over` with dogs, 60 s gives `over`.
- The host leaves mid-heist: the next host's `phase heist → overtime` arrives within 250 ms of when the old host's would have; no phase is folded twice.
- Round 2 starts with every client's character of the other kind; a 2–2 match is won by the team whose third fish came sooner; 0–0 is a draw; the session score reads 1–0 after a won match and survives a `phase lobby`.
- The three knobs differ between 3 and 8 players (name the table).

## Test
- Vitest through the relay for each win condition, the migration and the tiebreak, each red with its rule removed. Two headless clients end a scripted round with deep-equal round tables (card 63 drives it; here: the Vitest round).
