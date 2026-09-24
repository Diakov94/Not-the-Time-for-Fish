import { expect, test } from 'vitest';
import { anatomy } from '../anatomy.ts';
import type { Box, Level, Vec3 } from '../level.ts';
import { countryHouse } from './country-house.ts';

const { statics, volumes, points, props, doors } = countryHouse;
// The sim's bodies the house is sized to (card 22, the C1/S1 contract): a cat's and a dog's capsule diameter.
const CAT = 0.5;
const DOG = 0.8;
const AXES = ['x', 'y', 'z'] as const;
const lo = (b: Box, k: keyof Vec3) => b.p[k] - b.half[k];
const hi = (b: Box, k: keyof Vec3) => b.p[k] + b.half[k];
const inside = (p: Vec3, b: Box) => AXES.every((k) => Math.abs(p[k] - b.p[k]) <= b.half[k] + 1e-9);
const overlaps = (a: Box, b: Box) => AXES.every((k) => Math.abs(a.p[k] - b.p[k]) < a.half[k] + b.half[k]);
const role = (r: string) => volumes.filter((v) => v.role === r);
const at = (r: string) => points.filter((p) => p.role === r).map((p) => p.p);

// The promises every map keeps (anatomy.ts), by name, that a level breaks.
const broken = (level: Level) => anatomy(level).filter((c) => !c.kept).map((c) => c.promise);

test('the anatomy goes red on the house with one exit removed and with the fence at 2 m', () => {
  const exit = volumes.findIndex((v) => v.role === 'exit');
  const lowFence = statics.map((s) => (s.label === 'fence' ? { ...s, p: { ...s.p, y: 1 }, half: { ...s.half, y: 1 } } : s));
  console.log(`broken: the house ${broken(countryHouse).length}; an exit removed: ${broken({ ...countryHouse, volumes: volumes.filter((_, i) => i !== exit) })}; the fence at 2 m: ${broken({ ...countryHouse, statics: lowFence })}`);
  expect(broken({ ...countryHouse, volumes: volumes.filter((_, i) => i !== exit) })).toEqual(['exits']);
  expect(broken({ ...countryHouse, statics: lowFence })).toEqual(['fence']);
});

