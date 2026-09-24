import { expect, test } from 'vitest';
import { countryHouse } from './country-house.ts';
import type { Box, Vec3 } from './level.ts';

const { statics, volumes } = countryHouse;
const AXES = ['x', 'y', 'z'] as const;
const lo = (b: Box, k: keyof Vec3) => b.p[k] - b.half[k];
const hi = (b: Box, k: keyof Vec3) => b.p[k] + b.half[k];
const inside = (p: Vec3, b: Box) => AXES.every((k) => Math.abs(p[k] - b.p[k]) <= b.half[k] + 1e-9);
const overlaps = (a: Box, b: Box) => AXES.every((k) => Math.abs(a.p[k] - b.p[k]) < a.half[k] + b.half[k]);
const role = (r: string) => volumes.filter((v) => v.role === r);

test('the country house keeps the promises of its anatomy', () => {
  // Card 17. The fence's centre line, from its boxes.
  const fence = statics.filter((s) => s.label === 'fence');
  const exits = role('exit');
  const t = Math.min(...fence.map((f) => 2 * Math.min(f.half.x, f.half.z)));
  const [x0, x1] = [Math.min(...fence.map((f) => lo(f, 'x'))) + t / 2, Math.max(...fence.map((f) => hi(f, 'x'))) - t / 2];
  const [z0, z1] = [Math.min(...fence.map((f) => lo(f, 'z'))) + t / 2, Math.max(...fence.map((f) => hi(f, 'z'))) - t / 2];
  const columns: Vec3[] = [];
  for (let x = x0; x <= x1; x += 0.05) columns.push({ x, y: 0, z: z0 }, { x, y: 0, z: z1 });
  for (let z = z0; z <= z1; z += 0.05) columns.push({ x: x0, y: 0, z }, { x: x1, y: 0, z });
  // Every point of the line up to 3 m is fence, or a gap inside an exit that a dogs blocker closes.
  let stray = 0;
  let open = 0;
  let height = Infinity;
  const gaps = new Map(exits.map((e) => [e, 0]));
  for (const c of columns) {
    const exit = exits.find((e) => inside(c, e));
    let gap = false;
    for (let y = 0.05; y < 3; y += 0.1) {
      const p = { ...c, y };
      if (fence.some((f) => inside(p, f))) continue;
      gap = true;
      if (!exit) stray++;
      else if (!statics.some((s) => s.blocks === 'dogs' && inside(p, s))) open++;
    }
    if (exit && gap) gaps.set(exit, gaps.get(exit)! + 0.05);
    if (!exit) height = Math.min(height, Math.max(0, ...fence.filter((f) => inside({ ...c, y: 0.05 }, f)).map((f) => hi(f, 'y'))));
  }
  // Nothing a cat stands on or climbs within 3 m of the fence's inside, but in an exit.
  const [ix0, ix1, iz0, iz1] = [x0 + t / 2, x1 - t / 2, z0 + t / 2, z1 - t / 2];
  const ledges = [...statics.filter((s) => s.blocks === 'all' && s.label !== 'fence' && hi(s, 'y') > 0), ...role('climb')].filter(
    (b) => b.p.x > ix0 && b.p.x < ix1 && b.p.z > iz0 && b.p.z < iz1 && !exits.some((e) => overlaps(b, e)),
  );
  const ledge = Math.min(...ledges.map((b) => Math.min(lo(b, 'x') - ix0, ix1 - hi(b, 'x'), lo(b, 'z') - iz0, iz1 - hi(b, 'z'))));
  const rooms = role('house').length;
  const hideout = role('hideout')[0]!;
  const dropOff = Math.min(...exits.map((e) => Math.hypot(e.p.x - hideout.p.x, e.p.z - hideout.p.z)));
  const widths = [...gaps.values()].map((w) => w.toFixed(2)).join(' / ');
  console.log(`exits ${exits.length} (>= 4), gaps ${widths} m; fence height ${height} m (>= 3); nearest mantle ledge ${ledge.toFixed(1)} m from it (>= 3)`);
  console.log(`openings outside the exits ${stray}, exit gap points open to dogs ${open}; rooms ${rooms}; drop-off to the nearest exit ${dropOff.toFixed(1)} m (<= 15)`);
  expect(exits.length).toBeGreaterThanOrEqual(4);
  expect(Math.min(...gaps.values())).toBeGreaterThanOrEqual(0.5); // a cat passes each (card 22's 0.5 m capsule)
  expect(height).toBeGreaterThanOrEqual(3);
  expect(ledge).toBeGreaterThanOrEqual(3);
  expect(stray).toBe(0);
  expect(open).toBe(0);
  expect(rooms).toBeGreaterThanOrEqual(3);
  expect(dropOff).toBeLessThanOrEqual(15);
});
