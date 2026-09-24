# chase-kennel-rescue-rejoin scenario: intermittent movement synchronization failures (clients=4)

src/sim

M

## Command
```
npm run headless -- --scenario chase-kennel-rescue-rejoin --clients 4
```

## Reproduction
- Run count: 8 runs
- Failures: 3 out of 8 (runs 1, 4, 6)
- Consistent error: moving distance exceeds 0.25 m limit

## Judge Failures
All failures show the same pattern:
- Run 1: max moving 0.289 m (limit 0.25) — exceeds by 0.039 m
- Run 4: max moving 0.380 m (limit 0.25) — exceeds by 0.130 m
- Run 6: max moving 0.261 m (limit 0.25) — exceeds by 0.011 m

Passing runs maintain moving values between 0.133-0.207 m.

## Details
The movement judge is detecting that one or more entities are deviating from their expected path by more than 0.25 m. This is an intermittent failure, occurring randomly across test runs rather than consistently.

The judge failure message shows:
```
max: moving 0.289 m (limit 0.25), resting 0.001 m (limit 0.02)
```

This indicates a movement synchronization issue between clients, possibly related to:
- Latency in message delivery
- Desynchronization in entity position updates
- Movement path calculation discrepancies

## Impact
- Intermittent test failures (37.5% failure rate with 4 clients)
- Unreliable headless testing for this scenario
- May indicate underlying network or simulation sync issues
