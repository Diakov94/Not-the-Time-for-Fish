zone: src/meta
size: M
files: src/meta/unlocks.ts (new), src/meta/unlocks.test.ts (new)
# The unlock rules: every cosmetic earned by playing

ADR 0013: a rule per catalogue id (card 111) over the progress (card 126); the catalogue encodes no rule and the sim checks nothing. GAME.md, Meta Loop: cosmetic unlocks earned by playing.

## DoD
- Twelve rules, one per id, reachable within a few sessions (a first match, 10 fish secured, 5 rescues, 3 wins as dogs, 20 mines planted, a dig-out, ...); `unlocked(progress)` and `newlyUnlocked(before, after)` for the lobby's picker and the results' toast (card 145).
- A test that every rule names a catalogue id and every catalogue id has a rule.

## Acceptance
- 12 rules for 12 ids, 0 orphans either way; the highest threshold named and reachable in ≤ 5 matches by a player who plays both sides; a fresh browser has 0 unlocked and the picker says so.

## Test
- The orphan test; a progress fixture that unlocks exactly the ids its numbers earn, red with a threshold moved.
