zone: src/net
size: M
files: src/net/ticks.ts, src/net/client.ts, tools/headless/scenarios/round.ts (the reproduction)
# The round at six clients breaks the moving limit in 5 of 5 runs: every copy spikes 0.9–2.2 m off its owner's path

Found by the shell review of 2026-09-24 with the profile's own commands. `npm run headless -- --scenario round --clients 6 --seconds 120` exits 1 in 2 of 2 runs, and the two-round variant in 3 of 3 (one of those by the spawn overlap of `bug-content-dog-spawns-fewer-than-the-dog-team`, the other two by this). The moving judge's worst: 2.220, 2.110, 1.515 and 2.220 m against a limit of 0.25. In one run nearly every entity is over it at once: four cats 1.5–2.2 m, both dogs 0.9–1.2 m, three fish 0.6–1.0 m, the crates at 0; visible desyncs stay at 0 (nothing is off for more than 1 s), so these are spikes, not drift. The same scenario at 3 clients (0.198 m) and 8 clients (0.166 m) passes, as do mines-and-traps at 4, chase-kennel-rescue-rejoin at 4 and eight-clients; the gates' two-client game never sees it. Card 66 measured six clients × 120 s with 0 visible desyncs and did not quote the moving number. A control on 6874a56, the commit before merge #32 (map choice, water bomb, slip trap), fails the same limit but by a different margin: 0.434 m on one dog and 0.297 m on one cat in one run, 0.579 m on three cats in the other, the range of the open `bug-net-copy-freezes-at-an-ownership-change` (0.26–0.38 m at a grab). So the limit was already broken at six clients before #32, and #32 made it an order of magnitude worse and spread it to every entity: two defects, or one made worse; the trace decides.

Something at six clients moves every copy at once for under a second. Candidates the trace decides: one client's frames pausing while its copies are interpolated past their buffer; the round-1 kennel toss and its release pose reaching the copies through a `release` whose handoff state the receiver's buffer does not restart from (the open `bug-net-copy-freezes-at-an-ownership-change` is the same buffer at 0.26–0.38 m; this is ten times that); a scenario step at six seats that no other count takes. The runner keeps every frame's dumps and turns (`Sample`, `Turn`), so the first step is to print, for the worst entity, the frame of the spike, the owner's poses around it and the messages folded within 200 ms of it, before any fix.

## DoD
- The spike traced to one owner and named in the card's report; the fix in that owner's zone, with the moving number back under the limit.

## Acceptance
- `--scenario round --clients 6 --seconds 120`: exit 0 in 5 of 5 runs with moving ≤ 0.25 m (before: exit 1 in 5 of 5, 1.5–2.2 m); 3 and 8 clients unchanged (≤ 0.2 m).

## Test
- Only if the trace finds a rule (a buffer restart, a release pose): a net test that goes red without the fix. The scenario is the measurement otherwise.
