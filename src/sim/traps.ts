import type { Vector } from '@dimforge/rapier3d-compat';
import { halfHeight, spawnOf, type Entity } from './entities.ts';
import type { Cleared, Pickup, SimMessage, Sprung } from './messages.ts';
import { myCharacter } from './movement.ts';
import { inPlay } from './round.ts';
import type { Sim } from './world.ts';

const CLEAR = 1.5; // m from a planted trap a dog's interact clears it
const PICK = 0.6; // m between centres a character picks a pickup up from
const LOUD = 1; // a sprung trap is as loud as a noise gets (card 23's scale)

const flat = (a: Vector, b: Vector) => Math.hypot(a.x - b.x, a.z - b.z);
// This client's planted trap: a trap whose home is this client (a pickup has none).
const planted = (sim: Sim) => [...sim.entities.values()].find((e) => e.kind === 'trap' && e.home === sim.me);

// Q for a cat (card 49): its planted trap is set off, from anywhere; else the trap in its hand is planted
// at its feet, in play only, with the cat's client as its home. One trap in play per cat: with one
// planted there is nothing to plant, and with none in hand nothing either.
export function plantOrSpring(sim: Sim, c: Entity): SimMessage | null {
  const set = planted(sim);
  if (set) return sim.ending.has(set.id) ? null : end(sim, { type: 'sprung', from: sim.me, id: set.id });
  if (!sim.trap || !inPlay(sim.round)) return null;
  sim.trap = false;
  const p = c.body.translation();
  return { ...spawnOf(sim, { kind: 'trap', p: { x: p.x, y: p.y - halfHeight('cat') + halfHeight('trap'), z: p.z } }), home: sim.me };
}

// E tapped by a dog (card 49): the nearest planted trap within CLEAR is cleared.
export function clear(sim: Sim, c: Entity): Cleared | null {
  const p = c.body.translation();
  const near = [...sim.entities.values()].filter((e) => e.kind === 'trap' && e.home !== null && !sim.ending.has(e.id) && flat(e.body.translation(), p) <= CLEAR);
  const t = near.sort((a, b) => flat(a.body.translation(), p) - flat(b.body.translation(), p))[0];
  return t ? end(sim, { type: 'cleared', from: sim.me, id: t.id }) : null;
}

// Every step, what this client's character touches: a cat with no trap in play, planted or in hand,
// picks up a trap pickup within PICK, once; the fold names the first picker.
export function pickups(sim: Sim): Pickup[] {
  const c = myCharacter(sim);
  if (c?.kind !== 'cat' || sim.trap || planted(sim)) return [];
  const p = c.body.translation();
  const t = [...sim.entities.values()].find((e) => e.kind === 'trap' && e.home === null && !sim.ending.has(e.id) && flat(e.body.translation(), p) <= PICK);
  return t ? [end(sim, { type: 'pickup', from: sim.me, id: t.id })] : [];
}

// A folded end of a trap, or of a pickup, on this client. The springer's client makes the trap's noise
// where it lay; the picker's client has a trap in hand.
export function trapEnded(sim: Sim, m: Sprung | Cleared | Pickup, at: Vector): void {
  if (m.from !== sim.me) return;
  if (m.type === 'sprung') sim.outbox.push({ type: 'noise', from: sim.me, p: at, loud: LOUD, cause: 'trap' });
  if (m.type === 'pickup') sim.trap = true;
}

// A message that ends an entity is sent once: this client remembers it until the fold answers.
function end<M extends Sprung | Cleared | Pickup>(sim: Sim, m: M): M {
  sim.ending.add(m.id);
  return m;
}
