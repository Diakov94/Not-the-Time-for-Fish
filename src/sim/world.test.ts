import { beforeAll, expect, test } from 'vitest';
import { spawnEntity } from './entities.ts';
import { prototypeRoom } from './level.ts';
import { createWorld, init, step, STEP } from './world.ts';

beforeAll(init);

test('a crate dropped from 2 m rests at y = 0.50 ± 0.01 within 120 steps', () => {
  const sim = createWorld(prototypeRoom, 'H');
  prototypeRoom.crates.forEach((p, i) =>
    spawnEntity(sim.world, sim.entities, { type: 'spawn', from: 'H', id: `H:${i}`, kind: 'crate', home: null, p }),
  );
  // Its bottom face starts 2 m above the floor.
  const crate = spawnEntity(sim.world, sim.entities, {
    type: 'spawn', from: 'H', id: 'H:10', kind: 'crate', home: null, p: { x: 0, y: 2.5, z: 0 },
  }).body;
  for (let i = 0; i < 120; i++) step(sim, STEP);
  expect(Math.abs(crate.translation().y - 0.5)).toBeLessThanOrEqual(0.01);
  expect(crate.isSleeping()).toBe(true);
});
