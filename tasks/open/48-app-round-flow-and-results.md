zone: src/app
size: M
# The round flow and the results

GAME.md, Menus: lobby → match (two rounds, sides swapped between them) → results → back to the lobby. The app switches its screens on the round table's phase (card 27): the canvas for prep, heist and overtime; a results screen at `over` with the round's outcome (who won, fish secured, why: three fish, the timer, every cat captured) and after round 2 the match's outcome (secured per round, the tiebreak's reason when it decided, a draw) and the session score; the host's button goes to the next round or back to the lobby. Ukrainian text; the app holds no result of its own.

## DoD
- The phase is read from the round table every frame; the app never guesses a phase from a timer or a message of its own.
- Between rounds the character is respawned by the sim's rule (ADR 0009), not by the screen.

## Acceptance
- At `over`, every tab shows the results within one frame with the same winner and count; the reason shown matches the fold's (a tester provokes each of the four ends).
- Round 2 starts with every player's character of the other side, visible on screen; a 2–2 match shows the tiebreak's reason; 0–0 shows a draw; the session score reads 1–0 after a won match.

## Test
- None: a browser check per ending named in the report, with one screenshot of the results.
