zone: tools/headless
size: M
# Eight clients: message rate, bytes and CPU

ADR 0005's arithmetic (8 players at 20 Hz: 160 messages/s, 29,000 billed requests an hour) and GAME.md's 3–8 players need a number before the first 8-player playtest: eight headless clients on a level with 40 synced props (card 16's schema lets the scenario build one) all shoving props for 30 s. The runner prints per client: tick messages/s, bytes/s up and down (the echo doubles), and the relay's messages/s; and the Node process's CPU share. Card 45 acts on the number if it is over budget.

## DoD
- The numbers are printed by the runner, not estimated; the scenario keeps every client's owned props moving so the measurement is the worst case, not the resting one.

## Acceptance
- 8 clients × 30 s: exit 0 on divergence; ticks ≤ 21/s per client; relay ≤ 170 messages/s; bytes/s down per client printed (the budget: ≤ 100 KB/s; if over, card 45 is live, else it closes with this number).
- Ticks sent stay at 20/s under load (a stalled client would send fewer: name the minimum seen).

## Test
- None: the run and its numbers in the report.
