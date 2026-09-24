import type { Collider } from '@dimforge/rapier3d-compat';
import type { Entity } from './entities.ts';
import { myCharacter } from './movement.ts';
import { setBodyTypes, simulatedHere, type Claim } from './ownership.ts';
import type { Sim } from './world.ts';

const TOUCH_GAP = 0.5; // seconds between two touch claims of this client for one prop

// ADR 0006: a prop another client owns, touched by a body this client simulates, becomes a claim with
// `hold: false`, at most once per prop per TOUCH_GAP. Until the claim comes back the prop is simulated
// here and its owner's snapshots are ignored; the fold still decides who owns it. The caller sends
// the claims. This client's character meets a prop copy through the character controller; a dynamic
// body meets one through the contact graph.
export function touchClaims(sim: Sim): Claim[] {
  const entityOf = (c: Collider | null | undefined): Entity | undefined => {
    const b = c?.parent();
    for (const e of sim.entities.values()) if (b && e.body.handle === b.handle) return e;
    return undefined;
  };
  const touched = new Set<Entity>();
  const c = myCharacter(sim);
  for (let i = 0; c && i < sim.controller.numComputedCollisions(); i++) {
    const e = entityOf(sim.controller.computedCollision(i)?.collider);
    if (e) touched.add(e);
  }
  for (const e of sim.entities.values()) {
    if (e.kind === 'character' || simulatedHere(sim, e)) continue;
    sim.world.contactPairsWith(e.body.collider(0), (other) => {
      const o = entityOf(other);
      if (!o || !simulatedHere(sim, o)) return;
      sim.world.contactPair(e.body.collider(0), other, (m) => {
        if (m.numContacts() > 0) touched.add(e);
      });
    });
  }
  const claims: Claim[] = [];
  for (const e of touched) {
    if (e.kind === 'character' || simulatedHere(sim, e) || sim.ownership.rows.get(e.id)?.owner === sim.me) continue;
    if (sim.time - (sim.touchedAt.get(e.id) ?? -Infinity) < TOUCH_GAP) continue;
    sim.touchedAt.set(e.id, sim.time);
    sim.inFlight.add(e.id);
    claims.push({ type: 'claim', from: sim.me, id: e.id, hold: false });
  }
  if (claims.length > 0) setBodyTypes(sim);
  return claims;
}
