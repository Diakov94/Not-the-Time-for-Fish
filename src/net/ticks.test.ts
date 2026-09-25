import { beforeAll, expect, test } from 'vitest';
import { prototypeRoom } from '../content/prototype-room.ts';
import { receive } from '../sim/ownership.ts';
import type { Snapshot } from '../sim/snapshot.ts';
import { createWorld, init, type Sim } from '../sim/world.ts';
import { interpolate, receiveTick, type Receiver } from './ticks.ts';

beforeAll(init);

const east = (x: number): Snapshot => ({ id: 'B:0', p: { x, y: 0.5, z: 0 }, q: { x: 0, y: 0, z: 0, w: 1 }, v: { x: 20, y: 0, z: 0 }, w: { x: 0, y: 0, z: 0 }, rest: false });

test("at an ownership change a copy moves on along the previous owner's buffered snapshots, then takes the new owner's pose without a slide", () => {
  const sim = createWorld({ ...prototypeRoom, props: [] }, 'A');
  receive(sim, { type: 'spawn', from: 'B', id: 'B:0', kind: 'prop', home: null, p: { x: 0, y: 0.5, z: 0 } }, 'A');
  const r: Receiver = new Map();
  // B's crate moves east 1 m per tick; C's touch claim gives C the crate, whose first tick is 3 m on.
  for (const [at, x] of [[0, 0], [50, 1], [100, 2]] as const) receiveTick(sim, r, { type: 'tick', from: 'B', s: [east(x)] }, at);
  receive(sim, { type: 'claim', from: 'C', id: 'B:0', hold: false }, 'A');
  receiveTick(sim, r, { type: 'tick', from: 'C', s: [east(5)] }, 180);
  const x = (now: number) => {
    interpolate(sim, r, now);
    return sim.entities.get('B:0')!.body.nextTranslation().x;
  };
  // DELAY_MS behind: halfway between B's poses at 50 and 100 ms; B's last; C's from one tick before it came.
  const at = [x(175), x(215), x(235)];
  console.log(`copy at x ${at.map((v) => v.toFixed(3)).join(', ')} m at 175, 215 and 235 ms; B's poses then 1.5, 2, 2 m, C's first 5 m`);
  expect(at[0]).toBeCloseTo(1.5);
  expect(at[1]).toBeCloseTo(2);
  expect(at[2]).toBeCloseTo(5);
});

test("a new owner's first tick with its next close behind (the sender's catch-up) shows no sooner than one tick after it came, on a bystander and on the previous owner", () => {
  // C's claim gives C the crate; C's ticks come 18 ms apart, the second a catch-up after a frame C did not
  // step. Before C's first pose (5 m) shows, a bystander holds B's last (2 m) and the previous owner its own.
  const shown = (me: string, before: (sim: Sim, r: Receiver) => void) => {
    const sim = createWorld({ ...prototypeRoom, props: [] }, me);
    receive(sim, { type: 'spawn', from: 'B', id: 'B:0', kind: 'prop', home: null, p: { x: 0, y: 0.5, z: 0 } }, me);
    const r: Receiver = new Map();
    before(sim, r);
    receive(sim, { type: 'claim', from: 'C', id: 'B:0', hold: false }, me);
    receiveTick(sim, r, { type: 'tick', from: 'C', s: [east(5)] }, 180);
    receiveTick(sim, r, { type: 'tick', from: 'C', s: [east(6)] }, 198);
    return [225, 235].map((now) => {
      interpolate(sim, r, now);
      return sim.entities.get('B:0')!.body.nextTranslation().x;
    });
  };
  const bystander = shown('A', (sim, r) => {
    for (const [at, x] of [[0, 0], [50, 1], [100, 2]] as const) receiveTick(sim, r, { type: 'tick', from: 'B', s: [east(x)] }, at);
  });
  const previous = shown('B', (sim, r) => receiveTick(sim, r, { type: 'tick', from: 'B', s: [east(0)] }, 100));
  console.log(`copy at x ${[...bystander, ...previous].map((v) => v.toFixed(3)).join(', ')} m: bystander, then previous owner, at 225 and 235 ms; C's first shows from 230`);
  expect(bystander).toEqual([2, 5]);
  expect(previous).toEqual([0, 5]);
});
