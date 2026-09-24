import type { Rotation, Vector } from '@dimforge/rapier3d-compat';
import type { ClientId, Entity, NetId } from './entities.ts';
import type { Sim } from './world.ts';

// One entity's state in a `tick` (ADR 0006), read from its body on the owning client.
export type Snapshot = { id: NetId; p: Vector; q: Rotation; v: Vector; w: Vector; rest: boolean };

export function readSnapshot(e: Entity): Snapshot {
  const b = e.body;
  return { id: e.id, p: b.translation(), q: b.rotation(), v: b.linvel(), w: b.angvel(), rest: b.isSleeping() };
}

// Moves a kinematic copy to its owner's pose; a snapshot from anyone but the fold's owner is dropped,
// and so is one for a prop this client's claim is in flight for.
// A resting pose is final, so it is placed at once and the copy sleeps; a moving one is the next pose.
export function applySnapshot(sim: Sim, from: ClientId, s: Snapshot): boolean {
  const e = sim.entities.get(s.id);
  if (!e || from === sim.me || sim.inFlight.has(s.id) || sim.ownership.rows.get(s.id)?.owner !== from) return false;
  if (s.rest) {
    e.body.setTranslation(s.p, false);
    e.body.setRotation(s.q, false);
    e.body.sleep();
  } else {
    e.body.setNextKinematicTranslation(s.p);
    e.body.setNextKinematicRotation(s.q);
  }
  return true;
}
