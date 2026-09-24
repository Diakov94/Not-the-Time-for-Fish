import { expect, test } from 'vitest';
import { grab } from '../sim/grab.ts';
import { IDLE } from '../sim/movement.ts';
import { send, spawn, type Session } from './client.ts';
import { north, play, room, south } from './clients.test.ts';

// Touch claims: a character pushing a prop another client owns takes it; one held by another is refused,
// at most twice a second, and the prop returns to its owner's snapshots.

test('a character walking into a crate another client owns moves it more than 0.2 m on both clients within 1 s', async () => {
  const [a, b] = await room(2);
  const crate = spawn(a!, 'prop', { x: 0, y: 0.5, z: 3 });
  spawn(b!, 'cat', { x: 0, y: 1, z: 1.5 }); // 0.65 m short of the crate
  await play(2000, () => a!.sim.entities.size === 2 && b!.sim.entities.size === 2 && a!.rested.has(crate));
  const onA = a!.sim.entities.get(crate)!.body;
  const onB = b!.sim.entities.get(crate)!.body;
  const z0 = onA.translation().z;
  const t0 = performance.now();
  let movedA = Infinity;
  let movedB = Infinity;
  await play(
    1000,
    () => movedA < Infinity && movedB < Infinity,
    (now) => {
      if (movedA === Infinity && onA.translation().z - z0 > 0.2) movedA = now - t0;
      if (movedB === Infinity && onB.translation().z - z0 > 0.2) movedB = now - t0;
    },
    (s) => (s === b ? north : IDLE),
  );
  console.log(`pushed crate past 0.2 m: ${movedB.toFixed(0)} ms on the pusher, ${movedA.toFixed(0)} ms on its former owner`);
  expect(Math.max(movedA, movedB)).toBeLessThanOrEqual(1000);
  for (const s of [a!, b!]) expect(s.sim.ownership.rows.get(crate)).toEqual({ owner: b!.sim.me, held: false });
});

// B holds a crate still, and A's character is set to walk into it: the fold rejects every touch claim of A's.
async function holdCrate() {
  const [a, b] = await room(2);
  spawn(b!, 'cat', { x: 0, y: 1, z: 3 });
  const crate = spawn(b!, 'prop', { x: 0, y: 0.5, z: 4.5 });
  spawn(a!, 'cat', { x: 0, y: 1, z: 7 });
  await play(2000, () => a!.sim.entities.size === 3 && b!.rested.has(crate));
  send(b!, grab(b!.sim)!);
  await play(500, () => a!.sim.ownership.rows.get(crate)?.held === true);
  return { a: a!, b: b!, crate, pushing: (s: Session) => (s === a ? south : IDLE) };
}

test('touch claims for one prop go out at most twice per second', async () => {
  const { a, crate, pushing } = await holdCrate();
  const sent: number[] = [];
  const send0 = a.ws.send.bind(a.ws);
  a.ws.send = (d) => {
    const m = JSON.parse(String(d));
    if (m.type === 'claim' && m.id === crate && !m.hold) sent.push(performance.now());
    send0(d);
  };
  await play(2500, undefined, undefined, pushing);
  const rate = (sent.length - 1) / ((sent.at(-1)! - sent[0]!) / 1000);
  console.log(`${sent.length} touch claims for the held crate, ${rate.toFixed(2)} per second`);
  expect(sent.length).toBeGreaterThanOrEqual(3);
  expect(rate).toBeLessThanOrEqual(2);
});

test("a rejected touch claim: the prop returns to its owner's snapshots within 150 ms", async () => {
  const { a, b, crate, pushing } = await holdCrate();
  const onA = a.sim.entities.get(crate)!.body;
  const onB = b.sim.entities.get(crate)!.body;
  const returns: number[] = [];
  let inFlight = false;
  let rejectedAt: number | null = null;
  const each = (now: number) => {
    if (inFlight && !a.sim.inFlight.has(crate)) rejectedAt = now; // the first frame after the rejection arrived
    inFlight = a.sim.inFlight.has(crate);
    const p = onA.translation();
    const q = onB.translation();
    if (rejectedAt === null || Math.hypot(p.x - q.x, p.y - q.y, p.z - q.z) > 0.01) return;
    returns.push(now - rejectedAt);
    rejectedAt = null;
  };
  await play(2500, undefined, each, pushing);
  console.log(`${returns.length} rejected touch claims, back on the owner's pose after ${returns.map((r) => r.toFixed(0)).join(' / ')} ms`);
  expect(returns.length).toBeGreaterThanOrEqual(2);
  expect(rejectedAt).toBeNull();
  expect(Math.max(...returns)).toBeLessThanOrEqual(150);
});
