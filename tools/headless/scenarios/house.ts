import { countryHouse } from '../../../src/content/country-house.ts';
import type { Volume } from '../../../src/content/level.ts';
import { volumeAt } from '../../../src/sim/build.ts';
import { isCharacter, type Entity } from '../../../src/sim/entities.ts';
import { stored } from '../../../src/sim/heist.ts';
import { IDLE, myCharacter, yawOf, type Intent } from '../../../src/sim/movement.ts';
import { carried } from '../../../src/sim/ownership.ts';
import { playerOf, playsAs, positionOf } from '../../../src/sim/round.ts';
import type { Sim } from '../../../src/sim/world.ts';
import type { HeadlessClient, Press } from '../client.ts';

// The country house as the bots know it. What the level owns is read from it: the exits, the storages,
// the kennel, the latch, the hideout. The lanes between them are the bots' own map, clear of every prop:
// cats leave the hideout through the gate at x = +0.4 and come back at -0.4, go east of the house at x =
// 9.8 and come back at 9.1, go up the west side at -8.5 and come back at -9.3, so two never meet head-on;
// dogs run at x = +-8.8 (a dog is 0.8 m wide).
export type P = { x: number; z: number };
type Box = { x0: number; x1: number; z0: number; z1: number };
const L = countryHouse;
const volume = (role: Volume['role'], access?: string) => L.volumes.findIndex((v) => v.role === role && (!access || ('access' in v && v.access === access)));
const [westGap, gate, westFence, eastHole] = L.volumes.filter((v) => v.role === 'exit') as [Volume, Volume, Volume, Volume];
export const TABLE = volume('storage', 'open');
export const FRIDGE = volume('storage', 'door');
const KENNEL = L.volumes[volume('kennel')]!;
const HIDEOUT = L.volumes[volume('hideout')]!;
const LATCH = L.points.find((p) => p.role === 'latch')!.p;
const p = (x: number, z: number): P => ({ x, z });
const box = ({ p: c, half: h }: Volume): Box => ({ x0: c.x - h.x, x1: c.x + h.x, z0: c.z - h.z, z1: c.z + h.z });
const inside = (q: P, b: Box) => q.x >= b.x0 && q.x <= b.x1 && q.z >= b.z0 && q.z <= b.z1;

// A dog plants on the yard side of an exit, clear of the fence; a cat comes back to the hideout past its
// north edge, where the fish it holds ahead of it is in.
export const MINE_AT = { gate: p(gate.p.x, gate.p.z + 0.7), westGap: p(westGap.p.x, westGap.p.z + 0.7), westFence: p(westFence.p.x + 0.7, westFence.p.z), eastHole: p(eastHole.p.x - 0.7, eastHole.p.z) };
export const HOME = p(gate.p.x - 0.4, HIDEOUT.p.z + HIDEOUT.half.z - 1);
export const GATE_S = p(gate.p.x, gate.p.z - 2); // the hideout's side of the gate
const GATE_OUT = [p(gate.p.x + 0.4, gate.p.z - 2.5), p(gate.p.x + 0.4, gate.p.z + 2)];
const GATE_IN = [p(gate.p.x - 0.4, gate.p.z + 2), p(gate.p.x - 0.4, gate.p.z - 2.5), HOME];
// The dog tosses from 1 m west of the cage, facing it (card 29); a cat opens it from beside the latch.
export const TOSS = p(KENNEL.p.x - KENNEL.half.x - 1.1, KENNEL.p.z);
export const CAGE = p(KENNEL.p.x, KENNEL.p.z);
export const IN_CAGE = box(KENNEL);
export const RESCUE = p(LATCH.x, LATCH.z - 0.6);
const OUT_OF_CAGE = p(KENNEL.p.x - 0.5, KENNEL.p.z - KENNEL.half.z - 0.7);

// A room a cat route leads into through a gap one cat wide: one cat at a time is in it or its passage.
// Cats wait their turn outside at their own spot in the queue, the first on the team first.
type Room = { room: Box; passage: Box; queue: Box; spot: (k: number) => P };
// The living room, through its east cat gap; the kitchen, through its west cat flap.
const LIVING: Room = {
  room: { x0: 2.1, x1: 7.9, z0: -5.9, z1: 5.9 },
  passage: { x0: 7.3, x1: 9.9, z0: -3.8, z1: -2.5 },
  queue: { x0: 10, x1: 12.4, z0: -5.5, z1: -4.5 },
  spot: (k) => p(10.4 + 0.8 * k, -5),
};
const KITCHEN: Room = {
  room: { x0: -7.9, x1: -2.1, z0: 0.1, z1: 5.9 },
  passage: { x0: -9.8, x1: -7.2, z0: 2.2, z1: 3.5 },
  queue: { x0: -8.9, x1: -8.1, z0: -0.5, z1: 1.6 },
  spot: (k) => p(-8.5, 1.2 - k),
};

