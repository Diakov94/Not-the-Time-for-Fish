import RAPIER from '@dimforge/rapier3d-compat';
import type { Rotation, Vector } from '@dimforge/rapier3d-compat';
import { spawnEntity, type ClientId, type Entity, type NetId, type Spawn } from './entities.ts';
import type { Sim } from './world.ts';

// ADR 0006. `from` is the sender the relay stamped on the envelope; `left` comes from the relay itself.
export type Claim = { type: 'claim'; from: ClientId; id: NetId; hold: boolean };
export type Release = { type: 'release'; from: ClientId; id: NetId; p: Vector; q: Rotation; v: Vector };
export type Left = { type: 'left'; id: ClientId; host: ClientId };
export type FoldMessage = Spawn | Claim | Release | Left;

export type Ownership = { owner: ClientId; held: boolean };

// The one owner of authority. `gone` records the clients the relay announced as left, in its order,
// only so the home rule knows whether a home is still in the room; membership stays the relay's.
export type OwnershipTable = { rows: Map<NetId, Ownership>; gone: Set<ClientId> };

export function newOwnershipTable(): OwnershipTable {
  return { rows: new Map(), gone: new Set() };
}

// Folds one message of the relay's order into the table and says whether it was accepted. The table
// depends on nothing but the messages and the homes of the entity table, so every client that folds
// the same order holds the same table.
export function fold(t: OwnershipTable, m: FoldMessage, homeOf: (id: NetId) => ClientId | null): boolean {
  const homeOr = (id: NetId, fallback: ClientId): ClientId => {
    const home = homeOf(id);
    return home !== null && !t.gone.has(home) ? home : fallback;
  };
  switch (m.type) {
    case 'spawn':
      t.rows.set(m.id, { owner: m.from, held: false });
      return true;
    case 'claim': {
      const row = t.rows.get(m.id);
      // Held by someone else, or a touch on an entity with a home (a character): rejected.
      if (!row || (row.held && row.owner !== m.from) || (!m.hold && homeOf(m.id) !== null)) return false;
      row.owner = m.from;
      row.held = m.hold;
      return true;
    }
    case 'release': {
      const row = t.rows.get(m.id);
      if (!row || row.owner !== m.from) return false;
      row.held = false;
      row.owner = homeOr(m.id, m.from);
      return true;
    }
    case 'left':
      t.gone.add(m.id);
      for (const [id, row] of t.rows) {
        if (row.owner !== m.id) continue;
        row.held = false;
        row.owner = homeOr(id, m.host);
      }
      return true;
  }
}

// Whether this client simulates the entity: the fold gives it here and nobody carries it. Another
// player's character given to this client (its player left) is not driven: it stays a frozen body.
export function simulatedHere(sim: Sim, e: Entity): boolean {
  const row = sim.ownership.rows.get(e.id);
  return row?.owner === sim.me && !row.held && (e.kind !== 'character' || e.home === sim.me);
}

// Every client runs this for every message of the relay's order, its own echoed ones included.
export function receive(sim: Sim, m: FoldMessage): void {
  if (m.type === 'spawn') spawnEntity(sim.world, sim.entities, m);
  if (!fold(sim.ownership, m, (id) => sim.entities.get(id)?.home ?? null)) return;
  for (const e of sim.entities.values()) {
    const type = !simulatedHere(sim, e)
      ? RAPIER.RigidBodyType.KinematicPositionBased // a follower of its carrier or a copy of its owner
      : e.kind === 'crate'
        ? RAPIER.RigidBodyType.Dynamic
        : RAPIER.RigidBodyType.KinematicVelocityBased;
    if (e.body.bodyType() !== type) e.body.setBodyType(type, true);
  }
  // The release carries the handoff state, so the new owner continues the throw or the drop without a gap.
  const e = m.type === 'release' ? sim.entities.get(m.id) : undefined;
  if (m.type === 'release' && e && simulatedHere(sim, e)) {
    e.body.setTranslation(m.p, true);
    e.body.setRotation(m.q, true);
    e.body.setLinvel(m.v, true);
  }
}
