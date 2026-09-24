zone: src/app
size: S
files: src/app/screens/results.ts, src/app/screens/room.ts, index.html
# The results in the game's style, the hint bar from the bindings, a way out of the room

Card 48's results are a list of sentences; the hint bar of card 50 spells every key by hand (card 103 made it ask the input zone). GAME.md, Menus: results → back to the lobby; a player also needs to leave a room without closing the tab.

## DoD
- The results screen in the menu's style: the round's outcome, every player's points and the match's winner by name (card 162), the session score per player, ADR 0014's tiebreak named.
- The hint bar shows the bound keys through the input zone (card 103) and hides after the first round for a browser that has seen the hints.
- "Вийти з кімнати" on the lobby and the results: the socket closes and the room screen returns.

## Acceptance
- A remapped key shows its new name in the hint bar with no edit to the screen; leaving returns to the room screen within 1 s and the other tab sees `left` (the roster shows "поза кімнатою").

## Test
- None: layout and text; the leave is checked in two tabs.
