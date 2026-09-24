import { beforeAll, expect, test } from 'vitest';
import { prototypeRoom } from '../content/prototype-room.ts';
import { drainEvents } from './events.ts';
import { receive } from './ownership.ts';
import { createWorld, init } from './world.ts';

beforeAll(init);

// ADR 0013: an emote is an event on arrival, never stored.
test('an emote received is one event on the list and changes no table', () => {
  const sim = createWorld(prototypeRoom, 'A');
  receive(sim, { type: 'hello', from: 'B', name: 'P1' }, 'A');
  receive(sim, { type: 'spawn', from: 'B', id: 'B:0', kind: 'cat', home: 'B', p: { x: 0, y: 1, z: 0 } }, 'A');
  drainEvents(sim);
  const tables = () => JSON.stringify([sim.round, [...sim.ownership.rows], [...sim.ownership.gone], [...sim.entities.keys()]]);
  const before = tables();
  receive(sim, { type: 'emote', from: 'B', n: 1 }, 'A');
  expect(drainEvents(sim)).toEqual([{ type: 'emote', from: 'B', n: 1 }]);
  expect(tables()).toBe(before);
});
