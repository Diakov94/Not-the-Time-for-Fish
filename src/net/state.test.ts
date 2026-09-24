import { expect, test } from 'vitest';
import { prototypeRoom } from '../content/prototype-room.ts';
import { drainEvents } from '../sim/events.ts';
import { grab } from '../sim/grab.ts';
import { IDLE } from '../sim/movement.ts';
import { playerOf, remaining } from '../sim/round.ts';
import { connect, send, spawn, type Refused, type Session } from './client.ts';
import { facts, join, leave, play, relay, room, same, sessions, url, walls, west } from './clients.test.ts';

// Join and state, and what the others' ticks show: a joiner holds the host's table, round and every pose
// from its owner; the next host answers when the host leaves; a client learns its relay is gone; a copy
// follows its owner, a resting body sends nothing, and an impact between two owners' crates is one noise.

test('a crate moved on one client shows on the other within 150 ms', async () => {
  const [a, b] = await room(2);
  const id = spawn(a!, 'prop', { x: 0, y: 0.5, z: 0 });
  await play(2000, () => b!.sim.entities.has(id) && a!.rested.has(id));
  const onA = a!.sim.entities.get(id)!.body;
  const onB = b!.sim.entities.get(id)!.body;
  const x0 = onA.translation().x;
  onA.setLinvel({ x: 4, y: 0, z: 0 }, true); // slides 1.6 m
  const marks = [0.05, 0.5, 1.0];
  const crossedA: number[] = [];
  const crossedB: number[] = [];
  await play(1500, undefined, (now) => {
    for (const [i, m] of marks.entries()) {
      if (crossedA[i] === undefined && onA.translation().x - x0 >= m) crossedA[i] = now;
      if (crossedB[i] === undefined && onB.translation().x - x0 >= m) crossedB[i] = now;
    }
  });
  const lags = marks.map((_, i) => crossedB[i]! - crossedA[i]!);
  console.log(`lag of the copy per mark ${marks.join(' / ')} m: ${lags.map((l) => l.toFixed(0)).join(' / ')} ms`);
  expect(Math.max(...lags)).toBeLessThanOrEqual(150);
});

test('a resting crate produces 0 ticks per second', async () => {
  const [a] = await room(2);
  const id = spawn(a!, 'prop', { x: 0, y: 0.5, z: 0 });
  await play(2000, () => a!.rested.has(id));
  const before = a!.ticks;
  await play(1000);
  expect(a!.ticks - before).toBe(0);
});

test("a third client joining mid-run holds the host's table and entities within 500 ms, each pose from its owner", async () => {
  const [a, b] = await room(2, prototypeRoom);
  spawn(a!, 'cat', { x: -3, y: 1, z: 0 });
  spawn(b!, 'cat', { x: 0, y: 1, z: 4.6 }); // faces +z, the crate at (0, 0.5, 6) in reach
  const crates = () => [...a!.sim.entities.values()].filter((e) => e.kind === 'prop');
  await play(2000, () => b!.sim.entities.size === 12 && crates().every((e) => e.body.isSleeping()));
  const claim = grab(b!.sim);
  send(b!, claim!);
  const carrying = (s: Session) => (s === b ? west : IDLE);
  await play(300, undefined, undefined, carrying);
  expect(a!.sim.ownership.rows.get(claim!.id)).toEqual({ owner: b!.sim.me, held: true });
  const t0 = performance.now();
  const c = await join(prototypeRoom);
  await play(500, () => same(c, a!), undefined, carrying);
  const ms = performance.now() - t0;
  console.log(`joiner matched the host's table and entities after ${ms.toFixed(0)} ms`);
  expect(facts(c)).toEqual(facts(a!));
  expect(ms).toBeLessThanOrEqual(500);
  // Every pose reaches the joiner from its owner (the state has none): the host's resting crates
  // within the 2 cm resting threshold, the crate B carries within 100 ms of walking.
  await play(300, undefined, undefined, carrying);
  const off = (e: { id: string }, owner: Session) => {
    const p = c.sim.entities.get(e.id)!.body.translation();
    const q = owner.sim.entities.get(e.id)!.body.translation();
    return Math.hypot(p.x - q.x, p.y - q.y, p.z - q.z);
  };
  expect(Math.max(...crates().filter((e) => e.id !== claim!.id).map((e) => off(e, a!)))).toBeLessThanOrEqual(0.02);
  expect(off(claim!, b!)).toBeLessThanOrEqual(0.5);
});

