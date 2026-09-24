import { span, vec, type Access, type Box, type Door, type Level, type Point, type Prop, type Static, type V, type Volume } from '../level.ts';

// The country house (GAME.md, Map Anatomy and Setting): the hideout south of an opaque fence with four
// exits, the yard with the doghouse and the kennel, and the house with its rooms, three storages, doors,
// cat routes, hiding spots and clutter. Placeholder boxes with a label; the look is render's. x runs east,
// z north. Sized to the sim's bodies (card 22): a cat's capsule is 0.5 m across and a dog's 0.8 m, so a
// hiding spot is a 0.65 m slot between two solids.

const FENCE = 4; // no fish thrown from inside clears it: a toss releases ~1.2 m up and a jump adds ~1.3 m
const WALL = 2.8; // the house's walls, under its roof

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

export const countryHouse: Level = {
  statics: [
    solid('ground', [-26, -1, -32], [26, 0, 22]),
    // The neighbours' walls: the world's edge.
    ...run('outer wall', 'x', -32.1, -26.2, 26.2, 5),
    ...run('outer wall', 'x', 22.1, -26.2, 26.2, 5),
    ...run('outer wall', 'z', -26.1, -32, 22, 5),
    ...run('outer wall', 'z', 26.1, -32, 22, 5),
    // The fence around the property, 40 x 32 m. Exits: the gate and a gap on the hideout's side, a gap in
    // the west, and in the east a hole from 1.2 m up that a cat reaches by the drainpipe on either side.
    ...run('fence', 'x', -16, -20.1, 20.1, FENCE, [
      [-14.5, -13.7, 'gap'],
      [-0.75, 0.75, 'gate'],
    ]),
    ...run('fence', 'x', 16, -20.1, 20.1, FENCE),
    ...run('fence', 'z', -20, -15.9, 15.9, FENCE, [[5.6, 6.4, 'gap']]),
    ...run('fence', 'z', 20, -15.9, 15.9, FENCE, [[-6.5, -5.5]]),
    solid('fence', [19.9, 0, -6.5], [20.1, 1.2, -5.5]),
    solid('drainpipe', [19.9, 1.2, -6.5], [20.1, FENCE, -5.5], 'dogs'),
    // The house, 16 x 12 m: a hall from the front door to the back door, the kitchen and the bedroom
    // west of it, the living room east. Cat routes: a flap beside the front door and into the kitchen, a
    // gap into the living room, a vent from the kitchen to the bedroom.
    ...run('wall', 'x', -6, -8.1, 8.1, WALL, [
      [-0.5, 0.5],
      [1, 1.7, 'cat flap'],
    ]),
    ...run('wall', 'x', 6, -8.1, 8.1, WALL, [[-0.5, 0.5]]),
    ...run('wall', 'z', -8, -5.9, 5.9, WALL, [[2.5, 3.2, 'cat flap']]),
    ...run('wall', 'z', 8, -5.9, 5.9, WALL, [[-3.5, -2.8, 'gap']]),
    ...run('wall', 'z', -2, -5.9, 5.9, WALL, [
      [-3.5, -2.5],
      [2.5, 3.5],
    ]),
    ...run('wall', 'z', 2, -5.9, 5.9, WALL, [[3, 4]]),
    ...run('wall', 'x', 0, -7.9, -2.1, WALL, [[-7, -6.3, 'vent']]),
    solid('roof', [-8.1, WALL, -6.1], [8.1, WALL + 0.2, 6.1]),
    // The storages: the living room's table, the kitchen's fridge (a shelf at 0.9 m, open to the south: its
    // door is the sim's access cost) and the living room's aquarium (a tank on a stand, its lid the sim's).
    solid('table', [4, 0, 0], [6, 0.75, 1.2]),
    solid('fridge', [-7.9, 0, 4.9], [-7.1, 0.9, 5.9]),
    solid('fridge', [-7.9, 0.9, 5.8], [-7.1, 1.8, 5.9]),
    solid('fridge', [-7.9, 0.9, 4.9], [-7.8, 1.8, 5.8]),
    solid('fridge', [-7.2, 0.9, 4.9], [-7.1, 1.8, 5.8]),
    solid('fridge', [-7.8, 1.7, 4.9], [-7.2, 1.8, 5.8]),
    solid('aquarium', [6.6, 0, 4.6], [7.8, 0.8, 5.8]),
    solid('aquarium', [6.6, 0.8, 4.6], [7.8, 1.4, 4.65]),
    solid('aquarium', [6.6, 0.8, 5.75], [7.8, 1.4, 5.8]),
    solid('aquarium', [6.6, 0.8, 4.65], [6.65, 1.4, 5.75]),
    solid('aquarium', [7.75, 0.8, 4.65], [7.8, 1.4, 5.75]),
    // Furniture that stays put: the kitchen counter beside the fridge, the bedroom's wardrobe off its wall, the bed.
    solid('counter', [-6.45, 0, 4.9], [-3.5, 0.9, 5.9]),
    solid('wardrobe', [-5.5, 0, -5.25], [-3.5, 2, -4.65]),
    solid('bed', [-5.5, 0, -2.1], [-3.5, 0.6, -0.1]),
    // Behind the back door: the kennel, a cage open on top whose 2.5 m walls a cat inside cannot climb, so
    // the hatch's bottom edge is 2.5 m up; the latch is on the gate, outside. The doghouse beside it.
    solid('kennel gate', [-1.2, 0, 8.8], [1.2, 2.5, 8.9], 'latch'),
    solid('kennel', [-1.2, 0, 11.1], [1.2, 2.5, 11.2]),
    solid('kennel', [-1.2, 0, 8.9], [-1.1, 2.5, 11.1]),
    solid('kennel', [1.1, 0, 8.9], [1.2, 2.5, 11.1]),
    solid('doghouse', [2.5, 0, 9.2], [4, 1.2, 10.8]),
    // The yard's few obstacles, all more than 3 m from the fence.
    solid('shed', [11, 0, 8], [15, 2.5, 12]),
    solid('woodpile', [-15, 0, -10], [-12, 1, -9]),
    solid('car', [5, 0, -12], [9, 1.4, -10]),
  ],
  volumes: [
    zone('hideout', [-10, 0, -30], [10, 3, -20]),
    zone('exit', [-14.5, 0, -17], [-13.7, FENCE, -15]),
    zone('exit', [-0.75, 0, -17], [0.75, FENCE, -15]),
    zone('exit', [-21, 0, 5.6], [-19, FENCE, 6.4]),
    zone('exit', [19, 0, -6.5], [21, FENCE, -5.5]),
    zone('climb', [19.3, 0, -6.3], [19.9, 2.4, -5.7]),
    zone('climb', [20.1, 0, -6.3], [20.7, 2.4, -5.7]),
    zone('house', [-1.9, 0, -5.9], [1.9, WALL, 5.9]), // the hall
    zone('house', [-7.9, 0, 0.1], [-2.1, WALL, 5.9]), // the kitchen
    zone('house', [-7.9, 0, -5.9], [-2.1, WALL, -0.1]), // the bedroom
    zone('house', [2.1, 0, -5.9], [7.9, WALL, 5.9]), // the living room
    storage('open', [4, 0.75, 0], [6, 1.25, 1.2]),
    storage('door', [-7.8, 0.9, 4.9], [-7.2, 1.7, 5.8]),
    storage('lid', [6.65, 0.8, 4.65], [7.75, 1.4, 5.75]),
    zone('kennel', [-1.1, 0, 8.9], [1.1, 2.5, 11.1]),
    zone('doghouse', [2, 0, 8.7], [4.5, 2, 11.3]),
    zone('hidingSpot', [-7.1, 0, 4.9], [-6.45, 1.2, 5.9]), // between the fridge and the counter
    zone('hidingSpot', [-5.5, 0, -5.9], [-3.5, 1.2, -5.25]), // behind the wardrobe
  ],
  points: [
    ...[-4, -2, 0, 2, 4].map((x) => at('catSpawn', [x, 0, -24])),
    at('tunnelExit', [8, 0, -27]),
    ...[4, 5.5, 7].map((x) => at('dogSpawn', [x, 0, 12.5], Math.PI)),
    at('fish', [4.6, 0.75, 0.6]),
    at('fish', [5.4, 0.75, 0.6]),
    at('fish', [-7.5, 0.9, 5.1], Math.PI / 2),
    at('fish', [-7.5, 0.9, 5.55], Math.PI / 2),
    at('fish', [7.2, 0.8, 5.2]),
    at('hatch', [0, 2.5, 10]),
    at('latch', [0.7, 1, 8.5], Math.PI),
    ...([[1, -4], [-4, 2], [-5, -3], [3, -2], [-12, 4], [13, -4], [-6, -11]] as const).map(([x, z]) => at('bag', [x, 0, z])),
    ...([[-10, -13], [15, 0], [-10, 12]] as const).map(([x, z]) => at('trapPickup', [x, 0, z])),
  ],
  props: [
    // Hiding spots a dog shoves away: behind the sofa, the curtain, and a big box in the hall and by the shed.
    prop('sofa', [6.8, 0.45, -1.5], [0.45, 0.45, 1], 60, true, span([0.45, -0.45, -1], [1.1, 0.75, 1])),
    prop('curtain', [-7.22, 1.2, -3], [0.03, 1.2, 0.8], 2, true, span([-0.68, -1.2, -0.8], [-0.03, 0, 0.8])),
    prop('cardboard box', [-0.85, 0.4, 0], [0.4, 0.4, 0.6], 15, true, span([-1.05, -0.4, -0.6], [-0.4, 0.8, 0.6])),
    prop('cardboard box', [9.95, 0.4, 10], [0.4, 0.4, 0.6], 15, true, span([0.4, -0.4, -0.6], [1.05, 0.8, 0.6])),
    // Barricades a dog barges and a cat cannot move: at the back door and the bedroom door.
    prop('barricade', [0, 0.5, 5.4], [0.5, 0.5, 0.25], 20),
    prop('barricade', [-2.6, 0.5, -3], [0.25, 0.5, 0.5], 20),
    prop('armchair', [3.2, 0.4, -4.8], [0.4, 0.4, 0.4], 25),
    prop('armchair', [5, 0.4, -5.2], [0.4, 0.4, 0.4], 25),
    ...([[3.6, 0.6], [6.4, 0.6], [5, -0.4], [5, 1.6]] as const).map(([x, z]) => prop('chair', [x, 0.45, z], [0.22, 0.45, 0.22], 5)),
    prop('coffee table', [4.2, 0.2, -3.2], [0.5, 0.2, 0.3], 10),
    ...row(2, [-5.3, 0.3, 4.3], [0.8, 0], (p) => prop('stool', p, [0.18, 0.3, 0.18], 4)),
    prop('bin', [-2.6, 0.35, 5.5], [0.2, 0.35, 0.2], 3),
    prop('bedside table', [-3.1, 0.3, -0.5], [0.25, 0.3, 0.25], 8),
    ...row(2, [-8, 0.18, 9], [0.4, 0.3], (p) => prop('watermelon', p, 0.18, 5)),
    prop('wheelbarrow', [12, 0.3, 2], [0.35, 0.3, 0.7], 15),
    ...row(2, [-10, 0.4, -4], [-0.8, -0.2], (p) => prop('garden chair', p, [0.25, 0.4, 0.25], 3)),
    ...row(2, [13, 0.4, 6.5], [0.9, 0], (p) => prop('crate', p, [0.4, 0.4, 0.4], 10)),
    prop('crate', [13.45, 1.2, 6.5], [0.4, 0.4, 0.4], 10),
    prop('crate', [-13, 0.4, -7.5], [0.4, 0.4, 0.4], 10),
    // Debris: local bodies on every client, noisy when they fall.
    ...row(6, [-6.2, 0.91, 5.4], [0.26, 0], (p) => prop('plate', p, [0.12, 0.01, 0.12], 0.3, false)),
    ...row(4, [-4.6, 0.95, 5.2], [0.15, 0], (p) => prop('cup', p, [0.04, 0.05, 0.04], 0.2, false)),
    ...row(3, [-3.9, 1, 5.6], [0.15, 0], (p) => prop('jar', p, [0.06, 0.1, 0.06], 0.5, false)),
    ...row(3, [-4.6, 0.94, 5.6], [0.12, 0], (p) => prop('apple', p, 0.04, 0.15, false)),
    prop('vase', [4.2, 0.55, -3.2], [0.08, 0.15, 0.08], 0.8, false),
    prop('vase', [-3.1, 0.75, -0.5], [0.08, 0.15, 0.08], 0.8, false),
    ...row(4, [-1.6, 0.05, -5.5], [0.15, 0], (p) => prop('shoe', p, [0.05, 0.05, 0.13], 0.4, false)),
    ...row(3, [-4, 0.12, -7], [0.4, 0], (p) => prop('flower pot', p, [0.12, 0.12, 0.12], 1.5, false)),
    prop('football', [-5, 0.11, -12], 0.11, 0.45, false),
  ],
  doors: [door('x', -6, -0.5, 0.5), door('x', 6, -0.5, 0.5), door('z', -2, 2.5, 3.5), door('z', -2, -3.5, -2.5), door('z', 2, 3, 4)],
};
