import type { Vector } from '@dimforge/rapier3d-compat';
import type { NetId } from './entities.ts';
import { myCharacter } from './movement.ts';
import { perkOf } from './perks.ts';
import type { Sim } from './world.ts';

export type Scent = { p: Vector; t: number }; // a pose sample and the sim time it was taken
export type Sniffed = { trail: (Scent & { id: NetId })[]; traps: NetId[] };

const SAMPLE = 0.5; // m of travel between two samples
const KEPT = 60; // s of samples a trail keeps, the longest window a perk asks for

// ADR 0010: a scent trail is this client's own history of a cat's or a lure's poses, taken after every
// step from the body wherever the step left it: the own body where it drove it, a copy where its
// owner's snapshots put it. It is a view of ADR 0006's poses; no message carries it.
export function smell(sim: Sim): void {
  for (const e of sim.entities.values()) {
    if (e.kind !== 'cat' && e.kind !== 'lure') continue;
    const trail = sim.scent.get(e.id) ?? [];
    sim.scent.set(e.id, trail);
    const p = e.body.translation();
    const last = trail.at(-1)?.p;
    if (!last || Math.hypot(p.x - last.x, p.y - last.y, p.z - last.z) >= SAMPLE) trail.push({ p, t: sim.time });
  }
  for (const [id, trail] of sim.scent) {
    while (trail.length > 0 && trail[0]!.t < sim.time - KEPT) trail.shift();
    if (trail.length === 0) sim.scent.delete(id);
  }
}

// What this client's dog smells while it sniffs: the samples laid in the last `window` s within `radius`
// m of it, and the traps within `radius`. Nothing for a cat or a dog that does not sniff. Bloodhound
// (card 42) smells the whole trail kept.
export function sniffed(sim: Sim, window = perkOf(sim) === 'bloodhound' ? KEPT : 30, radius = 10): Sniffed {
  const dog = myCharacter(sim);
  if (!sim.sniffing || !dog) return { trail: [], traps: [] };
  const at = dog.body.translation();
  const near = (p: Vector) => Math.hypot(p.x - at.x, p.y - at.y, p.z - at.z) <= radius;
  const trail = [...sim.scent].flatMap(([id, samples]) =>
    samples.filter((s) => sim.time - s.t <= window && near(s.p)).map((s) => ({ id, ...s })),
  );
  const traps = [...sim.entities.values()].filter((e) => e.kind === 'trap' && near(e.body.translation())).map((e) => e.id);
  return { trail, traps };
}
