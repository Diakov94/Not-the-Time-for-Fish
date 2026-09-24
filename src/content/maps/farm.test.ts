import { expect, test } from 'vitest';
import { farm } from './farm.ts';
import type { Box, Level, Vec3 } from '../level.ts';

// Card 138's acceptance over the data. Until card 101's anatomy function lands this holds the numbers
// that need no walk; the carry range is measured in the card's report.
function numbers({ statics, volumes, points, props }: Level) {
  const AXES = ['x', 'y', 'z'] as const;
  const inside = (p: Vec3, b: Box) => AXES.every((k) => Math.abs(p[k] - b.p[k]) <= b.half[k] + 1e-9);
  const overlaps = (a: Box, b: Box) => AXES.every((k) => Math.abs(a.p[k] - b.p[k]) < a.half[k] + b.half[k]);
  const fish = points.filter((p) => p.role === 'fish').map((p) => p.p);
  const exits = volumes.filter((v) => v.role === 'exit');
  const storages = volumes.flatMap((v) => (v.role === 'storage' ? [v] : []));
  const holding = storages.filter((s) => fish.some((f) => inside(f, s)));
  return {
    exits: exits.length,
    dogs: points.filter((p) => p.role === 'dogSpawn').length,
    // The fence's height away from the exits, where its holes are.
    fence: Math.min(...statics.filter((s) => s.label === 'fence' && !exits.some((e) => overlaps(s, e))).map((s) => s.p.y + s.half.y)),
    fish: fish.filter((f) => storages.some((s) => inside(f, s))).length,
    costs: new Set(holding.map((s) => s.access)).size,
    synced: props.filter((p) => p.synced).length,
  };
}

test('the farm keeps the numbers of its anatomy', () => {
  const n = numbers(farm);
  console.log(`exits ${n.exits} > dogs ${n.dogs}; fence ${n.fence} m; ${n.fish} fish in storages of ${n.costs} costs; synced ${n.synced}`);
  expect(n.exits).toBeGreaterThan(n.dogs);
  expect(n.fence).toBeGreaterThanOrEqual(4);
  expect(n.fish).toBe(5);
  expect(n.costs).toBe(3);
  expect(n.synced).toBeLessThanOrEqual(26);
});
