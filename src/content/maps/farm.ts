import { span, vec, type Access, type Box, type Door, type Level, type Point, type Prop, type Static, type V, type Volume } from '../level.ts';

// The farm (GAME.md, Map Anatomy and Setting): the hideout in the meadow south beyond the hedge; the fence
// is the hedge and the barn's back wall, with four exits (the gate, a gap in the hedge, a culvert under it
// and a drainpipe on the barn); the farmyard with the doghouse and the chicken coop as the kennel; the house
// is the farmhouse (kitchen, parlour, hall, scullery) and the smokehouse. Storages: the kitchen table
// (open), the smokehouse's rack (door), the scullery's water tub (lid). Hiding spots: behind hay bales,
// under the cart, the coop's shadow. Cat routes: the barn's gaps, the kitchen's cat flap and vent, the
// smokehouse's loose board. x runs east, z north; sized to the sim's bodies (card 22) like the country house.
//
// Labels the farm's theme draws (until it lands, palette boxes): fence (the hedge, and the barn's back
// wall: the schema finds the fence by this label only), treeline, gate, gap, culvert, drainpipe, wall,
// roof, vent, cat flap, barn, smokehouse, smoking rack, table, counter, shelf, water tub, coop, coop gate,
// doghouse, feed bin, cart, woodpile, tractor; props: hay bale, bucket, wheelbarrow, milk can, chair,
// bench, rocking chair, feed sack, crate; debris: egg, apple, pot.

const FENCE = 4; // no fish thrown from inside clears it: a toss releases ~1.2 m up and a jump adds ~1.3 m
const WALL = 2.8; // the farmhouse's walls, under its roof
const SMOKE = 2.4; // the smokehouse's walls

const solid = (label: string, min: V, max: V, blocks: Static['blocks'] = 'all'): Static => ({ label, blocks, ...span(min, max) });
const zone = (role: Exclude<Volume['role'], 'storage'>, min: V, max: V): Volume => ({ role, ...span(min, max) });
const storage = (access: Access, min: V, max: V): Volume => ({ role: 'storage', access, ...span(min, max) });
const at = (role: Point['role'], p: V, yaw = 0): Point => ({ role, p: vec(p), yaw });
// A box (half extents) or a ball (a radius); a hiding spot relative to the prop.
const prop = (label: string, p: V, shape: V | number, mass: number, synced = true, spot?: Box): Prop => ({
  label,
  p: vec(p),
  shape: typeof shape === 'number' ? { ball: shape } : { box: vec(shape) },
  mass,
  synced,
  ...(spot && { hidingSpot: spot }),
});
// n things in a row, the first at [x, y, z] and each next one [dx, dz] further along the ground.
const row = (n: number, [x, y, z]: V, [dx, dz]: [number, number], make: (p: V) => Prop) =>
  Array.from({ length: n }, (_, i) => make([x + i * dx, y, z + i * dz]));
// A 0.05 m panel filling a doorway from a to b in a wall run, hinged at a.
const door = (along: 'x' | 'z', at: number, a: number, b: number): Door => ({
  panel: along === 'x' ? span([a, 0, at - 0.025], [b, WALL, at + 0.025]) : span([at - 0.025, 0, a], [at + 0.025, WALL, b]),
  hinge: vec(along === 'x' ? [a, 0, at] : [at, 0, a]),
});

// A 0.2 m thick run of boxes along x at z = `at` (or along z at x = `at`) from a to b, up to `top`, with
// its gaps open; a gap with a name is filled by a `dogs` blocker of that name: an exit or a cat route.
type Gap = [number, number, string?];
function run(label: string, along: 'x' | 'z', at: number, a: number, b: number, top: number, gaps: Gap[] = []): Static[] {
  const box = (s: number, e: number, name = label, blocks: Static['blocks'] = 'all') =>
    along === 'x' ? solid(name, [s, 0, at - 0.1], [e, top, at + 0.1], blocks) : solid(name, [at - 0.1, 0, s], [at + 0.1, top, e], blocks);
  const out: Static[] = [];
  let from = a;
  for (const [s, e, name] of gaps) {
    out.push(box(from, s));
    if (name) out.push(box(s, e, name, 'dogs'));
    from = e;
  }
  return [...out, box(from, b)];
}

