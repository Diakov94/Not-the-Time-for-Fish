import { beforeAll, expect, test } from 'vitest';
import { prototypeRoom } from './level.ts';
import { receive } from './ownership.ts';
import { createWorld, init, step, STEP } from './world.ts';

beforeAll(init);

test('a crate dropped from 2 m rests at y = 0.50 ± 0.01 within 120 steps', () => {
  const sim = createWorld(prototypeRoom, 'H');
  prototypeRoom.crates.forEach((p, i) => receive(sim, { type: 'spawn', from: 'H', id: `H:${i}`, kind: 'crate', home: null, p }));
  // Its bottom face starts 2 m above the floor.
  receive(sim, { type: 'spawn', from: 'H', id: 'H:10', kind: 'crate', home: null, p: { x: 0, y: 2.5, z: 0 } });
  const crate = sim.entities.get('H:10')!.body;
  for (let i = 0; i < 120; i++) step(sim, STEP);
  expect(Math.abs(crate.translation().y - 0.5)).toBeLessThanOrEqual(0.01);
  expect(crate.isSleeping()).toBe(true);
});
