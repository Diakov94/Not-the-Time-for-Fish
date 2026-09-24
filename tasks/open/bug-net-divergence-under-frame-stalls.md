zone: src/net
size: M
files: src/net/ticks.ts, src/net/client.ts, tools/headless/run.ts
# Copies drift far off their owner's path during frame stalls

Found while fixing bug-net-copy-freezes-at-an-ownership-change: under load (frames over 50 ms apart), copies reach 1.0–3.4 m off their owner's path in both the baseline and the fixed code, including entities that never change owner. The shell review measured the round at 6 clients: 5 of 5 runs broke the 0.25 m moving limit (0.9–2.2 m). Linked: bug-app-host-tab-stall-holds-the-clock, bug-net-round-at-six-clients-copies-spike-off-their-owners-path, review-net-copies-hitch-on-a-two-step-frame.

## DoD
- A copy stays on its owner's path through a stall of up to 250 ms on either client, or the runner names the stall and judges it separately.

## Acceptance
- `npm run headless -- --scenario round --clients 6` passes the moving limit in 5 of 5 runs at load average ~30. Before: 0 of 5.

## Test
- The runner's judge, red without the fix under an injected stall.
