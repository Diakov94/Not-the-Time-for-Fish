zone: repository root (batch A, with src/sim)
size: S
# The toolchain: install and gates

One npm package, no workspaces (ADR 0003): vite, typescript, vitest, eslint, three, @dimforge/rapier3d-compat, ws. A strict tsconfig with path aliases for the six zones. `npm run gates` = `tsc --noEmit`, eslint, the two zone greps of ADR 0003, `vitest run`.

## DoD
- `npm ci && npm run gates` works on a fresh clone.

## Acceptance
- `npm run gates` exits 0 on an empty suite in under 30 s on a free machine; the wall time is in the report.
- A planted `import 'three'` in src/sim turns the gates red (removed before the commit).

## Test
- None: the gates' own exit code is the check.
