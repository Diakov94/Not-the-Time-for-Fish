import { beforeAll, expect, test } from 'vitest';
import { countryHouse } from '../content/country-house.ts';
import { prototypeRoom } from '../content/prototype-room.ts';
import { halfHeight, spawnOf } from './entities.ts';
import { receive } from './ownership.ts';
import { createWorld, init, step, STEP } from './world.ts';

beforeAll(init);

test('a crate dropped from 2 m rests at y = 0.50 ± 0.01 within 120 steps', () => {
  const sim = createWorld(prototypeRoom, 'H');
  prototypeRoom.props.forEach(({ p }, i) => receive(sim, { type: 'spawn', from: 'H', id: `H:${i}`, kind: 'prop', home: null, p, prop: i }, 'H'));
  // Its bottom face starts 2 m above the floor.
  receive(sim, { type: 'spawn', from: 'H', id: 'H:10', kind: 'prop', home: null, p: { x: 0, y: 2.5, z: 0 } }, 'H');
  const crate = sim.entities.get('H:10')!.body;
  for (let i = 0; i < 120; i++) step(sim, STEP);
  expect(Math.abs(crate.translation().y - 0.5)).toBeLessThanOrEqual(0.01);
  expect(crate.isSleeping()).toBe(true);
});

test("the gate's dogs blocker: a dog walking south into it stops at the fence line and a cat walks through", () => {
  // The gate is an exit 1.5 m wide: a dog fits the gap, so only the blocker stops it.
  const southFrom = (kind: 'cat' | 'dog') => {
    const sim = createWorld(countryHouse, 'A');
    receive(sim, spawnOf(sim, { kind, p: { x: 0, y: halfHeight(kind), z: -13 } }), 'A');
    const body = [...sim.entities.values()][0]!.body;
    for (let i = 0; i < 180; i++) step(sim, STEP, { move: { x: 0, z: -1 }, sprint: false, jump: false });
    return body.translation().z;
  };
  const [dog, cat] = [southFrom('dog'), southFrom('cat')];
  console.log(`after 3 s walking south from z = -13 through the gate (fence at z = -16): dog at ${dog.toFixed(2)}, cat at ${cat.toFixed(2)}`);
  expect(dog).toBeGreaterThan(-16);
  expect(cat).toBeLessThan(-20);
});
