import { expect, test } from 'vitest';
import type { Box, Vec3 } from '../level.ts';
import { highRise } from './high-rise.ts';

// Card 134's numbers over the data, until card 101's anatomy function takes them over. The schema has no
// fence role (ADR 0008), so the fence is found by its labels.
const { statics, volumes, points, props } = highRise;
const DOGS = 3; // the largest dog team
const CARRY = 16; // m: a carrying dog's 2.0 m/s for 8 s (card 18)
const FENCE = ['balcony rail', 'vent shaft'];
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

// The shortest walk in straight lines from `from` to each of `to` around the flat's walls and whatever
// stops a dog: a visibility graph over the corners of those boxes, 5 cm out.
function walks(from: Vec3, to: Vec3[]): number[] {
  const blockers = statics.filter((s) => s.label === 'wall' || s.blocks === 'dogs');
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

test('the high-rise keeps the promises of its anatomy', () => {
  // An exit counts while a dogs blocker fills its gap: a cat passes, a dog does not.
  const exits = volumes.filter((v) => v.role === 'exit' && statics.some((s) => s.blocks === 'dogs' && overlaps(s, v)));
  const fence = statics.filter((s) => FENCE.includes(s.label) && !exits.some((e) => overlaps(s, e)));
  const height = Math.min(...fence.map((f) => hi(f, 'y')));
  const fish = points.filter((p) => p.role === 'fish').map((p) => p.p);
  const storages = volumes.filter((v) => v.role === 'storage');
  const holding = storages.filter((s) => fish.some((f) => inside(f, s)));
  const costs = holding.map((s) => (s.role === 'storage' ? s.access : '')).sort();
  const loose = fish.filter((f) => !storages.some((s) => inside(f, s))).length;
  const carry = Math.max(...walks(points.find((p) => p.role === 'hatch')!.p, holding.map((s) => s.p)));
  const synced = props.filter((p) => p.synced).length;
  console.log(`exits ${exits.length} (> ${DOGS} dogs); fence ${height} m (>= 4); fish ${fish.length} (${loose} loose) in ${holding.length} storages {${costs.join(', ')}}`);
  console.log(`walk from the farthest storage to the hatch ${carry.toFixed(1)} m (<= ${CARRY}); synced props ${synced} (<= 26, the house's)`);
  expect(exits.length).toBeGreaterThan(DOGS);
  expect(height).toBeGreaterThanOrEqual(4);
  expect(fish.length).toBe(5);
  expect(loose).toBe(0);
  expect(costs).toEqual(['door', 'lid', 'open']);
  expect(carry).toBeLessThanOrEqual(CARRY);
  expect(synced).toBeLessThanOrEqual(26);
});
