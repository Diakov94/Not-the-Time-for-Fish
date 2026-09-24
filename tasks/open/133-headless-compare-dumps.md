zone: tools/headless
size: S
files: tools/headless/main.ts, tools/headless/run.ts
# Two browsers' desync dumps compared by the runner's judge

GAME.md, Testability: a "report desync" hotkey dumps the local snapshot for comparison between clients. The F9 dumps exist (card 10); the friend group's "at most one visible desync per round" needs the comparison to be one command.

## DoD
- `npm run headless -- --compare a.json b.json`: the runner's divergence judge over two dumps: per entity the distance, the entities over the visible bar, exit 1 above it.

## Acceptance
- Two dumps taken in two tabs of one session: 0 entities over 0.5 m; one dump with a crate moved 1 m by hand → exit 1 naming the crate.

## Test
- None: the edited dump is the check.
