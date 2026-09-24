import type { Level, Volume } from '../../../src/content/level.ts';
import { fishMarket } from '../../../src/content/maps/fish-market.ts';
import { IDLE } from '../../../src/sim/movement.ts';
import { catsTeam, positionOf } from '../../../src/sim/round.ts';
import type { HeadlessClient, Press } from '../client.ts';
import type { Scenario } from '../run.ts';
import { captive, capturedMe, fishIn, go, heldNow, hold, inside, mineNear, p, phase, place, plantHere, pounce, rescue, simOf, take, tap, toss, until, type Box, type P } from './bots.ts';
import aRound from './round.ts';

// Card 137: card 63's round on the fish market. The round's scripts here are written against a map's plan
// (`roundOn`), so the farm's and the yacht's scenarios (cards 139, 141) are their plans only; the house's
// stay card 63's. Every map's plan follows one anatomy: the hideout south of the gate, the kennel's latch
// on its south side. Runners (cats at an even place on their team) take the open storage's fish out one
// at a time; kitchen cats (odd places) take a door storage's, its doors opened by their own work; the
// hunter (the first dog) mines two exits in prep and watches the kitchen cats' way, near enough its toss
// spot that a carry at 2 m/s ends inside the wiggle's 8 s; the other dogs mine an exit each and sniff by it;
// the last runner opens the kennel.

// A part of a building a cat route leads into through a gap one cat wide: one cat at a time is in it or its
// passage; cats wait their turn outside at their own spot in the queue, the first on the team first.
export type Room = { room: Box; passage: Box; queue: Box; spot: (k: number) => P };
// A step inside: a point, or a house door (its index) worked open if still shut.
type Step = P | { door: number };
// A storage's trip: the lane from the gate's yard side to the queue; the gap's outer and inner points; the
// steps from the inner point to the storage's side; the way home from the gap's outer point to the gate.
type Trip = { storage: number; room: Room; to: P[]; gap: [P, P]; steps: Step[]; home: P[] };
export type Plan = {
  level: Level;
  about: string;
  gate: Volume; // the cats' way out of the hideout, the one exit the hideout faces
  table: Trip; // the runners'
  pantry: Trip; // the kitchen cats'
  // The rescuer's ways, each from the gate's yard side unless named otherwise, to beside the latch; from the
  // latch home to the gate's yard side; the freed cat's from out of the cage to its queue's lane.
  rescue: { fromHome: P[]; fromQueue: P[]; standby: P[]; home: P[]; fromCage: P[] };
  // The hunter's routes to its two mines, each ending where it plants; its watch; the stretch of the kitchen
  // cats' way it chases a cat in, from `near` m; the carry to its toss spot (the kennel 1 m ahead); where it
  // sniffs after.
  hunter: { mines: [P[], P[]]; watch: P[]; prey: Box; near: number; carry: P[]; after: P[] };
  guards: { to: P[]; back: P }[]; // the second and third dogs': a mine where `to` ends, then a step back
  park: (n: number) => P;
};

type Script = Generator<Press, void>;
const sniffing = { ...IDLE, sniff: true };
const RUN = { sprint: true };
const back = (r: P[]) => [...r].reverse();
const isP = (s: Step): s is P => 'x' in s;

// What the plan's level owns, read from it, and the gate's lanes: out at x + 0.4, back at - 0.4.
function spots({ level, gate }: Plan) {
  const hideout = level.volumes.find((v) => v.role === 'hideout')!;
  const kennel = level.volumes.find((v) => v.role === 'kennel')!;
  const latch = level.points.find((q) => q.role === 'latch')!.p;
  return {
    mine: p(gate.p.x, gate.p.z + 0.7),
    wait: (n: number) => p(gate.p.x - 1.5 + 0.75 * (n % 5), gate.p.z - 3),
    out: [p(gate.p.x + 0.4, gate.p.z - 2.5), p(gate.p.x + 0.4, gate.p.z + 2)],
    in: [p(gate.p.x - 0.4, gate.p.z + 2), p(gate.p.x - 0.4, gate.p.z - 2.5), p(gate.p.x - 0.4, hideout.p.z + hideout.half.z - 1)],
    rescue: p(latch.x, latch.z - 0.6),
    outOfCage: p(kennel.p.x - 0.5, kennel.p.z - kennel.half.z - 0.7),
  };
}

