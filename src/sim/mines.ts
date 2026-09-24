import type { Vector } from '@dimforge/rapier3d-compat';
import { volumeAt } from './build.ts';
import { halfHeight, isCharacter, isFixture, spawnOf, type Variant } from './entities.ts';
import { release } from './grab.ts';
import type { Blast, SimMessage } from './messages.ts';
import { myCharacter, type Intent } from './movement.ts';
import { carried, simulatedHere } from './ownership.ts';
import { perkOf } from './perks.ts';
import { inPlay, knobs } from './round.ts';
import { plantOrSpring } from './traps.ts';
import type { Sim } from './world.ts';

const PLANT = 1.5; // s a dog stands still to plant a mine; Sapper halves it
const DEFUSE = 3; // s a cat holds E at a mine; Safecracker halves it and nothing interrupts it
const SAPPER = 2; // mines Sapper adds to the dog's count
const REACH = 1; // m from a mine's centre a cat defuses it
const TRIGGER = 0.45; // m between centres, feet on the ground: a cat steps on a mine (its 0.25 m half + a 0.2 m radius)
const WHISKER = 2; // m a sneaking cat feels a mine from
const STILL = 0.05; // m a planting dog or a defusing cat drifts before it counts as moving
const BLAST = 2.5; // m the blast reaches
const OUT = 4; // m/s outward and UP upward at the blast's centre, down to nothing at BLAST
const UP = 5;
const STUN = 3; // s a cat in the blast is stunned
const LOUD = 1; // a blast is as loud as a noise gets (card 23's scale)
const RESUPPLY = 30; // s a dog stays in the doghouse to get its used mines back
// The water bomb (card 129, the Architect's assumption for a playtest to refute): a dog's hand holds WATER
// of them after its first two firecrackers (card 148 makes the count a knob row); its splash is SPLASH loud
// and leaves a cat wet for WET s.
const WATER = 1;
const SPLASH = 0.6;
const WET = 20;

const flat = (a: Vector, b: Vector) => Math.hypot(a.x - b.x, a.z - b.z);

// This client's cat is stunned: its player's intent does not reach it (ADR 0007: its own client's fact).
export function stunned(sim: Sim): boolean {
  return sim.time < sim.stunUntil - 1e-9;
}

// This client's cat is wet, for so many s more; 0 when dry (card 129: its own client's fact). Its steps,
// the HUD and render read it.
export function wet(sim: Sim): number {
  const left = sim.wetUntil - sim.time;
  return left > 1e-9 ? left : 0;
}

// The mines this client's dog has in hand, its own count: the knob's firecrackers (card 27), the water
// bombs, and Sapper's while it lasts, less those used since its last resupply. `plant` and the HUD read it.
export function minesLeft(sim: Sim): number {
  return Math.max(0, knobs(sim.round).mines + WATER + (perkOf(sim) === 'sapper' ? SAPPER : 0) - sim.used);
}

// The variant of the next mine in this client's dog's hand: firecracker, firecracker, water, then the rest
// of its firecrackers. The plant and the HUD's next-mine word (card 146) read it.
export function nextMine(sim: Sim): Variant {
  return sim.used >= 2 && sim.used < 2 + WATER ? 'water' : 'firecracker';
}

// Q (card 49), for a cat its trap's. For a dog: a dog with a mine in hand that carries nothing starts
// planting one at its feet, in play only.
export function plant(sim: Sim): SimMessage | null {
  const c = myCharacter(sim);
  if (c?.kind === 'cat' && !stunned(sim)) return plantOrSpring(sim, c);
  const sapper = perkOf(sim) === 'sapper';
  if (c?.kind !== 'dog' || !inPlay(sim.round) || sim.planting || carried(sim) || minesLeft(sim) === 0) return null;
  sim.planting = { since: sim.time, until: sim.time + (sapper ? PLANT / 2 : PLANT), from: c.body.translation() };
  return null;
}

