import { span, vec, type Access, type Box, type Door, type Level, type Point, type Prop, type Static, type V, type Volume } from '../level.ts';

// The high-rise (GAME.md, Map Anatomy, Beta): one floor of a block of flats. The hideout is the neighbour's
// balcony, south of an opaque fence of balcony rails and vent shafts with four exits; the yard is the
// hallway and the landing around the flat, with the doghouse (a storage nook) and the kennel (a barred
// storeroom) by the front door; the house is the flat: a living room, a kitchen, a bedroom and a hall,
// with three storages, doors, cat routes, hiding spots and clutter. x runs east, z north, the floor slab's
// top at y = 0. Sized to the sim's bodies (card 22) like the country house.
//
// Labels the theme (card 143) draws; until it lands each is a palette box. Statics: floor slab, facade,
// balcony rail, vent shaft, balcony gap, drainpipe, vent, stairwell door, wall, gap, ceiling, table,
// fridge, aquarium, counter, cabinet, radiator, wardrobe, bed, kennel, kennel gate, doghouse, lift,
// stairs, mailboxes. Props: sofa, curtain, cardboard box, barricade, armchair, chair, coffee table, stool,
// bin, bedside table, shoe rack, laundry rack, potted plant, bicycle, suitcase; debris: plate, cup, jar,
// apple, vase, tv, shoe, flower pot.

const FENCE = 4; // no fish thrown from inside clears it: a toss releases ~1.2 m up and a jump adds ~1.3 m
const WALL = 2.8; // the flat's walls, under its ceiling

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
// n things in a row, the first at [x, y, z] and each next one [dx, dz] further along the floor.
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