// The routes, each from where the one before it ends.
const EAST_GAP = [p(9.5, -3.15), p(7.5, -3.15)];
const TO_TABLE = [p(5.8, -3), p(4.4, -1.5), p(4.3, -0.45)];
const WEST_FLAP = [p(-9, 2.85), p(-7.5, 2.85)];
const TO_FRIDGE = [p(-7.5, 4.4)];
const back = (r: P[]) => [...r].reverse();
export const ROUTE = {
  east: [...GATE_OUT, p(3.4, -9), p(9.8, -7)],
  eastHome: [p(9.1, -7.2), p(2.6, -9.4), ...GATE_IN],
  toRescue: [...GATE_OUT, p(3.4, -9), p(9.8, -7), p(9.8, 7.5), RESCUE],
  rescueToEast: [p(9.8, 7.5)],
  queueToRescue: [p(9.8, 7.5), RESCUE],
  toStandby: [...GATE_OUT, p(3.4, -9), p(9.8, -7), p(9.8, 7.5), p(3, 7.6)],
  standbyToRescue: [RESCUE],
  west: [...GATE_OUT, p(-8.5, -7)],
  westHome: [p(-9.3, 1.2), p(-9.3, -7), ...GATE_IN],
  cageToWest: [OUT_OF_CAGE, p(-8.5, 7.3)],
  outOfCage: [OUT_OF_CAGE],
  westToRescue: [...GATE_OUT, p(-8.5, -7), p(-8.5, 7.3), RESCUE],
  // Dogs: the first from its spawn north then round the east of the house to the gate, along the fence to
  // the west gap, up the west lane; the others round the shed to the east hole, or round the kennel to the
  // west fence's exit, once the first has gone.
  dogToGate: [p(4, 14), p(8.8, 14), p(8.8, -7), p(2, -9), MINE_AT.gate],
  gateToWestGap: [MINE_AT.westGap],
  westGapToAmbush: [p(-8.8, -11), p(-9.6, 6.5)],
  carryToCage: [p(-8.9, 6.6), TOSS],
  cageToKennel: [p(TOSS.x, 12.5), p(5.5, 12.5)],
  dogToEastHole: [p(8.8, 12.5), p(16, 13), p(16, -6), MINE_AT.eastHole],
  dogToWestFence: [p(-2.2, 12.5), p(-16, 12.5), p(-16, 6), MINE_AT.westFence],
};

const PASSED = 0.4; // m: a waypoint on the way is passed this close
const REACHED = 0.15; // m: the last one is reached this close, slowing within SLOW of it
const SLOW = 0.5;
const STUCK = 6; // s without getting 0.2 m closer: the script stops with where it stood

export const simOf = (c: HeadlessClient): Sim => c.session.sim;
const own = (c: HeadlessClient): Entity | undefined => {
  const sim = simOf(c);
  for (const e of sim.entities.values()) if (e.home === sim.me && isCharacter(e.kind)) return e;
  return undefined;
};
// The own character is carried by a dog: nothing to drive.
export const heldNow = (c: HeadlessClient) => {
  const e = own(c);
  return e !== undefined && simOf(c).ownership.rows.get(e.id)?.held === true;
};
export const where = (c: HeadlessClient) => myCharacter(simOf(c))?.body.translation();
export const phase = (c: HeadlessClient) => simOf(c).round.phase;
// This client's side and its place on its team this round, the roster's word (ADR 0007).
export function place(c: HeadlessClient): { side: 'cat' | 'dog'; n: number } {
  const r = simOf(c).round;
  return { side: playsAs(r, simOf(c).me)!, n: positionOf(r, playerOf(r, simOf(c).me)!) };
}
export const flat = (a: P, b: P) => Math.hypot(a.x - b.x, a.z - b.z);
const toward = (from: P, to: P, pace: Partial<Intent>, k = 1): Intent => {
  const d = flat(from, to);
  return { ...IDLE, ...pace, move: { x: ((to.x - from.x) / d) * k, z: ((to.z - from.z) / d) * k } };
};

// Holds `intent` while `wait` says so.
export function* until(c: HeadlessClient, done: () => boolean, intent: Intent = IDLE): Generator<Press, void> {
  while (!done()) yield { intent };
}
// Holds `intent` for `s` seconds of the bot's clock.
export function* hold(c: HeadlessClient, s: number, intent: Intent = IDLE): Generator<Press, void> {
  const end = c.t + s;
  while (c.t < end) yield { intent };
}
export function* tap(action: NonNullable<Press['action']>): Generator<Press, void> {
  yield { intent: IDLE, action };
}

