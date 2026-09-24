zone: src/content
size: XS
files: src/content/maps/fish-market.test.ts, src/content/maps/yacht.test.ts, src/content/maps/farm.test.ts, src/content/country-house.test.ts
# The fish market is the one map without an anatomy check in the gates, and the other three each carry a copy of the checker

country-house.test.ts (167 lines), yacht.test.ts (149) and farm.test.ts (34) each hold their own anatomy checks; fish-market.ts has no test. Card 136's numbers (exits 4 > dogs 3, farthest storage 12.8 m from the hatch) live in its report only, so an edit to the market that breaks the anatomy goes green. ADR 0008: "A content card proves them with a check over the data." Card 101 promises one anatomy function over a `Level`; until it lands, the market needs the yacht's check at least, and the three copies are the sign card 101 answers (one function, four data files).

## DoD
- `npm run test` checks the market's anatomy: exits outnumber the largest dog team, the fence is at least 4 m where it has no exit, 5 fish in storages of 3 costs, synced props within the budget, the carry walk from the farthest storage to the hatch; the check goes red with an exit removed, as the yacht's does.

## Acceptance
- Maps with an anatomy check in the gates: 3 of 4 → 4 of 4; the check red with an exit removed: 1 of 1.

## Test
- The check itself; its red case is the exit removed.