// The round on `plan`'s map: card 63's judge, the sides by the auto-balance, the scripts below.
export function roundOn(plan: Plan): Scenario {
  const S = spots(plan);

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

  // The cats' way through the gate once the round is on: the team's first cat sneaks up to a mine there and
  // defuses it from its hideout side; the others wait their turn beside the gate until it is gone.
  function* throughGate(c: HeadlessClient): Generator<Press, void> {
    const { n } = place(c);
    yield* go(c, [S.wait(n)]);
    const mine = mineNear(c, S.mine);
    if (mine && n === 0) {
      const m = mine.body.translation();
      yield* go(c, [p(m.x, m.z - 0.85)], { sneak: true });
      yield* until(c, () => !mineNear(c, S.mine), { ...IDLE, defuse: true });
    }
    yield* until(c, () => !mineNear(c, S.mine));
    yield* hold(c, 0.8 * n);
  }

  // Work at what the fold opens after its OPENING or DOOR_WORK s (a door storage, a house door), if still shut.
  function* work(c: HeadlessClient, done: () => boolean): Generator<Press, void> {
    if (done()) return;
    yield* tap('interact');
    const end = c.t + 5;
    yield* until(c, () => done() || c.t > end);
  }
  // The steps in order, the points between two doors as one walk; false as soon as a dog carries the cat.
  function* walk(c: HeadlessClient, steps: Step[], pace = {}): Generator<Press, boolean> {
    const { round } = simOf(c);
    let points: P[] = [];
    for (const s of [...steps, null]) {
      if (s && isP(s)) {
        points.push(s);
        continue;
      }
      if (!(yield* go(c, points, pace))) return false;
      points = [];
      if (s) yield* work(c, () => round.doors.includes(s.door));
    }
    return true;
  }

  // How a trip ended: home with a fish, home without one, called away from the queue, carried off.
  type End = 'home' | 'empty' | 'called' | 'carried';
  // A trip for `t`'s fish: along `from` to its spot `k` in the queue, in through the gap in its turn, the
  // storage's door opened by its own work if it has one still shut, a fish if one is left, out again and
  // home. 'called' if `call` came while it waited in the queue.
  function* trip(c: HeadlessClient, t: Trip, from: P[], k: number, call?: () => boolean): Generator<Press, End> {
    const { round, level } = simOf(c);
    if (!(yield* go(c, [...from, t.room.spot(k)], RUN))) return 'carried';
    if (!(yield* enter(c, t.room, call))) return 'called';
    if (!(yield* walk(c, [...t.gap, ...t.steps], RUN))) return 'carried';
    const v = level.volumes[t.storage]!;
    if (v.role === 'storage' && v.access === 'door') yield* work(c, () => round.opened.includes(t.storage));
    const took = yield* take(c);
    if (!(yield* go(c, [...back(t.steps.filter(isP)).slice(1), t.gap[1]]))) return 'carried';
    yield* leave(c, t.room);
    return !(yield* go(c, [t.gap[0], ...t.home, ...S.in])) ? 'carried' : took ? 'home' : 'empty';
  }

  // `s` until it ends, or 'carried' as soon as a dog carries the cat, wherever it is in it.
  function* unlessCarried<T>(c: HeadlessClient, s: Generator<Press, T>): Generator<Press, T | 'carried'> {
    for (;;) {
      if (heldNow(c)) return 'carried';
      const r = s.next();
      if (r.done) return r.value;
      yield r.value;
    }
  }

  // Whether this runner (the k-th) is the one that opens the kennel: the last runner.
  const cats = (c: HeadlessClient) => simOf(c).round.roster.filter((q) => q.team === catsTeam(simOf(c).round)).length;
  const rescuer = (c: HeadlessClient, k: number) => k === ((cats(c) + 1) >> 1) - 1;
  function* rescueAndHome(c: HeadlessClient, route: P[]): Generator<Press, void> {
    yield* go(c, [...route, S.rescue], RUN);
    yield* rescue(c);
    yield* hold(c, 3); // the freed cat out of the cage and on its way first
    yield* go(c, [...plan.rescue.home, ...S.in], RUN);
  }

  // A runner: through the gate, the table's fish out one at a time, then parked; the rescuer opens the kennel
  // whenever a teammate is in it. A runner with no fish left for it stands by the kennel for a captive first.
  function* runner(c: HeadlessClient): Script {
    yield* until(c, () => phase(c) === 'heist');
    yield* throughGate(c);
    const k = place(c).n >> 1;
    const called = () => rescuer(c, k) && captive(c);
    if (fishIn(c, plan.table.storage) <= k) {
      yield* go(c, [...S.out, ...plan.rescue.standby], RUN);
      yield* until(c, () => captive(c));
      yield* rescueAndHome(c, []);
    }
    const home = [...S.out, ...plan.table.to];
    let from: P[] | null = home; // its way to the queue; null: it waits there
    for (;;) {
      if (called()) {
        yield* rescueAndHome(c, from ? [...S.out, ...plan.rescue.fromHome] : plan.rescue.fromQueue);
        from = home;
        continue;
      }
      if (from && !fishIn(c, plan.table.storage)) break;
      const end: End = yield* trip(c, plan.table, from ?? [], k, called);
      if (end === 'carried') throw new Error('a runner carried off'); // no hunter's prey: a script to fix, not to loop on
      from = end === 'called' ? null : home;
    }
    for (;;) {
      yield* go(c, [plan.park(place(c).n)]);
      yield* until(c, called); // a cat caught after the table's last fish
      yield* rescueAndHome(c, [...S.out, ...plan.rescue.fromHome]);
    }
  }

  // A cat a dog carried: tossed into the kennel, in until a teammate opens it.
  function* captivity(c: HeadlessClient): Script {
    yield* until(c, () => !heldNow(c));
    const end = c.t + 4;
    yield* until(c, () => capturedMe(c) || c.t > end);
    if (!capturedMe(c)) throw new Error('not in the kennel after the toss');
    yield* until(c, () => !capturedMe(c));
  }

  // A kitchen cat: through the gate for a fish of the pantry's, again if it came home empty-handed (one knocked
  // out of reach), or from the kennel's gate if a dog carried it there on the way.
  function* kitchen(c: HeadlessClient): Script {
    yield* until(c, () => phase(c) === 'heist');
    yield* throughGate(c);
    const k = place(c).n >> 1;
    const home = [...S.out, ...plan.pantry.to];
    let from = home;
    for (;;) {
      const end = yield* unlessCarried(c, trip(c, plan.pantry, from, k));
      if (end === 'carried') yield* captivity(c);
      else if (end === 'home' || !fishIn(c, plan.pantry.storage)) break;
      from = end === 'carried' ? [S.outOfCage, ...plan.rescue.fromCage] : home;
    }
    yield* go(c, [plan.park(place(c).n)]);
  }

  // The hunter: its two mines in prep, then the watch, sniffing; a cat that comes within `near` m on the prey
  // stretch is chased, lunged at, carried to the kennel and tossed in. Then it sniffs out of the rescuer's way.
  function* hunter(c: HeadlessClient): Script {
    for (const route of plan.hunter.mines) {
      yield* go(c, route, RUN);
      yield* plantHere(c);
    }
    yield* go(c, plan.hunter.watch, RUN);
    yield* until(c, () => phase(c) === 'heist', sniffing);
    if (yield* pounce(c, plan.hunter.near, 90, (e) => inside(e.body.translation(), plan.hunter.prey))) yield* toss(c, plan.hunter.carry);
    yield* go(c, plan.hunter.after);
    yield* until(c, () => false, sniffing);
  }

  // A guard (every other dog): once the others have left the spawn, a mine at its exit, a step back, sniffing.
  function* guard(c: HeadlessClient): Script {
    const { n } = place(c);
    const g = plan.guards[n - 1];
    yield* hold(c, 1.2 * n);
    if (g) {
      yield* go(c, g.to, RUN);
      yield* plantHere(c);
      yield* go(c, [g.back]);
    }
    yield* until(c, () => false, sniffing);
  }

  const script = (c: HeadlessClient): Script => {
    const { side, n } = place(c);
    return side === 'cat' ? (n % 2 === 0 ? runner(c) : kitchen(c)) : n === 0 ? hunter(c) : guard(c);
  };
  return {
    about: `a round to the end on the ${plan.about}: mines at the exits, a defuse, fish out, a grab, the kennel, a rescue`,
    level: plan.level,
    player: (i, level) => ({ side: aRound.player(i, level).side, script }),
    judge: aRound.judge!,
    round: true,
    seconds: 420,
  };
}