test('the country house keeps the promises of its anatomy', () => {
  // The map anatomy's promises (card 101): exits, carry range, fence height, fish, spawns, the tunnel.
  for (const c of anatomy(countryHouse)) console.log(`${c.promise}: ${c.measured}${c.kept ? '' : ' BROKEN'}`);
  expect(broken(countryHouse)).toEqual([]);

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
    const tops = fence.filter((f) => inside({ ...c, y: 0.05 }, f)).map((f) => hi(f, 'y'));
    if (!exit) height = Math.min(height, Math.max(0, ...tops));
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
  console.log(`exit gaps ${widths} m; fence height ${height} m (>= 3); mantle ledge ${ledge.toFixed(1)} m from it (>= 3)`);
  console.log(`openings outside the exits ${stray}, exit gap points open to dogs ${open}; rooms ${rooms}`);
  console.log(`drop-off to the nearest exit ${dropOff.toFixed(1)} m (<= 15)`);
  expect(Math.min(...gaps.values())).toBeGreaterThanOrEqual(CAT);
  expect(height).toBeGreaterThanOrEqual(3);
  expect(ledge).toBeGreaterThanOrEqual(3);
  expect(stray).toBe(0);
  expect(open).toBe(0);
  expect(rooms).toBeGreaterThanOrEqual(3);
  expect(dropOff).toBeLessThanOrEqual(15);

  // Card 18. Five fish in three storages, one of each access cost (the fish and the carry range: anatomy).
  const fish = at('fish');
  const holding = role('storage').filter((s) => fish.some((f) => inside(f, s)));
  const costs = holding.map((s) => (s.role === 'storage' ? s.access : '')).sort();
  const hatch = at('hatch')[0]!;
  const hideoutHolds = [...at('catSpawn'), ...at('tunnelExit')].every((p) => inside(p, hideout));
  const inFence = (b: Box) => b.p.x - b.half.x > ix0 && b.p.x + b.half.x < ix1 && b.p.z - b.half.z > iz0 && b.p.z + b.half.z < iz1;
  const fenceHolds = [...at('dogSpawn').map((p) => ({ p, half: { x: 0, y: 0, z: 0 } })), ...role('doghouse')].every(inFence);
  const cage = Math.min(...statics.filter((s) => s.label.startsWith('kennel')).map((s) => hi(s, 'y')));
  const latchOut = at('latch').every((p) => !role('kennel').some((k) => inside(p, k)));
  console.log(`storages holding fish ${holding.length} with costs {${costs.join(', ')}}`);
  console.log(`tunnel exit and ${at('catSpawn').length} cat spawns in the hideout: ${hideoutHolds}`);
  console.log(`${at('dogSpawn').length} dog spawns and the doghouse inside the fence: ${fenceHolds}`);
  console.log(`bags ${at('bag').length} (>= 6), trap pickups ${at('trapPickup').length} (>= 3)`);
  console.log(`kennel walls ${cage} m (>= 2.5), hatch at ${hatch.y} m, latch outside the cage: ${latchOut}`);
  expect(costs).toEqual(['door', 'lid', 'open']);
  expect(hideoutHolds && fenceHolds && latchOut).toBe(true);
  expect(at('bag').length).toBeGreaterThanOrEqual(6);
  expect(at('trapPickup').length).toBeGreaterThanOrEqual(3);
  expect(cage).toBeGreaterThanOrEqual(2.5);

  // Card 19. Every hiding spot is a slot between two solids that stand flush with its long sides from the
  // ground: its entrance is the slot's width, or none if a side is open.
  const boxes = props.flatMap((p) => ('box' in p.shape ? [{ p: p.p, half: p.shape.box }] : []));
  const solids = [...statics.filter((s) => s.blocks === 'all'), ...boxes];
  const carried = props.flatMap(({ p, hidingSpot: h }) => (h ? [{ p: { x: p.x + h.p.x, y: p.y + h.p.y, z: p.z + h.p.z }, half: h.half }] : []));
  const spots = [...role('hidingSpot'), ...carried];
  const entrance = (s: Box) => {
    const [k, l] = s.half.x < s.half.z ? (['x', 'z'] as const) : (['z', 'x'] as const);
    const flush = (face: number, b: Box) =>
      Math.abs(face - (face === lo(s, k) ? hi(b, k) : lo(b, k))) < 0.01 &&
      lo(b, 'y') <= lo(s, 'y') + 0.01 &&
      Math.min(hi(b, l), hi(s, l)) > Math.max(lo(b, l), lo(s, l));
    return solids.some((b) => flush(lo(s, k), b)) && solids.some((b) => flush(hi(s, k), b)) ? 2 * s.half[k] : Infinity;
  };
  const entrances = spots.map(entrance);
  const fits = entrances.every((w) => w > CAT && w < DOG);
  const walled = (h: Box) => ({ p: h.p, half: { x: h.half.x + 0.2, y: h.half.y, z: h.half.z + 0.2 } });
  const nearHouse = (b: Box) => role('house').some((h) => overlaps(b, walled(h)));
  const routes = statics.filter((s) => s.blocks === 'dogs' && !exits.some((e) => overlaps(s, e)) && nearHouse(s));
  const synced = props.filter((p) => p.synced).length;
  const debris = props.length - synced;
  console.log(`hiding spots ${spots.length} (>= 6), ${carried.length} carried by props (>= 4)`);
  console.log(`entrances ${entrances.map((w) => w.toFixed(2)).join(' / ')} m, each wider than a cat's ${CAT} and narrower than a dog's ${DOG}: ${fits}`);
  console.log(`cat routes into or inside the house ${routes.length} (>= 3); doors ${doors.length} (>= 2)`);
  console.log(`synced props ${synced} (>= 20, <= 60); debris ${debris} (>= 20)`);
  expect(spots.length).toBeGreaterThanOrEqual(6);
  expect(carried.length).toBeGreaterThanOrEqual(4);
  expect(fits).toBe(true);
  expect(routes.length).toBeGreaterThanOrEqual(3);
  expect(Math.min(...routes.map((r) => 2 * Math.max(r.half.x, r.half.z)))).toBeGreaterThanOrEqual(CAT);
  expect(doors.length).toBeGreaterThanOrEqual(2);
  expect(synced).toBeGreaterThanOrEqual(20);
  expect(synced).toBeLessThanOrEqual(60);
  expect(debris).toBeGreaterThanOrEqual(20);
});
