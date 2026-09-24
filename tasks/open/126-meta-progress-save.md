zone: src/meta
size: L
files: src/meta/progress.ts (new), src/meta/progress.test.ts (new), src/app/main.ts
# The progress save: what this player has done, counted once, under one key

ADR 0013: progress is a local save with one owner, written from the round table's ends and this client's own events; GAME.md: `localStorage`, no accounts. A new owner of state, so the studio reviews it.

## DoD
- Counters: matches played, rounds won as cats and as dogs, fish secured by this player, cats captured, rescues, defuses, mines planted, dig-outs; `progress()` reads; `record(sim)` runs once a frame from the loop (one line in main.ts) and counts an `over` once by the round table's turn, never by the frame, and this client's own events (`from === sim.me`) once each.
- One versioned key; defaults and a no-op write when storage fails.

## Acceptance
- After one match in two tabs, the host's progress shows matches 1 and the rounds won as the results say; a reload keeps it; the results screen redrawn 100 frames counts 1 (not 100).

## Test
- Unit: the same `over` fed twice counts once; an event from another client counts 0; red without the guards.
