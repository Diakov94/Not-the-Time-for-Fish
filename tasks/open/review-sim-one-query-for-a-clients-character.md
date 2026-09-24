zone: src/sim
size: XS
files: src/sim/entities.ts, src/app/main.ts, src/render/work.ts, src/audio/audio.ts, src/hud/hud.ts, src/sim/round.ts, src/sim/ownership.ts, tools/headless/scenarios/house.ts
# "The character of client X" is spelled out in eight places; the app keeps its own list of the play phases

`[...sim.entities.values()].find((e) => e.home === client && isCharacter(e.kind))` appears in main.ts, render/work.ts, audio.ts, hud.ts, round.ts (twice: `dugOut` and `removals`), ownership.ts (twice) and headless/house.ts: one fact, eight spellings, and `myCharacter` in movement.ts a ninth by `simulatedHere`. The next rule about it (a despawned character, a client with two rows during a rejoin) would have to be repeated eight times or be missed in seven. Beside it, main.ts keeps `PLAY = ['prep', 'heist', 'overtime']` next to round.ts's `inPlay`: two owners of which phases are play; the HUD already asks `inPlay`.

Owner: the entity table (ADR 0003, 0004): `characterOf(entities, client)` in src/sim/entities.ts, asked by everyone; `inPlay` for the app. A mechanical card, no behaviour change; it touches one line in six zones, so it lands between waves.

## DoD
- One query in entities.ts; the eight sites call it; main.ts asks `inPlay`.

## Acceptance
- `grep -rn "home === .* && isCharacter" src tools | wc -l` → 1 (before: 8); `grep -c "PLAY" src/app/main.ts` → 0 (before: 3); `npm run gates` exit 0.

## Test
- None: a move.
