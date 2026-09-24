import { beforeAll, expect, test } from 'vitest';
import { countryHouse } from '../content/maps/country-house.ts';
import { prototypeRoom } from '../content/prototype-room.ts';
import { forward, join, leave, newRoom, type Out } from '../relay/room.ts';
import { halfHeight, spawnOf, type ClientId, type Entity, type NetId } from './entities.ts';
import type { Left, MapPick, SimMessage } from './messages.ts';
import { drainEvents } from './events.ts';
import { IDLE, type Intent } from './movement.ts';
import { grab, throwCarried } from './grab.ts';
import { interact } from './heist.ts';
import { hidden } from './hiding.ts';
import { perkOf } from './perks.ts';
import { plant, stunned } from './mines.ts';
import { newOwnershipTable, receive } from './ownership.ts';
import { advance, foldRound, knobs, mapRefusal, newRound, playerOf, playsAs, scoreOf, settle, successor, type RoundMessage } from './round.ts';
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
  // n clients that said hello.
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
const sides = (sim: Sim) => sim.round.roster.map(({ name, side }) => `${name}:${side}`).join(' ');
const count = (sim: Sim, side: string) => sim.round.roster.filter((p) => p.side === side).length;

test('no hello is answered; the prep sides 3 players 1 dog vs 2 cats and 6 2 vs 4 on every client at that message', () => {
  for (const [n, dogs] of [
    [3, 1],
    [6, 2],
  ] as const) {
    const r = relay();
    const sims = Array.from({ length: n }, () => r.add());
    for (const [i, s] of sims.entries()) {
      r.send(s, hello(s, `P${i}`));
      r.run(1);
    }
    const answers = r.sent() - n;
    const lobby = sides(sims[0]!);
    r.send(sims[0]!, advance(sims[0]!, sims[0]!.me)!);
    console.log(`${n} hellos: ${answers} message(s) besides them, lobby ${lobby}; at the prep: ${sides(sims[0]!)}`);
    expect(answers).toBe(0);
    for (const s of sims) {
      expect(sides(s)).toBe(sides(sims[0]!));
      expect([count(s, 'dog'), count(s, 'cat')]).toEqual([dogs, n - dogs]);
    }
  }
});

// ADR 0014's rotation over a whole match: n seated names, the host's phases to the match's end (each round
// ends on the heist timer, no fish held), the dogs each prep sides.
function rotated(n: number) {
  const [r, t] = [newRound(), newOwnershipTable()];
  const fold = (m: RoundMessage) => foldRound(r, m, 'c0', t, new Map());
  for (let i = 0; i < n; i++) fold({ type: 'hello', from: `c${i}`, name: `p${i}` });
  const dogs: string[][] = [];
  fold({ type: 'phase', from: 'c0', ...successor(r) });
  while (r.phase === 'prep') {
    dogs.push(r.roster.filter((p) => p.side === 'dog').map((p) => p.name));
    for (let k = 0; k < 3; k++) fold({ type: 'phase', from: 'c0', ...successor(r) }); // heist, overtime (over at once), next
  }
  const times = r.roster.map((p) => dogs.filter((d) => d.includes(p.name)).length);
  return { dogs, rounds: r.results.length, spread: [Math.min(...times), Math.max(...times)] };
}

test('the rotation at every seated count 3-8: GAME.md dog counts, 3 4 3 3 4 3 rounds, every name a dog once or twice at most one apart', () => {
  const at = [3, 4, 5, 6, 7, 8].map(rotated);
  for (const [i, m] of at.entries()) console.log(`${i + 3} seated: ${m.rounds} rounds, dogs ${m.dogs.map((d) => d.join('+')).join(' | ')}; dog rounds per name ${m.spread.join('-')}`);
  expect(at.map((m) => m.dogs.map((d) => d.length))).toEqual([[1, 1, 1], [1, 1, 1, 1], [2, 2, 2], [2, 2, 2], [2, 2, 2, 2], [3, 3, 3]]);
  expect(at.map((m) => m.rounds)).toEqual([3, 4, 3, 3, 4, 3]);
  for (const m of at) expect(m.spread[0]).toBeGreaterThanOrEqual(1);
  for (const m of at) expect(m.spread[1]! - m.spread[0]!).toBeLessThanOrEqual(1);
  expect(at[5]!.dogs).toEqual([['p0', 'p1', 'p2'], ['p3', 'p4', 'p5'], ['p0', 'p6', 'p7']]);
});

