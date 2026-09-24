import { afterEach, beforeAll, expect, test } from 'vitest';
import { startRelay, type Relay } from '../relay/node.ts';
import { grab } from '../sim/grab.ts';
import { prototypeRoom, type Level } from '../sim/level.ts';
import { IDLE, type Intent } from '../sim/movement.ts';
import { init } from '../sim/world.ts';
import { connect, frame, send, spawn, type Session } from './client.ts';
import { dump } from './dump.ts';

beforeAll(init);

const walls = { ...prototypeRoom, crates: [] }; // the Prototype room without the host's crates
const west: Intent = { move: { x: -1, z: 0 }, sprint: false, jump: false };
let relay: Relay | undefined;
let url = '';
let sessions: Session[] = [];

afterEach(async () => {
  for (const s of sessions) s.ws.close();
  await relay?.close();
});

async function join(level: Level = walls): Promise<Session> {
  const s = await connect(url, level);
  sessions.push(s);
  return s;
}

function leave(s: Session): void {
  s.ws.close();
  sessions = sessions.filter((x) => x !== s);
}

// N clients in one room of an in-process Node relay on an ephemeral port.
async function room(n: number, level: Level = walls): Promise<Session[]> {
  relay = await startRelay();
  url = `ws://localhost:${relay.port}/test`;
  sessions = [];
  for (let i = 0; i < n; i++) await join(level);
  return [...sessions];
}

// Every session's frame in real time, about 60 Hz, until `done` holds or `ms` pass.
async function play(
  ms: number,
  done: () => boolean = () => false,
  each: (now: number) => void = () => {},
  intent: (s: Session) => Intent = () => IDLE,
) {
  const end = performance.now() + ms;
  let last = performance.now();
  while (performance.now() < end && !done()) {
    await new Promise((r) => setTimeout(r, 16));
    const now = performance.now();
    for (const s of sessions) frame(s, (now - last) / 1000, intent(s));
    last = now;
    each(now);
  }
}

// What the join must hand over: the departed set and every entity's identity and fold row.
function facts(s: Session) {
  const { gone, entities } = dump(s.sim);
  return { gone, entities: entities.map(({ id, kind, home, owner, held }) => ({ id, kind, home, owner, held })) };
}
const same = (a: Session, b: Session) => JSON.stringify(facts(a)) === JSON.stringify(facts(b));

test('a crate moved on one client shows on the other within 150 ms', async () => {
  const [a, b] = await room(2);
  const id = spawn(a!, 'crate', { x: 0, y: 0.5, z: 0 });
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
  const id = spawn(a!, 'crate', { x: 0, y: 0.5, z: 0 });
  await play(2000, () => a!.rested.has(id));
  const before = a!.ticks;
  await play(1000);
  expect(a!.ticks - before).toBe(0);
});

test("a third client joining mid-run holds the host's table and entities within 500 ms, each pose from its owner", async () => {
  const [a, b] = await room(2, prototypeRoom);
  spawn(a!, 'character', { x: -3, y: 1, z: 0 });
  spawn(b!, 'character', { x: 0, y: 1, z: 4.6 }); // faces +z, the crate at (0, 0.5, 6) in reach
  const crates = () => [...a!.sim.entities.values()].filter((e) => e.kind === 'crate');
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

test('a client that left before the join: its departure travels with the state, so a later release agrees', async () => {
  const [a, b, d] = await room(3);
  const cat = spawn(d!, 'character', { x: 3, y: 1, z: 0 });
  await play(1000, () => sessions.every((s) => s.sim.entities.has(cat)));
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
