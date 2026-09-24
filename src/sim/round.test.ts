import { beforeAll, expect, test } from 'vitest';
import { countryHouse } from '../content/country-house.ts';
import { prototypeRoom } from '../content/prototype-room.ts';
import { forward, join, leave, newRoom, type Out } from '../relay/room.ts';
import { halfHeight, spawnOf, type ClientId, type Entity, type NetId } from './entities.ts';
import type { Left, SimMessage } from './messages.ts';
import { drainEvents } from './events.ts';
import { IDLE, type Intent } from './movement.ts';
import { grab, throwCarried } from './grab.ts';
import { interact } from './heist.ts';
import { plant, stunned } from './mines.ts';
import { receive } from './ownership.ts';
import { advance, knobs, playerOf, playsAs } from './round.ts';
import { applySnapshot, readSnapshot } from './snapshot.ts';
import { createWorld, init, step, STEP, type Sim } from './world.ts';

beforeAll(init);

// A client and the phases its table turned to, with its own time at each.
type Client = { sim: Sim; host: ClientId; phases: { to: string; round: number; t: number }[] };

// Clients behind the relay's own room logic (src/relay/room.ts), every message delivered to every member
// at once in the relay's order: time passes only in the sims, one fixed step at a time. A client that joins
// late folds the order so far first, as a joiner's `state` hands it over. With `poses`, every client's
// entities reach the others' copies after each step, a tick per step.
function relay(level = prototypeRoom, poses = false) {
  const room = newRoom();
  const clients: Client[] = [];
  const history: [SimMessage | Left, ClientId][] = [];
  let sent = 0;
  const decode = (text: string) => {
    const e = JSON.parse(text);
    return e.type === 'msg' ? { ...JSON.parse(e.data), from: e.from } : e;
  };
  // Every client logs the phases its table turns to as it folds them, with its own time then.
  const log = (c: Client) => {
    for (const e of drainEvents(c.sim)) if (e.type === 'phase') c.phases.push({ to: e.to, round: e.round, t: c.sim.time });
  };
  const deliver = (out: Out[]) => {
    for (const { to, text } of out) {
      const c = clients.find((x) => x.sim.me === to);
      const m = decode(text);
      if (!c || m.type === 'welcome' || m.type === 'joined') continue;
      if (m.type === 'left') c.host = m.host;
      receive(c.sim, m, c.host);
      log(c);
    }
  };
  const add = (): Sim => {
    const { id, out } = join(room);
    const c: Client = { sim: createWorld(level, id), host: room.members[0]!, phases: [] };
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
  // Each step: every client steps with the host it knows and sends what the step produced.
  const run = (steps: number, intent: (sim: Sim) => Intent = () => IDLE) => {
    for (let i = 0; i < steps; i++) {
      for (const c of [...clients]) for (const m of step(c.sim, STEP, intent(c.sim), c.host)) send(c.sim, m);
      if (!poses) continue;
      for (const c of clients) {
        for (const e of c.sim.entities.values()) {
          if (c.sim.ownership.rows.get(e.id)?.owner !== c.sim.me) continue;
          for (const d of clients) if (d !== c) applySnapshot(d.sim, c.sim.me, readSnapshot(e));
        }
      }
    }
  };
  const until = (done: () => boolean, max: number, intent?: (sim: Sim) => Intent) => {
    for (let i = 0; i < max && !done(); i++) run(1, intent);
  };
  // n clients that said hello, each answered by the host.
  const players = (n: number) =>
    Array.from({ length: n }, (_, i) => {
      const sim = add();
      send(sim, { type: 'hello', from: sim.me, name: `P${i}` });
      run(1);
      return sim;
    });
  const client = (sim: Sim) => clients.find((c) => c.sim === sim)!;
  return { clients, history, add, send, drop, run, until, players, client, sent: () => sent, sims: () => clients.map((c) => c.sim) };
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

type Relay = ReturnType<typeof relay>;
const hostOf = (r: Relay) => r.clients.find((c) => c.host === c.sim.me)!.sim;
const phases = (r: Relay) => r.sims().map((s) => s.round.phase).join();
const agree = (r: Relay) => new Set(r.sims().map((s) => JSON.stringify(s.round))).size === 1;
const catsOf = (r: Relay) => r.sims().filter((s) => playsAs(s.round, s.me) === 'cat');

// The host's button (the lobby or `over`), then its clock through prep: every client in heist.
function toHeist(r: Relay) {
  const h = hostOf(r);
  r.send(h, advance(h, h.me)!);
  r.until(() => r.sims().every((s) => s.round.phase === 'heist'), 46 * 60);
}
// A player's character of its side this round, spawned by hand: the Prototype room has no spawn points.
function character(r: Relay, sim: Sim) {
  r.send(sim, spawnOf(sim, { kind: playsAs(sim.round, sim.me)!, p: { x: 0, y: 1, z: 0 } }));
}
// The host spawns a fish and the cat's client holds it.
function holdFish(r: Relay, cat: Sim): NetId {
  const h = hostOf(r);
  const fish = spawnOf(h, { kind: 'fish', p: { x: 2, y: 0.1, z: 0 } });
  r.send(h, fish);
  r.send(cat, { type: 'claim', from: cat.me, id: fish.id, hold: true });
  return fish.id;
}
const secure = (r: Relay, cat: Sim, fish: NetId, at = cat.time - cat.heistAt) => r.send(cat, { type: 'secured', from: cat.me, fish, at });
const captureAll = (r: Relay) => {
  for (const c of catsOf(r)) r.send(c, { type: 'captured', from: c.me, at: c.time - c.heistAt });
};

test('prep lasts 45.0 s on every client; three secured fish end the round with cats on every client at the same message', () => {
  const r = relay();
  r.players(3);
  toHeist(r);
  const preps = r.clients.map(({ phases: [prep, heist] }) => heist!.t - prep!.t);
  const [cat] = catsOf(r);
  character(r, cat!);
  const after: string[] = [];
  for (let i = 0; i < 3; i++) {
    secure(r, cat!, holdFish(r, cat!));
    after.push(phases(r));
  }
  console.log(`prep ${preps.map((t) => t.toFixed(3)).join(' / ')} s; phases after each secured: ${after.join(' | ')}`);
  for (const t of preps) expect(Math.abs(t - 45)).toBeLessThanOrEqual(0.1);
  expect(after).toEqual(['heist,heist,heist', 'heist,heist,heist', 'over,over,over']);
  for (const s of r.sims()) expect(s.round.results).toEqual([{ cats: 'A', secured: 3, last: s.round.secured.at(-1)!.at, why: 'fish', winner: 'A' }]);
  expect(agree(r)).toBe(true);
});

test('every cat captured ends the round with dogs on every client at the same message', () => {
  const r = relay();
  r.players(3);
  toHeist(r);
  const [a, b] = catsOf(r);
  r.send(a!, { type: 'captured', from: a!.me, at: 1 });
  const one = phases(r);
  r.send(b!, { type: 'captured', from: b!.me, at: 2 });
  console.log(`phases with 1 of 2 cats captured: ${one}; with both: ${phases(r)}`);
  expect(one).toBe('heist,heist,heist');
  expect(phases(r)).toBe('over,over,over');
  for (const s of r.sims()) expect(s.round.results[0]).toMatchObject({ why: 'captured', winner: 'B' });
  expect(agree(r)).toBe(true);
});

test("the heist timer out with a fish held gives overtime; the fish's release ends it with dogs, and so do 60 s", { timeout: 30000 }, () => {
  const ends: string[] = [];
  for (const how of ['release', 'cap'] as const) {
    const r = relay();
    r.players(3);
    toHeist(r);
    const [cat] = catsOf(r);
    character(r, cat!);
    const fish = holdFish(r, cat!);
    const heist = knobs(r.sims()[0]!.round).heist;
    r.until(() => r.sims().every((s) => s.round.phase === 'overtime'), (heist + 1) * 60);
    const late = r.clients.map(({ phases: p }) => p.at(-1)!.t - p.at(-2)!.t - heist);
    if (how === 'release') {
      const body = cat!.entities.get(fish)!.body;
      r.send(cat!, { type: 'release', from: cat!.me, id: fish, p: body.translation(), q: body.rotation(), v: { x: 0, y: 0, z: 0 } });
    } else r.until(() => r.sims().every((s) => s.round.phase === 'over'), 61 * 60);
    const overtime = r.clients.map(({ phases: p }) => p.at(-1)!.t - p.at(-2)!.t);
    ends.push(`${how}: overtime from ${late.map((t) => t.toFixed(3)).join(' / ')} s after ${heist} s of heist, over after ${overtime.map((t) => t.toFixed(3)).join(' / ')} s`);
    for (const t of late) expect(Math.abs(t)).toBeLessThanOrEqual(STEP);
    expect(phases(r)).toBe('over,over,over');
    for (const s of r.sims()) expect(s.round.results[0]).toMatchObject({ why: 'overtime', winner: 'B' });
    if (how === 'cap') for (const t of overtime) expect(Math.abs(t - 60)).toBeLessThanOrEqual(0.1);
    expect(agree(r)).toBe(true);
  }
  console.log(ends.join('\n'));
});

test('the host leaves mid-heist: the next host ends the heist on time; no phase is folded twice', { timeout: 30000 }, () => {
  const r = relay();
  const [old, next, third] = r.players(3);
  toHeist(r);
  r.run(100 * 60);
  r.drop(old!);
  const heist = knobs(next!.round).heist;
  r.until(() => next!.round.phase !== 'heist', (heist - 99) * 60);
  const late = r.clients.map(({ phases: p }) => p.at(-1)!.t - p.find((x) => x.to === 'heist')!.t - heist);
  // A second host's copy of the transition already folded, and a phase from a client that is not the host.
  r.send(next!, { type: 'phase', from: next!.me, to: 'overtime', round: 1 });
  r.send(third!, { type: 'phase', from: third!.me, to: 'prep', round: 2 });
  r.run(1);
  const turns = r.clients.map((c) => c.phases.map((p) => `${p.to}${p.round}`).join(' '));
  console.log(`heist ended ${late.map((t) => (t * 1000).toFixed(0)).join(' / ')} ms after the old host's time; phases folded: ${turns.join(' | ')}`);
  for (const t of late) expect(Math.abs(t)).toBeLessThanOrEqual(0.25);
  for (const t of turns) expect(t).toBe('prep1 heist1 over1');
  for (const s of r.sims()) expect(s.round.results).toMatchObject([{ why: 'timer', winner: 'B' }]);
  expect(agree(r)).toBe(true);
});

test("round 2 starts with every client's character of the other kind", () => {
  const r = relay(countryHouse);
  r.players(3);
  const kinds = () => r.sims().map((s) => [...s.entities.values()].find((e) => e.home === s.me)?.kind).join();
  toHeist(r);
  const first = kinds();
  captureAll(r);
  r.send(hostOf(r), advance(hostOf(r), hostOf(r).me)!);
  r.run(2);
  console.log(`own characters, round 1: ${first}; round 2: ${kinds()}; entities per client ${r.sims().map((s) => s.entities.size).join(' / ')}`);
  expect(first).toBe('cat,dog,cat');
  expect(kinds()).toBe('dog,cat,dog');
  expect(agree(r)).toBe(true);
});

test('a 2-2 match goes to the team whose last fish came sooner; 0-0 is a draw; the session score survives the lobby', { timeout: 30000 }, () => {
  const r = relay();
  r.players(3);
  const round = (ats: number[]) => {
    toHeist(r);
    const [cat] = catsOf(r);
    character(r, cat!);
    for (const at of ats) secure(r, cat!, holdFish(r, cat!), at);
    captureAll(r);
  };
  round([300, 400]); // team A's 2, the last at 400 s
  round([100, 350]); // team B's 2, the last at 350 s
  const won = { match: r.sims()[0]!.round.match, score: { ...r.sims()[0]!.round.score } };
  r.send(hostOf(r), advance(hostOf(r), hostOf(r).me)!);
  const lobby = { phase: r.sims()[0]!.round.phase, score: { ...r.sims()[0]!.round.score } };
  round([]);
  round([]);
  const drawn = { match: r.sims()[0]!.round.match, score: r.sims()[0]!.round.score };
  console.log(`2-2: ${JSON.stringify(won)}; then ${JSON.stringify(lobby)}; 0-0: ${JSON.stringify(drawn)}`);
  expect(won).toEqual({ match: 'B', score: { A: 0, B: 1 } });
  expect(lobby).toEqual({ phase: 'lobby', score: { A: 0, B: 1 } });
  expect(drawn).toEqual({ match: 'draw', score: { A: 0, B: 1 } });
  expect(agree(r)).toBe(true);
});

// This client's own character, put where a test wants it, facing `yaw`.
function stand(sim: Sim, x: number, z: number, yaw: number): Entity {
  const me = [...sim.entities.values()].find((e) => e.home === sim.me)!;
  me.body.setTranslation({ x, y: 0.46, z }, true);
  me.body.setRotation({ x: 0, y: Math.sin(yaw / 2), z: 0, w: Math.cos(yaw / 2) }, true);
  return me;
}

test('secured is born at the holder inside the hideout: a fish carried in counts on both clients; one thrown in, once a cat holds it there', () => {
  const r = relay(countryHouse, true);
  const [cat, dog] = r.players(2); // one cat (the host) and one dog
  toHeist(r);
  const count = () => [cat!, dog!].map((s) => s.round.secured.length).join();
  const sent = () => r.history.filter(([m]) => m.type === 'secured').length;
  const fishAt = (z: number) => {
    const f = spawnOf(cat!, { kind: 'fish', p: { x: 0, y: halfHeight('fish'), z } });
    r.send(cat!, f);
    return f.id;
  };
  const south = (s: Sim): Intent => ({ move: { x: 0, z: s === cat ? -1 : 0 }, sprint: false, jump: false });
  // Carried from the yard through the gate into the hideout.
  stand(cat!, 0, -12.8, Math.PI);
  const first = fishAt(-13.6);
  r.run(10);
  r.send(cat!, grab(cat!)!);
  const before = count();
  r.until(() => cat!.round.secured.length > 0, 4 * 60, south);
  const carried = count();
  // Thrown in from the exit: it lies in the hideout, unheld, and nothing counts it.
  stand(cat!, 0, -17.2, Math.PI);
  const second = fishAt(-17.9);
  r.run(10);
  r.send(cat!, grab(cat!)!);
  r.run(5);
  r.send(cat!, throwCarried(cat!)!);
  r.run(120);
  const lying = cat!.entities.get(second)!.body.translation();
  const thrown = { count: count(), sent: sent() };
  r.send(cat!, { type: 'secured', from: cat!.me, fish: second, at: 1 }); // a client that does not hold it
  const refused = count();
  // A cat holds it there: it counts.
  stand(cat!, lying.x, lying.z + 0.8, Math.PI);
  r.run(2);
  r.send(cat!, grab(cat!)!);
  r.run(2);
  console.log(
    `secured on cat/dog: before ${before}; carried in ${carried}; thrown in (lies at z = ${lying.z.toFixed(2)}): ${thrown.count}, ` +
      `${thrown.sent} secured sent; a non-holder's secured: ${refused}; held there: ${count()}; fish ${first} in any table: ` +
      `${[cat!, dog!].some((s) => s.entities.has(first))}`,
  );
  expect([before, carried]).toEqual(['0,0', '1,1']);
  expect(lying.z).toBeLessThan(-20); // inside the hideout
  expect(thrown).toEqual({ count: '1,1', sent: 1 });
  expect(refused).toBe('1,1');
  expect(count()).toBe('2,2');
  expect([cat!, dog!].some((s) => s.entities.has(first) || s.ownership.rows.has(first))).toBe(false);
  expect(agree(r)).toBe(true);
});

test('in prep a cat pressing into the gate from the hideout moves 0 m through it, in heist it passes; a dog passes in neither', () => {
  const past = (kind: 'cat' | 'dog', to: 'prep' | 'heist') => {
    const sim = createWorld(countryHouse, 'A');
    receive(sim, { type: 'phase', from: 'A', to: 'prep', round: 1 }, 'A');
    if (to === 'heist') receive(sim, { type: 'phase', from: 'A', to, round: 1 }, 'A');
    const z = kind === 'cat' ? -19 : -13;
    receive(sim, spawnOf(sim, { kind, p: { x: 0, y: halfHeight(kind), z } }), 'A');
    for (let i = 0; i < 180; i++) step(sim, STEP, { move: { x: 0, z: kind === 'cat' ? 1 : -1 }, sprint: false, jump: false });
    const end = [...sim.entities.values()].find((e) => e.kind === kind)!.body.translation().z;
    return kind === 'cat' ? end + 16 : -16 - end; // m past the fence line, in the walking direction
  };
  const through = { cat: [past('cat', 'prep'), past('cat', 'heist')], dog: [past('dog', 'prep'), past('dog', 'heist')] };
  console.log(`m past the gate's fence line after 3 s walking at it, prep / heist: cat ${through.cat.map((d) => d.toFixed(2)).join(' / ')}, dog ${through.dog.map((d) => d.toFixed(2)).join(' / ')}`);
  expect(through.cat[0]).toBeLessThanOrEqual(0);
  expect(through.cat[1]).toBeGreaterThan(3);
  for (const d of through.dog) expect(d).toBeLessThanOrEqual(0);
});

const inKennel = (p: { x: number; y: number; z: number }) => Math.abs(p.x) < 1.1 && p.z > 8.9 && p.z < 11.1 && p.y < 2.5;
const capturedOn = (r: Relay, cat: Sim) => r.sims().map((s) => playerOf(s.round, cat.me)!.captured !== null);
const own = (sim: Sim) => [...sim.entities.values()].find((e) => e.home === sim.me)!;

test('a cat a dog tosses through the hatch is captured on every client when its body rests inside; it cannot press its way out', () => {
  const r = relay(countryHouse, true);
  const [, dog, cat] = r.players(3); // P1 plays the dog, P2 a cat
  toHeist(r);
  stand(dog!, -2.2, 10, Math.PI / 2); // 1 m west of the cage, facing it
  stand(cat!, -1.45, 10, 0);
  r.run(2);
  r.send(dog!, { type: 'claim', from: dog!.me, id: own(cat!).id, hold: true });
  r.run(10);
  const before = capturedOn(r, cat!).join();
  r.send(dog!, throwCarried(dog!)!);
  // Each client's own clock when the cat's body comes to rest inside, and when that client folds its capture.
  const rest = new Map<Sim, number>();
  const at = new Map<Sim, number>();
  for (let i = 0; i < 3 * 60 && (at.size < 3 || rest.size < 3); i++) {
    r.run(1);
    const b = own(cat!).body;
    const still = Math.hypot(b.linvel().x, b.linvel().y, b.linvel().z) < 0.05;
    if (rest.size === 0 && inKennel(b.translation()) && still) for (const s of r.sims()) rest.set(s, s.time);
    for (const s of r.sims()) if (!at.has(s) && playerOf(s.round, cat!.me)!.captured !== null) at.set(s, s.time);
  }
  const lag = r.sims().map((s) => (at.get(s)! - rest.get(s)!) * 1000);
  r.run(5 * 60, (s) => ({ move: { x: 0, z: s === cat ? -1 : 0 }, sprint: true, jump: s === cat }));
  const after = own(cat!).body.translation();
  console.log(`captured before the toss: ${before}; at rest inside, then captured ${lag.map((t) => t.toFixed(0)).join(' / ')} ms from it; after 5 s pressing at the gate: z = ${after.z.toFixed(2)}, inside ${inKennel(after)}`);
  expect(before).toBe('false,false,false');
  for (const t of lag) expect(Math.abs(t)).toBeLessThanOrEqual(150);
  expect(inKennel(after)).toBe(true);
  expect(agree(r)).toBe(true);
});

test("a free cat's interact at the latch frees both captured cats on every client at once; the gate lets them out and shuts 5 s later; the rescue ends their dig-out", { timeout: 30000 }, () => {
  const r = relay(countryHouse, true);
  const [free, , a, b] = r.players(4); // one dog, three cats
  toHeist(r);
  stand(a!, -0.6, 10, Math.PI);
  stand(b!, 0, 10, Math.PI);
  r.run(2);
  const caught = [a!, b!].map((s) => capturedOn(r, s).join());
  r.run(30 * 60);
  stand(free!, 0.7, 8.2, 0);
  r.run(1);
  const rescue = interact(free!)!;
  const gate = (s: Sim) => s.gates[0]!.collisionGroups();
  const shut = gate(free!);
  r.send(free!, rescue);
  const t0 = new Map(r.sims().map((s) => [s, s.time])); // each client's own clock at the rescue's fold
  const freed = [a!, b!].map((s) => capturedOn(r, s).join());
  const out = new Map<Sim, number>();
  const closed = new Map<Sim, number>();
  let opened = false;
  const outward = (s: Sim): Intent => ({ move: { x: 0, z: s === a || s === b ? -1 : 0 }, sprint: false, jump: false });
  for (let i = 0; i < 6 * 60; i++) {
    r.run(1, outward);
    if (i === 0) opened = r.sims().map(gate).every((g) => g !== shut);
    for (const s of [a!, b!]) if (!out.has(s) && own(s).body.translation().z < 8.7) out.set(s, s.time - t0.get(s)!);
    for (const s of r.sims()) if (!closed.has(s) && gate(s) === shut) closed.set(s, s.time - t0.get(s)!);
  }
  r.run(35 * 60); // past the 60 s dig-out the capture started
  const dug = r.history.filter(([m]) => m.type === 'dugOut').length;
  console.log(
    `captured on every client: ${caught.join(' | ')}; one interact at the latch: ${freed.join(' | ')}; gate open on all ${opened}; ` +
      `the freed cats out after ${[...out.values()].map((t) => t.toFixed(2)).join(' / ')} s; gate shut after ${[...closed.values()].map((t) => t.toFixed(3)).join(' / ')} s; dugOut sent ${dug}`,
  );
  expect(caught).toEqual(['true,true,true,true', 'true,true,true,true']);
  expect(freed).toEqual(['false,false,false,false', 'false,false,false,false']);
  expect(opened).toBe(true);
  expect(out.size).toBe(2);
  for (const t of closed.values()) expect(Math.abs(t - 5)).toBeLessThanOrEqual(STEP);
  expect(dug).toBe(0);
  expect(agree(r)).toBe(true);
});

test('a captured cat that leaves and rejoins by name mid-heist: its old body is gone, it is back in the kennel captured on every client, and digs out 60 s after the rejoin', { timeout: 30000 }, () => {
  const r = relay(countryHouse, true);
  const [, , cat] = r.players(3); // P2 plays a cat
  toHeist(r);
  stand(cat!, 0, 10, Math.PI); // on the kennel's floor
  r.run(2);
  const old = own(cat!).id;
  const caught = capturedOn(r, cat!).join();
  r.drop(cat!);
  r.run(20 * 60);
  const back = r.add();
  r.send(back, hello(back, 'P2'));
  const t0 = new Map(r.sims().map((s) => [s, s.time]));
  let steps = 0;
  const settled = () => r.sims().every((s) => !s.entities.has(old) && [...s.entities.values()].some((e) => e.home === back.me));
  for (; steps < 30 && !settled(); steps++) r.run(1);
  const at = own(back).body.translation();
  const kinds = r.sims().map((s) => [...s.entities.values()].find((e) => e.home === back.me)?.kind).join();
  const captured = capturedOn(r, back).join();
  r.until(() => playerOf(back.round, back.me)!.captured === null, 61 * 60);
  const dug = back.time - t0.get(back)!;
  console.log(
    `captured before leaving: ${caught}; after the hello: old body in any table ${r.sims().some((s) => s.entities.has(old) || s.ownership.rows.has(old))}, ` +
      `the new ${kinds} after ${steps} step(s) at (${at.x.toFixed(2)}, ${at.y.toFixed(2)}, ${at.z.toFixed(2)}), in the kennel ${inKennel(at)}, captured ${captured}; dug out ${dug.toFixed(3)} s after the rejoin`,
  );
  expect(caught).toBe('true,true,true');
  expect(steps).toBeLessThanOrEqual(30); // 500 ms
  expect(r.sims().some((s) => s.entities.has(old) || s.ownership.rows.has(old))).toBe(false);
  expect(kinds).toBe('cat,cat,cat');
  expect(inKennel(at)).toBe(true);
  expect(captured).toBe('true,true,true');
  expect(Math.abs(dug - 60)).toBeLessThanOrEqual(0.1);
  expect(agree(r)).toBe(true);
});

// A dog's mine at its feet at (x, z): it plants and stands still for the 1.5 s the plant takes.
function mineAt(r: Relay, dog: Sim, x: number, z: number): NetId {
  own(dog).body.setTranslation({ x, y: halfHeight('dog') + 0.01, z }, true);
  r.run(2);
  plant(dog);
  r.until(() => r.sims().every((s) => [...s.entities.values()].some((e) => e.kind === 'mine' && Math.hypot(e.body.translation().x - x, e.body.translation().z - z) < 0.1)), 2 * 60);
  return [...dog.entities.values()].find((e) => e.kind === 'mine' && Math.hypot(e.body.translation().x - x, e.body.translation().z - z) < 0.1)!.id;
}
const walking = (x: number): Intent => ({ move: { x, z: 0 }, sprint: false, jump: false });
const flat = (a: { x: number; z: number }, b: { x: number; z: number }) => Math.hypot(a.x - b.x, a.z - b.z);

test('two cats walk onto one mine in the same step: one blast accepted; each stunned 3 s and thrown, the carrier drops its fish at once; the dog 1 m off is pushed, not stunned; one noise', () => {
  const r = relay(countryHouse, true);
  const [b, dog, a] = r.players(3); // P0 and P2 play cats, P1 the dog
  toHeist(r);
  const mine = mineAt(r, dog!, 0, -10);
  own(dog!).body.setTranslation({ x: 0, y: halfHeight('dog') + 0.01, z: -9 }, true);
  stand(a!, -1.5, -10, Math.PI / 2);
  stand(b!, 1.5, -10, -Math.PI / 2);
  const fish = spawnOf(a!, { kind: 'fish', p: { x: -0.8, y: halfHeight('fish'), z: -10 } });
  r.send(a!, fish);
  r.send(a!, { type: 'claim', from: a!.me, id: fish.id, hold: true });
  r.run(5);
  // Every client steps before the relay orders what any sent, so both cats' blasts are in flight at once.
  const walk = (s: Sim) => walking(s === a ? 1 : s === b ? -1 : 0);
  const blasts = () => r.history.filter(([m]) => m.type === 'blast').length;
  for (let i = 0; i < 60 && blasts() === 0; i++) {
    const outs = r.clients.map((c) => [c.sim, step(c.sim, STEP, walk(c.sim), c.host)] as const);
    for (const [s, ms] of outs) for (const m of ms) r.send(s, m);
  }
  const at = r.history.findIndex(([m]) => m.type === 'blast');
  const t0 = new Map(r.sims().map((s) => [s, s.time]));
  const from = new Map([a!, b!, dog!].map((s) => [s, { ...own(s).body.translation() }]));
  const walksAgain = new Map<Sim, number>();
  const thrown = new Map<Sim, number>();
  let dogMoved = 0;
  for (let i = 0; i < 4 * 60; i++) {
    r.run(1, walk);
    for (const s of [a!, b!]) {
      const v = own(s).body.linvel();
      if (!walksAgain.has(s) && s.time - t0.get(s)! > 0.5 && v.x * (s === a ? 1 : -1) >= 0.9 * 4) walksAgain.set(s, s.time - t0.get(s)!);
      if (Math.abs(s.time - t0.get(s)! - 2.9) < STEP / 2) thrown.set(s, flat(own(s).body.translation(), from.get(s)!));
    }
    dogMoved = Math.max(dogMoved, flat(own(dog!).body.translation(), from.get(dog!)!));
  }
  // What the carrier sends once it folded the blast; a blast of its own was already in flight.
  const next = r.history.slice(at + 1).find(([m]) => m.type !== 'blast' && m.type !== 'left' && m.from === a!.me)?.[0];
  const noises = r.history.filter(([m]) => m.type === 'noise' && m.cause === 'blast').length;
  console.log(
    `blasts sent ${blasts()}, noises from a blast ${noises}, mine in any table ${r.sims().some((s) => s.entities.has(mine))}; ` +
      `the carrier's next message: ${next?.type} of ${next?.type === 'release' ? next.id : '-'}, fish held on ${r.sims().map((s) => s.ownership.rows.get(fish.id)?.held).join()}; ` +
      `cats walk again ${[...walksAgain.values()].map((t) => t.toFixed(3)).join(' / ')} s after the blast, thrown ${[...thrown.values()].map((d) => d.toFixed(2)).join(' / ')} m; ` +
      `the dog 1 m off moved ${dogMoved.toFixed(2)} m, stunned ${stunned(dog!)}`,
  );
  expect(blasts()).toBe(2);
  expect(noises).toBe(1);
  expect(r.sims().some((s) => s.entities.has(mine) || s.ownership.rows.has(mine))).toBe(false);
  expect(next).toMatchObject({ type: 'release', id: fish.id });
  expect(r.sims().map((s) => s.ownership.rows.get(fish.id)?.held)).toEqual([false, false, false]);
  expect(walksAgain.size).toBe(2);
  for (const t of walksAgain.values()) expect(Math.abs(t - 3)).toBeLessThanOrEqual(0.1);
  for (const d of thrown.values()) expect(d).toBeGreaterThanOrEqual(1.5);
  expect(dogMoved).toBeGreaterThanOrEqual(0.5);
  expect(stunned(dog!)).toBe(false);
});

test('a defuse held 3 s still removes the mine on both clients; moving at 2 s restarts it, and so does a grab', () => {
  const r = relay(countryHouse, true);
  const [cat, dog] = r.players(2); // P0 plays the cat, P1 the dog
  toHeist(r);
  const first = mineAt(r, dog!, 0, -10);
  const second = mineAt(r, dog!, 4, -10);
  own(dog!).body.setTranslation({ x: 4, y: halfHeight('dog') + 0.01, z: -12 }, true);
  const on = (id: NetId) => r.sims().map((s) => s.entities.has(id)).join();
  const hold = (steps: number, z = 0) => r.run(steps, (s) => (s === cat ? { move: { x: 0, z }, sprint: false, jump: false, defuse: true } : IDLE));
  // At the first mine: 2 s held, a step aside while holding (still within reach), then held still.
  stand(cat!, -0.8, -10, Math.PI / 2);
  r.run(2);
  hold(120);
  hold(6, 1);
  const restart = cat!.time;
  hold(75);
  const moved = on(first); // 3.4 s since the first press
  r.until(() => !cat!.entities.has(first), 4 * 60, (s) => (s === cat ? { ...IDLE, defuse: true } : IDLE));
  const done = cat!.time - restart;
  const gone = on(first);
  // At the second: 2 s held, then the dog grabs the cat, which holds E on.
  stand(cat!, 3.2, -10, Math.PI / 2);
  r.run(2);
  hold(120);
  r.send(dog!, { type: 'claim', from: dog!.me, id: own(cat!).id, hold: true });
  hold(90);
  const grabbed = on(second);
  console.log(`mine after 2 s, a step aside, 1.25 s more: ${moved}; removed ${done.toFixed(3)} s after the restart: ${gone}; after 2 s and a grab, 1.5 s more: ${grabbed}`);
  expect(moved).toBe('true,true');
  expect(Math.abs(done - 3)).toBeLessThanOrEqual(0.1);
  expect(gone).toBe('false,false');
  expect(grabbed).toBe('true,true');
});
