import { expect, test } from 'vitest';
import type { SimEvent } from '../sim/events.ts';
import { newOwnershipTable } from '../sim/ownership.ts';
import { foldRound, newRound, settle, successor, type RoundMessage } from '../sim/round.ts';
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

// ADR 0014: a 3-round match at 5 players folded as the relay orders it, this client `c0` (p0) a dog in
// rounds 1 and 3 (the rotation: p0+p1, p2+p3, p4+p0), a cat in round 2. Round 1: p0 catches p2, p1 catches
// p3, the dogs win on the timer; round 2: p1 secures three fish, the cats win; round 3: p4 catches p1, the
// dogs win. Every capture is also an event on this client, and the table's own ends are settled after
// every message, as `receive` does.
test('a 3-round match at 5 players: matches 1 at its last round, wins per the side played, captured this player\'s catches', () => {
  const [r, t] = [newRound(), newOwnershipTable()];
  const entities = new Map(['f1', 'f2', 'f3'].map((id) => [id, { kind: 'fish' as const, home: null }]));
  const fold = (m: RoundMessage) => {
    foldRound(r, m, 'c0', t, entities);
    settle(r, t, entities);
  };
  const next = () => fold({ type: 'phase', from: 'c0', ...successor(r) });
  const p = { x: 0, y: 0, z: 0 };
  let events: SimEvent[] = [];
  const capture = (cat: string, by: string) => {
    fold({ type: 'captured', from: cat, at: 1, by });
    events.push({ type: 'captured', p, from: cat });
  };
  const over = () => {
    events.push({ type: 'phase', to: 'over', round: r.round, from: 'c0' });
    record({ me: 'c0', round: r, events });
    events = [];
    return { matches: progress().matches - before.matches };
  };
  const before = structuredClone(progress());
  for (let i = 0; i < 5; i++) fold({ type: 'hello', from: `c${i}`, name: `p${i}` });
  next(); // prep 1
  next(); // heist
  capture('c2', 'c0');
  capture('c3', 'c1');
  next(); // overtime, over on the timer
  const after = [over()];
  next(); // prep 2
  next(); // heist
  for (const fish of ['f1', 'f2', 'f3']) {
    t.rows.set(fish, { owner: 'c1', held: true });
    fold({ type: 'secured', from: 'c1', fish, at: 1 });
    t.rows.delete(fish);
  }
  after.push(over());
  next(); // prep 3
  next(); // heist
  capture('c1', 'c4');
  next(); // overtime, over on the timer
  after.push(over());
  const now = progress();
  const got = { matches: after.map((x) => x.matches), wins: { cat: now.wins.cat - before.wins.cat, dog: now.wins.dog - before.wins.dog }, captured: now.captured - before.captured };
  console.log(`rounds ${r.rounds}, winners ${r.results.map((x) => x.winner).join()}; matches after each round ${got.matches.join()}, wins ${JSON.stringify(got.wins)}, captured ${got.captured}`);
  expect(r.results.map((x) => x.winner)).toEqual(['dog', 'cat', 'dog']);
  expect(got).toEqual({ matches: [0, 0, 1], wins: { cat: 1, dog: 2 }, captured: 1 });
});
