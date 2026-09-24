zone: src/net
size: XS
files: src/net/protocol.ts, src/net/client.ts
# `State.entities` is typed without `variant`: a joiner's water bombs and slip traps keep their variant only because TypeScript does not check a mapped literal

`answer` in client.ts maps `{ id, kind, home, prop, variant }` into a field typed `{ id; kind; home; prop? }[]`. The excess property passes because the callback's return is inferred, so `variant` travels by accident and `adopt` reads it from the spread. Naming the return type, or a `satisfies`, drops it silently: a joiner mid-round would then fold a water bomb as a firecracker and a slip trap as a noise maker (the fold's `sprung` reads `e.variant`), with every table agreeing. The type is the contract net carries (ADR 0006, 0008); it should say what travels.

## DoD
- `State.entities` names `variant?` beside `prop?`; nothing else changes.

## Acceptance
- `tsc` red when `variant` is dropped from `answer`'s literal: 0 of 1 → 1 of 1 (checked once by hand at delivery; no runtime test, since the runtime already carries it).

## Test
- None: a type contract, proven by `npm run typecheck`.
