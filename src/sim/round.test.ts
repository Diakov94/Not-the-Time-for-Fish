import { beforeAll, expect, test } from 'vitest';
import { forward, join, leave, newRoom, type Out } from '../relay/room.ts';
import type { ClientId } from './entities.ts';
import { prototypeRoom } from './level.ts';
import type { Left, SimMessage } from './messages.ts';
import { IDLE, type Intent } from './movement.ts';
import { receive } from './ownership.ts';
import { createWorld, init, step, STEP, type Sim } from './world.ts';

beforeAll(init);

type Client = { sim: Sim; host: ClientId };

// Clients behind the relay's own room logic (src/relay/room.ts), every message delivered to every member
// at once in the relay's order: time passes only in the sims, one fixed step at a time. A client that joins
// late folds the order so far first, as a joiner's `state` hands it over.
function relay(level = prototypeRoom) {
  const room = newRoom();
  const clients: Client[] = [];
  const history: [SimMessage | Left, ClientId][] = [];
  let sent = 0;
  const decode = (text: string) => {
    const e = JSON.parse(text);
    return e.type === 'msg' ? { ...JSON.parse(e.data), from: e.from } : e;
  };
  const deliver = (out: Out[]) => {
    for (const { to, text } of out) {
      const c = clients.find((x) => x.sim.me === to);
      const m = decode(text);
      if (!c || m.type === 'welcome' || m.type === 'joined') continue;
      if (m.type === 'left') c.host = m.host;
      receive(c.sim, m, c.host);
    }
  };
  const add = (): Sim => {
    const { id, out } = join(room);
    const c = { sim: createWorld(level, id), host: room.members[0]! };
    for (const [m, host] of history) receive(c.sim, m, host);
    clients.push(c);
    deliver(out);
    return c.sim;
  };
  const send = (sim: Sim, m: SimMessage) => {
    const out = forward(room, sim.me, JSON.stringify({ ...m, from: undefined }));
    history.push([decode(out[0]!.text), room.members[0]!]);
    sent++;
    deliver(out);
  };
  const drop = (sim: Sim) => {
    clients.splice(clients.findIndex((c) => c.sim === sim), 1);
    const out = leave(room, sim.me);
    const m = decode(out[0]!.text);
    history.push([m, m.host]);
    deliver(out);
  };
  const run = (steps: number, intent: (sim: Sim) => Intent = () => IDLE) => {
    for (let i = 0; i < steps; i++) for (const c of [...clients]) for (const m of step(c.sim, STEP, intent(c.sim))) send(c.sim, m);
  };
  return { clients, add, send, drop, run, sent: () => sent, sims: () => clients.map((c) => c.sim) };
}

const hello = (sim: Sim, name: string): SimMessage => ({ type: 'hello', from: sim.me, name });
const teams = (sim: Sim) => sim.round.roster.map(({ name, team }) => `${name}:${team}`).join(' ');
const count = (sim: Sim, team: string) => sim.round.roster.filter((p) => p.team === team).length;

test('auto-balance: 3 hellos give 1 dog vs 2 cats and 6 give 2 vs 4 on every client, one message after the last hello', () => {
  for (const [n, dogs] of [
    [3, 1],
    [6, 2],
  ] as const) {
    const r = relay();
    const sims = Array.from({ length: n }, () => r.add());
    for (const [i, s] of sims.entries()) {
      r.send(s, hello(s, `P${i}`));
      if (i < n - 1) r.run(1); // the host answers each hello at its next step
    }
    const last = r.sent();
    r.run(1);
    console.log(`${n} hellos: ${teams(sims[0]!)}; agreed ${r.sent() - last} message(s) after the last hello`);
    expect(r.sent() - last).toBe(1);
    for (const s of sims) {
      expect(teams(s)).toBe(teams(sims[0]!));
      expect([count(s, 'B'), count(s, 'A')]).toEqual([dogs, n - dogs]); // team B plays dogs in round 1
    }
  }
});

test("the host moves a name at that message on every client; a non-host's roster is rejected everywhere", () => {
  const r = relay();
  const [a, b, c] = [r.add(), r.add(), r.add()];
  for (const s of [a!, b!, c!]) r.send(s, hello(s, s.me));
  r.run(1);
  const before = teams(a!);
  r.send(b!, { type: 'roster', from: b!.me, name: c!.me, team: 'B' });
  for (const s of r.sims()) expect(teams(s)).toBe(before);
  r.send(a!, { type: 'roster', from: a!.me, name: c!.me, team: 'B' });
  for (const s of r.sims()) expect(s.round.roster.find((p) => p.name === c!.me)?.team).toBe('B');
});

test('a known name whose client left rejoins on its team from a new client; a name in use is refused everywhere', () => {
  const r = relay();
  const sims = [r.add(), r.add(), r.add()];
  for (const [i, s] of sims.entries()) {
    r.send(s, hello(s, `P${i}`));
    r.run(1);
  }
  const dog = sims[1]!; // P1: team B
  r.drop(dog);
  const back = r.add();
  r.send(back, hello(back, 'P1'));
  r.run(1);
  const late = r.add();
  const before = r.sims().map(teams);
  r.send(late, hello(late, 'P0')); // P0 is connected
  r.run(1);
  console.log(`after the rejoin: ${teams(back)}; a hello with a name in use: roster ${r.sims().map(teams).join(' | ') === before.join(' | ') ? 'unchanged' : 'changed'}`);
  for (const s of r.sims()) {
    const p1 = s.round.roster.find((p) => p.name === 'P1');
    expect(p1).toMatchObject({ team: 'B', client: back.me });
    expect(s.round.roster.length).toBe(3);
    expect(s.round.roster.some((p) => p.client === late.me)).toBe(false);
  }
  expect(r.sims().map(teams)).toEqual(before);
});
