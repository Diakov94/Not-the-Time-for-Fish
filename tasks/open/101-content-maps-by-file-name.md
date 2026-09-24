zone: src/content
size: M
files: src/content/maps/country-house.ts (moved), src/content/maps/country-house.test.ts (moved), src/content/anatomy.ts (new), src/app/main.ts, tools/headless/main.ts, tools/headless/run.ts, tools/headless/scenarios/bots.ts (new), tools/headless/scenarios/house.ts
# Maps by file name, the anatomy check as one function, the headless runner takes a map by name

ADR 0011: a map is `src/content/maps/<name>.ts`, its name is its file name, and no index file lists them, so four map batches (134–141) never touch one shared file. The app finds the maps by a Vite glob; the headless runner imports one by name. The anatomy every map promises (GAME.md, Map Anatomy) is checked by one function any map's test calls.

## DoD
- The country house moves to `src/content/maps/`; the app takes the map by name from a glob over that folder (`country-house` until card 128 lets the host pick); no `maps.ts` index exists.
- `src/content/anatomy.ts`: the checks as one function over a `Level`: exits outnumber the largest dog team (3); every storage within a named carry distance of the hatch; the fence taller than a fish toss; 5 fish in 3+ storages with three access costs; at least one cat route and one hiding spot; spawn points for 5 cats and 3 dogs; a tunnel exit in the hideout. The house's test calls it.
- `npm run headless -- --map <name>` loads that map for any scenario; a scenario is found by its file name under `tools/headless/scenarios/` (the record in main.ts goes); the bot helpers every map's scenario needs (go, until, hold, pounce, toss, rescue, phase, place) move from house.ts into bots.ts, house.ts keeps the house's routes.

## Acceptance
- `npm run headless -- --scenario round --clients 3 --map country-house` exit 0; `--map nope` exit 2 naming the maps; `npm run gates` exit 0 with its wall time within 10 % of before.

## Test
- The anatomy function goes red on a copy of the house with one exit removed and with the fence at 2 m.
