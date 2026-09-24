zone: tools/headless
size: M
files: tools/headless/run.ts, tools/headless/run.test.ts, tools/headless/main.ts, .studio/project.conf
# The round at 6 clients fails the moving judge 5 of 5 (0.68–5.0 m) with equal tables and 0 visible desyncs: the judge records the runner's own frame stalls as divergence

Measured this review, the QA command of `.studio/project.conf` (`round --clients 6 --seconds 120 --rounds 2`) and its single-round form:

| run | max moving (limit 0.25) | visible desyncs | tables | largest frame gap |
| --- | --- | --- | --- | --- |
| 6 clients, 2 rounds, 120 s (×3) | 1.467, 5.037, 1.830 m | 0, 0, 0 | equal | up to 878 ms (73.4 s), 555, 449, 351, 317 ms |
| 6 clients, 2 rounds, 80 s, `--trace-gc` | 0.753 m | 0 | equal | 155 ms; longest GC pause 39 ms |
| 6 clients, 1 round | 0.684 m | 0 | equal | not printed |
| 3 clients, 1 round | 0.191 m | 0 | equal | |
| 8 clients, 1 round | 0.156 m | 0 | equal | |

The largest copy-to-owner distances fall at the instants of the largest gaps (5.3 m at 74.4 s, 5.1 m at 73.4 s, 3.2 m at 57.9 s), on sprinting dogs (9 m/s) and carried fish (4.2 m/s). GC is not the cause (39 ms). The mechanism: the runner is one event loop; a frame that runs long leaves every snapshot that arrived meanwhile queued, and `onmessage` then stamps them all with one arrival time. `interpolate` finds no entry older than DELAY_MS, the copy stands, and DELAY_MS later it jumps to the last of them, while the owner's sim has caught its accumulator up in one `step`. The moving judge takes the maximum over the run against the owner's path in a ±TICK_MS window, so one 300 ms frame becomes (300 − 50) ms × 9 m/s ≈ 2 m of "divergence" that no client ever showed another. The visible judge (> 0.5 m for > 1 s) is right to count 0.

So the profile's own QA line has been red, and card 131's session (four rounds at 6 and 8) will be red on delivery for the same reason. Two answers, the worker names which by its number: the judge discounts the frames after a gap over 2 × TICK_MS (a stall is the runner's, not a desync), and the run prints its largest gap; or the runner stops stalling (what it retains per frame, the cost of `judge.see` at 6 × 60 rows, the round-end work at 73 s). The line `--seconds 120 --rounds 2` also cannot reach two rounds (round 1 ends at ~70 s and prep is 45 s): it is the 120 s soak card 66 ran; either it gets the seconds two rounds need (≥ 250) or the profile calls it a soak.

Named alternative on the net side, not chosen here: interpolating by a sender-stamped tick time instead of arrival would smooth a burst after a stall on a real browser too (a tab's GC pause); its price is a stamp per tick and a clock offset per sender, and ADR 0006's arrival rule would reopen. A stalled client freezes its own character as well, so the game does not pay for it today.

## DoD
- The run prints its largest frame gap and the moment; frames within DELAY_MS after a gap over 2 × TICK_MS are not judged for moving divergence, or the runner no longer produces such gaps at 6 clients.
- The profile's 2-round line runs two rounds, or is named the soak it is.

## Acceptance
- `round --clients 6` and `round --clients 6 --seconds 120 --rounds 2`: 0 of 5 → 3 of 3 pass, with the largest gap printed per run; `round --clients 8` unchanged (max moving ≤ 0.25 m, visible 0).

## Test
- run.test.ts: a run with one injected 400 ms frame (a busy loop in the loop's body once) passes the moving judge and prints the gap. Red without the change.