// Walks the route; false as soon as a dog carries the character.
export function* go(c: HeadlessClient, route: P[], pace: Partial<Intent> = {}): Generator<Press, boolean> {
  for (const [i, w] of route.entries()) {
    const last = i === route.length - 1;
    let best = Infinity;
    let since = c.t;
    for (;;) {
      if (heldNow(c)) return false;
      const at = where(c);
      if (!at) {
        yield { intent: IDLE };
        continue;
      }
      const d = flat(at, w);
      if (d <= (last ? REACHED : PASSED)) break;
      if (d < best - 0.2) [best, since] = [d, c.t];
      if (c.t - since > STUCK) throw new Error(`stuck at (${at.x.toFixed(2)}, ${at.z.toFixed(2)}) on its way to (${w.x}, ${w.z})`);
      yield { intent: toward(at, w, pace, last && d < SLOW ? Math.max(0.2, d / SLOW) : 1) };
    }
  }
  return true;
}

// Turns on the spot to face `to`.
export function* face(c: HeadlessClient, to: P): Generator<Press, void> {
  for (let i = 0; i < 60; i++) {
    const e = myCharacter(simOf(c));
    if (!e) return;
    const at = e.body.translation();
    const want = Math.atan2(to.x - at.x, to.z - at.z);
    const off = Math.atan2(Math.sin(want - yawOf(e.body.rotation())), Math.cos(want - yawOf(e.body.rotation())));
    if (Math.abs(off) < 0.03) return;
    yield { intent: toward(at, to, {}, 0.01) };
  }
}

// The fish in the storage (volume index `i`) in this client's world.
export const fishIn = (c: HeadlessClient, i: number) =>
  [...simOf(c).entities.values()].filter((e) => e.kind === 'fish' && volumeAt(simOf(c), 'storage', e.body.translation()) === i).length;

// At a storage: presses grab until the fold gives this cat a fish; false once there is none to take.
export function* take(c: HeadlessClient): Generator<Press, boolean> {
  for (let tries = 0; tries < 5; tries++) {
    const cat = myCharacter(simOf(c));
    if (!cat || !stored(simOf(c), cat)) return false;
    yield* tap('grab');
    yield* hold(c, 0.3);
    if (carried(simOf(c))?.kind === 'fish') return true;
  }
  return false;
}

// Some cat on this cat's team is in the kennel, by its own round table.
export const captive = (c: HeadlessClient) => simOf(c).round.roster.some((q) => q.captured !== null);
export const capturedMe = (c: HeadlessClient) => playerOf(simOf(c).round, simOf(c).me)?.captured != null;

// A dog on the watch: sniffing where it stands until a free cat (one `prey` accepts) comes within `near` m,
// then after it at a sprint, lunging from LUNGE m, until the fold gives it the cat. False if none came
// within `patience` s.
const LUNGE = 2.2;
export function* pounce(c: HeadlessClient, near: number, patience: number, prey: (e: Entity) => boolean = () => true): Generator<Press, boolean> {
  const sim = simOf(c);
  const end = c.t + patience;
  let chased: string | undefined;
  while (c.t < end) {
    if (carried(sim)?.kind === 'cat') return true;
    const at = where(c);
    const cats = [...sim.entities.values()].filter((e) => e.kind === 'cat' && !sim.ownership.rows.get(e.id)?.held && !inside(e.body.translation(), IN_CAGE) && prey(e));
    const target = cats.find((e) => e.id === chased) ?? (at && cats.find((e) => flat(e.body.translation(), at) <= near));
    if (!at || !target) {
      yield { intent: { ...IDLE, sniff: true } };
      continue;
    }
    chased = target.id;
    const d = flat(target.body.translation(), at);
    yield { intent: toward(at, target.body.translation(), { sprint: true }), ...(d <= LUNGE && { action: 'grab' as const }) };
  }
  return false;
}

// A dog carrying a cat: to the toss spot beside the cage, facing it, and the toss.
export function* toss(c: HeadlessClient): Generator<Press, void> {
  yield* go(c, ROUTE.carryToCage);
  yield* face(c, CAGE);
  yield* tap('throw');
  yield* hold(c, 0.3);
}

// A free cat at the latch: the interact that opens the kennel, once every captive's table says it is in.
export function* rescue(c: HeadlessClient): Generator<Press, void> {
  yield* face(c, p(LATCH.x, LATCH.z));
  yield* tap('interact');
  yield* until(c, () => !captive(c));
}

