zone: tools/headless
size: L
# Scenario: a round to the end at 3 and at 8 clients

STUDIO.md's playtest cut: a round to the end at three and at eight players. Two scripts per side over the country house: cats go for the table's fish, carry it out through an exit, one gets grabbed and tossed into the kennel, a teammate rescues; dogs plant at two exits, sniff, lunge, carry to the kennel. The round is driven to `over` by the sim's clock at a shortened heist knob for the run (a scenario parameter, not a norm change), and both endings are exercised across two runs: cats securing three, dogs by the timer. The judge: every client's round table deep-equal at the end, the winner as scripted, divergence within the Prototype's limits, and the numbers the QA role names (fish delivered, time to the first grab, mines armed and defused).

## DoD
- The scenario is the same script at 3 and at 8; only the roster's size and the knobs differ.
- The round tables are compared by the runner, not by eye.

## Acceptance
- 3 clients: cats win with 3 secured in ≤ 4 min of sim time; round tables deep-equal on all 3; divergence moving ≤ 0.25 m, resting ≤ 0.02 m.
- 8 clients (3 dogs, 5 cats): the same script ends in ≤ 6 min; tables deep-equal on all 8; ticks per client 19–21/s; wall time printed.
- The run with the timer ending: dogs win on every client at the same message.

## Test
- The scenario is the test; its exit code and numbers go into the report. Not in the gates (its length); `HEADLESS_GAMES_CMD` is the Producer's to point at it.