// The fish market as the bots know it: the lanes are their own map, clear of every prop. Runners take the
// ice counter's fish through the drain grate in the hall's front wall, into its south half. Kitchen cats
// go up the west yard, round the north of the crate stack there, in by the gap under the back shutter to
// the hall's north half and the cold room: its door and its shelf's opened by their own work. Northbound
// cats keep to x = -10.4 past the barrels, southbound to -9.6. Dogs run the west yard at x = -16.5 and the
// east at 16.5, clear of the traps.
const L = fishMarket;
const storage = (access: string) => L.volumes.findIndex((v) => v.role === 'storage' && v.access === access);
const [stallGap, gate, westFlap, eastHole] = L.volumes.filter((v) => v.role === 'exit') as [Volume, Volume, Volume, Volume];
const kennel = L.volumes.find((v) => v.role === 'kennel')!;
const COLD_DOOR = L.doors.findIndex((d) => d.hinge.x === 3 && d.hinge.z === 2);
const TOSS = p(kennel.p.x - kennel.half.x - 1.1, kennel.p.z); // 1 m west of the cage, facing it (card 29)
const NORTH_LANE = [p(-10.4, -7), p(-10.4, 4.5), p(-11, 5.3), p(-11, 6.9)];
const SOUTH_LANE = [p(-11.6, 6.9), p(-11.6, 5.3), p(-9.6, 4.2), p(-9.6, -6.5)];
const market: Plan = {
  level: L,
  about: 'fish market',
  gate,
  table: {
    storage: storage('open'),
    room: {
      room: { x0: -8.9, x1: 2.9, z0: -4.9, z1: -0.1 },
      passage: { x0: -7, x1: -5.7, z0: -6.8, z1: -3.8 },
      queue: { x0: -4.8, x1: -1, z0: -7, z1: -6.2 },
      spot: (k) => p(-4.4 + 0.8 * k, -6.6),
    },
    to: [],
    gap: [p(-6.35, -6), p(-6.35, -4.2)],
    steps: [p(-5.2, -2.4), p(-3.7, -1.4)],
    home: [p(-6.35, -8)],
  },
  pantry: {
    storage: storage('door'),
    room: {
      room: { x0: -8.9, x1: 8.9, z0: 0.1, z1: 4.9 },
      passage: { x0: -7, x1: -5.7, z0: 3.8, z1: 6.5 },
      queue: { x0: -10.6, x1: -8.1, z0: 7.2, z1: 8 },
      spot: (k) => p(-8.5 - 0.8 * k, 7.6),
    },
    to: NORTH_LANE,
    gap: [p(-6.35, 6.2), p(-6.35, 4.2)],
    // Through the cold room's door on the side of its free edge, clear of the panel's swing.
    steps: [p(-4.5, 3.8), p(2.5, 2.7), { door: COLD_DOOR }, p(3.9, 2.7), p(7.45, 4)],
    home: [p(-6.35, 6.9), ...SOUTH_LANE],
  },
  rescue: {
    fromHome: NORTH_LANE,
    fromQueue: [p(-10.4, -6.5), ...NORTH_LANE.slice(1)],
    standby: [...NORTH_LANE, p(3, 6.7)],
    home: SOUTH_LANE,
    fromCage: [],
  },
  // The hunter from its spawn down the west yard to the gap under a stall, along the fence to the gate, and
  // back up the west yard to its watch by its toss spot, 8 m from the kitchen cats' way to the shutter: the
  // chase from there is card 63's length (from 4 m, the other clients' copies of the grabbed cat were 0.3-0.4
  // m off in 5 runs of 8).
  hunter: {
    mines: [
      [p(4, 12.8), p(-16.5, 12.8), p(-16.5, -13), p(stallGap.p.x, stallGap.p.z + 0.7)],
      [p(gate.p.x, gate.p.z + 0.7)],
    ],
    watch: [p(-6, -11), p(-16.5, -5), p(-16.5, 8.2), p(-13, 11.8), p(-7, 11.8), p(-3, 10.5)],
    prey: { x0: -20, x1: 20, z0: -16, z1: 14 }, // the whole yard: from its watch no runner's way comes within 8 m
    near: 8,
    carry: [p(TOSS.x - 1.2, TOSS.z), TOSS], // the last leg straight at the cage: no swing before the throw
    after: [p(TOSS.x, 12.3), p(5.5, 12.3)],
  },
  guards: [
    { to: [p(5.5, 12.8), p(16.5, 12.8), p(16.5, -6), p(eastHole.p.x - 0.7, eastHole.p.z)], back: p(eastHole.p.x - 2.2, eastHole.p.z) },
    { to: [p(7, 12.8), p(-16.5, 12.8), p(-16.5, 5), p(westFlap.p.x + 0.7, westFlap.p.z)], back: p(westFlap.p.x + 2.2, westFlap.p.z) },
  ],
  park: (n) => p(-10 + 1.5 * n, -27),
};
export default roundOn(market);
