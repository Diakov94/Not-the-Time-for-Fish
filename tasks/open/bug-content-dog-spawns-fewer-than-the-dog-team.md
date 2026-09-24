zone: src/content
size: S
files: src/content/country-house.ts, src/content/maps/farm.ts, src/content/maps/fish-market.ts, src/content/maps/yacht.ts, src/content/level.ts (the schema test)
# Every map has 3 dog spawn points; round 2 of a 6–8 player match seats 4–5 dogs, so two start inside each other

Found by the shell review of 2026-09-24 running the profile's own command, `npm run headless -- --scenario round --clients 6 --seconds 120 --rounds 2`: exit 1 in 3 of 3 runs. In round 2 the big team plays dogs (6 players → 4 dogs, 8 → 5). `pointFor` hands out `points[n % points.length]`, and every map declares 3 dog spawns against 5 cat spawns (country house x = 4, 5.5, 7 at z 12.5; farm, fish market and yacht the same three), so the fourth dog spawns inside the first. Run 1 showed it directly: "p0's script stopped: stuck at (4.00, 12.46) on its way to (4, 14)", the hunter held on its own spawn point (4, 12.5) by the fourth dog standing in it. Runs 2 and 3 failed earlier, in round 1, on the six-client spike of `bug-net-round-at-six-clients-copies-spike-off-their-owners-path`, a separate defect; the overlap is certain from the points alone. In the browser two players start every 6+ match's second round inside each other.

GAME.md's Map Anatomy asks the exits to outnumber the largest dog team a map hosts; the spawns must at least equal it, 5, as the cat side already has. Owner: the map's points (ADR 0008's schema); `pointFor` stays as it is, since wrapping is right for the n-th cat of five. The schema test names the rule so the high-rise (card 134) and every later map cannot forget it.

## DoD
- Each map: ≥ 5 dog spawn points, ≥ 1 m apart, in the yard, clear of the doghouse and the kennel.
- The level schema test: for every map, dog spawns ≥ 5 and cat spawns ≥ 5, the largest team GAME.md seats.

## Acceptance
- `--scenario round --clients 6 --seconds 150 --rounds 2`: exit 0 in 3 of 3 runs (before: exit 1 in 3 of 3); at 8 clients, round 2's five dogs stand at five distinct points at prep (the dump shows five distinct poses, before: three).

## Test
- The schema test above; red with a map at 3 dog spawns.