test("a joiner during heist holds the host's round within 500 ms, its timer a hop off; pings held before its state are dropped", async () => {
  const [a, b] = await room(2);
  for (const to of ['prep', 'heist'] as const) send(a!, { type: 'phase', from: a!.sim.me, to, round: 1 });
  await play(500, () => b!.sim.round.phase === 'heist');
  spawn(b!, 'cat', { x: 0, y: 1, z: 0 });
  const fish = spawn(a!, 'fish', { x: 0, y: 0.1, z: 2 });
  await play(500, () => b!.sim.entities.has(fish)); // the claim after the fish's spawn in the relay's order
  send(b!, { type: 'claim', from: b!.sim.me, id: fish, hold: true });
  send(b!, { type: 'secured', from: b!.sim.me, fish, at: 1.5 });
  await play(1000, () => a!.sim.round.secured.length === 1 && a!.sim.round.roster.every((p) => p.side !== null));
  // A holds its state until 20 of B's pings are in the relay's order after the join.
  const send0 = a!.ws.send.bind(a!.ws);
  let state: string | undefined;
  a!.ws.send = (d) => (JSON.parse(String(d)).type === 'state' ? (state = String(d)) : send0(d));
  const ping = () => send(b!, { type: 'noise', from: b!.sim.me, p: { x: 0, y: 0, z: 0 }, loud: 0.1, cause: 'step' });
  const pings = (s: Session) => s.sim.events.filter((e) => e.type === 'noise').length;
  const t0 = performance.now();
  const joining = join();
  await play(500, () => state !== undefined);
  drainEvents(a!.sim);
  for (let i = 0; i < 20; i++) ping();
  await play(500, () => pings(a!) === 20);
  send0(state!);
  const c = await joining;
  await play(500, () => JSON.stringify(c.sim.round) === JSON.stringify(a!.sim.round));
  const ms = performance.now() - t0;
  console.log(`joiner held the round ${ms.toFixed(0)} ms after connect; remaining ${remaining(c.sim)?.toFixed(3)} s against ${remaining(a!.sim)?.toFixed(3)} s`);
  expect(c.sim.round).toEqual(a!.sim.round);
  expect(ms).toBeLessThanOrEqual(500);
  expect(c.sim.round.phase).toBe('heist');
  expect(c.sim.round.secured.length).toBe(1);
  expect(Math.abs(remaining(c.sim)! - remaining(a!.sim)!)).toBeLessThanOrEqual(0.25);
  expect(pings(c)).toBe(0);
  ping();
  await play(500, () => pings(c) > 0);
  expect(pings(c)).toBe(1);
});

test('a second client with a name in use is refused within 500 ms and closed; the first plays on', async () => {
  const [a] = await room(1);
  const name = playerOf(a!.sim.round, a!.sim.me)!.name;
  const t0 = performance.now();
  const refused = await connect(url, walls, name).then(() => undefined, (e: Refused) => e);
  const ms = performance.now() - t0;
  await play(500, () => a!.sim.ownership.gone.size > 0);
  console.log(`a second "${name}": ${refused?.code} (${refused?.reason}) after ${ms.toFixed(0)} ms; left announced to the first: ${a!.sim.ownership.gone.size}`);
  expect(refused).toMatchObject({ code: 'refused', player: name, reason: 'taken' });
  expect(ms).toBeLessThanOrEqual(500);
  expect(a!.sim.ownership.gone.size).toBe(1); // the relay's `left` for the refused socket: one member stays
  expect(playerOf(a!.sim.round, a!.sim.me)?.name).toBe(name);
});

