import { beforeAll, expect, test } from 'vitest';
import { prototypeRoom } from './level.ts';
import { IDLE } from './movement.ts';
import { receive } from './ownership.ts';
import { sniffed } from './scent.ts';
import { applySnapshot } from './snapshot.ts';
import { createWorld, init, step, STEP } from './world.ts';

beforeAll(init);

test("a sniffing dog smells a cat's trail 20 s after it passed, and nothing after 30 s", () => {
  const sim = createWorld(prototypeRoom, 'B');
  receive(sim, { type: 'spawn', from: 'B', id: 'B:0', kind: 'dog', home: 'B', p: { x: 0, y: 1, z: -3 } }, 'B');
  receive(sim, { type: 'spawn', from: 'A', id: 'A:0', kind: 'cat', home: 'A', p: { x: -5, y: 0.46, z: 0 } }, 'B');
  const sniff = { ...IDLE, sniff: true };
  const wait = (s: number) => {
    for (let i = 0; i < s * 60; i++) step(sim, STEP, sniff);
  };
  // A's snapshots walk its cat 10 m past the dog in 2.5 s.
  for (let i = 1; i <= 150; i++) {
    const p = { x: -5 + i / 15, y: 0.46, z: 0 };
    applySnapshot(sim, 'A', { id: 'A:0', p, q: { x: 0, y: 0, z: 0, w: 1 }, v: { x: 4, y: 0, z: 0 }, w: { x: 0, y: 0, z: 0 }, rest: false });
    step(sim, STEP, sniff);
  }
  wait(20);
  const at20 = sniffed(sim).trail.length;
  wait(11);
  console.log(`trail samples: ${at20} at 20 s, ${sniffed(sim).trail.length} at 31 s`);
  expect(at20).toBeGreaterThanOrEqual(18);
  expect(at20).toBeLessThanOrEqual(22);
  expect(sniffed(sim).trail.length).toBe(0);
});
