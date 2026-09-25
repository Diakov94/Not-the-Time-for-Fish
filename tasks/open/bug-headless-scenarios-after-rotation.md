zone: tools/headless
size: M
files: tools/headless/run.ts, tools/headless/scenarios/mines-and-traps.ts, tools/headless/scenarios/chase-kennel-rescue-rejoin.ts, tools/headless/scenarios/session.ts
# Three headless scenarios out of step with the rotation's seats (#67) and the balance knobs (#66)

Found by the Producer's final verification of develop at 61bf2d7; the game's judges (sync, tables, desyncs) pass:
1. `mines-and-traps --clients 4` exits 1: 0 blasts, so the stun judge reads NaN. At 6 clients it passes.
2. `chase-kennel-rescue-rejoin --clients 4` (and 6) crashes: "TypeError: Cannot read properties of null (reading 'sim')".
3. `session --clients 6` ran over 400 s with no stated length.

## DoD
- Each scenario exercises what its card asks: a mine stepped on and one defused (64); a chase, the kennel, a rescue, a rejoin and the host's leaving (65); two whole matches (131).
- No judge or threshold loosened.

## Acceptance
- `mines-and-traps` and `chase-kennel-rescue-rejoin` at 4 and 6 clients, 3 runs each: exit 0.
- `session` at 6 clients: exit 0, its length named.
- `npm run gates` exit 0.
