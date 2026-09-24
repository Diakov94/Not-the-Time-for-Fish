zone: src/hud
size: S
files: src/hud/hud.ts, src/hud/words.ts, src/app/main.ts
# The HUD says nothing about the player's own state: grabbed, captured with its dig-out, whom it watches

GAME.md, UI/HUD: teammate status is on screen (card 61); the player's own state is not. A grabbed cat sees its screen carried off with no word (its mates read "схоплений"); a captured cat spectates (card 51) with no word that it is in the kennel, no dig-out countdown, though the kennel rule's ~60 s per cat (the knob's `digOut`) is the one number a benched player wants, and no name of the teammate Tab switched it to; its items line still reads "Пастка: є". Every fact is on this client: held is the ownership table's row of the own character, captured is the round table's, the dig-out end is `sim.digOut` (ADR 0007: the own client's clock), the watched teammate is the app's `target()`.

## DoD
- One own-state line under the clock: "Тебе схопили" while the own character's row is held; "Ти у вольєрі · підкоп через m:ss" while captured, with "дивишся: <ім'я>" when the camera follows a teammate (the app passes the target it already decides; the HUD copies nothing); absent while free. The items line is hidden while captured.

## Acceptance
- The dig-out countdown reads within 1 s of `sim.digOut - sim.time` and shows 0:00 at the `dugOut` message; grabbed shows within 1 frame of the accepted claim; while free the line is absent (0 elements, before: 0 lines in every state).

## Test
- None: a read of the tables.
