import type { Volume } from '../../../src/content/level.ts';
import { volumeAt } from '../../../src/sim/build.ts';
import { isCharacter, type Entity } from '../../../src/sim/entities.ts';
import { stored } from '../../../src/sim/heist.ts';
import { IDLE, myCharacter, yawOf, type Intent } from '../../../src/sim/movement.ts';
import { carried } from '../../../src/sim/ownership.ts';
import { playerOf, playsAs, positionOf } from '../../../src/sim/round.ts';
import type { Sim } from '../../../src/sim/world.ts';
import type { HeadlessClient, Press } from '../client.ts';

// The bots' moves on any map: walking a route, waiting, grabbing, the kennel's toss and rescue, mines.
// What they need of the map they read from the level their client's sim was built from; a map's own
// routes are its scenario's (house.ts for the country house).
export type P = { x: number; z: number };
export type Box = { x0: number; x1: number; z0: number; z1: number };
export const p = (x: number, z: number): P => ({ x, z });
export const box = ({ p: c, half: h }: Volume): Box => ({ x0: c.x - h.x, x1: c.x + h.x, z0: c.z - h.z, z1: c.z + h.z });
export const inside = (q: P, b: Box) => q.x >= b.x0 && q.x <= b.x1 && q.z >= b.z0 && q.z <= b.z1;

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

// The level's kennel and its latch, in this client's world.
const kennel = (c: HeadlessClient) => simOf(c).level.volumes.find((v) => v.role === 'kennel')!;
const latch = (c: HeadlessClient) => simOf(c).level.points.find((q) => q.role === 'latch')!.p;

// A dog on the watch: sniffing where it stands until a free cat (one `prey` accepts) comes within `near` m,
// then after it at a sprint, lunging from LUNGE m, until the fold gives it the cat. False if none came
// within `patience` s.
const LUNGE = 2.2;
export function* pounce(c: HeadlessClient, near: number, patience: number, prey: (e: Entity) => boolean = () => true): Generator<Press, boolean> {
  const sim = simOf(c);
  const cage = box(kennel(c));
  const end = c.t + patience;
  let chased: string | undefined;
  while (c.t < end) {
    if (carried(sim)?.kind === 'cat') return true;
    const at = where(c);
    const cats = [...sim.entities.values()].filter((e) => e.kind === 'cat' && !sim.ownership.rows.get(e.id)?.held && !inside(e.body.translation(), cage) && prey(e));
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

// A dog carrying a cat: along `route` to its toss spot beside the cage, facing it, and the toss.
export function* toss(c: HeadlessClient, route: P[]): Generator<Press, void> {
  yield* go(c, route);
  yield* face(c, kennel(c).p);
  yield* tap('throw');
  yield* hold(c, 0.3);
}

// A free cat at the latch: the interact that opens the kennel, once every captive's table says it is in.
export function* rescue(c: HeadlessClient): Generator<Press, void> {
  yield* face(c, latch(c));
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
