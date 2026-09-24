import { span, type Level, type Static, type V, type Volume } from './level.ts';

// The country house (GAME.md, Map Anatomy and Setting): the hideout south of an opaque fence with four
// exits, the yard, and the house with its rooms. Placeholder boxes with a label; the look is render's.
// x runs east, z north.

const FENCE = 4; // no fish thrown from inside clears it: a toss releases ~1.2 m up and a jump adds ~1.3 m
const WALL = 2.8; // the house's walls, under its roof

const solid = (label: string, min: V, max: V, blocks: Static['blocks'] = 'all'): Static => ({ label, blocks, ...span(min, max) });
const zone = (role: 'hideout' | 'house' | 'exit' | 'climb', min: V, max: V): Volume => ({ role, ...span(min, max) });

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
    // west of it, the living room east.
    ...run('wall', 'x', -6, -8.1, 8.1, WALL, [[-0.5, 0.5]]),
    ...run('wall', 'x', 6, -8.1, 8.1, WALL, [[-0.5, 0.5]]),
    ...run('wall', 'z', -8, -5.9, 5.9, WALL),
    ...run('wall', 'z', 8, -5.9, 5.9, WALL),
    ...run('wall', 'z', -2, -5.9, 5.9, WALL, [
      [-3.5, -2.5],
      [2.5, 3.5],
    ]),
    ...run('wall', 'z', 2, -5.9, 5.9, WALL, [[3, 4]]),
    ...run('wall', 'x', 0, -7.9, -2.1, WALL),
    solid('roof', [-8.1, WALL, -6.1], [8.1, WALL + 0.2, 6.1]),
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
  ],
  points: [],
  props: [],
  doors: [],
};
