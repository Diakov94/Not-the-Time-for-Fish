import type { Box, Level, Vec3 } from './level.ts';

// GAME.md, Map Anatomy: the promises every map keeps, as one function any map's test calls. A map is
// `src/content/maps/<name>.ts` exporting its Level as <name> in camelCase (ADR 0011); no index lists them.
export const CATS = 5; // the largest cat team a map hosts
export const DOGS = 3; // and dog team: one exit more, so one is always unguarded
export const CARRY = 16; // m: a carrying dog's 2.0 m/s for the 8 s before a grabbed cat wiggles free
export const TOSS = 2.5; // m: the highest a fish goes, tossed from a jump: released ~1.2 m up, a jump adds ~1.3 m

// One promise: what was measured against its bar, and whether the map keeps it.
export type Check = { promise: string; measured: string; kept: boolean };

const AXES = ['x', 'y', 'z'] as const;
const lo = (b: Box, k: keyof Vec3) => b.p[k] - b.half[k];
const hi = (b: Box, k: keyof Vec3) => b.p[k] + b.half[k];
const inside = (p: Vec3, b: Box) => AXES.every((k) => Math.abs(p[k] - b.p[k]) <= b.half[k] + 1e-9);
// Whether two boxes share an inside, or with `grow`, come within it of each other in the ground plane.
const overlaps = (a: Box, b: Box, grow = 0) => AXES.every((k) => Math.abs(a.p[k] - b.p[k]) < a.half[k] + b.half[k] + (k === 'y' ? 0 : grow));

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
function walks({ statics }: Level, from: Vec3, to: Vec3[]): number[] {
  const blockers = statics.filter((s) => s.label === 'wall' || s.blocks === 'dogs');
  const corner = (b: Box, i: number, j: number) => ({ x: b.p.x + i * (b.half.x + 0.05), y: 0, z: b.p.z + j * (b.half.z + 0.05) });
  const corners = blockers.flatMap((b) => [corner(b, -1, -1), corner(b, -1, 1), corner(b, 1, -1), corner(b, 1, 1)]);
  const nodes = [from, ...to, ...corners];
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

export function anatomy(level: Level): Check[] {
  const { statics, volumes, points, props } = level;
  const role = (r: string) => volumes.filter((v) => v.role === r);
  const at = (r: string) => points.filter((p) => p.role === r).map((p) => p.p);
  const exits = role('exit');
  // The fence either side of an exit: the solids beside the exit's volume, not in it.
  const flanks = statics.filter((s) => s.blocks === 'all' && exits.some((e) => overlaps(e, s, 0.01) && !overlaps(e, s)));
  const fence = flanks.length > 0 ? Math.min(...flanks.map((s) => hi(s, 'y'))) : 0;
  const storages = role('storage');
  const fish = at('fish');
  const holding = storages.filter((s) => fish.some((f) => inside(f, s)));
  const costs = new Set(holding.map((s) => ('access' in s ? s.access : '')));
  const loose = fish.filter((f) => !storages.some((s) => inside(f, s))).length;
  const hatch = at('hatch')[0];
  const carry = hatch && storages.length > 0 ? Math.max(...walks(level, hatch, storages.map((s) => s.p))) : Infinity;
  // A cat route: a gap only cats pass (a `dogs` blocker) that is not an exit.
  const routes = statics.filter((s) => s.blocks === 'dogs' && !exits.some((e) => overlaps(s, e))).length;
  const spots = role('hidingSpot').length + props.filter((p) => p.hidingSpot).length;
  const hideout = role('hideout')[0];
  const tunnels = at('tunnelExit').filter((p) => hideout && inside(p, hideout)).length;
  const [cats, dogs] = [at('catSpawn').length, at('dogSpawn').length];
  return [
    { promise: 'exits', measured: `${exits.length} (> ${DOGS}, the largest dog team)`, kept: exits.length > DOGS },
    { promise: 'carry', measured: `the farthest storage ${carry.toFixed(1)} m from the hatch (<= ${CARRY})`, kept: carry <= CARRY },
    { promise: 'fence', measured: `${fence} m beside the exits (> ${TOSS}, a fish's toss)`, kept: fence > TOSS },
    {
      promise: 'fish',
      measured: `${fish.length} (5), ${loose} outside a storage, in ${holding.length} storages (>= 3) with ${costs.size} access costs (3)`,
      kept: fish.length === 5 && loose === 0 && holding.length >= 3 && costs.size === 3,
    },
    { promise: 'hiding', measured: `cat routes ${routes} (>= 1), hiding spots ${spots} (>= 1)`, kept: routes >= 1 && spots >= 1 },
    { promise: 'spawns', measured: `cat spawns ${cats} (>= ${CATS}), dog spawns ${dogs} (>= ${DOGS})`, kept: cats >= CATS && dogs >= DOGS },
    { promise: 'tunnel', measured: `tunnel exits in the hideout ${tunnels} (>= 1)`, kept: tunnels >= 1 },
  ];
}
