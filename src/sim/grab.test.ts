import { beforeAll, expect, test } from 'vitest';
import type { RigidBody, Vector } from '@dimforge/rapier3d-compat';
import type { Level } from '../content/level.ts';
import { countryHouse } from '../content/maps/country-house.ts';
import { prototypeRoom } from '../content/prototype-room.ts';
import { CRATE_HALF, halfHeight, isCharacter, type ClientId, type Kind } from './entities.ts';
import { anchor, grab, handOf, throwCarried } from './grab.ts';
import { hidden } from './hiding.ts';
import type { Claim, Spawn } from './messages.ts';
import { IDLE, yawOf, type Intent } from './movement.ts';
import { receive, type FoldMessage } from './ownership.ts';
import { applySnapshot, readSnapshot } from './snapshot.ts';
import { createWorld, init, step, STEP, type Sim } from './world.ts';

beforeAll(init);

const east: Intent = { move: { x: 1, z: 0 }, sprint: false, jump: false };
const west: Intent = { move: { x: -1, z: 0 }, sprint: false, jump: false };
const dist = (a: Vector, b: Vector) => Math.hypot(a.x - b.x, a.y - b.y, a.z - b.z);
// A crate's lowest point: its centre less the vertical reach of its three rotated half-axes, so a
// crate that meets the floor on an edge counts as landed.
const bottom = (b: RigidBody) => {
  const { x, y, z, w } = b.rotation();
  const reach = Math.abs(2 * (x * y + w * z)) + Math.abs(1 - 2 * (x * x + z * z)) + Math.abs(2 * (y * z - w * x));
  return b.translation().y - CRATE_HALF * reach;
};
const offAnchor = (held: Vector, carrier: Sim, id: string, kind: Kind = 'prop') => {
  const c = carrier.entities.get(id)!.body;
  return dist(held, anchor(c.translation(), yawOf(c.rotation()), handOf(kind)));
};

// Clients behind a loopback relay: every message reaches every client at once, in one order.
function room<T extends ClientId[]>(level: Level, ...clients: T) {
  const sims = clients.map((me) => createWorld(level, me)) as { [K in keyof T]: Sim };
  const relay = (m: FoldMessage | null) => {
    expect(m).not.toBeNull();
    for (const sim of sims) receive(sim, m!, clients[0]!);
  };
  let n = 0;
  const spawn = (from: ClientId, kind: Kind, p: Vector, more: Pick<Spawn, 'q' | 'prop'> = {}) => {
    const id = `${from}:${n++}`;
    relay({ type: 'spawn', from, id, kind, home: isCharacter(kind) ? from : null, p, ...more });
    return id;
  };
  const run = (intent: Intent, steps: number) => {
    for (let i = 0; i < steps; i++) for (const sim of sims) step(sim, STEP, intent);
  };
  return { sims, relay, spawn, run };
}

test('a crate carried 3 m stays within 0.05 m of the anchor on every step', () => {
  const { sims: [a], relay, spawn, run } = room(prototypeRoom, 'A');
  const me = spawn('A', 'cat', { x: -5, y: 1, z: 0 });
  const box = spawn('A', 'prop', { x: -5, y: CRATE_HALF, z: 1.5 }); // ahead: the character faces +z
  run(IDLE, 30);
  relay(grab(a));
  const c = a.entities.get(me)!.body;
  const crate = a.entities.get(box)!.body;
  const x0 = c.translation().x;
  let worst = 0;
  for (let i = 0; i < 48; i++) {
    step(a, STEP, east);
    worst = Math.max(worst, offAnchor(crate.translation(), a, me));
  }
  expect(c.translation().x - x0).toBeGreaterThan(3);
  expect(worst).toBeLessThanOrEqual(0.05);
});

test('a 6 m/s throw lands 2–4 m away', () => {
  const { sims: [a], relay, spawn, run } = room(prototypeRoom, 'A');
  const me = spawn('A', 'cat', { x: 0, y: 1, z: -5 });
  const box = spawn('A', 'prop', { x: 0, y: CRATE_HALF, z: -3.5 });
  run(IDLE, 30);
  relay(grab(a));
  run(IDLE, 10);
  relay(throwCarried(a));
  const from = a.entities.get(me)!.body.translation();
  const crate = a.entities.get(box)!.body;
  let landed: Vector | undefined;
  for (let i = 0; i < 120 && !landed; i++) {
    step(a, STEP);
    if (bottom(crate) <= 0.01) landed = crate.translation();
  }
  const d = Math.hypot(landed!.x - from.x, landed!.z - from.z);
  expect(d).toBeGreaterThanOrEqual(2);
  expect(d).toBeLessThanOrEqual(4);
});

test("a dog's grab at a fish makes no claim and puts nothing in flight", () => {
  const { sims: [, b], spawn, run } = room(prototypeRoom, 'A', 'B');
  spawn('B', 'dog', { x: 0, y: 1, z: 0 }); // faces +z, toward the fish
  spawn('A', 'fish', { x: 0, y: 0.1, z: 1 });
  run(IDLE, 30);
  expect(grab(b)).toBeNull();
  expect(b.inFlight.size).toBe(0);
});

