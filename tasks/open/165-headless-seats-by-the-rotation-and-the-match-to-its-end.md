zone: tools/headless
size: M
files: tools/headless/run.ts, tools/headless/scenarios/round.ts, tools/headless/scenarios/bots.ts, tools/headless/main.ts
# The runner seats nobody by message: the rotation's round-1 sides, `--rounds` to the match's end

ADR 0014, after cards 160–161. The runner sends `roster` to side every seat as the scenario says and waits for the fold to agree; the fold picks the sides itself now. A round scenario's seat i gets the side the rotation gives it in round 1 of N seats (the first `dogCount(N)` names in join order are dogs), so `player(i, level)` needs N or the runner derives the expected side itself; `sided` compares the fold's `Player.side`; the bots keep re-reading `place(c)` at every prep. `--rounds N` plays min(N, `r.rounds`) rounds and `over` reads `results.length`; the round judge names the winner as a side and the top scorer by name. The profile's two-round command keeps working (2 ≤ 3 at 6 players).

## DoD
- No `roster` message in `tools/headless`; readiness by `side`; the scenario's expected side per seat from the sim's own `dogCount`; the judge's end line: side, why, fish, the top name and its points.
- `--rounds` up to `r.rounds`; a run past it ends at the match's `over` with `r.match` a name or `'draw'`.

## Acceptance
- `npm run headless -- --scenario round --clients 3` and `--clients 8`: exit 0 in 3 of 3 runs each; at 8 the sides line reads p0, p1, p2 dog (before: p0, p4, p7).
- `--scenario round --clients 6 --seconds 200 --rounds 3`: three results on every client, every name a dog exactly once, `r.match` the same name on 6 of 6 clients.

## Test
- None: the scenario is the measurement.
