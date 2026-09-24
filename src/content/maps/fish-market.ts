import { span, vec, type Access, type Box, type Door, type Level, type Point, type Prop, type Static, type V, type Volume } from '../level.ts';

// The fish market (GAME.md, Setting and Map Anatomy): the hideout on the pier by the van, south of an
// opaque fence of stall backs and tarpaulins with four exits; the yard's aisles with the guard's booth as
// the doghouse and a fish-crate cage as the kennel; the fishmonger's hall with the ice counter, the cold
// room and the tank. Placeholder boxes with a label; the look is the theme's (card 149). x runs east, z
// north. Sized to the sim's bodies as the country house is: a cat's capsule is 0.5 m across and 0.9 m tall,
// a dog's 0.8 m across, so a hiding spot is a 0.65 m slot between two solids.
//
// The labels the theme draws. Statics: ground, outer wall, pier, van, fence (the stall backs and the
// tarpaulins), gate, gap under a stall, tarpaulin flap, drainpipe, wall, roof, drain grate, gap under the
// shutter, vent, ice counter, cold shelf, tank, crate stack, stall, desk, kennel, kennel gate, guard booth.
// Props: tarpaulin, crate, ice chest, pallet, bucket, scales, fish bin, trolley, stool, barrel. Debris:
// fish head, cup, broom, tin can, bottle, lemon.

const FENCE = 4; // no fish thrown from inside clears it: a toss releases ~1.2 m up and a jump adds ~1.3 m
const WALL = 3; // the hall's walls, under its roof
const STALL = 1; // a stall's counter: a cat (0.9 m) crawls under it

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
// A stall a cat hides under: two side panels 0.65 m apart under a counter, along z from z0 to z1.
const stall = (x: number, z0: number, z1: number): Static[] => [
  solid('stall', [x, 0, z0], [x + 0.1, STALL, z1]),
  solid('stall', [x + 0.75, 0, z0], [x + 0.85, STALL, z1]),
  solid('stall', [x, STALL, z0], [x + 0.85, STALL + 0.1, z1]),
];

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

