zone: src/sim
size: S
# An impact between two clients' crates sometimes pings twice

Found by batch H2's gates run. The gates exited 1 on src/net/client.test.ts, "two clients' crates shoved into each other: one noise for the impact, heard on both from the echo": `expected 2 to be 1`, with the log line "noise for the impact: c1, c3 on A; 2 on B". Run alone 6 times, the test failed once and passed five times. src/ is byte-identical to the batch's base (77ef0cc), so this is not a new failure.

The rule is in `sends` (src/sim/events.ts): when two simulated bodies meet, only the owner of the lower net id sends the noise, unless the other body "cannot have felt it". Each client judges that from its own copy of the other body (`other.body.linvel()` above RESTING). One impact thus gives two pings whenever the higher id's client reads the other's copy as still at that step. **Not verified:** a copy that has no new target between two snapshots may read as still. The batch's traces show copies standing still that way at ownership changes (bug-net-copy-freezes-at-an-ownership-change.md).

## DoD
- One impact between bodies simulated on two clients gives one noise, whatever each client's copy of the other body reads at that step.

## Acceptance
- The test above passes 20 runs of 20 alone and in the gates. Before: 5 of 6 alone, and it failed the gates once.

## Test
- The existing test is the red one; run it repeatedly.
