zone: src/hud
size: S
# First-round hints

GAME.md, Onboarding: contextual hints during a player's first round (controls, objective, mines); prep doubles as the safe moment to learn the controls; no tutorial map. One short phrase at the right moment (the UI role's rule): the controls of the player's side during prep, the objective at heist's start, the mine hint at the first whisker cue or the first blast, the kennel hint at the first capture. Seen once per browser (`localStorage`), never again; a key hides them.

## DoD
- Each hint is triggered by a sim fact (the phase, an event, a query), shown once, and holds no state beyond "seen".

## Acceptance
- A fresh browser sees exactly 4 hints across its first round, each ≤ 12 words, none longer than 6 s on screen; a second round in the same browser sees 0; the hints never cover the fish counter or the timer (a screenshot with a hint up).

## Test
- None: a browser check named in the report.
