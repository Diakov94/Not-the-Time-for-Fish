zone: src/content
size: M
files: src/content/characters.ts (new), src/content/characters.test.ts (new), src/sim/round.ts, src/app/screens/lobby.ts, src/render/looks.ts
# The character roster as content data: twelve characters, one owner

ADR 0011: the concept of a character is data, and today the list has three owners (the count `LOOKS = 3` in src/sim/round.ts, the names in src/app/screens/lobby.ts, the builders in src/render/looks.ts). GAME.md, Characters, names six cats and six dogs, each differing in looks and emotes only.

## DoD
- `src/content/characters.ts` lists the twelve in GAME.md's order: id (ASCII, the file name art will use), side, the Ukrainian name, palette slots (fur, belly or muzzle, one accent), the signature detail in one line, the emote names (one to four; The Egg's includes the topple).
- The round's look bound is the side's count from the roster; the lobby names the six per side from it; render maps a look index through the roster (a look with no geometry yet draws the side's placeholder of the same index modulo three, said in a comment, until cards 112–115).
- A data check: six per side, ids unique and ASCII, every character has at least one emote.

## Acceptance
- The lobby shows 6 names per side (before 3); a player picking look 5 in one tab is drawn as look 5 in the other tab (the roster's fact).
- 12 entries, 0 duplicate ids.

## Test
- The round fold test that accepts looks 0–2 accepts 0–5 and rejects 6: red without the change. The data check goes red with a cat removed.
