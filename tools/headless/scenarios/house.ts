import type { Volume } from '../../../src/content/level.ts';
import { countryHouse } from '../../../src/content/maps/country-house.ts';
import { IDLE } from '../../../src/sim/movement.ts';
import { positionOf } from '../../../src/sim/round.ts';
import type { HeadlessClient, Press } from '../client.ts';
import { box, go, hold, inside, mineNear, p, place, simOf, take, tap, until, type Box, type P } from './bots.ts';

// The country house as the bots know it. What the level owns is read from it: the exits, the storages,
// the kennel, the latch, the hideout. The lanes between them are the bots' own map, clear of every prop:
// cats leave the hideout through the gate at x = +0.4 and come back at -0.4, go east of the house at x =
// 9.8 and come back at 9.1, go up the west side at -8.5 and come back at -9.3, so two never meet head-on;
// dogs run at x = +-8.8 (a dog is 0.8 m wide).
const L = countryHouse;
const volume = (role: Volume['role'], access?: string) => L.volumes.findIndex((v) => v.role === role && (!access || ('access' in v && v.access === access)));
const [westGap, gate, westFence, eastHole] = L.volumes.filter((v) => v.role === 'exit') as [Volume, Volume, Volume, Volume];
export const TABLE = volume('storage', 'open');
export const FRIDGE = volume('storage', 'door');
const KENNEL = L.volumes[volume('kennel')]!;
const HIDEOUT = L.volumes[volume('hideout')]!;
const LATCH = L.points.find((p) => p.role === 'latch')!.p;

// A dog plants on the yard side of an exit, clear of the fence; a cat comes back to the hideout past its
// north edge, where the fish it holds ahead of it is in.
export const MINE_AT = { gate: p(gate.p.x, gate.p.z + 0.7), westGap: p(westGap.p.x, westGap.p.z + 0.7), westFence: p(westFence.p.x + 0.7, westFence.p.z), eastHole: p(eastHole.p.x - 0.7, eastHole.p.z) };
export const HOME = p(gate.p.x - 0.4, HIDEOUT.p.z + HIDEOUT.half.z - 1);
export const GATE_S = p(gate.p.x, gate.p.z - 2); // the hideout's side of the gate
const GATE_OUT = [p(gate.p.x + 0.4, gate.p.z - 2.5), p(gate.p.x + 0.4, gate.p.z + 2)];
const GATE_IN = [p(gate.p.x - 0.4, gate.p.z + 2), p(gate.p.x - 0.4, gate.p.z - 2.5), HOME];
// The dog tosses from 1 m west of the cage, facing it (card 29); a cat opens it from beside the latch.
export const TOSS = p(KENNEL.p.x - KENNEL.half.x - 1.1, KENNEL.p.z);
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
