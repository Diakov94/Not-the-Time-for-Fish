import { expect, test } from 'vitest';
import type { Box, Level, Vec3 } from '../level.ts';
import { yacht } from './yacht.ts';

// Card 140: the yacht keeps the map anatomy (GAME.md, Map Anatomy). Card 101's anatomy function over a
// `Level` is to own these checks; until it lands they are measured here, with the country house test's
// method and numbers.
const CAT = 0.5; // a cat's capsule diameter (card 22)
const DOGS = 3; // the largest dog team
const CARRY = 16; // m a carrying dog walks at 2.0 m/s in the 8 s before a cat wiggles free
const SYNCED = 26; // the country house's synced props, the snapshot budget card 45 measured
const AXES = ['x', 'y', 'z'] as const;
const lo = (b: Box, k: keyof Vec3) => b.p[k] - b.half[k];
const hi = (b: Box, k: keyof Vec3) => b.p[k] + b.half[k];
const inside = (p: Vec3, b: Box) => AXES.every((k) => Math.abs(p[k] - b.p[k]) <= b.half[k] + 1e-9);
const overlaps = (a: Box, b: Box) => AXES.every((k) => Math.abs(a.p[k] - b.p[k]) < a.half[k] + b.half[k]);

// Whether the segment a-b in the ground plane passes through the inside of the box's footprint.
function crosses(a: Vec3, b: Vec3, box: Box): boolean {
  let [t0, t1] = [0, 1];
  for (const k of ['x', 'z'] as const) {
    const d = b[k] - a[k];
    if (d === 0) {
      if (a[k] <= lo(box, k) || a[k] >= hi(box, k)) return false;
      continue;
    }
    const [u, v] = [(lo(box, k) - a[k]) / d, (hi(box, k) - a[k]) / d];
    [t0, t1] = [Math.max(t0, Math.min(u, v)), Math.min(t1, Math.max(u, v))];
    if (t0 >= t1) return false;
  }
  return true;
}

// The shortest walk in straight lines from `from` to each of `to` around the walls and whatever stops a
// dog: a visibility graph over the corners of those boxes, 5 cm out.
function walks(level: Level, from: Vec3, to: Vec3[]): number[] {
  const blockers = level.statics.filter((s) => s.label === 'wall' || s.blocks === 'dogs');
  const corner = (b: Box, i: number, j: number) => ({ x: b.p.x + i * (b.half.x + 0.05), y: 0, z: b.p.z + j * (b.half.z + 0.05) });
  const nodes = [from, ...to, ...blockers.flatMap((b) => [corner(b, -1, -1), corner(b, -1, 1), corner(b, 1, -1), corner(b, 1, 1)])];
  const dist = nodes.map((_, i) => (i === 0 ? 0 : Infinity));
  const open = new Set(nodes.keys());
  while (open.size > 0) {
    const i = [...open].reduce((m, j) => (dist[j]! < dist[m]! ? j : m));
    open.delete(i);
    for (const j of open) {
      const [a, b] = [nodes[i]!, nodes[j]!];
      if (!blockers.some((box) => crosses(a, b, box))) dist[j] = Math.min(dist[j]!, dist[i]! + Math.hypot(b.x - a.x, b.z - a.z));
    }
  }
  return to.map((_, i) => dist[i + 1]!);
}

