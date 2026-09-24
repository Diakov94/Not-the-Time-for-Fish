import { span, vec, type Access, type Box, type Door, type Level, type Point, type Prop, type Static, type V, type Volume } from '../level.ts';

// The yacht (GAME.md, Setting and Map Anatomy), moored stern-to in a marina: the hideout on the quay by a
// dinghy, south of the hull's opaque rails with four exits (the gangway and the stern ladder over the
// transom, a porthole low in the port side, the anchor chain from 1.2 m up on the starboard bow); the
// deck with the bridge as the doghouse and the fish hold's cage as the kennel; the cabins and the galley
// with three storages, doors, cat routes, hiding spots and clutter. The quay and the two pontoons along the
// hull are the only ground outside the rails; the water beyond them is the world's edge. x runs to
// starboard, z to the bow. Sized to the sim's bodies (card 22) as the country house is.
//
// Labels the theme (card 151) draws; until it lands each is a palette box.
//   statics: deck, pier, water (the edge's colliders: the theme draws the water as a plane at y = 0), rail,
//     gangway, stern ladder, porthole, anchor chain, dinghy, wall, vent, roof, galley table, fridge,
//     counter, aquarium, bar, bunk, kennel gate, kennel, bridge, lifeboat, chock
//   props: tarpaulin, luggage, deck chair, coil of rope, fender, cooler, armchair, coffee table, stool, bin
//   debris: glass, bottle, plate, lifebuoy

const FENCE = 4; // the rails: no fish thrown from the deck clears them (a toss releases ~1.2 m up, a jump adds ~1.3 m)
const WALL = 2.8; // the superstructure's walls, under its roof

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
// n things in a row, the first at [x, y, z] and each next one [dx, dz] further along the deck.
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

