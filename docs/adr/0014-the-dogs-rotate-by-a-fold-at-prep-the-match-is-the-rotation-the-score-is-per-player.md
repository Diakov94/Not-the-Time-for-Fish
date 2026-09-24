---
status: accepted
date: 2026-09-24
supersedes: the roster's team, the match rows and the two-round successor of ADR 0007
---

# The dogs rotate: the fold picks them at every prep, the match lasts as long as the rotation, the score is per player

The owner decided on 2026-09-24: no fixed teams, the dogs are picked anew every round at GAME.md's 1:2 ratio and rotate so every player plays dog as equally as possible, the score is per player. ADR 0007 built the match on two fixed teams that swap sides, so in an 8-player match the second round seated 5 dogs against 3 cats, off the ratio and over the exit count. This ADR replaces that part of ADR 0007 and nothing else: the round table stays one fold over the relay's order, written by `foldRound` on every client, and the host still holds only the clock.

## Owners

| fact | owner | born where |
| --- | --- | --- |
| the roster: player name → client, looks, worn, captured, **and its side this round** (`Player.side: Side \| null` replaces `team`) | the round table, `src/sim/round.ts`, written only by its fold | `hello {name}` as before (join order is the roster's order); `side` is written by the fold at the `phase {to: 'prep'}` message for every seated player (a client connected as of that message), null for a name not seated, which waits for the next prep as today. No `roster` message: it leaves the union |
| who is a dog this round | the fold at prep, by one pure function `rotation(r)` over the seated players: the fewest dog rounds in this match's `results` first, then roster order; the first `dogCount(n) = Math.round(n / 3)` names are the dogs (3 → 1, 4 → 1, 5 → 2, 6 → 2, 7 → 2, 8 → 3), everyone else a cat | the same `prep` message; every client holds the same roster and results as of it, so every client writes the same sides. The lobby shows `rotation(r)` as a preview of the next round; the fact is the fold's write at prep |
| how many rounds the match has | `r.rounds`, written by the fold at round 1's prep: `Math.ceil(n / dogCount(n))` for the n seated then (3 → 3, 4 → 4, 5 → 3, 6 → 3, 7 → 4, 8 → 3), the fewest rounds in which every player is a dog at least once with the counts at most one apart | the same message; `successor` reads `r.rounds` where it read 2 |
| a secured fish and who secured it | `r.secured: {fish, at, by}[]`, `by` the roster name of the sender | `secured {fish, at}` unchanged; the fold names the sender |
| a catch: which dog put a cat in the kennel | `r.caught: {cat, by, at}[]` this round, `by` a name or null | `captured {at, by}` from the captured cat's client, as before, with `by` the client that last held its character: the cat's own sim notes the holder at the accepted hold claim on its own character (a local fact like `digOut`), null if never held. The fold turns the client into a name; a `by` naming no dog of this round scores nothing |
| a round's result | `Result = { dogs: string[]; secured; last; why; winner: Side; points: Record<name, { n, last }> }`: the round's dogs (the rotation reads them), the cats' count and its last `at` (the round's own tiebreak stays), who won as a side, and each name's points that round (a fish as a cat, a catch as a dog) with the `at` of its last point | derived by the fold at `over` from `secured` and `caught` |
| a player's match score | derived, never stored: `scoreOf(r, name)` sums `results[].points` and the current round's lists | one function, read by the HUD, the results and the fold's match outcome |
| the match winner, the session score | `r.match: name \| 'draw' \| null`, `r.score: Record<name, number>` for the life of the room | derived by the fold at the last round's `over`: the top score; equal, the sooner last point (`points[name].last`, the sender's `at` into its round, as ADR 0007's tiebreak); equal again, a draw and no session win |
| what this browser's player has won | `src/meta/progress.ts` (ADR 0013), reading `Player.side` and `Result.winner`; a match is played when `ev.round === r.rounds` | unchanged owner, new fields |

A rejoiner keeps its `side` for the round, as it kept its team. A player who joins mid-match is seated at the next prep with zero dog rounds, so the rotation makes it a dog next; `r.rounds` does not move. Below three seated players the rule still gives a number (2 → 1 dog, 1 → none); the host's button is the guard, not the fold.

## Considered options

- **Exact fairness, `n / gcd(n, d)` rounds** (3, 4, 5, 3, 7, 8): rejected. A 7- or 8-player match is 7–8 rounds, 80–90 min at GAME.md's 10-min rounds, a whole session for one match, refuting the success criterion of two matches back to back. The spread of at most one dog round in the fewest rounds is what "as equally as possible" buys; the price is one player per match at 5, 7 and 8 who is a dog twice, always the earliest joiner among the equals.
- **A fixed round count for every roster** (2 or 3): rejected. At 4 players one of four never plays dog in a 3-round match.
- **A cyclic pick by roster index** (the next d names after last round's dogs): rejected. The same seats on a stable roster, but a leave or a join shifts every index; "fewest dog rounds first" reads only facts already in the table (`results[].dogs`) and survives both.
- **A host override of the pick** (a `dogs` message, ADR 0007's reassignment by hand): rejected. A second owner of the pick beside the rotation, and a fair rotation undone by hand. The price: a late friend cannot be spared the dog by hand; the sign that it was needed is in the refutation.
- **The catch credited by the fold from the ownership row**: rejected. When `captured` is sent the cat is unheld inside the kennel and its row is back with its own client; the only client that saw the last hold claim on that character is the cat's, and it names the holder.
- **The catch credited at the grab**: rejected. A wiggle-free or a hit would score a point for nothing.
- **Per-player counters kept in `Player`**: rejected. A second owner of the sum beside the results; the sum is a function.
- **Amending ADR 0007 in place**: rejected. Its round part stands unchanged, and the fixed-team table is the history that explains why this ADR exists.

## Consequences

- `Team`, the `Roster` message, `catsTeam`, `autoTeam` leave `src/sim`; `Player.side`, `rotation`, `dogCount`, `roundsOf`, `scoreOf` enter; `Result` and the table's match rows change shape, and a joiner's `state` carries them as before (ADR 0006). `captured` gains `by`; the sim notes the last holder of the own character.
- The lobby loses the two team columns and the move button: one roster in join order with each name's side for the next round; the results show every player's points and the match's top score; the HUD's mates and the app's spectate target read `side`; the meta save reads `side` and `winner: Side`.
- The art's two-colour pair marks the sides (cats light, dogs dark) wherever a colour stands for a group; card 117's band is a side band.
- The headless runner seats nobody by message: a scenario's seat i has the side the rotation gives it in round 1 (the first d names in join order are dogs), and the readiness check compares the fold's `side` with it; the bots already re-read their side at every prep. `--rounds N` plays up to `r.rounds`; the round judge names the winner as a side and the top scorer by name.
- Voice: a player moves channel when the rotation moves it (GAME.md).
- Cards 160–166 carry the code; `bug-content-dog-spawns-fewer-than-the-dog-team` is moot (never more than 3 dogs) and the session scenario of card 131 counts rounds by `r.rounds`.

## Refutation sign

Two clients disagreeing on who is a dog after the same prep message (the rotation read something outside the table); a round whose dog count is off GAME.md's table for its seated count; a match at n players ending with a player never a dog, or two players' dog counts two apart; a catch credited to a name that never held that cat, or a wiggle-free scoring; two clients summing a player's score differently; a rejoiner changing side mid-round; the friend group asking for a manual swap more than once a session (the dropped override was needed, and the price above was misjudged).
