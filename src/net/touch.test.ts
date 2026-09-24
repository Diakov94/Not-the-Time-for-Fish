import { expect, test } from 'vitest';
import type { Level } from '../content/level.ts';
import { grab, release } from '../sim/grab.ts';
import { IDLE } from '../sim/movement.ts';
import { carried } from '../sim/ownership.ts';
import { send, spawn } from './client.ts';
import { north, play, room, south, walls } from './clients.test.ts';

// Touch claims: a character pushing a prop another client owns takes it, at most twice a second; one held
// by another is never claimed; a claim the fold rejects (a touch racing the owner's grab) returns the prop
// to its owner's snapshots.

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

// A crate B spawned, between two cats pushing it from both sides: every touch claim is accepted, and each
// cat's client claims the crate back from the other as soon as its own limit lets it.
test('touch claims for one prop go out at most twice per second', async () => {
  const [a, b] = await room(2);
  const crate = spawn(b!, 'prop', { x: 0, y: 0.5, z: 4.5 });
  spawn(a!, 'cat', { x: 0, y: 1, z: 7 });
  spawn(b!, 'cat', { x: 0, y: 1, z: 2 });
  await play(2000, () => a!.sim.entities.size === 3 && b!.rested.has(crate));
  const sent: number[] = [];
  const send0 = a!.ws.send.bind(a!.ws);
  a!.ws.send = (d) => {
    const m = JSON.parse(String(d));
    if (m.type === 'claim' && m.id === crate && !m.hold) sent.push(performance.now());
    send0(d);
  };
  await play(2500, undefined, undefined, (s) => (s === a ? south : north));
  const rate = (sent.length - 1) / ((sent.at(-1)! - sent[0]!) / 1000);
  console.log(`${sent.length} touch claims for a crate two cats push, ${rate.toFixed(2)} per second`);
  expect(sent.length).toBeGreaterThanOrEqual(3);
  expect(rate).toBeLessThanOrEqual(2);
});

// A touch that races the owner's grab. The host A spawns the level's tall crate, which stands where a
// standing cat's hands hold a crate, and A's cat faces it, so A's grab does not move it; B's dog walks into
// it from the north. B's touch claim takes LATE to reach the relay, and A's grab, sent as B's claim leaves,
// gets there first: the fold rejects the claim B made while its table showed the crate free. The dog, which
// shoved the crate on its own client meanwhile, backs off, A drops the crate, and the race runs again on
// the dog's next touch.
const TALL = 0.76; // m: the half height of a crate whose centre is where a standing cat's hands hold it
const LATE = 50; // ms: B's way to the relay, a few frames of shoving the crate on its own client
test("a rejected touch claim: the prop returns to its owner's snapshots within 150 ms", async () => {
  const tall: Level = { ...walls, props: [{ label: 'crate', p: { x: 0, y: TALL, z: 4.5 }, shape: { box: { x: 0.5, y: TALL, z: 0.5 } }, mass: 1, synced: true }] };
  const [a, b] = await room(2, tall);
  spawn(a!, 'cat', { x: 0, y: 1, z: 3.5 }); // faces +z, the crate's centre 1 m ahead
  spawn(b!, 'dog', { x: 0, y: 1, z: 7.5 });
  const crate = () => [...a!.sim.entities.values()].find((e) => e.kind === 'prop')?.id ?? '';
  await play(2000, () => b!.sim.entities.size === 3 && a!.rested.has(crate()));
  const id = crate();
  let [dropAt, backUntil] = [Infinity, 0];
  const send0 = b!.ws.send.bind(b!.ws);
  b!.ws.send = (d) => {
    const m = JSON.parse(String(d));
    const first = m.type === 'claim' && m.id === id && !m.hold ? grab(a!.sim) : null;
    if (!first) return send0(d);
    send(a!, first);
    setTimeout(() => send0(d), LATE);
  };
  const onA = a!.sim.entities.get(id)!.body;
  const onB = b!.sim.entities.get(id)!.body;
  const returns: number[] = [];
  let [inFlight, off] = [false, 0]; // off: how far the dog had shoved its copy from the owner's pose by a rejection, m
  let rejectedAt: number | null = null;
  const each = (now: number) => {
    const held = now >= dropAt && carried(a!.sim);
    if (held) [dropAt] = [Infinity, send(a!, release(a!.sim, held, { x: 0, y: 0, z: 0 }))];
    const p = onB.translation();
    const q = onA.translation();
    const d = Math.hypot(p.x - q.x, p.y - q.y, p.z - q.z);
    if (inFlight && !b!.sim.inFlight.has(id)) [rejectedAt, off, dropAt, backUntil] = [now, Math.max(off, d), now + 200, now + 400]; // the first frame after the rejection arrived
    inFlight = b!.sim.inFlight.has(id);
    if (rejectedAt === null || d > 0.01) return;
    returns.push(now - rejectedAt);
    rejectedAt = null;
  };
  await play(2500, undefined, each, (s) => (s !== b ? IDLE : performance.now() < backUntil ? north : south));
  console.log(`${returns.length} rejected touch claims, the copy up to ${off.toFixed(3)} m off; back on the owner's pose after ${returns.map((r) => r.toFixed(0)).join(' / ')} ms`);
  expect(returns.length).toBeGreaterThanOrEqual(2);
  expect(rejectedAt).toBeNull();
  expect(Math.max(...returns)).toBeLessThanOrEqual(150);
});
