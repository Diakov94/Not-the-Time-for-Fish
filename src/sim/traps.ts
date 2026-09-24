import type { Vector } from '@dimforge/rapier3d-compat';
import { characterOf, halfHeight, spawnOf, type Entity, type Kind, type Variant } from './entities.ts';
import { release } from './grab.ts';
import type { Cleared, Pickup, SimMessage, Sprung } from './messages.ts';
import { noteUntil, stunned } from './mines.ts';
import { myCharacter } from './movement.ts';
import { carried } from './ownership.ts';
import { draw } from './perks.ts';
import { inPlay } from './round.ts';
import type { Sim } from './world.ts';

const CLEAR = 1.5; // m from a planted trap a dog's interact clears it
const PICK = 0.6; // m between centres a character picks a pickup up from
const LOUD = 1; // a sprung trap is as loud as a noise gets (card 23's scale)
// The slip trap (card 130, the Architect's assumption for a playtest to refute), a banana peel: a dog whose
// feet come within TRIP of one tumbles for SLIP s, and the slip is SLIP_LOUD loud.
const TRIP = 0.45; // m between centres: the trap's 0.15 m half and a paw's reach
const SLIP = 1.5;
const SLIP_LOUD = 0.5;

const flat = (a: Vector, b: Vector) => Math.hypot(a.x - b.x, a.z - b.z);
// This client's planted trap: a trap whose home is this client (a pickup has none).
const planted = (sim: Sim) => [...sim.entities.values()].find((e) => e.kind === 'trap' && e.home === sim.me);

// Q for a cat (card 49): its planted noise maker is set off, from anywhere; a planted slip trap springs by
// itself, so Q does nothing then; else the trap in its hand is planted at its feet, in play only, with the
// cat's client as its home. One trap in play per cat: with one planted there is nothing to plant, and with
// none in hand nothing either.
export function plantOrSpring(sim: Sim, c: Entity): SimMessage | null {
  const set = planted(sim);
  if (set) return sim.ending.has(set.id) || set.variant === 'slip' ? null : end(sim, { type: 'sprung', from: sim.me, id: set.id });
  const variant = sim.trap;
  if (!variant || !inPlay(sim.round)) return null;
  sim.trap = null;
  const p = c.body.translation();
  return { ...spawnOf(sim, { kind: 'trap', p: { x: p.x, y: p.y - halfHeight('cat') + halfHeight('trap'), z: p.z }, variant }), home: sim.me };
}

// E tapped by a dog (card 49): the nearest planted trap within CLEAR is cleared.
export function clear(sim: Sim, c: Entity): Cleared | null {
  const p = c.body.translation();
  const near = [...sim.entities.values()].filter((e) => e.kind === 'trap' && e.home !== null && !sim.ending.has(e.id) && flat(e.body.translation(), p) <= CLEAR);
  const t = near.sort((a, b) => flat(a.body.translation(), p) - flat(b.body.translation(), p))[0];
  return t ? end(sim, { type: 'cleared', from: sim.me, id: t.id }) : null;
}

// Every step, what this client's character touches within PICK, once each; the fold names the first
// picker. Any character picks up a mystery bag; a cat with no trap in play, planted or in hand, a trap
// pickup.
export function pickups(sim: Sim): Pickup[] {
  const c = myCharacter(sim);
  if (!c) return [];
  const p = c.body.translation();
  const trapFree = c.kind === 'cat' && !sim.trap && !planted(sim);
  const t = [...sim.entities.values()].find(
    (e) => (e.kind === 'bag' || (trapFree && e.kind === 'trap' && e.home === null)) && !sim.ending.has(e.id) && flat(e.body.translation(), p) <= PICK,
  );
  return t ? [end(sim, { type: 'pickup', from: sim.me, id: t.id })] : [];
}

// Every step, this client's dog with its feet on a planted slip trap springs it, once: the fold takes a
// slip trap's `sprung` from the dog that stepped on it.
export function slips(sim: Sim): Sprung[] {
  const c = myCharacter(sim);
  if (c?.kind !== 'dog') return [];
  const p = c.body.translation();
  const on = (t: Vector) => flat(t, p) <= TRIP && Math.abs(p.y - halfHeight('dog') - t.y) < 0.3;
  const t = [...sim.entities.values()].find((e) => e.kind === 'trap' && e.variant === 'slip' && e.home !== null && !sim.ending.has(e.id) && on(e.body.translation()));
  return t ? [end(sim, { type: 'sprung', from: sim.me, id: t.id })] : [];
}

// This client's dog slipped and tumbles: the stun a slip trap gave it, for the HUD and render.
export const slipped = (sim: Sim): boolean => myCharacter(sim)?.kind === 'dog' && stunned(sim);

// A folded end of a trap, or of a pickup of `kind` and `variant`, on this client. The springer's client
// makes the trap's noise where it lay; a slip trap's springer is the dog that stepped on it: it tumbles, its
// intent ignored for SLIP (its own stun), and drops the cat it carries by an ordinary release; every other
// client notes that dog stunned for SLIP. The picker's client has that trap in hand, or draws its perk.
export function trapEnded(sim: Sim, m: Sprung | Cleared | Pickup, at: Vector, kind: Kind, variant?: Variant): void {
  const slip = m.type === 'sprung' && variant === 'slip';
  const dog = slip && m.from !== sim.me ? characterOf(sim.entities, m.from) : undefined;
  if (dog) noteUntil(sim, sim.stunned, dog.id, sim.time + SLIP);
  if (m.from !== sim.me) return;
  const held = carried(sim);
  if (slip) sim.stunUntil = sim.time + SLIP;
  if (slip && held) sim.outbox.push(release(sim, held, { x: 0, y: 0, z: 0 }));
  if (m.type === 'sprung') sim.outbox.push({ type: 'noise', from: sim.me, p: at, loud: slip ? SLIP_LOUD : LOUD, cause: 'trap' });
  if (m.type === 'pickup' && kind === 'trap') sim.trap = variant === 'slip' ? 'slip' : 'noise';
  if (m.type === 'pickup' && kind === 'bag') draw(sim);
}

// A message that ends an entity is sent once: this client remembers it until the fold answers.
function end<M extends Sprung | Cleared | Pickup>(sim: Sim, m: M): M {
  sim.ending.add(m.id);
  return m;
}
