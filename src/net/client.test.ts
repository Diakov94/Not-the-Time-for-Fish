import { afterEach, beforeAll, expect, test } from 'vitest';
import { startRelay, type Relay } from '../relay/node.ts';
import { prototypeRoom } from '../sim/level.ts';
import { IDLE } from '../sim/movement.ts';
import { init } from '../sim/world.ts';
import { connect, frame, spawn, type Session } from './client.ts';

beforeAll(init);

const walls = { ...prototypeRoom, crates: [] }; // the Prototype room without the host's crates
let relay: Relay | undefined;
let sessions: Session[] = [];

afterEach(async () => {
  for (const s of sessions) s.ws.close();
  await relay?.close();
});

// N clients in one room of an in-process Node relay on an ephemeral port.
async function room(n: number): Promise<Session[]> {
  relay = await startRelay();
  sessions = [];
  for (let i = 0; i < n; i++) sessions.push(await connect(`ws://localhost:${relay.port}/test`, walls));
  return sessions;
}

// Every session's frame in real time, about 60 Hz, until `done` holds or `ms` pass.
async function play(ms: number, done: () => boolean = () => false, each: (now: number) => void = () => {}) {
  const end = performance.now() + ms;
  let last = performance.now();
  while (performance.now() < end && !done()) {
    await new Promise((r) => setTimeout(r, 16));
    const now = performance.now();
    for (const s of sessions) frame(s, (now - last) / 1000, IDLE);
    last = now;
    each(now);
  }
}

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
