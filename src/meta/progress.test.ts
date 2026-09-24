import { expect, test } from 'vitest';
import type { SimEvent } from '../sim/events.ts';
import { newRound } from '../sim/round.ts';
import { progress, record } from './progress.ts';

// Client `a`, a cat in round 1, which the cats won with three fish.
function afterRound1(events: SimEvent[]) {
  const round = newRound();
  round.roster.push({ name: 'P0', side: 'cat', client: 'a', looks: {}, worn: {}, captured: null });
  [round.phase, round.round] = ['over', 1];
  round.results.push({ dogs: [], secured: 3, last: 100, why: 'fish', winner: 'cat', points: {} });
  return { me: 'a', round, events };
}

// Card 126: the results screen stays up for many frames, and the loop may hand the same list twice.
test('the same over fed twice counts once', () => {
  const before = progress().wins.cat;
  const sim = afterRound1([{ type: 'phase', to: 'over', round: 1, from: 'a' }]);
  record(sim);
  record(sim);
  expect(progress().wins.cat - before).toBe(1);
});

test("an event from another client counts 0, this client's own 1", () => {
  const before = progress().rescues;
  const p = { x: 0, y: 0, z: 0 };
  record(afterRound1([{ type: 'rescue', p, from: 'b' }]));
  expect(progress().rescues - before).toBe(0);
  record(afterRound1([{ type: 'rescue', p, from: 'a' }]));
  expect(progress().rescues - before).toBe(1);
});
