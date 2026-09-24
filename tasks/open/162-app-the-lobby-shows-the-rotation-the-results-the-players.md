zone: src/app
size: M
files: src/app/screens/lobby.ts, src/app/screens/results.ts, src/app/screens/parts.ts, src/app/main.ts
# The lobby shows the roster with the next round's dogs; the results show every player's points

ADR 0014, after cards 160–161. The lobby's two team columns and the host's move button go: one roster in join order, each name with its next-round side from `rotation(r)` (the same function the fold applies at prep) and its character for that side; the pickers stay. The results show the round's outcome as a side, each player's points that round and in the match, the match winner by name with ADR 0014's tiebreak in words, and the session's match wins per player; `TEAM` and `score` in parts.ts go. The app's spectate target follows a free player of the same `side`. Cards 119, 120 and 145 restyle these screens and read the table as this card leaves it.

## DoD
- Lobby: one list, "пес наступного раунду" beside the names the rotation will pick, the count of rounds the match will have; no move button; no "команда" anywhere.
- Results: a row per player with points this round and in the match, the winner by name, the session score per player; the host's button unchanged.
- `main.ts` `target()` filters by `side`.

## Acceptance
- At 8 names in the lobby, 3 are marked as next dogs and the header says 3 rounds (before: two columns of 5 and 3); after a scripted round the results' points sum to the table's `scoreOf` for every name (8 of 8).
- `grep -c "команд" src/app` = 0 (before: 6).

## Test
- None: the screens send and show; a two-tab session checks the lobby's marks and the results' rows.