// A hay bale a dog shoves away, 1.8 m long along x (or z), with the 0.65 m slot between it and the wall
// on its `side` (-1 or 1, along the short axis).
const bale = (p: V, along: 'x' | 'z', side?: -1 | 1) => {
  const half: V = along === 'x' ? [0.9, 0.45, 0.45] : [0.45, 0.45, 0.9];
  const [n, f] = side === 1 ? [0.45, 1.1] : [-1.1, -0.45];
  const spot = along === 'x' ? span([-0.9, -0.45, n], [0.9, 0.75, f]) : span([n, -0.45, -0.9], [f, 0.75, 0.9]);
  return prop('hay bale', p, half, 30, true, side && spot);
};

export const farm: Level = {
  statics: [
    solid('ground', [-26, -1, -32], [26, 0, 22]),
    // The woods around the fields: the world's edge.
    ...run('treeline', 'x', -32.1, -26.2, 26.2, 5),
    ...run('treeline', 'x', 22.1, -26.2, 26.2, 5),
    ...run('treeline', 'z', -26.1, -32, 22, 5),
    ...run('treeline', 'z', 26.1, -32, 22, 5),
    // The hedge around the farm, 40 x 32 m, and the barn's back wall in the east. Exits: the gate and the
    // culvert (a pipe under the hedge, 1.1 m high) on the meadow's side, a gap in the west, and in the east
    // the barn's loft hole from 1.2 m up that a cat reaches by the drainpipe outside or the ladder inside.
    ...run('fence', 'x', -16, -20.1, 20.1, FENCE, [
      [-14.5, -13.7],
      [-0.75, 0.75, 'gate'],
    ]),
    solid('fence', [-14.5, 1.1, -16.1], [-13.7, FENCE, -15.9]),
    solid('culvert', [-14.5, 0, -16.1], [-13.7, 1.1, -15.9], 'dogs'),
    ...run('fence', 'x', 16, -20.1, 20.1, FENCE),
    ...run('fence', 'z', -20, -15.9, 15.9, FENCE, [[5.6, 6.4, 'gap']]),
    ...run('fence', 'z', 20, -15.9, 15.9, FENCE, [[-6.5, -5.5]]),
    solid('fence', [19.9, 0, -6.5], [20.1, 1.2, -5.5]),
    solid('drainpipe', [19.9, 1.2, -6.5], [20.1, FENCE, -5.5], 'dogs'),
    // The barn, 6 x 8 m against the hedge, as tall as the fence and open to the sky: its doorway faces the
    // yard, and a cat slips in by a gap in either side wall.
    ...run('barn', 'x', -2, 13.9, 19.9, FENCE, [[16.5, 17.2, 'gap']]),
    ...run('barn', 'x', -10, 13.9, 19.9, FENCE, [[16.5, 17.2, 'gap']]),
    ...run('barn', 'z', 14, -9.9, -2.1, FENCE, [[-7, -5]]),
    // The farmhouse, 12 x 8 m: the parlour and the kitchen west, the hall and the scullery east. Doors: the
    // front and back doors, and between the rooms; the hall opens to the scullery. A cat flap into the kitchen
// and a vent from it to the parlour.
    ...run('wall', 'x', 0, -10.1, 2.1, WALL, [[-1.5, -0.5]]),
    ...run('wall', 'x', 8, -10.1, 2.1, WALL, [
      [-6, -5.3, 'cat flap'],
      [-1, 0],
    ]),
    ...run('wall', 'z', -10, 0.1, 7.9, WALL),
    ...run('wall', 'z', 2, 0.1, 7.9, WALL),
    ...run('wall', 'z', -4, 0.1, 7.9, WALL, [
      [1.5, 2.5],
      [5.5, 6.5],
    ]),
    ...run('wall', 'x', 4, -9.9, -4.1, WALL, [
      [-9.4, -8.7, 'vent'],
      [-7.5, -6.5],
    ]),
    ...run('wall', 'x', 4, -3.9, 1.9, WALL, [[-1.5, -0.5]]),
    solid('roof', [-10.1, WALL, -0.1], [2.1, WALL + 0.2, 8.1]),
    // The smokehouse, 3 x 3 m east of the farmhouse, its doorway to the west and a loose board at the back.
    ...run('smokehouse', 'x', 4, 4.9, 8.1, SMOKE),
    ...run('smokehouse', 'x', 7, 4.9, 8.1, SMOKE, [[6.2, 6.9, 'gap']]),
    ...run('smokehouse', 'z', 5, 4.1, 6.9, SMOKE, [[5, 6]]),
    ...run('smokehouse', 'z', 8, 4.1, 6.9, SMOKE),
    solid('roof', [4.9, SMOKE, 3.9], [8.1, SMOKE + 0.2, 7.1]),
    // The storages: the kitchen table, the smokehouse's rack (a shelf at 0.9 m behind its door: the sim's
    // access cost) and the scullery's water tub (its lid the sim's).
    solid('table', [-8, 0, 5.2], [-6, 0.75, 6.4]),
    solid('smoking rack', [7, 0, 4.1], [7.9, 0.9, 6.9]),
    solid('water tub', [0.5, 0, 6], [1.7, 0.2, 7.2]),
    solid('water tub', [0.5, 0.2, 6], [1.7, 0.8, 6.05]),
    solid('water tub', [0.5, 0.2, 7.15], [1.7, 0.8, 7.2]),
    solid('water tub', [0.5, 0.2, 6.05], [0.55, 0.8, 7.15]),
    solid('water tub', [1.65, 0.2, 6.05], [1.7, 0.8, 7.15]),
    // Furniture that stays put: the kitchen counter, the scullery's shelf.
    solid('counter', [-9.9, 0, 7.3], [-8.2, 0.9, 7.9]),
    solid('shelf', [-3.9, 0, 4.1], [-2.9, 0.9, 4.6]),
    // Behind the back door: the chicken coop as the kennel, a cage open on top whose 2.5 m walls a cat
    // inside cannot climb; the latch is on its gate, outside. The doghouse beside it, the feed bin in its shadow.
    solid('coop gate', [-2.2, 0, 10.4], [0.2, 2.5, 10.5], 'latch'),
    solid('coop', [-2.2, 0, 12.7], [0.2, 2.5, 12.8]),
    solid('coop', [-2.2, 0, 10.5], [-2.1, 2.5, 12.7]),
    solid('coop', [0.1, 0, 10.5], [0.2, 2.5, 12.7]),
    solid('doghouse', [1.2, 0, 10.8], [2.7, 1.2, 12.4]),
    solid('feed bin', [-3.6, 0, 10.4], [-2.85, 1.2, 12.8]),
    // The farmyard's few obstacles, all more than 3 m from the fence: the hay cart, sides down to the
    // ground and a slot under its bed, the woodpile, the tractor.
    solid('cart', [8, 0, -5.2], [8.2, 1.1, -2.8]),
    solid('cart', [8.85, 0, -5.2], [9.05, 1.1, -2.8]),
    solid('cart', [8, 1.1, -5.2], [9.05, 1.3, -2.8]),
    solid('woodpile', [-15, 0, -10], [-12, 1, -9]),
    solid('tractor', [5, 0, -12], [9, 1.8, -10]),
  ],
  volumes: [
    zone('hideout', [-10, 0, -30], [10, 3, -20]),
    zone('exit', [-14.5, 0, -17], [-13.7, FENCE, -15]),
    zone('exit', [-0.75, 0, -17], [0.75, FENCE, -15]),
    zone('exit', [-21, 0, 5.6], [-19, FENCE, 6.4]),
    zone('exit', [19, 0, -6.5], [21, FENCE, -5.5]),
    zone('climb', [19.3, 0, -6.3], [19.9, 2.4, -5.7]),
    zone('climb', [20.1, 0, -6.3], [20.7, 2.4, -5.7]),
    zone('house', [-3.9, 0, 0.1], [1.9, WALL, 3.9]), // the hall
    zone('house', [-9.9, 0, 0.1], [-4.1, WALL, 3.9]), // the parlour
    zone('house', [-9.9, 0, 4.1], [-4.1, WALL, 7.9]), // the kitchen
    zone('house', [-3.9, 0, 4.1], [1.9, WALL, 7.9]), // the scullery
    zone('house', [5.1, 0, 4.1], [7.9, SMOKE, 6.9]), // the smokehouse
    storage('open', [-8, 0.75, 5.2], [-6, 1.25, 6.4]),
    storage('door', [7, 0.9, 4.1], [7.9, 1.7, 6.9]),
    storage('lid', [0.55, 0.2, 6.05], [1.65, 0.8, 7.15]),
    zone('kennel', [-2.1, 0, 10.5], [0.1, 2.5, 12.7]),
    zone('doghouse', [0.8, 0, 10.4], [3.1, 2, 12.8]),
    zone('hidingSpot', [-2.85, 0, 10.4], [-2.2, 1.2, 12.8]), // the coop's shadow, beside the feed bin
    zone('hidingSpot', [8.2, 0, -5.2], [8.85, 1.1, -2.8]), // under the cart
  ],
  points: [
    ...[-4, -2, 0, 2, 4].map((x) => at('catSpawn', [x, 0, -24])),
    at('tunnelExit', [8, 0, -27]),
    ...[4, 5.5, 7].map((x) => at('dogSpawn', [x, 0, 13.5], Math.PI)),
    at('fish', [-7.4, 0.75, 5.8]),
    at('fish', [-6.6, 0.75, 5.8]),
    at('fish', [7.45, 0.9, 5.2], -Math.PI / 2),
    at('fish', [7.45, 0.9, 5.8], -Math.PI / 2),
    at('fish', [1.1, 0.2, 6.6]),
    at('hatch', [-1, 2.5, 11.6]),
    at('latch', [-0.3, 1, 10], Math.PI),
    ...([[-1, 2], [-7, 2], [-2, 6], [6, 1], [-15, -4], [12, 6], [16, -6], [-6, -10]] as const).map(([x, z]) => at('bag', [x, 0, z])),
    ...([[-12, -12], [15, 4], [-8, 12]] as const).map(([x, z]) => at('trapPickup', [x, 0, z])),
  ],
  props: [
    // Hay bales a dog shoves away, four with a hiding spot against a wall: two in the barn, one behind the
    // smokehouse, one against the farmhouse's west wall; two loose in the yard.
    bale([15.5, 0.45, -3.2], 'x', 1),
    bale([15.5, 0.45, -8.8], 'x', -1),
    bale([9.2, 0.45, 5.5], 'z', -1),
    bale([-11.2, 0.45, 4], 'z', 1),
    bale([-13, 0.45, -4], 'x'),
    bale([11, 0.45, -12], 'x'),
    ...([[-1.8, 7.4], [-1.4, 7.4], [4.2, 8.8], [10.5, -6]] as const).map(([x, z]) => prop('bucket', [x, 0.18, z], [0.15, 0.18, 0.15], 2)),
    prop('wheelbarrow', [12, 0.3, 2], [0.35, 0.3, 0.7], 15),
    ...row(4, [5.5, 0.3, 3.4], [0.4, 0], (p) => prop('milk can', p, [0.15, 0.3, 0.15], 8)),
    ...([[-8.45, 5.8], [-5.55, 5.8], [-7.4, 6.85], [-6.6, 6.85]] as const).map(([x, z]) => prop('chair', [x, 0.45, z], [0.22, 0.45, 0.22], 5)),
    prop('bench', [-7, 0.25, 1], [0.9, 0.25, 0.2], 12),
    prop('rocking chair', [-9, 0.45, 2.5], [0.3, 0.45, 0.35], 8),
    ...row(2, [17.5, 0.3, -8.6], [0.8, 0], (p) => prop('feed sack', p, [0.3, 0.3, 0.3], 20)),
    prop('crate', [-13, 0.4, -7.5], [0.4, 0.4, 0.4], 10),
    prop('crate', [12.5, 0.4, 8], [0.4, 0.4, 0.4], 10),
    // Debris: local bodies on every client, noisy when they fall: a basket's eggs and apples on the
    // kitchen counter, clay pots on the scullery's shelf.
    ...[7.45, 7.7].flatMap((z) => row(5, [-9.7, 0.93, z], [0.12, 0], (p) => prop('egg', p, 0.03, 0.06, false))),
    ...[7.45, 7.75].flatMap((z) => row(3, [-9, 0.94, z], [0.15, 0], (p) => prop('apple', p, 0.04, 0.15, false))),
    ...row(6, [-3.8, 1, 4.35], [0.15, 0], (p) => prop('pot', p, [0.06, 0.1, 0.06], 1, false)),
  ],
  doors: [door('x', 0, -1.5, -0.5), door('x', 8, -1, 0), door('z', -4, 1.5, 2.5), door('z', -4, 5.5, 6.5), door('x', 4, -7.5, -6.5)],
};
