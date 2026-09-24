zone: tools/headless
size: M
files: tools/headless/scenarios/session.ts (new), tools/headless/run.ts, tools/headless/main.ts
# The MVP success criteria as headless checks: a session of two matches

GAME.md, MVP success criteria: six friends play two matches back to back and ask for a third; at most one visible desync per round. The first is the friend group's answer; what an instrument can answer is that two matches run to the results with every client agreeing and the desyncs under the bar. Card 66 measured 120 s at six; a match is `r.rounds` rounds (ADR 0014: 3 at 6 and at 8 players), a session of two matches 6.

## DoD
- A scenario `session`: two matches (six rounds, the dogs rotating as the fold picks them) at 6 and at 8 clients, the round scenario's bots (card 165); one verdict line per criterion: every `over` at one message, the match decided the same on every client, visible desyncs ≤ 1 per round (per round, not per run), ticks 19–21/s, no script errors; the wall time.
- The Producer's profile lists it (`--scenario session --clients 6`).

## Acceptance
- `npm run headless -- --scenario session --clients 6` exit 0 with its wall time named; at 8 clients visible desyncs per round ≤ 1 (name each round's number).

## Test
- None: the scenario is the measurement.
