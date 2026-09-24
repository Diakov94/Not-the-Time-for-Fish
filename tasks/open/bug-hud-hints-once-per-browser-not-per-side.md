zone: src/hud
size: S
files: src/hud/hints.ts, src/hud/hud.ts
# First-round hints are seen once per browser, not per side: a player's first dog round shows none

GAME.md, Onboarding: contextual hints during a player's first round (controls, objective, mines). Card 62 keys the seen list by hint name (`hud.hints.seen`) while every hint's text is per side (`HINT[hint][side]`). A player whose first round is as a cat marks `controls` and `objective` seen; the next round they play dogs, whose keys and objective differ, and `due` finds both seen. Measured in a two-tab session on the country house: after one cat round the browser holds `["controls","objective"]`, and the dog round shows 0 hints. The same goes for `mines` (the cat's whisker text against the dog's resupply text) and `kennel`.

Also, `due` reads and JSON-parses localStorage on every frame (60 parses a second for the life of the tab, `due` at 2.4 ms per 5 s in a CPU profile) even once every hint is seen; the seen set is a per-viewer memory the HUD may keep in memory and write through.

## DoD
- A hint is seen per side: the key is `<hint>:<side>`, so each side's four hints show once each per browser; H marks the shown side's hints seen, as today.
- The seen set is read from storage once and kept in memory; `see` writes through. Nothing else changes.

## Acceptance
- A browser that played a cat round then a dog round shows 2 hints in the dog's prep and heist (controls, objective) and 0 in its second dog round; before: 0 in the first.
- `localStorage.getItem` from the HUD: 1 call per session (before: 1 per frame, 60/s).

## Test
- None: a read of storage and the DOM; the counts are the check.