// A mine near `at` in this client's world.
export const mineNear = (c: HeadlessClient, at: P, within = 1.5) =>
  [...simOf(c).entities.values()].find((e) => e.kind === 'mine' && flat(e.body.translation(), at) <= within);

// A dog plants where it stands: Q, then still for the plant's 1.5 s and a margin, until its mine is there.
export function* plantHere(c: HeadlessClient): Generator<Press, void> {
  const at = where(c)!;
  yield* tap('plant');
  yield* until(c, () => mineNear(c, at, 0.3) !== undefined);
}

// The cats' way through the gate once the round is on: the team's first cat sneaks up to a mine there,
// feels it, and defuses it from its hideout side; the others wait their turn beside the gate until it is
// gone, one every 0.8 s.
export function* throughGate(c: HeadlessClient): Generator<Press, void> {
  const { n } = place(c);
  const wait = p(GATE_S.x - 1.5 + 0.75 * (n % 5), GATE_S.z - 1);
  yield* go(c, [wait]);
  const mine = mineNear(c, MINE_AT.gate);
  if (mine && n === 0) {
    const m = mine.body.translation();
    yield* go(c, [p(m.x, m.z - 0.85)], { sneak: true });
    yield* until(c, () => !mineNear(c, MINE_AT.gate), { ...IDLE, defuse: true });
  }
  yield* until(c, () => !mineNear(c, MINE_AT.gate));
  yield* hold(c, 0.8 * n);
}

// Another cat in `b` in this client's world; with `before`, only one earlier on its team than that.
function catIn(c: HeadlessClient, b: Box, before = Infinity): boolean {
  const { entities, me, round } = simOf(c);
  const rank = (home: string | null) => {
    const q = round.roster.find((x) => x.client === home);
    return q ? positionOf(round, q) : Infinity;
  };
  return [...entities.values()].some((e) => e.kind === 'cat' && e.home !== me && inside(e.body.translation(), b) && rank(e.home) < before);
}

// Into a room once nobody is in it or its passage and no teammate before this one waits its turn, unless
// `call` comes first; out of it once nobody is in the passage.
function* enter(c: HeadlessClient, room: Room, call = () => false): Generator<Press, boolean> {
  const { n } = place(c);
  yield* until(c, () => call() || (!catIn(c, room.room) && !catIn(c, room.passage) && !catIn(c, room.queue, n)));
  return !call();
}
function* leave(c: HeadlessClient, room: Room): Generator<Press, void> {
  yield* until(c, () => !catIn(c, room.passage));
}

const RUN = { sprint: true };
// A cat's trip for the table's fish: along `from` to its spot `k` in the living room's queue, in through the
// gap in its turn, a fish if one is left (held at the table while `stay` says so), out again and back to
// the hideout by the east lane. Ends in the hideout, in the queue if `call` came while it waited there, or
// wherever a dog carried it from.
export function* tableTrip(c: HeadlessClient, from: P[], k: number, call?: () => boolean, stay = () => false): Generator<Press, 'home' | 'called' | 'carried'> {
  if (!(yield* go(c, [...from, LIVING.spot(k)], RUN))) return 'carried';
  if (!(yield* enter(c, LIVING, call))) return 'called';
  if (!(yield* go(c, [...EAST_GAP, ...TO_TABLE], RUN))) return 'carried';
  yield* take(c);
  yield* until(c, () => !stay());
  if (!(yield* go(c, [...back(TO_TABLE).slice(1), EAST_GAP[1]!]))) return 'carried';
  yield* leave(c, LIVING);
  return (yield* go(c, [EAST_GAP[0]!, ...ROUTE.eastHome])) ? 'home' : 'carried';
}

// A cat's trip for the fridge's fish: along `from` to its spot `k` in the kitchen's queue, in through the
// flap in its turn, the fridge opened by its own work if it is still shut, a fish, and back to the hideout
// by the west lane. False as soon as a dog carries it.
export function* fridgeTrip(c: HeadlessClient, from: P[], k: number): Generator<Press, boolean> {
  if (!(yield* go(c, [...from, KITCHEN.spot(k)], RUN))) return false;
  yield* enter(c, KITCHEN);
  if (!(yield* go(c, [...WEST_FLAP, ...TO_FRIDGE], RUN))) return false;
  if (!simOf(c).round.opened.includes(FRIDGE)) {
    yield* tap('interact');
    const end = c.t + 5;
    yield* until(c, () => simOf(c).round.opened.includes(FRIDGE) || c.t > end);
  }
  yield* take(c);
  if (!(yield* go(c, [WEST_FLAP[1]!]))) return false;
  yield* leave(c, KITCHEN);
  return yield* go(c, [WEST_FLAP[0]!, ...ROUTE.westHome]);
}