// The anatomy's numbers for a level whose fence is the statics labelled `fence`.
function anatomy(level: Level, fence: string) {
  const { statics, volumes, points, props } = level;
  const role = (r: string) => volumes.filter((v) => v.role === r);
  const at = (r: string) => points.filter((p) => p.role === r).map((p) => p.p);
  const rails = statics.filter((s) => s.label === fence);
  const exits = role('exit');
  // The fence's centre line from its boxes; every point of it up to 3 m is fence, or a gap inside an exit
  // that a dogs blocker closes; its lowest top outside the exits is what a toss must clear.
  const t = Math.min(...rails.map((f) => 2 * Math.min(f.half.x, f.half.z)));
  const [x0, x1] = [Math.min(...rails.map((f) => lo(f, 'x'))) + t / 2, Math.max(...rails.map((f) => hi(f, 'x'))) - t / 2];
  const [z0, z1] = [Math.min(...rails.map((f) => lo(f, 'z'))) + t / 2, Math.max(...rails.map((f) => hi(f, 'z'))) - t / 2];
  const columns: Vec3[] = [];
  for (let x = x0; x <= x1; x += 0.05) columns.push({ x, y: 0, z: z0 }, { x, y: 0, z: z1 });
  for (let z = z0; z <= z1; z += 0.05) columns.push({ x: x0, y: 0, z }, { x: x1, y: 0, z });
  let [stray, open, height] = [0, 0, Infinity];
  const gaps = new Map(exits.map((e) => [e, 0]));
  for (const c of columns) {
    const exit = exits.find((e) => inside(c, e));
    let gap = false;
    for (let y = 0.05; y < 3; y += 0.1) {
      const p = { ...c, y };
      if (rails.some((f) => inside(p, f))) continue;
      gap = true;
      if (!exit) stray++;
      else if (!statics.some((s) => s.blocks === 'dogs' && inside(p, s))) open++;
    }
    if (exit && gap) gaps.set(exit, gaps.get(exit)! + 0.05);
    if (!exit) height = Math.min(height, Math.max(0, ...rails.filter((f) => inside({ ...c, y: 0.05 }, f)).map((f) => hi(f, 'y'))));
  }
  // Nothing a cat stands on or climbs within 3 m of the fence's inside, but in an exit.
  const [ix0, ix1, iz0, iz1] = [x0 + t / 2, x1 - t / 2, z0 + t / 2, z1 - t / 2];
  const within = (b: Box) => b.p.x > ix0 && b.p.x < ix1 && b.p.z > iz0 && b.p.z < iz1;
  const ledges = [...statics.filter((s) => s.blocks === 'all' && s.label !== fence && hi(s, 'y') > 0), ...role('climb')].filter(
    (b) => within(b) && !exits.some((e) => overlaps(b, e)),
  );
  const ledge = Math.min(...ledges.map((b) => Math.min(lo(b, 'x') - ix0, ix1 - hi(b, 'x'), lo(b, 'z') - iz0, iz1 - hi(b, 'z'))));
  const fish = at('fish');
  const holding = role('storage').filter((s) => fish.some((f) => inside(f, s)));
  const hideout = role('hideout')[0]!;
  const carried = props.filter((p) => p.hidingSpot).length;
  return {
    exits: exits.length,
    gap: Math.min(...gaps.values()),
    stray,
    open,
    height,
    ledge,
    fish: fish.length,
    loose: fish.filter((f) => !role('storage').some((s) => inside(f, s))).length,
    costs: holding.map((s) => (s.role === 'storage' ? s.access : '')).sort(),
    carry: Math.max(...walks(level, at('hatch')[0]!, holding.map((s) => s.p))),
    cats: at('catSpawn').filter((p) => inside(p, hideout)).length,
    tunnel: at('tunnelExit').filter((p) => inside(p, hideout)).length,
    dogs: at('dogSpawn').filter((p) => within({ p, half: { x: 0, y: 0, z: 0 } })).length,
    doghouse: role('doghouse').every(within),
    routes: statics.filter((s) => s.blocks === 'dogs' && !exits.some((e) => overlaps(s, e))).length,
    spots: role('hidingSpot').length + carried,
    synced: props.filter((p) => p.synced).length,
    debris: props.filter((p) => !p.synced).length,
  };
}

// Whether the numbers keep every promise; the first broken one is named.
function broken(a: ReturnType<typeof anatomy>): string | undefined {
  const promises: [string, boolean][] = [
    [`exits ${a.exits} > dogs ${DOGS}`, a.exits > DOGS],
    [`narrowest exit ${a.gap.toFixed(2)} m >= a cat's ${CAT}`, a.gap >= CAT],
    [`openings outside the exits ${a.stray} = 0`, a.stray === 0],
    [`exit gap points open to dogs ${a.open} = 0`, a.open === 0],
    [`fence ${a.height} m >= ${4}`, a.height >= 4],
    [`nearest ledge ${a.ledge.toFixed(1)} m from the fence >= 3`, a.ledge >= 3],
    [`fish ${a.fish} = 5, ${a.loose} outside a storage`, a.fish === 5 && a.loose === 0],
    [`storage costs {${a.costs.join(', ')}}`, a.costs.join() === 'door,lid,open'],
    [`walk from the farthest storage to the hatch ${a.carry.toFixed(1)} m <= ${CARRY}`, a.carry <= CARRY],
    [`cat spawns in the hideout ${a.cats} >= 5, tunnel exits there ${a.tunnel} >= 1`, a.cats >= 5 && a.tunnel >= 1],
    [`dog spawns inside the fence ${a.dogs} >= ${DOGS}, the doghouse inside it`, a.dogs >= DOGS && a.doghouse],
    [`cat routes ${a.routes} >= 1, hiding spots ${a.spots} >= 1`, a.routes >= 1 && a.spots >= 1],
    [`synced props ${a.synced} <= ${SYNCED}`, a.synced <= SYNCED],
  ];
  return promises.find(([, kept]) => !kept)?.[0];
}

test('the yacht keeps the promises of its anatomy', () => {
  const a = anatomy(yacht, 'rail');
  console.log(`exits ${a.exits} (> ${DOGS}), narrowest ${a.gap.toFixed(2)} m; rails ${a.height} m; ledge ${a.ledge.toFixed(1)} m from them`);
  console.log(`fish ${a.fish} in storages {${a.costs.join(', ')}}; walk from the farthest storage to the hatch ${a.carry.toFixed(1)} m`);
  console.log(`cat spawns ${a.cats}, dog spawns ${a.dogs}; cat routes ${a.routes}, hiding spots ${a.spots}`);
  console.log(`synced props ${a.synced} (<= ${SYNCED}), debris ${a.debris}`);
  expect(broken(a)).toBeUndefined();
});

test('the check goes red on a yacht with an exit removed', () => {
  const exit = yacht.volumes.findIndex((v) => v.role === 'exit');
  const fewer = { ...yacht, volumes: yacht.volumes.filter((_, i) => i !== exit) };
  expect(broken(anatomy(fewer, 'rail'))).toMatch(/^exits 3 > dogs 3/);
});
