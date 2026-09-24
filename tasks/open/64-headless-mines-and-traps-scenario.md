zone: tools/headless
size: M
# Scenario: mines armed, sniffed and defused; a trap sprung and cleared

STUDIO.md's playtest cut: mines armed, sniffed and defused. Four clients: two dogs plant at an exit and in a doorway; one cat sneaks in, gets the whisker cue, defuses one, steps on the other and is stunned; the other cat plants a trap that one dog clears while the other dog is pulled by a second trap sprung across the yard. The judge reads the event list and the entity table: one `blast`, one `defused`, one `sprung`, one `cleared`, the stun's length, the ping count per client.

## DoD
- Every number the scenario prints comes from the runner's samples, not from the script's expectations.

## Acceptance
- Exit 0 at 4 clients; blasts 1, defuses 1, sprung 1, cleared 1 on every client's counts; the stunned cat's intent ignored for 3.0 ± 0.1 s; the whisker cue seen by the sneaking cat before the defuse; the ping counts equal on the two dogs' clients.

## Test
- The scenario is the test; numbers in the report.