export const yacht: Level = {
  statics: [
    // The hull's deck, 20 x 44 m, and the pier around its stern and sides, all at y = 0.
    solid('deck', [-10, -1, -20], [10, 0, 24.1]),
    solid('pier', [-13, -1, -32], [13, 0, -20]),
    solid('pier', [-13, -1, -20], [-10, 0, 20]),
    solid('pier', [10, -1, -20], [13, 0, 20]),
    // The water past the pier and off the bow: the world's edge.
    solid('water', [-13.2, 0, -32.2], [13.2, 5, -32]),
    solid('water', [-13.2, 0, -32], [-13, 5, 20]),
    solid('water', [13, 0, -32], [13.2, 5, 20]),
    solid('water', [-13.2, 0, 20], [-9.9, 5, 20.2]),
    solid('water', [9.9, 0, 20], [13.2, 5, 20.2]),
    // The rails. Exits: the gangway and the stern ladder over the transom, a porthole in the port side, and
    // on the starboard bow a hawse from 1.2 m up that a cat reaches by the anchor chain on either side.
    ...run('rail', 'x', -20, -10.1, 10.1, FENCE, [
      [-0.75, 0.75, 'gangway'],
      [6.6, 7.4, 'stern ladder'],
    ]),
    ...run('rail', 'x', 24, -10.1, 10.1, FENCE),
    ...run('rail', 'z', -10, -19.9, 23.9, FENCE, [[3.6, 4.4, 'porthole']]),
    ...run('rail', 'z', 10, -19.9, 23.9, FENCE, [[15.5, 16.5]]),
    solid('rail', [9.9, 0, 15.5], [10.1, 1.2, 16.5]),
    solid('anchor chain', [9.9, 1.2, 15.5], [10.1, FENCE, 16.5], 'dogs'),
    // The dinghy tied up at the quay, in the hideout.
    solid('dinghy', [6.5, 0, -29.5], [9.5, 0.5, -27.5]),
    // The superstructure, 12 x 16 m: a corridor from the aft door to the forward door, the galley and the
    // cabin to port of it, the saloon to starboard. Cat routes: a porthole into the galley and one into
    // the saloon, a vent from the galley to the cabin.
    ...run('wall', 'x', -8, -6.1, 6.1, WALL, [[-0.5, 0.5]]),
    ...run('wall', 'x', 8, -6.1, 6.1, WALL, [[-0.5, 0.5]]),
    ...run('wall', 'z', -6, -7.9, 7.9, WALL, [[3, 3.7, 'porthole']]),
    ...run('wall', 'z', 6, -7.9, 7.9, WALL, [[-4, -3.3, 'porthole']]),
    ...run('wall', 'z', -1.5, -7.9, 7.9, WALL, [
      [-3.5, -2.5],
      [5, 6],
    ]),
    ...run('wall', 'z', 1.5, -7.9, 7.9, WALL, [[4, 5]]),
    ...run('wall', 'x', 0, -5.9, -1.6, WALL, [[-5, -4.3, 'vent']]),
    solid('roof', [-6.1, WALL, -8.1], [6.1, WALL + 0.2, 8.1]),
    // The storages: the galley table, the galley's fridge (a shelf at 0.9 m, open aft: its door is the sim's
    // access cost) and the saloon's aquarium (a tank on a stand, its lid the sim's).
    solid('galley table', [-4.4, 0, 2], [-2.8, 0.75, 3.2]),
    solid('fridge', [-5.9, 0, 6.9], [-5.1, 0.9, 7.9]),
    solid('fridge', [-5.9, 0.9, 7.8], [-5.1, 1.8, 7.9]),
    solid('fridge', [-5.9, 0.9, 6.9], [-5.8, 1.8, 7.8]),
    solid('fridge', [-5.2, 0.9, 6.9], [-5.1, 1.8, 7.8]),
    solid('fridge', [-5.8, 1.7, 6.9], [-5.2, 1.8, 7.8]),
    solid('aquarium', [4.6, 0, 5.6], [5.8, 0.8, 6.8]),
    solid('aquarium', [4.6, 0.8, 5.6], [5.8, 1.4, 5.65]),
    solid('aquarium', [4.6, 0.8, 6.75], [5.8, 1.4, 6.8]),
    solid('aquarium', [4.6, 0.8, 5.65], [4.65, 1.4, 6.75]),
    solid('aquarium', [5.75, 0.8, 5.65], [5.8, 1.4, 6.75]),
    // Fittings that stay put: the galley counter beside the fridge, the saloon's bar, the cabin's bunk off
    // the aft wall.
    solid('counter', [-4.45, 0, 6.9], [-2.2, 0.9, 7.9]),
    solid('bar', [2.5, 0, -7.9], [5, 1, -7.2]),
    solid('bunk', [-5.5, 0, -7.25], [-3.5, 1.6, -6.35]),
    // Forward of the superstructure: the fish hold's cage, open on top, whose 2.5 m bars a cat inside
    // cannot climb, so the hatch's bottom edge is 2.5 m up; the latch is on the gate, outside. The bridge
    // beside it.
    solid('kennel gate', [-1.2, 0, 10.8], [1.2, 2.5, 10.9], 'latch'),
    solid('kennel', [-1.2, 0, 13.1], [1.2, 2.5, 13.2]),
    solid('kennel', [-1.2, 0, 10.9], [-1.1, 2.5, 13.1]),
    solid('kennel', [1.1, 0, 10.9], [1.2, 2.5, 13.1]),
    solid('bridge', [2.5, 0, 10.5], [5, 2.5, 13.5]),
    // The lifeboat on two chocks: a cat fits in the slot between them, under the boat.
    solid('chock', [-5.6, 0, 14], [-5.25, 1, 17]),
    solid('chock', [-4.6, 0, 14], [-4.25, 1, 17]),
    solid('lifeboat', [-6.2, 1, 13.8], [-3.6, 1.8, 17.2]),
  ],
  volumes: [
    zone('hideout', [-10, 0, -30], [10, 3, -22]),
    zone('exit', [-0.75, 0, -21], [0.75, FENCE, -19]),
    zone('exit', [6.6, 0, -21], [7.4, FENCE, -19]),
    zone('exit', [-11, 0, 3.6], [-9, FENCE, 4.4]),
    zone('exit', [9, 0, 15.5], [11, FENCE, 16.5]),
    zone('climb', [9.3, 0, 15.7], [9.9, 2.4, 16.3]),
    zone('climb', [10.1, 0, 15.7], [10.7, 2.4, 16.3]),
    zone('house', [-1.4, 0, -7.9], [1.4, WALL, 7.9]), // the corridor
    zone('house', [-5.9, 0, 0.1], [-1.6, WALL, 7.9]), // the galley
    zone('house', [-5.9, 0, -7.9], [-1.6, WALL, -0.1]), // the cabin
    zone('house', [1.6, 0, -7.9], [5.9, WALL, 7.9]), // the saloon
    storage('open', [-4.4, 0.75, 2], [-2.8, 1.25, 3.2]),
    storage('door', [-5.8, 0.9, 6.9], [-5.2, 1.7, 7.8]),
    storage('lid', [4.65, 0.8, 5.65], [5.75, 1.4, 6.75]),
    zone('kennel', [-1.1, 0, 10.9], [1.1, 2.5, 13.1]),
    zone('doghouse', [2, 0, 10], [5.5, 2, 14]),
    zone('hidingSpot', [-5.1, 0, 6.9], [-4.45, 1.2, 7.9]), // between the fridge and the counter
    zone('hidingSpot', [-5.5, 0, -7.9], [-3.5, 1.2, -7.25]), // behind the bunk
    zone('hidingSpot', [-5.25, 0, 14], [-4.6, 1, 17]), // under the lifeboat
  ],
  points: [
    ...[-4, -2, 0, 2, 4].map((x) => at('catSpawn', [x, 0, -24])),
    at('tunnelExit', [5.5, 0, -28.5]),
    ...[3, 4.5, 6].map((x) => at('dogSpawn', [x, 0, 15.5], Math.PI)),
    at('fish', [-4, 0.75, 2.6]),
    at('fish', [-3.2, 0.75, 2.6]),
    at('fish', [-5.5, 0.9, 7.1], Math.PI / 2),
    at('fish', [-5.5, 0.9, 7.55], Math.PI / 2),
    at('fish', [5.2, 0.8, 6.2]),
    at('hatch', [0, 2.5, 12]),
    at('latch', [0.7, 1, 10.5], Math.PI),
    ...([[0.8, -4], [-4, -4], [3, 2], [-3.5, 5], [-7.5, -12], [7.5, 4], [-7.5, 10]] as const).map(([x, z]) => at('bag', [x, 0, z])),
    ...([[7.5, -14], [-7.5, 2], [7.5, 14]] as const).map(([x, z]) => at('trapPickup', [x, 0, z])),
  ],
  props: [
    // Tarpaulins over deck gear a dog shoves away, each leaving a cat's slot against the superstructure.
    prop('tarpaulin', [-4, 0.6, -9.45], [0.9, 0.6, 0.7], 30, true, span([-0.9, -0.6, 0.7], [0.9, 0.6, 1.35])),
    prop('tarpaulin', [-4, 0.6, 9.45], [0.9, 0.6, 0.7], 30, true, span([-0.9, -0.6, -1.35], [0.9, 0.6, -0.7])),
    prop('tarpaulin', [-7.45, 0.6, -4], [0.7, 0.6, 0.9], 30, true, span([0.7, -0.6, -0.9], [1.35, 0.6, 0.9])),
    prop('tarpaulin', [7.45, 0.6, 0], [0.7, 0.6, 0.9], 30, true, span([-1.35, -0.6, -0.9], [-0.7, 0.6, 0.9])),
    // Luggage a dog barges and a cat cannot move: at the forward door and the cabin door.
    prop('luggage', [0, 0.5, 7.4], [0.5, 0.5, 0.25], 20),
    prop('luggage', [-2.1, 0.5, -3], [0.25, 0.5, 0.5], 20),
    ...([[3, -14], [4, -14], [-3, -14], [-4, -14]] as const).map(([x, z]) => prop('deck chair', [x, 0.4, z], [0.25, 0.4, 0.25], 3)),
    ...([[6, -17], [-6, 12], [6.5, 18]] as const).map(([x, z]) => prop('coil of rope', [x, 0.1, z], [0.35, 0.1, 0.35], 6)),
    ...row(3, [-6, 0.4, -17], [0.4, 0], (p) => prop('fender', p, [0.15, 0.4, 0.15], 2)),
    prop('cooler', [4.5, 0.25, -12.5], [0.35, 0.25, 0.25], 8),
    prop('armchair', [2.4, 0.4, -5.8], [0.4, 0.4, 0.4], 25),
    prop('armchair', [3.6, 0.4, -5.8], [0.4, 0.4, 0.4], 25),
    prop('coffee table', [4, 0.2, -1], [0.5, 0.2, 0.3], 10),
    ...row(2, [-4, 0.3, 3.9], [0.8, 0], (p) => prop('stool', p, [0.18, 0.3, 0.18], 4)),
    prop('bin', [-2, 0.35, 1], [0.2, 0.35, 0.2], 3),
    // Debris: local bodies on every client, noisy when they fall.
    ...row(4, [-4.2, 0.95, 7.15], [0.3, 0], (p) => prop('glass', p, [0.04, 0.05, 0.04], 0.2, false)),
    ...row(3, [-4.2, 1.02, 7.6], [0.35, 0], (p) => prop('bottle', p, [0.04, 0.12, 0.04], 0.6, false)),
    ...row(2, [-2.85, 0.91, 7.4], [0.35, 0], (p) => prop('plate', p, [0.12, 0.01, 0.12], 0.3, false)),
    ...row(4, [2.8, 1.05, -7.4], [0.4, 0], (p) => prop('glass', p, [0.04, 0.05, 0.04], 0.2, false)),
    ...row(4, [2.8, 1.12, -7.7], [0.4, 0], (p) => prop('bottle', p, [0.04, 0.12, 0.04], 0.6, false)),
    ...row(2, [3.8, 0.45, -1], [0.4, 0], (p) => prop('glass', p, [0.04, 0.05, 0.04], 0.2, false)),
    ...row(4, [2.9, 0.12, -12.5], [0.2, 0], (p) => prop('bottle', p, [0.04, 0.12, 0.04], 0.6, false)),
    prop('lifebuoy', [6, 0.05, -16], [0.35, 0.05, 0.35], 1, false),
    prop('lifebuoy', [-6, 0.05, 18], [0.35, 0.05, 0.35], 1, false),
  ],
  doors: [door('x', -8, -0.5, 0.5), door('x', 8, -0.5, 0.5), door('z', -1.5, 5, 6), door('z', -1.5, -3.5, -2.5), door('z', 1.5, 4, 5)],
};