test("a joiner's copy of a moving crate appears at its owner's pose, not rising from under the floor", async () => {
  const [a] = await room(1);
  const id = spawn(a!, 'prop', { x: 0, y: 0.5, z: 0 });
  await play(500, () => a!.sim.entities.has(id));
  a!.sim.entities.get(id)!.body.setLinvel({ x: 4, y: 0, z: 0 }, true);
  const c = await join();
  let lowest = Infinity; // once the copy left the place a joiner holds it at (y = -100)
  await play(500, undefined, () => {
    const y = c.sim.entities.get(id)!.body.translation().y;
    if (y > -99) lowest = Math.min(lowest, y);
  });
  expect(lowest).toBeGreaterThan(0.4);
});

test('a client that left before the join: its departure travels with the state, so a later release agrees', async () => {
  const [a, b, d] = await room(3);
  const cat = spawn(d!, 'cat', { x: 3, y: 1, z: 0 });
  spawn(b!, 'dog', { x: -3, y: 1, z: 0 }); // B's side, so its hold claim on the cat is accepted
  await play(1000, () => sessions.every((s) => s.sim.entities.size === 2));
  leave(d!);
  await play(1000, () => a!.sim.ownership.gone.size === 1);
  const c = await join();
  send(b!, { type: 'claim', from: b!.sim.me, id: cat, hold: true });
  await play(500, () => c.sim.ownership.rows.get(cat)?.held === true);
  const body = b!.sim.entities.get(cat)!.body;
  send(b!, { type: 'release', from: b!.sim.me, id: cat, p: body.translation(), q: body.rotation(), v: { x: 0, y: 0, z: 0 } });
  await play(500, () => c.sim.ownership.rows.get(cat)?.held === false);
  expect(a!.sim.ownership.rows.get(cat)).toEqual({ owner: b!.sim.me, held: false }); // its home left: the releaser keeps it
  expect(facts(c)).toEqual(facts(a!));
});

test('after the host leaves, the next host answers the next joiner', async () => {
  const [a, b] = await room(2, prototypeRoom);
  await play(1000, () => b!.sim.entities.size === 10);
  leave(a!);
  await play(1000, () => b!.host === b!.sim.me);
  const t0 = performance.now();
  const c = await join(prototypeRoom);
  await play(500, () => same(c, b!));
  const ms = performance.now() - t0;
  console.log(`joiner after migration matched the new host after ${ms.toFixed(0)} ms`);
  expect(facts(c)).toEqual(facts(b!));
  expect(ms).toBeLessThanOrEqual(500);
});

test("a joiner whose host leaves before answering holds the next host's table and entities within 500 ms of the left", async () => {
  const [a, b] = await room(2, prototypeRoom);
  await play(1000, () => b!.sim.entities.size === 10);
  // A leaves the moment it would answer the joiner, so its state never goes out.
  const send0 = a!.ws.send.bind(a!.ws);
  let leftAt = Infinity;
  a!.ws.send = (d) => {
    if (JSON.parse(String(d)).type !== 'state') return send0(d);
    leave(a!);
    leftAt = performance.now();
  };
  let c: Session | undefined;
  join(prototypeRoom).then((s) => (c = s), () => {});
  await play(1500, () => c !== undefined && same(c, b!));
  const ms = performance.now() - leftAt;
  console.log(`joiner orphaned by its host matched the next host ${ms.toFixed(0)} ms after the left`);
  expect(c && facts(c)).toEqual(facts(b!));
  expect(ms).toBeLessThanOrEqual(500);
});

// The review's sequence (card bug-net-socket-close-unnoticed): the relay dies under a client whose cat
// walks. Its next 30 frames counted 11 ticks as sent and stepped the cat 2 m on, into a closed socket.
test('the relay closes under a walking client: its session reports closed within 100 ms, and 30 frames then step and send nothing', async () => {
  const [a] = await room(1);
  const cat = spawn(a!, 'cat', { x: 0, y: 1, z: 0 });
  await play(500, () => a!.sim.entities.has(cat));
  await play(200, undefined, undefined, () => west);
  let closedAt = Infinity;
  void a!.closed.then(() => (closedAt = performance.now()));
  const t0 = performance.now();
  await relay!.close();
  await play(100, () => closedAt < Infinity, undefined, () => west);
  const ticks = a!.ticks;
  const x = a!.sim.entities.get(cat)!.body.translation().x;
  let sent = 0;
  const send0 = a!.ws.send.bind(a!.ws);
  a!.ws.send = (d) => (sent++, send0(d));
  let frames = 0;
  await play(1000, () => frames === 30, () => frames++, () => west);
  const moved = Math.abs(a!.sim.entities.get(cat)!.body.translation().x - x);
  console.log(`closed ${(closedAt - t0).toFixed(0)} ms after the relay; the next ${frames} frames: ${a!.ticks - ticks} ticks counted, ${sent} messages sent, the cat ${moved.toFixed(2)} m on`);
  expect(closedAt - t0).toBeLessThanOrEqual(100);
  expect(a!.ticks - ticks).toBe(0);
  expect(sent).toBe(0);
  expect(moved).toBe(0);
});