// ADR 0014's score over scripted matches at 5 players (dogs p0+p1, p2+p3, p0+p4), folded in the relay's
// order: a fish's row is held by its carrier's client until it is secured.
test('the score is per player: p3 secures 2, p0 catches 1, p1 2, a capture held by a cat 0; p3 wins on the sooner last point; 0-0 is a draw; the session score survives the lobby', () => {
  const [r, t] = [newRound(), newOwnershipTable()];
  const entities = new Map(['f1', 'f2'].map((id) => [id, { kind: 'fish' as const, home: null }]));
  const fold = (m: RoundMessage) => foldRound(r, m, 'c0', t, entities);
  const next = () => fold({ type: 'phase', from: 'c0', ...successor(r) });
  const secure = (fish: string, at: number) => {
    t.rows.set(fish, { owner: 'c3', held: true });
    fold({ type: 'secured', from: 'c3', fish, at });
    t.rows.delete(fish);
  };
  const capture = (cat: number, by: string, at: number) => fold({ type: 'captured', from: `c${cat}`, at, by });
  const scores = () => r.roster.map((p) => scoreOf(r, p.name)).join();
  for (let i = 0; i < 5; i++) fold({ type: 'hello', from: `c${i}`, name: `p${i}` });
  next(); // prep
  next(); // heist
  secure('f1', 100);
  capture(2, 'c0', 150);
  secure('f2', 200);
  capture(4, 'c1', 250);
  fold({ type: 'rescue', from: 'c3' });
  capture(2, 'c1', 300);
  capture(4, 'c2', 320); // held last by p2, a cat
  const inPlay = scores();
  next(); // overtime: no fish held, over
  const points = r.results[0]!.points;
  while (r.phase !== 'lobby') next();
  const won = { match: r.match, decided: r.decided, score: { ...r.score } };
  next(); // a second match, nobody scores
  while (r.phase !== 'lobby') next();
  console.log(`scores p0-p4 in play ${inPlay}, at the end ${scores()}; round 1 points ${JSON.stringify(points)}; match ${JSON.stringify(won)}; a 0-0 match: ${r.match} (${r.decided}), session ${JSON.stringify(r.score)}`);
  expect(inPlay).toBe('1,2,0,2,0');
  expect(points).toEqual({ p3: { n: 2, last: 200 }, p0: { n: 1, last: 150 }, p1: { n: 2, last: 300 } });
  expect(won).toEqual({ match: 'p3', decided: 'sooner', score: { p3: 1 } });
  expect([r.match, r.decided, r.score]).toEqual(['draw', 'level', { p3: 1 }]);
});

// A side's looks are its characters in the roster (card 100): six per side, the fold refuses a seventh.
// Three names folded to the heist, the table's ends settled after every message as `receive` does: p0
// the dog, p1 and p2 the cats.
function heistOf3() {
  const [r, t] = [newRound(), newOwnershipTable()];
  const fold = (m: RoundMessage | Left) => {
    const ok = foldRound(r, m, 'c0', t, new Map());
    settle(r, t, new Map());
    return ok;
  };
  for (let i = 0; i < 3; i++) fold({ type: 'hello', from: `c${i}`, name: `p${i}` });
  for (let k = 0; k < 2; k++) fold({ type: 'phase', from: 'c0', ...successor(r) });
  return { r, fold };
}

test("a free cat's tab dying mid-heist, its teammate captured, ends nothing", () => {
  const { r, fold } = heistOf3();
  fold({ type: 'captured', from: 'c1', at: 5, by: null });
  fold({ type: 'left', id: 'c2', host: 'c0' });
  console.log(`${r.roster.map((p) => `${p.name}:${p.side}`).join(' ')}; phase after the free cat's left: ${r.phase}`);
  expect(r.phase).toBe('heist');
});

