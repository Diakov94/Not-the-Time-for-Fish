zone: src/sim
size: XS
files: package.json
# The zone grep guards the four new zones

ADRs 0011–0013 add `src/art`, `src/settings`, `src/input` and `src/meta`. `npm run zones` (its one owner is package.json, ADR 0003) must reject them from the headless zones before their first file lands, so no card can wire the sim to a browser zone by accident.

## DoD
- `src/sim`, `src/net`, `src/relay`, `src/content` may not import `art`, `settings`, `input`, `meta` (beside `render`, `app`, `hud`, `audio` as today).
- `src/art` may not import `sim`, `net`, `app`, `hud`, `audio`; `src/settings` imports nothing from the game; `src/meta` may not import `render`, `app`, `hud`.
- A missing folder is not an error (the grep is silent on it).

## Acceptance
- A planted `import '../settings/store.ts'` in src/sim turns `npm run zones` red; without it the gates stay green and their wall time is unchanged.

## Test
- The plant above, removed before the commit.