export const highRise: Level = {
  statics: [
    solid('floor slab', [-24, -1, -28], [24, 0, 22]),
    // The facade and the core's walls: the world's edge.
    ...run('facade', 'x', -28.1, -24.2, 24.2, 5),
    ...run('facade', 'x', 22.1, -24.2, 24.2, 5),
    ...run('facade', 'z', -24.1, -28, 22, 5),
    ...run('facade', 'z', 24.1, -28, 22, 5),
    // The fence around the property, 36 x 30 m: our balcony's rail on the south, vent shafts elsewhere.
    // Exits: the gap to the neighbour's balcony and, from 1.2 m up, a hole a cat reaches by the drainpipe
    // on either side, both on the rail; a vent in the west shaft; the stairwell door in the east.
    ...run('balcony rail', 'x', -14, -18.1, 18.1, FENCE, [
      [-10.4, -9.6, 'balcony gap'],
      [7.5, 8.5],
    ]),
    solid('balcony rail', [7.5, 0, -14.1], [8.5, 1.2, -13.9]),
    solid('drainpipe', [7.5, 1.2, -14.1], [8.5, FENCE, -13.9], 'dogs'),
    ...run('vent shaft', 'x', 16, -18.1, 18.1, FENCE),
    ...run('vent shaft', 'z', -18, -13.9, 15.9, FENCE, [[-6.4, -5.6, 'vent']]),
    ...run('vent shaft', 'z', 18, -13.9, 15.9, FENCE, [[9.5, 11, 'stairwell door']]),
    // The flat, 18 x 12 m: the living room south-west with the balcony door, the kitchen south-east, the
    // bedroom north-west and the hall north-east with the front door. Cat routes: a vent from the kitchen
    // to the balcony, a vent from the bedroom to the hallway, a gap from the bedroom to the living room.
    ...run('wall', 'x', -8, -9.1, 9.1, WALL, [
      [-5, -4],
      [6, 6.7, 'vent'],
    ]),
    ...run('wall', 'x', 4, -9.1, 9.1, WALL, [
      [-8.6, -7.9, 'vent'],
      [0.5, 1.5],
    ]),
    ...run('wall', 'z', -9, -7.9, 3.9, WALL),
    ...run('wall', 'z', 9, -7.9, 3.9, WALL),
    ...run('wall', 'x', -1, -8.9, 8.9, WALL, [
      [-7.5, -6.8, 'gap'],
      [-1.5, -0.5],
      [2.5, 3.5],
    ]),
    ...run('wall', 'z', 1, -7.9, -1.1, WALL, [[-5, -4]]),
    ...run('wall', 'z', -2, -0.9, 3.9, WALL, [[0, 1]]),
    solid('ceiling', [-9.1, WALL, -8.1], [9.1, WALL + 0.2, 4.1]),
    // The storages: the kitchen table, the kitchen's fridge by its door (a shelf at 0.9 m, open to the east:
    // its door is the sim's access cost) and the living room's aquarium (a tank on a stand, its lid the sim's).
    solid('table', [3.5, 0, -5.1], [5.5, 0.75, -3.9]),
    solid('fridge', [1.1, 0, -2.1], [1.9, 0.9, -1.1]),
    solid('fridge', [1.1, 0.9, -2.1], [1.2, 1.8, -1.1]),
    solid('fridge', [1.2, 0.9, -2.1], [1.9, 1.8, -2]),
    solid('fridge', [1.2, 0.9, -1.2], [1.9, 1.8, -1.1]),
    solid('fridge', [1.2, 1.7, -2], [1.9, 1.8, -1.2]),
    solid('aquarium', [-2.2, 0, -4.6], [-1, 0.8, -3.4]),
    solid('aquarium', [-2.2, 0.8, -4.6], [-1, 1.4, -4.55]),
    solid('aquarium', [-2.2, 0.8, -3.45], [-1, 1.4, -3.4]),
    solid('aquarium', [-2.2, 0.8, -4.55], [-2.15, 1.4, -3.45]),
    solid('aquarium', [-1.05, 0.8, -4.55], [-1, 1.4, -3.45]),
    // Furniture that stays put: the kitchen counter, the tv cabinet, the radiators under the windows, the
    // bedroom's wardrobe off its wall, and the bed on high rails with a cat's room under it.
    solid('counter', [2, 0, -7.9], [5.5, 0.9, -7.1]),
    solid('cabinet', [-5.2, 0, -5.1], [-4.7, 0.6, -3.9]),
    solid('radiator', [-3.5, 0.1, -7.9], [-2.5, 0.8, -7.75]),
    solid('radiator', [-8.9, 0.1, 2.2], [-8.75, 0.8, 3.4]),
    solid('wardrobe', [-4.3, 0, 2.65], [-2.3, 2, 3.25]),
    solid('bed', [-6.7, 0, 1.8], [-6.3, 1, 3.8]),
    solid('bed', [-5.65, 0, 1.8], [-5.25, 1, 3.8]),
    solid('bed', [-6.7, 1, 1.8], [-5.25, 1.25, 3.8]),
    // In the hallway, past the front door: the kennel, a barred storeroom open on top whose 2.5 m walls a
    // cat inside cannot climb, so the hatch's bottom edge is 2.5 m up; the latch is on the gate, outside.
    // The doghouse beside it.
    solid('kennel gate', [-0.2, 0, 7.8], [2.2, 2.5, 7.9], 'latch'),
    solid('kennel', [-0.2, 0, 10.1], [2.2, 2.5, 10.2]),
    solid('kennel', [-0.2, 0, 7.9], [-0.1, 2.5, 10.1]),
    solid('kennel', [2.1, 0, 7.9], [2.2, 2.5, 10.1]),
    solid('doghouse', [3.5, 0, 8.2], [5, 1.2, 9.8]),
    // The landing's few obstacles, all at least 3 m from the fence.
    solid('lift', [-6, 0, 10.5], [-3.5, WALL, 12.8]),
    solid('stairs', [11, 0, 9.5], [14, 0.3, 12.8]),
    solid('stairs', [11, 0.3, 10.5], [14, 0.6, 12.8]),
    solid('stairs', [11, 0.6, 11.5], [14, 0.9, 12.8]),
    solid('mailboxes', [-12, 0, 5], [-11.5, 1.5, 7]),
  ],
  volumes: [
    zone('hideout', [-10, 0, -26], [10, 3, -18]),
    zone('exit', [-10.4, 0, -15], [-9.6, FENCE, -13]),
    zone('exit', [7.5, 0, -15], [8.5, FENCE, -13]),
    zone('exit', [-19, 0, -6.4], [-17, FENCE, -5.6]),
    zone('exit', [17, 0, 9.5], [19, FENCE, 11]),
    zone('climb', [7.7, 0, -14.7], [8.3, 2.4, -14.1]),
    zone('climb', [7.7, 0, -13.9], [8.3, 2.4, -13.3]),
    zone('house', [-8.9, 0, -7.9], [0.9, WALL, -1.1]), // the living room
    zone('house', [1.1, 0, -7.9], [8.9, WALL, -1.1]), // the kitchen
    zone('house', [-8.9, 0, -0.9], [-2.1, WALL, 3.9]), // the bedroom
    zone('house', [-1.9, 0, -0.9], [8.9, WALL, 3.9]), // the hall
    storage('open', [3.5, 0.75, -5.1], [5.5, 1.25, -3.9]),
    storage('door', [1.2, 0.9, -2], [1.9, 1.7, -1.2]),
    storage('lid', [-2.15, 0.8, -4.55], [-1.05, 1.4, -3.45]),
    zone('kennel', [-0.1, 0, 7.9], [2.1, 2.5, 10.1]),
    zone('doghouse', [3, 0, 7.7], [5.5, 2, 10.3]),
    zone('hidingSpot', [-6.3, 0, 1.8], [-5.65, 1, 3.8]), // under the bed
    zone('hidingSpot', [-4.3, 0, 3.25], [-2.3, 1.2, 3.9]), // behind the wardrobe
  ],
  points: [
    ...[-4, -2, 0, 2, 4].map((x) => at('catSpawn', [x, 0, -22])),
    at('tunnelExit', [8, 0, -24]),
    ...[6, 7.5, 9].map((x) => at('dogSpawn', [x, 0, 12.5], Math.PI)),
    at('fish', [4.1, 0.75, -4.5]),
    at('fish', [4.9, 0.75, -4.5]),
    at('fish', [1.55, 0.9, -1.8], Math.PI / 2),
    at('fish', [1.55, 0.9, -1.4], Math.PI / 2),
    at('fish', [-1.6, 0.8, -4]),
    at('hatch', [1, 2.5, 9]),
    at('latch', [1.7, 1, 7.45], Math.PI),
    ...([[4, 1.5], [7, -4], [-3, -6], [-4, 0.5], [0, -11], [-10, 10], [13, 2]] as const).map(([x, z]) => at('bag', [x, 0, z])),
    ...([[-12, -10], [14, -4], [-6, 14]] as const).map(([x, z]) => at('trapPickup', [x, 0, z])),
  ],
  props: [
    // Hiding spots a dog shoves away: behind the sofa, the two curtains, a moving box on the landing by
    // the lift and one on the balcony by the flat's wall.
    prop('sofa', [-7.8, 0.45, -4.5], [0.45, 0.45, 1], 60, true, span([-1.1, -0.45, -1], [-0.45, 0.75, 1])),
    prop('curtain', [-7, 1.2, -7.22], [0.8, 1.2, 0.03], 2, true, span([-0.8, -1.2, -0.68], [0.8, 0, -0.03])),
    prop('curtain', [-8.22, 1.2, 0.5], [0.03, 1.2, 0.8], 2, true, span([-0.68, -1.2, -0.8], [-0.03, 0, 0.8])),
    prop('cardboard box', [-2.45, 0.4, 11.6], [0.4, 0.4, 0.6], 15, true, span([-1.05, -0.4, -0.6], [-0.4, 0.8, 0.6])),
    prop('cardboard box', [-7, 0.4, -9.15], [0.6, 0.4, 0.4], 15, true, span([-0.6, -0.4, 0.4], [0.6, 0.8, 1.05])),
    // Barricades a dog barges and a cat cannot move: at the front door and the bedroom door.
    prop('barricade', [1, 0.5, 3.4], [0.5, 0.5, 0.25], 20),
    prop('barricade', [-2.6, 0.5, 0.5], [0.25, 0.5, 0.5], 20),
    prop('armchair', [-5.6, 0.4, -2.2], [0.4, 0.4, 0.4], 25),
    prop('armchair', [-4, 0.4, -2.2], [0.4, 0.4, 0.4], 25),
    ...([[3.1, -4.5], [5.9, -4.5], [4.5, -5.5], [4.5, -3.5]] as const).map(([x, z]) => prop('chair', [x, 0.45, z], [0.22, 0.45, 0.22], 5)),
    prop('coffee table', [-6.3, 0.2, -4.5], [0.3, 0.2, 0.5], 10),
    ...row(2, [2.8, 0.3, -6.7], [0.8, 0], (p) => prop('stool', p, [0.18, 0.3, 0.18], 4)),
    prop('bin', [8.5, 0.35, -7.5], [0.2, 0.35, 0.2], 3),
    prop('bedside table', [-7.1, 0.3, 3.4], [0.25, 0.3, 0.25], 8),
    prop('shoe rack', [6, 0.3, 3.6], [0.6, 0.3, 0.15], 6),
    prop('laundry rack', [3, 0.6, -10.5], [0.6, 0.6, 0.25], 4),
    prop('potted plant', [-3, 0.4, -10], [0.3, 0.4, 0.3], 12),
    prop('potted plant', [12, 0.4, -9], [0.3, 0.4, 0.3], 12),
    prop('bicycle', [-8, 0.5, 8], [0.9, 0.5, 0.15], 12),
    prop('suitcase', [8, 0.35, 6], [0.35, 0.35, 0.2], 10),
    // Debris: local bodies on every client, noisy when they fall.
    ...row(6, [2.3, 0.91, -7.5], [0.26, 0], (p) => prop('plate', p, [0.12, 0.01, 0.12], 0.3, false)),
    ...row(4, [3.9, 0.95, -7.3], [0.15, 0], (p) => prop('cup', p, [0.04, 0.05, 0.04], 0.2, false)),
    ...row(3, [4.6, 1, -7.6], [0.15, 0], (p) => prop('jar', p, [0.06, 0.1, 0.06], 0.5, false)),
    ...row(3, [4.6, 0.94, -7.3], [0.12, 0], (p) => prop('apple', p, 0.04, 0.15, false)),
    prop('vase', [-6.3, 0.55, -4.5], [0.08, 0.15, 0.08], 0.8, false),
    prop('vase', [-7.1, 0.75, 3.4], [0.08, 0.15, 0.08], 0.8, false),
    prop('tv', [-4.95, 0.85, -4.5], [0.05, 0.25, 0.45], 6, false),
    ...row(4, [4.2, 0.05, 3.5], [0.15, 0], (p) => prop('shoe', p, [0.05, 0.05, 0.13], 0.4, false)),
    ...row(3, [4, 0.12, -9], [0.4, 0], (p) => prop('flower pot', p, [0.12, 0.12, 0.12], 1.5, false)),
  ],
  doors: [door('x', -8, -5, -4), door('x', 4, 0.5, 1.5), door('x', -1, -1.5, -0.5), door('x', -1, 2.5, 3.5), door('z', -2, 0, 1)],
};
