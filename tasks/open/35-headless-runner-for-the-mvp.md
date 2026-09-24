zone: tools/headless
size: L
# The runner for the MVP: N clients, scripts per side, scenarios by name

The Prototype's runner drives one script for everyone in one room. The MVP's scenarios (STUDIO.md §4, the playtest cut; cards 36, 37, 63–66) need a headless client per side with its own script, a room whose players hello with names and get teams (card 25), a readiness check that reads the level's entity count rather than a crate list, the round table and the event list in every sample, and a scenario chosen by name from the command line: `npm run headless -- --scenario <name> --clients N --seconds S`. The gates keep their 10 s game as the default scenario; `HEADLESS_GAMES_CMD` in the profile is the Producer's to update.

## DoD
- A scenario is a script of intents and actions per side over time, in one file per scenario; the runner and the judge (divergence, and from card 63 the round tables) are shared.
- The runner needs no browser and no jsdom (ADR 0003 stands); a scenario the runner does not know exits 2 with the list of names.

## Acceptance
- The default scenario at 2 clients exits 0 with the Prototype's numbers (moving ≤ 0.25 m, resting ≤ 0.02 m); at 3 clients with 1 dog and 2 cats hello'd, every client's roster agrees and the dog's script differs from the cats'.
- The sample of a run carries every client's round table and event count; two clients' tables deep-equal at the end.
- `npm run gates` wall time grows by ≤ 3 s over the current 26 s.

## Test
- The negative of card 11 stays red; the unknown scenario's exit code is the test.
