zone: src/app
size: M
files: src/app/screens/lobby.ts, src/app/screens/results.ts
# The lobby's map pick and cosmetics picker; the results' unlock toast

GAME.md, Menus: the host picks the map; Meta Loop: cosmetics earned by playing. The pick is card 128's message, the worn is card 105's, the unlocked list is card 127's; the screens only send and show.

## DoD
- The host picks a map from the maps the app found (card 101), sends `map`; every client shows the pick from the round table.
- A picker of hats and accessories from `unlocked()`, sending `look` with `worn`; with nothing unlocked, "Нічого ще не відкрито" and the nearest rule's hint.
- The results show what the last match unlocked (`newlyUnlocked`).

## Acceptance
- A pick in the host's tab shows in the other tab within one relay hop (≤ 100 ms measured with the F9 dump's time); a hat picked in one tab is on the character in both at prep (2 of 2).

## Test
- None: the screens send and show.