export const fishMarket: Level = {
  statics: [
    solid('ground', [-26, -1, -32], [26, 0, 22]),
    // The neighbours' walls: the world's edge.
    ...run('outer wall', 'x', -32.1, -26.2, 26.2, 5),
    ...run('outer wall', 'x', 22.1, -26.2, 26.2, 5),
    ...run('outer wall', 'z', -26.1, -32, 22, 5),
    ...run('outer wall', 'z', 26.1, -32, 22, 5),
    // The hideout's pier along the water and the van parked on it.
    solid('pier', [-14, 0, -32], [10, 0.3, -30.2]),
    solid('van', [3, 0, -29], [7.5, 2.2, -26.5]),
    // The fence around the market, 40 x 30 m: the backs of the outer stalls and their tarpaulins. Exits: the
    // gate and a gap under a stall facing the pier, a tarpaulin flap in the west, and in the east a hole from
    // 1.2 m up that a cat reaches by the drainpipe on either side.
    ...run('fence', 'x', -16, -20.1, 20.1, FENCE, [
      [-12.4, -11.6],
      [-0.75, 0.75, 'gate'],
    ]),
    solid('fence', [-12.4, STALL, -16.1], [-11.6, FENCE, -15.9]),
    solid('gap under a stall', [-12.4, 0, -16.1], [-11.6, STALL, -15.9], 'dogs'),
    ...run('fence', 'x', 14, -20.1, 20.1, FENCE),
    ...run('fence', 'z', -20, -15.9, 13.9, FENCE, [[4.6, 5.4, 'tarpaulin flap']]),
    ...run('fence', 'z', 20, -15.9, 13.9, FENCE, [[-6.5, -5.5]]),
    solid('fence', [19.9, 0, -6.5], [20.1, 1.2, -5.5]),
    solid('drainpipe', [19.9, 1.2, -6.5], [20.1, FENCE, -5.5], 'dogs'),
    // The fishmonger's hall, 18 x 10 m: the sales floor from the front door to the back door, the cold room
    // and the office east of it. Cat routes: a drain grate into the sales floor from the yard and a gap under
    // its shutter at the back, a vent into the office, a vent from the office to the cold room.
    ...run('wall', 'x', -5, -9.1, 9.1, WALL, [
      [-6.7, -6, 'drain grate'],
      [-0.5, 0.5],
    ]),
    ...run('wall', 'x', 5, -9.1, 9.1, WALL, [
      [-6.7, -6, 'gap under the shutter'],
      [-0.5, 0.5],
    ]),
    ...run('wall', 'z', -9, -4.9, 4.9, WALL),
    ...run('wall', 'z', 9, -4.9, 4.9, WALL, [[-4.2, -3.5, 'vent']]),
    ...run('wall', 'z', 3, -4.9, 4.9, WALL, [
      [-3, -2],
      [2, 3],
    ]),
    ...run('wall', 'x', 0, 3.1, 8.9, WALL, [[7, 7.7, 'vent']]),
    solid('roof', [-9.1, WALL, -5.1], [9.1, WALL + 0.2, 5.1]),
    // The storages: the ice counter in the open, the cold room's shelf (its door the sim's access cost) and
    // the tank on its stand (a lid the sim's).
    solid('ice counter', [-4, 0, -1], [0, 0.9, 0]),
    solid('cold shelf', [7.9, 0, 3.2], [8.8, 0.9, 4.8]),
    solid('cold shelf', [7.9, 1.7, 3.2], [8.8, 1.8, 4.8]),
    solid('tank', [-8.8, 0, 3.4], [-7.6, 0.8, 4.6]),
    solid('tank', [-8.8, 0.8, 3.4], [-7.6, 1.4, 3.45]),
    solid('tank', [-8.8, 0.8, 4.55], [-7.6, 1.4, 4.6]),
    solid('tank', [-8.8, 0.8, 3.45], [-8.75, 1.4, 4.55]),
    solid('tank', [-7.65, 0.8, 3.45], [-7.6, 1.4, 4.55]),
    // What stays put inside: the fishmonger's own stall, a crate stack off the west wall, the office desk.
    ...stall(-4.5, -4.5, -3),
    solid('crate stack', [-8.25, 0, -3.5], [-7.45, 1.6, -2]),
    solid('desk', [6, 0, -4.9], [8, 0.8, -4.1]),
    // Behind the back door: the kennel, a cage of fish crates open on top whose 2.5 m walls a cat inside
    // cannot climb, so the hatch's bottom edge is 2.5 m up; the latch is on the gate, outside. The guard's
    // booth beside it is the doghouse.
    solid('kennel gate', [-1.2, 0, 7.8], [1.2, 2.5, 7.9], 'latch'),
    solid('kennel', [-1.2, 0, 10.1], [1.2, 2.5, 10.2]),
    solid('kennel', [-1.2, 0, 7.9], [-1.1, 2.5, 10.1]),
    solid('kennel', [1.1, 0, 7.9], [1.2, 2.5, 10.1]),
    solid('guard booth', [2.5, 0, 8.2], [4, 2, 9.8]),
    // The yard's aisles between stalls, all more than 3 m from the fence.
    ...stall(-14, -9, -7.5),
    solid('stall', [-15, 0, -3], [-13, STALL, -2]),
    solid('stall', [12, 0, -10], [14, STALL, -9]),
    solid('stall', [12, 0, 2], [14, STALL, 3]),
  ],
  volumes: [
    zone('hideout', [-12, 0, -30], [8, 3, -20]),
    zone('exit', [-12.4, 0, -17], [-11.6, FENCE, -15]),
    zone('exit', [-0.75, 0, -17], [0.75, FENCE, -15]),
    zone('exit', [-21, 0, 4.6], [-19, FENCE, 5.4]),
    zone('exit', [19, 0, -6.5], [21, FENCE, -5.5]),
    zone('climb', [19.3, 0, -6.3], [19.9, 2.4, -5.7]),
    zone('climb', [20.1, 0, -6.3], [20.7, 2.4, -5.7]),
    zone('house', [-8.9, 0, -4.9], [2.9, WALL, 4.9]), // the sales floor
    zone('house', [3.1, 0, 0.1], [8.9, WALL, 4.9]), // the cold room
    zone('house', [3.1, 0, -4.9], [8.9, WALL, -0.1]), // the office
    storage('open', [-4, 0.9, -1], [0, 1.4, 0]),
    storage('door', [7.9, 0.9, 3.2], [8.8, 1.7, 4.8]),
    storage('lid', [-8.75, 0.8, 3.45], [-7.65, 1.4, 4.55]),
    zone('kennel', [-1.1, 0, 7.9], [1.1, 2.5, 10.1]),
    zone('doghouse', [2, 0, 7.7], [4.5, 2.2, 10.3]),
    zone('hidingSpot', [-4.4, 0, -4.5], [-3.75, STALL, -3]), // under the fishmonger's stall
    zone('hidingSpot', [-13.9, 0, -9], [-13.25, STALL, -7.5]), // under a stall in the yard
    zone('hidingSpot', [-8.9, 0, -3.5], [-8.25, 1.2, -2]), // behind the crate stack
  ],
  points: [
    ...[-6, -4, -2, 0, 2].map((x) => at('catSpawn', [x, 0, -23])),
    at('tunnelExit', [-9, 0, -27]),
    ...[4, 5.5, 7].map((x) => at('dogSpawn', [x, 0, 11.5], Math.PI)),
    at('fish', [-3.2, 0.9, -0.5]),
    at('fish', [-0.8, 0.9, -0.5]),
    at('fish', [8.35, 0.9, 3.6], -Math.PI / 2),
    at('fish', [8.35, 0.9, 4.4], -Math.PI / 2),
    at('fish', [-8.2, 0.8, 4]),
    at('hatch', [0, 2.5, 9]),
    at('latch', [0.7, 1, 7.4], Math.PI),
    ...([[1, -3], [-6, 2], [5, 2], [5.5, -2], [-11, 3], [13, -4], [-6, -11]] as const).map(([x, z]) => at('bag', [x, 0, z])),
    ...([[-10, -13], [15, 0], [-10, 10]] as const).map(([x, z]) => at('trapPickup', [x, 0, z])),
  ],
  props: [
    // Hiding spots a dog shoves away: a tarpaulin hung off the west wall, the ice chest by the counter, and a
    // crate in the office and one by a yard stall.
    prop('tarpaulin', [-8.22, 1.2, 1], [0.03, 1.2, 0.8], 3, true, span([-0.68, -1.2, -0.8], [-0.03, 0, 0.8])),
    prop('ice chest', [-2, 0.4, -2.05], [0.6, 0.4, 0.4], 30, true, span([-0.6, -0.4, 0.4], [0.6, 0.8, 1.05])),
    prop('crate', [7.85, 0.4, -1.6], [0.4, 0.4, 0.6], 15, true, span([0.4, -0.4, -0.6], [1.05, 0.8, 0.6])),
    prop('crate', [13, 0.4, -11.05], [0.6, 0.4, 0.4], 15, true, span([-0.6, -0.4, 0.4], [0.6, 0.8, 1.05])),
    // Barricades a dog barges and a cat cannot move: pallets at the back door and the office door.
    prop('pallet', [0, 0.5, 4.4], [0.5, 0.5, 0.25], 20),
    prop('pallet', [2.5, 0.5, -2.5], [0.25, 0.5, 0.5], 20),
    ...row(2, [-10, 0.4, 6], [0.9, 0], (p) => prop('crate', p, [0.4, 0.4, 0.4], 10)),
    prop('crate', [-9.55, 1.2, 6], [0.4, 0.4, 0.4], 10),
    ...row(2, [10, 0.4, -4], [0.9, 0], (p) => prop('crate', p, [0.4, 0.4, 0.4], 10)),
    ...row(2, [-6, 0.2, 1], [0.5, 0.5], (p) => prop('bucket', p, [0.15, 0.2, 0.15], 3)),
    prop('bucket', [5, 0.2, 4], [0.15, 0.2, 0.15], 3),
    prop('scales', [-2, 1, -0.5], [0.2, 0.1, 0.15], 4),
    prop('fish bin', [-7, 0.35, -4], [0.25, 0.35, 0.25], 6),
    prop('fish bin', [6.5, 0.35, 1], [0.25, 0.35, 0.25], 6),
    prop('trolley', [8, 0.4, -12], [0.4, 0.4, 0.7], 15),
    ...row(2, [5, 0.3, -3.5], [0.8, 0], (p) => prop('stool', p, [0.18, 0.3, 0.18], 4)),
    ...row(2, [-12, 0.35, -1], [0.8, -0.2], (p) => prop('barrel', p, 0.35, 20)),
    // Debris: local bodies on every client, noisy when they fall.
    ...row(6, [-12, 0.06, -12], [0.3, 0], (p) => prop('fish head', p, 0.06, 0.2, false)),
    ...row(4, [6.3, 0.85, -4.5], [0.2, 0], (p) => prop('cup', p, [0.04, 0.05, 0.04], 0.2, false)),
    ...row(3, [7.3, 0.9, -4.5], [0.2, 0], (p) => prop('bottle', p, [0.04, 0.1, 0.04], 0.5, false)),
    prop('broom', [-6, 0.03, 2.8], [0.03, 0.03, 0.7], 0.8, false),
    ...row(4, [5, 0.06, -9], [0.25, 0], (p) => prop('tin can', p, [0.04, 0.06, 0.04], 0.2, false)),
    ...row(3, [-13.2, STALL + 0.14, -8.6], [0, 0.3], (p) => prop('lemon', p, 0.04, 0.15, false)),
  ],
  doors: [door('x', -5, -0.5, 0.5), door('x', 5, -0.5, 0.5), door('z', 3, 2, 3), door('z', 3, -3, -2)],
};
