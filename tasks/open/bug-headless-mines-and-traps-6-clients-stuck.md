zone: tools/headless
size: S
# mines-and-traps @ 6 clients: p4, p5 scripts stuck, trap not sprung (FAIL)

src/sim

M

## Defect

mines-and-traps scenario fails 100% of the time when run with 6 clients. The 5th and 6th player (p4, p5) entities get stuck on their navigation path, preventing the trap-springing event from completing.

## Evidence

- Command: `npm run headless -- --scenario mines-and-traps --clients 6`
- Run count: 5 runs
- Failure rate: 5/5 (100%)
- Affected scenario numbers: `per client blasts/defused/sprung/cleared: 1/1/0/1` (sprung=0 when should be 1)

### Sample Log Output (Run 1)

```
p4's script stopped: stuck at (-10.18, -12.59) on its way to (-10, -13)
p5's script stopped: stuck at (-10.36, -13.07) on its way to (-10, -13)
per client blasts/defused/sprung/cleared: 1/1/0/1, 1/1/0/1, 1/1/0/1, 1/1/0/1, 1/1/0/1, 1/1/0/1
wall time: 80.3 s; FAIL
```

### Test Run Details

| Run | Clients | Status | Details |
|-----|---------|--------|---------|
| 1 | 6 | ✗ FAIL | Script stuck, trap not sprung |
| 2 | 6 | ✗ FAIL | Script stuck, trap not sprung |
| 3 | 6 | ✗ FAIL | Script stuck, trap not sprung |
| 4 | 6 | ✗ FAIL | Script stuck, trap not sprung |
| 5 | 6 | ✗ FAIL | Script stuck, trap not sprung |

**Comparison (works with 4 clients)**:
- mines-and-traps @ 4 clients: 5/5 passed ✓

## Root Cause Analysis

The navigation script for players p4 and p5 (entities c53 and c56) fails to reach their target position (-10, -13) when running with 6 clients. The entities get stuck at intermediate positions:
- p4 stuck at (-10.18, -12.59)
- p5 stuck at (-10.36, -13.07)

This prevents the intended trap-springing event (where one of these players should step on a trap), causing the scenario validation to fail.

## Impact

- Scenario: mines-and-traps
- Triggers: Exclusively when `--clients 6`
- Repeatability: 100% (5/5 test runs)
- Severity: Critical - scenario cannot complete successfully

## Test Commands & Logs

- Command: `perl -e 'alarm 300; exec @ARGV' npm run headless -- --scenario mines-and-traps --clients 6`
- Log files: `/scratchpad/test_results/mines-and-traps_6_run{1,2,3,4,5}.log`