test('a rescue frees a captured cat whose tab died, and its rejoin by name enters free', () => {
  const { r, fold } = heistOf3();
  fold({ type: 'captured', from: 'c2', at: 5, by: null });
  fold({ type: 'left', id: 'c2', host: 'c0' });
  const rescue = fold({ type: 'rescue', from: 'c1' });
  fold({ type: 'hello', from: 'c9', name: 'p2' });
  console.log(`the rescue with the captive away accepted: ${rescue}; its rejoin's captured: ${playerOf(r, 'c9')?.captured}`);
  expect([rescue, playerOf(r, 'c9')?.captured, r.phase]).toEqual([true, null, 'heist']);
});

test('the fold accepts looks 0 to 5 on either side and refuses 6', () => {
  const [r, t] = [newRound(), newOwnershipTable()];
  foldRound(r, { type: 'hello', from: 'A', name: 'P0' }, 'A', t, new Map());
  for (const side of ['cat', 'dog'] as const) {
    const looks = [0, 1, 2, 3, 4, 5, 6].map((look) => foldRound(r, { type: 'look', from: 'A', side, look, worn: {} }, 'A', t, new Map()));
    expect(looks).toEqual([true, true, true, true, true, true, false]);
    expect(r.roster[0]!.looks[side]).toBe(5);
  }
});

// What a player wears is the round table's, per side, whatever id it names (ADR 0013); the next look
// overwrites it.
test('the fold stores what a look wears per side, and the next look overwrites it', () => {
  const [r, t] = [newRound(), newOwnershipTable()];
  const fold = (m: RoundMessage) => foldRound(r, m, 'A', t, new Map());
  fold({ type: 'hello', from: 'A', name: 'P0' });
  fold({ type: 'look', from: 'A', side: 'cat', look: 1, worn: { hat: 'ushanka' } });
  fold({ type: 'look', from: 'A', side: 'dog', look: 2, worn: { accessory: 'sunflower' } });
  expect(r.roster[0]!.worn).toEqual({ cat: { hat: 'ushanka' }, dog: { accessory: 'sunflower' } });
  fold({ type: 'look', from: 'A', side: 'cat', look: 1, worn: { accessory: 'medal' } });
  expect(r.roster[0]!.worn).toEqual({ cat: { accessory: 'medal' }, dog: { accessory: 'sunflower' } });
});

// The host picks the map in the lobby, by a name this client has a level for (card 128); the fold names
// why it refuses a pick.
test("the fold takes a map from the host in the lobby only, by a name it has a level for, and names each refusal", () => {
  const [r, t] = [newRound(), newOwnershipTable()];
  const levels = { 'country-house': countryHouse, 'prototype-room': prototypeRoom };
  // A pick's reason, then whether the fold took it.
  const fold = (from: ClientId, name: string) => {
    const m: MapPick = { type: 'map', from, name };
    return [mapRefusal(r, m, 'H', levels), foldRound(r, m, 'H', t, new Map(), levels)];
  };
  const lobby = [fold('A', 'prototype-room'), fold('H', 'nope'), fold('H', 'prototype-room')];
  foldRound(r, { type: 'phase', from: 'H', to: 'prep', round: 1 }, 'H', t, new Map(), levels);
  const prep = fold('H', 'country-house');
  expect(lobby).toEqual([['host', false], ['unknown', false], [null, true]]);
  expect(prep).toEqual(['lobby', false]);
  expect(r.map).toBe('prototype-room');
});

