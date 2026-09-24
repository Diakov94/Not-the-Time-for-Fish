zone: src/sim
size: M
files: src/sim/round.ts, src/sim/round.test.ts, src/sim/messages.ts
# The rotation picks the dogs at every prep; the match lasts as many rounds as the rotation needs

ADR 0014 (the owner's decision of 2026-09-24): no fixed teams. `Player.team` and the `roster` message go; the fold writes `Player.side` at every `prep` for the seated players (client connected as of the message) by one pure `rotation(r)`: the fewest dog rounds in this match's `results` first, then roster order; the first `dogCount(n) = Math.round(n / 3)` names are dogs. At round 1's prep the fold also writes `r.rounds = Math.ceil(n / dogCount(n))` and `successor` reads it where it read 2. `catsTeam`, `autoTeam`, `Team` and `Roster` leave the sim; `playsAs` reads `side`; `positionOf` counts the roster of the same side; each `Result` records its `dogs`. A rejoiner keeps its side for the round; a name not seated at prep has `side: null` and waits for the next prep, as a name with no team did. Card 161 adds the score on top of this; the callers outside the sim are cards 162–165.

## DoD
- `Player.side: Side | null`, `rotation(r)`, `dogCount(n)`, `roundsOf(n)`, `r.rounds`; the prep fold writes the sides and, at round 1, the round count; `Result.dogs`; `successor` ends the match at `r.rounds`.
- No `roster` message anywhere in `src/sim`; the host's `receiveRound` answers no hello with a team.
- The lobby's preview and the fold call the same `rotation`.

## Acceptance
- For every seated count 3–8, the dog count at each prep is GAME.md's (1, 1, 2, 2, 2, 3) and the match has 3, 4, 3, 3, 4, 3 rounds; at the end every name was a dog at least once and the dog counts differ by at most 1 (before: at 8 players round 2 seated 5 dogs).
- At 8 players the dogs of round 1 are p0, p1, p2, of round 2 p3, p4, p5, of round 3 p6, p7, p0.

## Test
- The round tests over a scripted table at every count 3–8 (the two numbers above); red with the rotation replaced by a fixed pick, and red with `successor` still ending at 2.
