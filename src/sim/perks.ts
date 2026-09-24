import { spawnOf } from './entities.ts';
import { anchor } from './grab.ts';
import { hidden } from './hiding.ts';
import type { Bark, SimMessage } from './messages.ts';
import { stunned } from './mines.ts';
import { myCharacter, yawOf } from './movement.ts';
import { sideOf } from './ownership.ts';
import type { Sim } from './world.ts';

// GAME.md's perk pickups, four per side. Bark and Decoy are one use; the others last LASTS s.
export type Perk = 'sapper' | 'bloodhound' | 'bulldog' | 'bark' | 'ninja' | 'acrobat' | 'decoy' | 'safecracker';
const PERKS = { dog: ['sapper', 'bloodhound', 'bulldog', 'bark'], cat: ['ninja', 'acrobat', 'decoy', 'safecracker'] } as const;
const LASTS = 30; // s
const BARK = 7; // m from the barking dog a hidden cat is flushed out
const FLUSHED = 0.5; // the noise ping of a cat flushed out of its spot
const LURE = { hand: 0.6, speed: 6, pitch: (20 * Math.PI) / 180 }; // a thrown lure leaves the cat's hand

// The perk in this client's slot (ADR 0010: the picker's own fact): none once a timed one ran LASTS s
// on this client's clock.
export function perkOf(sim: Sim): Perk | null {
  const slot = sim.perk;
  return slot && (slot.until === null || sim.time < slot.until - 1e-9) ? slot.kind : null;
}

// The fold named this client the picker of a bag: one of its side's four, drawn here, fills the slot,
// whatever was in it.
export function draw(sim: Sim): void {
  const side = sideOf(sim.entities, sim.me);
  if (side !== 'cat' && side !== 'dog') return;
  const kind = PERKS[side][Math.floor(Math.random() * 4)]!;
  sim.perk = { kind, until: kind === 'bark' || kind === 'decoy' ? null : sim.time + LASTS };
}

// F (card 49): a one-use perk is used up; a timed one is at work from its pickup on. Bark is a message
// every cat's client answers for its own cat; Decoy throws a lure, an entity of this client's.
export function usePerk(sim: Sim): SimMessage | null {
  const c = myCharacter(sim);
  const kind = perkOf(sim);
  if (!c || stunned(sim) || (kind !== 'bark' && kind !== 'decoy')) return null;
  sim.perk = null;
  const p = c.body.translation();
  if (kind === 'bark') return { type: 'bark', from: sim.me, p };
  const yaw = yawOf(c.body.rotation());
  const ahead = Math.cos(LURE.pitch) * LURE.speed;
  const v = { x: Math.sin(yaw) * ahead, y: Math.sin(LURE.pitch) * LURE.speed, z: Math.cos(yaw) * ahead };
  return spawnOf(sim, { kind: 'lure', p: anchor(p, yaw, LURE.hand), v });
}

// A bark on this client: its own cat, hidden within BARK m of the dog, is flushed out of its spot to
// where it last stood outside one, and makes a noise there.
export function barked(sim: Sim, m: Bark): void {
  const c = myCharacter(sim);
  if (c?.kind !== 'cat' || !sim.outside || !hidden(sim, c)) return;
  const p = c.body.translation();
  if (Math.hypot(p.x - m.p.x, p.z - m.p.z) > BARK) return;
  c.body.setTranslation(sim.outside, true);
  sim.outbox.push({ type: 'noise', from: sim.me, p: sim.outside, loud: FLUSHED, cause: 'flush' });
}

// Every step: where this client's character last stood outside a hiding spot, for a bark to flush it to.
export function perkStep(sim: Sim): void {
  const c = myCharacter(sim);
  if (c && !hidden(sim, c)) sim.outside = c.body.translation();
}