test('a known name whose client left rejoins on its side for the round from a new client; a name in use is refused everywhere', () => {
  const r = relay();
  const sims = [r.add(), r.add(), r.add()];
  for (const [i, s] of sims.entries()) {
    r.send(s, hello(s, `P${i}`));
    r.run(1);
  }
  r.send(sims[0]!, advance(sims[0]!, sims[0]!.me)!);
  const cat = sims[1]!; // P1: a cat this round
  r.drop(cat);
  const back = r.add();
  r.send(back, hello(back, 'P1'));
  r.run(1);
  const late = r.add();
  const before = r.sims().map(sides);
  r.send(late, hello(late, 'P0')); // P0 is connected
  r.run(1);
  console.log(`after the rejoin: ${sides(back)}; a hello with a name in use: roster ${r.sims().map(sides).join(' | ') === before.join(' | ') ? 'unchanged' : 'changed'}`);
  for (const s of r.sims()) {
    const p1 = s.round.roster.find((p) => p.name === 'P1');
    expect(p1).toMatchObject({ side: 'cat', client: back.me });
    expect(s.round.roster.length).toBe(3);
    expect(s.round.roster.some((p) => p.client === late.me)).toBe(false);
  }
  expect(r.sims().map(sides)).toEqual(before);
  // The fold names why (card 68): the name is taken; a named client's second hello is refused as named.
  r.send(back, hello(back, 'P9'));
  r.run(1);
  expect([late.refused, back.refused]).toEqual(['taken', 'named']);
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
  for (const c of catsOf(r)) r.send(c, { type: 'captured', from: c.me, at: c.time - c.heistAt, by: null });
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
  const last = (s: Sim) => s.round.secured.at(-1)!.at;
  for (const s of r.sims()) expect(s.round.results).toEqual([{ dogs: ['P0'], secured: 3, last: last(s), why: 'fish', winner: 'cat', points: { P1: { n: 3, last: last(s) } } }]);
  expect(agree(r)).toBe(true);
});

test('every cat captured ends the round with dogs on every client at the same message', () => {
  const r = relay();
  r.players(3);
  toHeist(r);
  const [a, b] = catsOf(r);
  r.send(a!, { type: 'captured', from: a!.me, at: 1, by: null });
  const one = phases(r);
  r.send(b!, { type: 'captured', from: b!.me, at: 2, by: null });
  console.log(`phases with 1 of 2 cats captured: ${one}; with both: ${phases(r)}`);
  expect(one).toBe('heist,heist,heist');
  expect(phases(r)).toBe('over,over,over');
  for (const s of r.sims()) expect(s.round.results[0]).toMatchObject({ why: 'captured', winner: 'dog' });
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
    for (const s of r.sims()) expect(s.round.results[0]).toMatchObject({ why: 'overtime', winner: 'dog' });
    if (how === 'cap') for (const t of overtime) expect(Math.abs(t - 60)).toBeLessThanOrEqual(0.1);
    expect(agree(r)).toBe(true);
  }
  console.log(ends.join('\n'));
});

test("in overtime the carrier's client pings from its cat every 1 s, the first at once, and stops on the drop; none before, none from a cat with no fish", () => {
  const r = relay();
  r.players(3);
  toHeist(r);
  const [cat, other] = catsOf(r);
  character(r, cat!);
  r.send(other!, spawnOf(other!, { kind: 'cat', p: { x: -4, y: 1, z: 0 } }));
  const fish = holdFish(r, cat!);
  for (const s of r.sims()) s.phaseAt -= knobs(s.round).heist - 3; // the heist's time is up 3 s from now
  const pings: { t: number; from: ClientId; phase: string }[] = [];
  let seen = r.history.length;
  const watch = (steps: number) => {
    for (let i = 0; i < steps; i++) {
      r.run(1);
      for (const [m] of r.history.slice(seen)) if (m.type === 'noise' && m.cause === 'carrier') pings.push({ t: cat!.time - cat!.phaseAt, from: m.from, phase: cat!.round.phase });
      seen = r.history.length;
    }
  };
  watch(3 * 60 + 270); // 3 s of heist, then 4.5 s of overtime
  const body = cat!.entities.get(fish)!.body;
  r.send(cat!, { type: 'release', from: cat!.me, id: fish, p: body.translation(), q: body.rotation(), v: { x: 0, y: 0, z: 0 } });
  const dropped = pings.length;
  watch(2 * 60);
  const gaps = pings.slice(1).map((p, i) => p.t - pings[i]!.t);
  console.log(`pings at ${pings.map((p) => `${p.phase} ${p.t.toFixed(3)}`).join(', ')} s; gaps ${gaps.map((g) => g.toFixed(3)).join(' / ')} s; after the drop ${pings.length - dropped}`);
  expect(pings.map((p) => `${p.phase}:${p.from}`)).toEqual(Array(5).fill(`overtime:${cat!.me}`));
  expect(pings[0]!.t).toBeLessThanOrEqual(STEP + 1e-9);
  for (const g of gaps) expect(Math.abs(g - 1)).toBeLessThanOrEqual(STEP);
  expect(pings.length - dropped).toBe(0);
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
  for (const s of r.sims()) expect(s.round.results).toMatchObject([{ why: 'timer', winner: 'dog' }]);
  expect(agree(r)).toBe(true);
});