// The host drops its first `drops` states and leaves at the next one, so nobody left holds the world.
async function hostLeavesOwing(joiners: number, drops: number) {
  const [a] = await room(1, prototypeRoom);
  await play(1000, () => a!.sim.entities.size === 10);
  const send0 = a!.ws.send.bind(a!.ws);
  let states = 0;
  let leftAt = Infinity;
  a!.ws.send = (d) => {
    if (JSON.parse(String(d)).type !== 'state') return send0(d);
    if (states++ < drops) return;
    leave(a!);
    leftAt = performance.now();
  };
  const joined: Session[] = [];
  for (let i = 0; i < joiners; i++) join(prototypeRoom).then((s) => joined.push(s), () => {});
  const spawned = () => joined.length === joiners && joined.every((s) => s.sim.entities.size === 10);
  await play(1500, () => spawned() && joined.every((s) => same(s, joined[0]!)));
  return { joined, spawned: spawned(), ms: performance.now() - leftAt };
}

test('a lone joiner whose host leaves before answering is playing, the level spawned, within 500 ms of the left', async () => {
  const { joined, spawned, ms } = await hostLeavesOwing(1, 0);
  console.log(`stateless host playing ${ms.toFixed(0)} ms after the left`);
  expect(spawned).toBe(true);
  expect(joined[0]!.host).toBe(joined[0]!.sim.me);
  expect(ms).toBeLessThanOrEqual(500);
});

test('two joiners owed a state when the host leaves hold deep-equal tables within 500 ms of the left', async () => {
  const { joined, spawned, ms } = await hostLeavesOwing(2, 1);
  console.log(`both joiners matched ${ms.toFixed(0)} ms after the left`);
  expect(spawned).toBe(true);
  expect(facts(joined[1]!)).toEqual(facts(joined[0]!));
  expect(ms).toBeLessThanOrEqual(500);
});

// A frame every 100 ms is a loaded machine's loop (or a throttled tab's): six steps a frame, a copy moving
// on the first and still on the other five. It measured 2 noises in 10 of 10 runs before the rule read the
// owner's speed.
test.each([16, 100])("two clients' crates shoved into each other: one noise for the impact, heard on both from the echo (a frame every %i ms)", async (every) => {
  const [a, b] = await room(2);
  const x = spawn(a!, 'prop', { x: -1.5, y: 0.5, z: 0 });
  const y = spawn(b!, 'prop', { x: 1.5, y: 0.5, z: 0 });
  await play(3000, () => a!.rested.has(x) && b!.rested.has(y) && sessions.every((s) => s.sim.entities.size === 2), undefined, undefined, every);
  for (const s of sessions) drainEvents(s.sim);
  a!.sim.entities.get(x)!.body.setLinvel({ x: 4, y: 0, z: 0 }, true);
  b!.sim.entities.get(y)!.body.setLinvel({ x: -4, y: 0, z: 0 }, true);
  await play(1000, undefined, undefined, undefined, every);
  // Each list holds every noise of the relay's stream: noise reaches a list only from the echo.
  const heard = (s: Session) => s.sim.events.filter((e) => e.type === 'noise' && Math.abs(e.p.x) < 3);
  console.log(`noise for the impact: ${heard(a!).map((e) => e.from).join(', ')} on A; ${heard(b!).length} on B`);
  expect(heard(a!).length).toBe(1);
  expect(heard(b!).length).toBe(1);
});
