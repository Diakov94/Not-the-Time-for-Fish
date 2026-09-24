import { beforeAll, expect, test } from 'vitest';
import { prototypeRoom } from '../content/prototype-room.ts';
import { receive } from '../sim/ownership.ts';
import type { Snapshot } from '../sim/snapshot.ts';
import { createWorld, init } from '../sim/world.ts';
import { interpolate, receiveTick, type Receiver } from './ticks.ts';

beforeAll(init);

const east = (x: number): Snapshot => ({ id: 'B:0', p: { x, y: 0.5, z: 0 }, q: { x: 0, y: 0, z: 0, w: 1 }, v: { x: 20, y: 0, z: 0 }, w: { x: 0, y: 0, z: 0 }, rest: false });

test("at an ownership change a copy moves on the next frame along the previous owner's snapshots still buffered", () => {
  const sim = createWorld({ ...prototypeRoom, props: [] }, 'A');
  receive(sim, { type: 'spawn', from: 'B', id: 'B:0', kind: 'prop', home: null, p: { x: 0, y: 0.5, z: 0 } }, 'A');
  const r: Receiver = new Map();
  // B's crate moves east 1 m per tick; C's touch claim gives C the crate, whose first tick follows.
  for (const [at, x] of [[0, 0], [50, 1], [100, 2]] as const) receiveTick(sim, r, { type: 'tick', from: 'B', s: [east(x)] }, at);
  receive(sim, { type: 'claim', from: 'C', id: 'B:0', hold: false }, 'A');
  receiveTick(sim, r, { type: 'tick', from: 'C', s: [east(2.5)] }, 120);
  interpolate(sim, r, 175); // DELAY_MS behind: halfway between B's poses at 50 and 100 ms
  const x = sim.entities.get('B:0')!.body.nextTranslation().x;
  console.log(`copy at x ${x.toFixed(3)} m 75 ms after the change, B's pose then 1.5 m`);
  expect(x).toBeCloseTo(1.5);
});