test("round 2 starts with every client's character of the side the rotation gives it", () => {
  const r = relay(countryHouse);
  r.players(3);
  const kinds = () => r.sims().map((s) => [...s.entities.values()].find((e) => e.home === s.me)?.kind).join();
  toHeist(r);
  const first = kinds();
  captureAll(r);
  r.send(hostOf(r), advance(hostOf(r), hostOf(r).me)!);
  r.run(2);
  console.log(`own characters, round 1: ${first}; round 2: ${kinds()}; entities per client ${r.sims().map((s) => s.entities.size).join(' / ')}`);
  expect(first).toBe('dog,cat,cat');
  expect(kinds()).toBe('cat,dog,cat');
  expect(agree(r)).toBe(true);
});

test("the next prep puts every piece of debris knocked in round 1 back at its content pose, at rest 3 s later, on every client", () => {
  const r = relay(countryHouse);
  r.players(3);
  toHeist(r);
  const home = (s: Sim) => s.debris.filter(({ prop, body }) => {
    const p = countryHouse.props[prop]!.p;
    const q = body.translation();
    return Math.hypot(q.x - p.x, q.y - p.y, q.z - p.z) <= 0.01 && body.isSleeping();
  }).length;
  // Every plate, cup, vase and pot swept 1.2 m south and dropped from 0.3 m, on every client.
  for (const s of r.sims()) for (const { body } of s.debris) body.setTranslation({ x: body.translation().x, y: 0.3, z: body.translation().z - 1.2 }, true);
  r.run(60);
  const knocked = r.sims().map(home);
  captureAll(r);
  r.send(hostOf(r), advance(hostOf(r), hostOf(r).me)!);
  r.run(3 * 60);
  const round2 = r.sims().map(home);
  console.log(`debris at its content pose of ${countryHouse.props.filter((p) => !p.synced).length}: knocked in round 1 ${knocked.join(' / ')}; at round 2's prep ${round2.join(' / ')} (${r.sims()[0]!.round.phase} ${r.sims()[0]!.round.round})`);
  expect(r.sims()[0]!.round).toMatchObject({ phase: 'prep', round: 2 });
  expect(round2).toEqual([26, 26, 26]);
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
  const [dog, cat] = r.players(2); // one dog (the host) and one cat
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
  const [dog, , cat] = r.players(3); // P0 plays the dog, P2 a cat
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

test('a catch goes to the dog that held the cat last: the first dog, its hold ended by a hit, scores 0; the next, which tossed it in, 1 on every client', () => {
  const r = relay(countryHouse, true);
  const [first, dog, cat, mate] = r.players(5); // P0 and P1 play the dogs, P2 and P3 cats
  toHeist(r);
  r.send(first!, { type: 'claim', from: first!.me, id: own(cat!).id, hold: true });
  r.send(mate!, { type: 'hit', from: mate!.me, dog: own(first!).id });
  const freed = r.sims().map((s) => s.ownership.rows.get(own(cat!).id)?.held).join();
  stand(dog!, -2.2, 10, Math.PI / 2); // 1 m west of the cage, facing it
  stand(cat!, -1.45, 10, 0);
  r.run(2);
  r.send(dog!, { type: 'claim', from: dog!.me, id: own(cat!).id, hold: true });
  r.run(10);
  r.send(dog!, throwCarried(dog!)!);
  r.until(() => r.sims().every((s) => s.round.caught.length > 0), 3 * 60);
  const caught = r.sims().map((s) => s.round.caught.map((c) => `${c.cat} by ${c.by}`).join());
  const scores = r.sims().map((s) => ['P0', 'P1'].map((n) => scoreOf(s.round, n)).join());
  console.log(`held after the hit ${freed}; caught ${caught.join(' | ')}; P0, P1 scores ${scores.join(' | ')}`);
  expect(freed).toBe('false,false,false,false,false');
  expect(caught).toEqual(Array(5).fill('P2 by P1'));
  expect(scores).toEqual(Array(5).fill('0,1'));
  expect(agree(r)).toBe(true);
});

test("a free cat's interact at the latch frees both captured cats on every client at once; the gate lets them out and shuts 5 s later; the rescue ends their dig-out", { timeout: 30000 }, () => {
  const r = relay(countryHouse, true);
  const [, free, a, b] = r.players(4); // one dog, three cats
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
  const [dog, b, a] = r.players(3); // P0 plays the dog, P1 and P2 cats
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
  const [dog, cat] = r.players(2); // P0 plays the dog, P1 the cat
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

const trapsOf = (sim: Sim, home: ClientId | null) => [...sim.entities.values()].filter((e) => e.kind === 'trap' && e.home === home);

test("a dog's clear delivered before the cat's spring: the trap is gone everywhere, the spring is rejected and no ping follows", () => {
  const r = relay(countryHouse, true);
  const [dog, , cat] = r.players(3);
  toHeist(r);
  stand(cat!, 0, -10, 0);
  r.run(2);
  r.send(cat!, plant(cat!)!);
  const set = trapsOf(dog!, cat!.me)[0]!.id;
  stand(cat!, 0, -3, 0);
  own(dog!).body.setTranslation({ x: 1, y: halfHeight('dog') + 0.01, z: -10 }, true);
  r.run(2);
  // Both pressed at once: the dog's clear reaches the relay first.
  const [cleared, sprung] = [interact(dog!), plant(cat!)];
  r.send(dog!, cleared!);
  r.send(cat!, sprung!);
  r.run(30);
  const pings = r.history.filter(([m]) => m.type === 'noise' && m.cause === 'trap').length;
  console.log(`clear then spring: ${cleared?.type} and ${sprung?.type} of ${set}; trap in any table ${r.sims().some((s) => s.entities.has(set) || s.ownership.rows.has(set))}; trap pings ${pings}`);
  expect([cleared?.type, sprung?.type]).toEqual(['cleared', 'sprung']);
  expect(r.sims().some((s) => s.entities.has(set) || s.ownership.rows.has(set))).toBe(false);
  expect(pings).toBe(0);
});

test('one trap in play per cat: with its trap planted a cat takes no pickup and Q plants nothing; with none, Q does nothing; a pickup gives it one to plant', () => {
  const r = relay(countryHouse, true);
  const [, , cat] = r.players(3);
  toHeist(r);
  const pickup = trapsOf(cat!, null).find((e) => flat(e.body.translation(), { x: -10, z: -13 }) < 0.1)!.id;
  const spawns = () => r.history.filter(([m]) => m.type === 'spawn' && m.kind === 'trap' && m.from === cat!.me).length;
  const press = () => {
    const m = plant(cat!);
    if (m) r.send(cat!, m);
    r.run(2);
    return m?.type ?? 'nothing';
  };
  stand(cat!, -10, -11, Math.PI);
  r.run(2);
  const first = press();
  stand(cat!, -10, -13, Math.PI); // on the pickup, the trap still planted
  r.run(30);
  const whilePlanted = { pickups: r.history.filter(([m]) => m.type === 'pickup').length, there: r.sims().every((s) => s.entities.has(pickup)) };
  stand(cat!, -10, -9, Math.PI); // off the pickup
  r.run(2);
  const second = press();
  const third = press();
  stand(cat!, -10, -12.8, Math.PI);
  r.run(2);
  const fourth = press();
  console.log(
    `Q: ${first}; on a pickup with its trap planted: ${whilePlanted.pickups} pickups, still there ${whilePlanted.there}; Q: ${second}; Q: ${third}; ` +
      `on it with none: pickup gone everywhere ${r.sims().every((s) => !s.entities.has(pickup))}; Q: ${fourth}; trap spawns ${spawns()}`,
  );
  expect(first).toBe('spawn');
  expect(whilePlanted).toEqual({ pickups: 0, there: true });
  expect([second, third]).toEqual(['sprung', 'nothing']);
  expect(r.sims().every((s) => !s.entities.has(pickup))).toBe(true);
  expect(fourth).toBe('spawn');
  expect(spawns()).toBe(2);
});

test("a cat in the hall box's spot is hidden on both clients; the dog shoves the box north 1 m and it is not, on both, within 150 ms", () => {
  const r = relay(countryHouse, true);
  const [dog, cat] = r.players(2); // P0 plays the dog, P1 the cat
  toHeist(r);
  const box = [...cat!.entities.values()].find((e) => e.prop !== undefined && countryHouse.props[e.prop]!.label === 'cardboard box' && e.body.translation().x < 0)!;
  const z0 = box.body.translation().z;
  stand(cat!, -1.575, 0, 0); // between the hall's west wall and the box
  own(dog!).body.setTranslation({ x: -0.85, y: halfHeight('dog') + 0.01, z: -1.6 }, true);
  r.run(5);
  const me = own(cat!).id;
  const hiddenOn = () => r.sims().map((s) => hidden(s, s.entities.get(me)!));
  const before = hiddenOn().join();
  const flipped = new Map<Sim, number>();
  let moved = 0;
  for (let i = 0; i < 3 * 60 && moved < 1; i++) {
    r.run(1, (s) => (s === dog ? { move: { x: 0, z: 1 }, sprint: false, jump: false } : IDLE));
    hiddenOn().forEach((h, k) => !h && !flipped.has(r.sims()[k]!) && flipped.set(r.sims()[k]!, r.sims()[k]!.time));
    moved = dog!.entities.get(box.id)!.body.translation().z - z0;
  }
  const lag = Math.abs(flipped.get(cat!)! - flipped.get(dog!)!) * 1000;
  console.log(`hidden before ${before}; the box shoved ${moved.toFixed(2)} m, hidden now ${hiddenOn().join()}; flipped on the cat's and the dog's clients ${lag.toFixed(0)} ms apart`);
  expect(before).toBe('true,true');
  expect(moved).toBeGreaterThanOrEqual(1);
  expect(hiddenOn().join()).toBe('false,false');
  expect(lag).toBeLessThanOrEqual(150);
});

test('a cat and a dog touch one mystery bag in the same step: one picker, the first delivered, holds a perk; the bag is gone everywhere', () => {
  const r = relay(countryHouse, true);
  const [dog, , cat] = r.players(3);
  toHeist(r);
  const bag = [...cat!.entities.values()].find((e) => e.kind === 'bag' && flat(e.body.translation(), { x: 13, z: -4 }) < 0.1)!.id;
  stand(cat!, 12, -4, Math.PI / 2);
  own(dog!).body.setTranslation({ x: 14, y: halfHeight('dog') + 0.01, z: -4 }, true);
  r.run(2);
  // Both step before the relay orders either's pickup.
  const walk = (s: Sim) => walking(s === cat ? 1 : s === dog ? -1 : 0);
  const pickups = () => r.history.filter(([m]) => m.type === 'pickup');
  for (let i = 0; i < 60 && pickups().length === 0; i++) {
    const outs = r.clients.map((c) => [c.sim, step(c.sim, STEP, walk(c.sim), c.host)] as const);
    for (const [s, ms] of outs) for (const m of ms) r.send(s, m);
  }
  r.run(5);
  const first = pickups()[0]![0] as { from: ClientId };
  const pickers = [cat!, dog!].filter((s) => perkOf(s) !== null);
  console.log(
    `pickups sent ${pickups().length} (${pickups().map(([m]) => (m as { from: ClientId }).from).join(', ')}); perks: cat ${perkOf(cat!)}, dog ${perkOf(dog!)}; ` +
      `bag in any table ${r.sims().some((s) => s.entities.has(bag) || s.ownership.rows.has(bag))}`,
  );
  expect(pickups().length).toBe(2);
  expect(pickers.map((s) => s.me)).toEqual([first.from]);
  expect(r.sims().some((s) => s.entities.has(bag) || s.ownership.rows.has(bag))).toBe(false);
});
