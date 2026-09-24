zone: src/content
size: M
# The level schema, and the Prototype room written in it

ADR 0008: the level is data with a schema content owns. `src/content/level.ts` declares `Level` with the parts and roles of the ADR's table (statics with `blocks`, volumes by role, points by role, self-describing props with shape, mass, `synced` and an optional hiding spot, doors), and `src/content/prototype-room.ts` writes the Prototype room in it (floor, four walls, ten crates as synced props) so the schema is exercised before the house lands. The sim keeps reading its own `src/sim/level.ts` until card 26 retires it: two rooms for one wave, one in use.

## DoD
- Content imports nothing from the game and no three.js or DOM; `npm run zones` (owner: `package.json`) checks `src/content` the way it checks `src/sim`, and rejects a path into `hud` or `audio` from the four Node-safe zones.
- The schema carries no code that runs a level: no Rapier, no functions beyond builders of data.

## Acceptance
- `npm run zones` prints nothing; a planted `import 'three'` in `src/content` turns it red.
- The Prototype room in the schema lists the same 10 crate centres as `src/sim/level.ts` (a check over the data, not a test that reads both).

## Test
- None beyond the zone grep: a data check named in the report.
