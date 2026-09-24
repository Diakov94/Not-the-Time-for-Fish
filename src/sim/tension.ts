import { isCharacter } from './entities.ts';
import type { Sim } from './world.ts';

const NEAR = 6; // m between this client's character and one of the other side's

// Whether the round is tense for this client (card 54's music asks): overtime, or its character within
// NEAR of a character of the other side, a dog at its cat or its dog at a cat.
export function tension(sim: Sim): boolean {
  if (sim.round.phase === 'overtime') return true;
  const all = [...sim.entities.values()].filter((e) => isCharacter(e.kind));
  const me = all.find((e) => e.home === sim.me);
  if (!me) return false;
  const p = me.body.translation();
  return all.some((e) => {
    const q = e.body.translation();
    return e.kind !== me.kind && Math.hypot(p.x - q.x, p.y - q.y, p.z - q.z) <= NEAR;
  });
}
