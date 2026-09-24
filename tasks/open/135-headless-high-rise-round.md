zone: tools/headless
size: M
files: tools/headless/scenarios/high-rise.ts (new)
# A round to the end on the high-rise, headless

Card 63's round scenario proves the house; the high-rise (card 134) needs its own routes on the bot helpers of card 101 and the same judge. Found by its file name, no runner edit.

## DoD
- Routes for the high-rise: dogs mine the exits in prep and watch; runners take the table's fish out through an exit; a kitchen cat works the fridge; a grab, the kennel, a rescue; the round scenario's judge reused (imported from round.ts, unchanged).

## Acceptance
- `npm run headless -- --scenario high-rise --clients 3 --map high-rise` and at 8: 3 of 3 runs pass each; visible desyncs ≤ 1; down kB/s per client at 8 ≤ 100.

## Test
- None: the scenario is the measurement.
