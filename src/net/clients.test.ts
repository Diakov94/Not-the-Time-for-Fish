import { afterEach, beforeAll } from 'vitest';
import type { Level } from '../content/level.ts';
import { prototypeRoom } from '../content/prototype-room.ts';
import { startRelay, type Relay } from '../relay/node.ts';
import { IDLE, type Intent } from '../sim/movement.ts';
import { init } from '../sim/world.ts';
import { connect, frame, type Session } from './client.ts';
import { dump } from './dump.ts';

// No tests: the rig the net test files share (join and state, touch claims, grab and hit), one file per
// topic so vitest runs them on workers of their own. Each file that imports it holds its own copy of it.

beforeAll(init);

export const walls = { ...prototypeRoom, props: [] }; // the Prototype room without the host's crates
export const west: Intent = { move: { x: -1, z: 0 }, sprint: false, jump: false };
export const north: Intent = { move: { x: 0, z: 1 }, sprint: false, jump: false };
export const south: Intent = { move: { x: 0, z: -1 }, sprint: false, jump: false };
let relay: Relay | undefined;
export let url = '';
export let sessions: Session[] = [];
let names = 0; // every client of a test run hellos with a name of its own

afterEach(async () => {
  for (const s of sessions) s.ws.close();
  await relay?.close();
});

export async function join(level: Level = walls, name = `p${names++}`): Promise<Session> {
  const s = await connect(url, level, name);
  sessions.push(s);
  return s;
}

export function leave(s: Session): void {
  s.ws.close();
  sessions = sessions.filter((x) => x !== s);
}

// N clients in one room of an in-process Node relay on an ephemeral port.
export async function room(n: number, level: Level = walls): Promise<Session[]> {
  relay = await startRelay();
  url = `ws://localhost:${relay.port}/test`;
  sessions = [];
  for (let i = 0; i < n; i++) await join(level);
  return [...sessions];
}

// Every session's frame in real time, about 60 Hz (or every `every` ms), until `done` holds or `ms` pass.
export async function play(
  ms: number,
  done: () => boolean = () => false,
  each: (now: number) => void = () => {},
  intent: (s: Session) => Intent = () => IDLE,
  every = 16,
) {
  const end = performance.now() + ms;
  let last = performance.now();
  while (performance.now() < end && !done()) {
    await new Promise((r) => setTimeout(r, every));
    const now = performance.now();
    for (const s of sessions) frame(s, (now - last) / 1000, intent(s));
    last = now;
    each(now);
  }
}

// What the join must hand over: the departed set and every entity's identity and fold row.
export function facts(s: Session) {
  const { gone, entities } = dump(s.sim);
  return { gone, entities: entities.map(({ id, kind, home, owner, held }) => ({ id, kind, home, owner, held })) };
}
export const same = (a: Session, b: Session) => JSON.stringify(facts(a)) === JSON.stringify(facts(b));