test("a cat's grab at the 20 kg barricade makes no claim and puts nothing in flight", () => {
  const { sims: [a], spawn, run } = room(countryHouse, 'A');
  spawn('A', 'prop', { x: -8, y: 0.5, z: 13 }, { prop: countryHouse.props.findIndex((p) => p.label === 'barricade') });
  spawn('A', 'cat', { x: -8, y: halfHeight('cat'), z: 11.8 }); // faces +z, toward it
  run(IDLE, 30);
  expect(grab(a)).toBeNull();
  expect(a.inFlight.size).toBe(0);
});

test("a grabbed character's body follows its carrier", () => {
  const { sims: [a, b], relay, spawn, run } = room(prototypeRoom, 'A', 'B');
  const cat = spawn('A', 'cat', { x: 0, y: 1, z: 1.5 });
  const dog = spawn('B', 'dog', { x: 0, y: 1, z: 0 }); // faces +z, toward the cat
  run(IDLE, 30);
  grab(b); // a dog lunges: its claim comes out of the step that ends the dash (card 21)
  let claim: FoldMessage | undefined;
  for (let i = 0; i < 30 && !claim; i++) claim = step(b, STEP).find((m) => m.type === 'claim');
  relay(claim!);
  const onA = a.entities.get(cat)!.body;
  const onB = b.entities.get(cat)!.body;
  const x0 = onA.translation().x;
  let worst = 0;
  for (let i = 0; i < 96; i++) { // a dog carrying a cat walks at half its speed (card 22)
    step(b, STEP, east);
    // B's tick: everything B owns, the carried cat included.
    for (const [id, row] of b.ownership.rows) if (row.owner === 'B') applySnapshot(a, 'B', readSnapshot(b.entities.get(id)!));
    step(a, STEP, west); // the cat's player pulls the other way
    worst = Math.max(worst, offAnchor(onB.translation(), b, dog, 'cat'), dist(onA.translation(), onB.translation()));
  }
  expect(onA.translation().x - x0).toBeGreaterThan(3);
  expect(worst).toBeLessThanOrEqual(0.05);
});

// Facing +x or -x, and the hold claims a dog's lunge sends from `sim`, by the step that ends its dash.
const EAST = { x: 0, y: Math.SQRT1_2, z: 0, w: Math.SQRT1_2 };
const WEST = { x: 0, y: -Math.SQRT1_2, z: 0, w: Math.SQRT1_2 };
function lunge(sim: Sim): Claim[] {
  grab(sim);
  const claims: Claim[] = [];
  for (let i = 0; i < 30; i++) claims.push(...step(sim, STEP).filter((m): m is Claim => m.type === 'claim' && m.hold));
  return claims;
}

test("a dog's lunge stops at what it meets first: no claim on a cat hidden behind the yard box, the cat with the box 1 m aside, a cat past the fish it carries", () => {
  const behindBox = (aside: number) => {
    const { sims: [a, b], spawn, run } = room(countryHouse, 'A', 'B');
    spawn('A', 'prop', { x: 9.95, y: 0.4, z: 10 + aside }, { prop: 3 }); // the cardboard box by the shed
    const cat = spawn('A', 'cat', { x: 10.62, y: halfHeight('cat'), z: 10 }); // in the slot between it and the shed
    spawn('B', 'dog', { x: 8.5, y: halfHeight('dog'), z: 10 }, { q: EAST });
    run(IDLE, 30);
    return { hidden: hidden(b, b.entities.get(cat)!) && hidden(a, a.entities.get(cat)!), claims: lunge(b).map((m) => (m.id === cat ? 'cat' : m.id)) };
  };
  const [behind, aside] = [behindBox(0), behindBox(-1)];
  // Head-on in the open: the fish the cat carries lies between them on the dog's client.
  const { sims: [a, b], relay, spawn, run } = room(countryHouse, 'A', 'B');
  const cat = spawn('A', 'cat', { x: 10.3, y: halfHeight('cat'), z: 14 }, { q: WEST });
  spawn('A', 'fish', { x: 9.6, y: halfHeight('fish'), z: 14 });
  spawn('B', 'dog', { x: 8.5, y: halfHeight('dog'), z: 14 }, { q: EAST });
  run(IDLE, 30);
  relay(grab(a));
  const carrier = lunge(b).map((m) => (m.id === cat ? 'cat' : m.id));
  console.log(`hidden behind the box: ${behind.hidden}, hold claims ${JSON.stringify(behind.claims)}; the box 1 m aside: hidden ${aside.hidden}, ${JSON.stringify(aside.claims)}; a fish carrier head-on: ${JSON.stringify(carrier)}`);
  expect(behind).toEqual({ hidden: true, claims: [] });
  expect(aside).toEqual({ hidden: false, claims: ['cat'] });
  expect(carrier).toEqual(['cat']);
});
