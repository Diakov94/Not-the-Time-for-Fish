import { expect, test } from 'vitest';
import type { ClientId, Kind, NetId, Variant } from './entities.ts';
import type { Spawn } from './messages.ts';
import { fold, newOwnershipTable } from './ownership.ts';

// Cat C's two planted traps and dog D (card 130): a slip trap springs under the dog that steps on it, so
// the fold takes its `sprung` from that dog's client; a noise maker's only from its own cat.
test("the fold accepts a dog's sprung on a planted slip trap and rejects it on a noise maker", () => {
  const spawn = (from: ClientId, id: NetId, kind: Kind, variant?: Variant): Spawn => ({ type: 'spawn', from, id, kind, home: from, p: { x: 0, y: 0.1, z: 0 }, variant });
  const order = [spawn('C', 'C:0', 'cat'), spawn('D', 'D:0', 'dog'), spawn('C', 'C:1', 'trap', 'slip'), spawn('C', 'C:2', 'trap', 'noise')];
  const identities = new Map(order.map((m) => [m.id, m]));
  const t = newOwnershipTable();
  for (const m of order) fold(t, m, identities);
  const sprung = (from: ClientId, id: NetId) => fold(t, { type: 'sprung', from, id }, identities);
  expect([sprung('D', 'C:1'), sprung('D', 'C:2'), sprung('C', 'C:2')]).toEqual([true, false, true]);
});