// Every step after the world's, this client's mine work on the intent its character acted on. A plant
// that ran PLANT s with the dog still spawns the mine. Its own cat with its feet on a mine is the mine's
// blast, sent once. A defuse runs while the cat holds E still at a mine and ends it after DEFUSE; moving,
// letting go or a grab (the cat is then no character of this client's) restarts it, except under
// Safecracker, which nothing interrupts. A dog that stays
// RESUPPLY s in the doghouse gets its used mines back.
export function mineStep(sim: Sim, intent: Intent): SimMessage[] {
  const out: SimMessage[] = [];
  const c = myCharacter(sim);
  const p = c?.body.translation();
  const mines = [...sim.entities.values()].filter((e) => e.kind === 'mine' && !sim.ending.has(e.id));
  if (sim.planting && (!p || flat(p, sim.planting.from) > STILL || carried(sim))) sim.planting = null;
  if (sim.planting && p && sim.time >= sim.planting.until - 1e-9) {
    sim.planting = null;
    out.push(spawnOf(sim, { kind: 'mine', p: { x: p.x, y: p.y - halfHeight('dog') + halfHeight('mine'), z: p.z }, variant: nextMine(sim) }));
    sim.used++;
  }
  const safe = perkOf(sim) === 'safecracker';
  if (c?.kind !== 'cat' || !p) {
    if (!safe) sim.defusing = null;
  } else {
    const on = mines.find((m) => flat(p, m.body.translation()) <= TRIGGER && Math.abs(p.y - halfHeight('cat') - m.body.translation().y) < 0.3);
    if (on) {
      sim.ending.add(on.id);
      out.push({ type: 'blast', from: sim.me, id: on.id });
    }
    const d = sim.defusing;
    if (d && ((!safe && (!intent.defuse || flat(p, d.from) > STILL)) || !mines.some((m) => m.id === d.id))) sim.defusing = null;
    const at = intent.defuse && !sim.defusing && mines.find((m) => flat(p, m.body.translation()) <= REACH);
    if (at) sim.defusing = { id: at.id, since: sim.time, until: sim.time + (safe ? DEFUSE / 2 : DEFUSE), from: p };
  }
  if (sim.defusing && sim.time >= sim.defusing.until - 1e-9) {
    sim.ending.add(sim.defusing.id);
    out.push({ type: 'defused', from: sim.me, id: sim.defusing.id });
    sim.defusing = null;
  }
  if (c?.kind !== 'dog' || !p || volumeAt(sim, 'doghouse', p) < 0) sim.resupplyAt = null;
  else if (sim.resupplyAt === null) sim.resupplyAt = sim.time;
  else if (sim.time - sim.resupplyAt >= RESUPPLY - 1e-9) [sim.used, sim.resupplyAt] = [0, sim.time];
  return out;
}

// A folded blast on every client (ADR 0007): each client pushes the bodies it simulates within BLAST of
// the mine outward and up, by less the further they stand. Its own character leaps; a cat is stunned for
// STUN and drops what it holds by an ordinary release, a dog never is. A water bomb's splash pushes
// nothing and stuns no one: its own cat within BLAST is wet for WET. The client whose blast it was sends
// its noise.
export function blasted(sim: Sim, m: Blast, at: Vector, variant?: Variant): void {
  const water = variant === 'water';
  const push = (p: Vector) => {
    const d = flat(p, at);
    const k = 1 - d / BLAST;
    const [x, z] = d > 1e-3 ? [(p.x - at.x) / d, (p.z - at.z) / d] : [0, 0];
    return k > 0 ? { x: x * OUT * k, y: UP * k, z: z * OUT * k } : null;
  };
  const c = myCharacter(sim);
  const v = c && push(c.body.translation());
  if (c?.kind === 'cat' && v && water) sim.wetUntil = sim.time + WET;
  if (c && v && !water) {
    sim.leap = v;
    const held = carried(sim);
    if (c.kind === 'cat') sim.stunUntil = sim.time + STUN;
    if (c.kind === 'cat' && held) sim.outbox.push(release(sim, held, { x: 0, y: 0, z: 0 }));
  }
  const bodies = [...sim.entities.values()].filter((e) => !isCharacter(e.kind) && !isFixture(e.kind) && simulatedHere(sim, e));
  for (const { body } of water ? [] : [...bodies, ...sim.debris]) {
    const dv = push(body.translation());
    if (dv) body.applyImpulse({ x: dv.x * body.mass(), y: dv.y * body.mass(), z: dv.z * body.mass() }, true);
  }
  if (m.from === sim.me) sim.outbox.push({ type: 'noise', from: sim.me, p: at, loud: water ? SPLASH : LOUD, cause: 'blast' });
}

// The whisker cue (card 60 shows it): this client's cat sneaks within WHISKER m of a mine. A local query.
export function whisker(sim: Sim): boolean {
  const c = myCharacter(sim);
  if (c?.kind !== 'cat' || !sim.sneaking) return false;
  return [...sim.entities.values()].some((e) => e.kind === 'mine' && flat(e.body.translation(), c.body.translation()) <= WHISKER);
}

// How far this client's plant or defuse has come, 0 to 1, for render and the HUD; null while neither runs.
export function progress(sim: Sim): { what: 'plant' | 'defuse'; done: number } | null {
  const work = sim.planting ?? sim.defusing;
  if (!work) return null;
  return { what: sim.planting ? 'plant' : 'defuse', done: (sim.time - work.since) / (work.until - work.since) };
}
