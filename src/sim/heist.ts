import type { Vector } from '@dimforge/rapier3d-compat';
import type { Box } from '../content/level.ts';
import { volumeAt } from './build.ts';
import { GROUPS, type Entity } from './entities.ts';
import type { SimMessage } from './messages.ts';
import { stunned } from './mines.ts';
import { myCharacter } from './movement.ts';
import { carried } from './ownership.ts';
import { playerOf } from './round.ts';
import type { Sim } from './world.ts';

const TAKE = 0.8; // m from a storage's box: a cat takes a fish from there, and a teammate holds a lid
const OPENING = 3; // s of a cat's work at a door storage (the fridge) before it opens
const DOOR_LOUD = 0.6; // the opened door's noise ping
const LATCH = 1; // m from the latch point a free cat opens the kennel

// How far `p` is from the box, 0 inside it.
function away(p: Vector, b: Box): number {
  const out = (k: 'x' | 'y' | 'z') => Math.max(Math.abs(p[k] - b.p[k]) - b.half[k], 0);
  return Math.hypot(out('x'), out('y'), out('z'));
}

// Whether `cat` may take a fish out of volume `i` now (GAME.md, House: the access costs). An open storage
// always; a door storage once opened (the round table's word); a lid storage while another cat stands at
// it holding the lid, so one cat alone never can.
function unlocked(sim: Sim, i: number, cat: Entity): boolean {
  const v = sim.level.volumes[i]!;
  if (v.role !== 'storage' || v.access === 'open') return true;
  if (v.access === 'door') return sim.round.opened.includes(i);
  return [...sim.entities.values()].some((e) => e.kind === 'cat' && e !== cat && away(e.body.translation(), v) <= TAKE);
}

// A fish inside a storage `cat` may not take from yet: not there for its grab.
export function locked(sim: Sim, fish: Entity, cat: Entity): boolean {
  const i = volumeAt(sim, 'storage', fish.body.translation());
  return i >= 0 && !unlocked(sim, i, cat);
}

// The fish a cat standing at a storage takes out of it: a storage's fish is reached into, not cast at.
export function stored(sim: Sim, cat: Entity): Entity | undefined {
  const p = cat.body.translation();
  for (const e of sim.entities.values()) {
    const i = e.kind === 'fish' ? volumeAt(sim, 'storage', e.body.translation()) : -1;
    if (i >= 0 && away(p, sim.level.volumes[i]!) <= TAKE && unlocked(sim, i, cat)) return e;
  }
  return undefined;
}

// A cat's interact (E tapped, card 49): a free cat at the kennel's latch rescues at once while a cat is
// captured; at a shut door storage it starts the work that opens it. Returns the message an interact
// sends at once, if any.
export function interact(sim: Sim): SimMessage | null {
  const c = myCharacter(sim);
  if (c?.kind !== 'cat' || stunned(sim)) return null;
  const p = c.body.translation();
  const latch = sim.level.points.find((pt) => pt.role === 'latch')?.p;
  const free = playerOf(sim.round, sim.me)?.captured === null;
  if (latch && free && away(p, { p: latch, half: { x: 0, y: 0, z: 0 } }) <= LATCH && sim.round.roster.some((q) => q.captured !== null)) {
    return { type: 'rescue', from: sim.me };
  }
  if (sim.opening) return null;
  const i = sim.level.volumes.findIndex(
    (v, j) => v.role === 'storage' && v.access === 'door' && !sim.round.opened.includes(j) && away(p, v) <= TAKE,
  );
  if (i >= 0) sim.opening = { storage: i, until: sim.time + OPENING };
  return null;
}

// Every step after the world's, what this client detects for the round (ADR 0007: born at the fact's
// owner). Exits carry their cats blockers while the table says prep, and the kennel's gate lets only dogs
// meet it while a rescue holds it open. A door storage worked on for OPENING by a cat still at it opens,
// loudly. A fish this client holds inside the hideout is secured, once. This client's own cat, unheld,
// on the ground inside the kennel with the gate shut, is captured; its dig-out timer ending digs it out.
export function roundStep(sim: Sim): SimMessage[] {
  const out: SimMessage[] = [];
  const r = sim.round;
  for (const c of sim.exits) if (c.isEnabled() !== (r.phase === 'prep')) c.setEnabled(r.phase === 'prep');
  const shut = sim.time >= sim.gateUntil - 1e-9;
  for (const g of sim.gates) if (g.collisionGroups() !== (shut ? GROUPS.all : GROUPS.dogsBlocker)) g.setCollisionGroups(shut ? GROUPS.all : GROUPS.dogsBlocker);
  const c = myCharacter(sim);
  if (sim.opening && sim.time >= sim.opening.until - 1e-9) {
    const { storage } = sim.opening;
    const v = sim.level.volumes[storage]!;
    sim.opening = null;
    if (c && away(c.body.translation(), v) <= TAKE) {
      out.push({ type: 'opened', from: sim.me, storage }, { type: 'noise', from: sim.me, p: v.p, loud: DOOR_LOUD, cause: 'door' });
    }
  }
  const held = carried(sim);
  const stealing = r.phase === 'heist' || r.phase === 'overtime';
  if (stealing && held?.kind === 'fish' && !sim.securing.has(held.id) && volumeAt(sim, 'hideout', held.body.translation()) >= 0) {
    sim.securing.add(held.id);
    out.push({ type: 'secured', from: sim.me, fish: held.id, at: sim.time - sim.heistAt });
  }
  const me = playerOf(r, sim.me);
  if (me?.captured !== null) sim.capturing = false; // the table answered, or there is nothing to answer
  const inPlay = stealing || r.phase === 'prep';
  const caught = c?.kind === 'cat' && shut && sim.controller.computedGrounded() && volumeAt(sim, 'kennel', c.body.translation()) >= 0;
  if (inPlay && me?.captured === null && !sim.capturing && caught) {
    sim.capturing = true;
    out.push({ type: 'captured', from: sim.me, at: sim.time - sim.heistAt });
  }
  if (sim.digOut !== null && sim.time >= sim.digOut - 1e-9) {
    sim.digOut = null;
    out.push({ type: 'dugOut', from: sim.me });
  }
  return out;
}
