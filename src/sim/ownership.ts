import RAPIER from '@dimforge/rapier3d-compat';
import { isCharacter, spawnEntity, type ClientId, type Entity, type Kind, type NetId } from './entities.ts';
import type { Claim, Hit, Left, Release, SimMessage, Spawn } from './messages.ts';
import type { Sim } from './world.ts';

// ADR 0006's and 0009's messages, in the relay's order.
export type FoldMessage = Spawn | Claim | Release | Left | Hit;

export type Ownership = { owner: ClientId; held: boolean };

// The one owner of authority. `gone` records the clients the relay announced as left, in its order,
// only so the home rule knows whether a home is still in the room; membership stays the relay's.
export type OwnershipTable = { rows: Map<NetId, Ownership>; gone: Set<ClientId> };

export function newOwnershipTable(): OwnershipTable {
  return { rows: new Map(), gone: new Set() };
}

// ADR 0009: whether a holder may hold a target. The side rule is written here only: the fold rejects
// a hold claim it refuses, and `grab` never makes one.
export function mayHold(holder: Kind | undefined, target: Kind): boolean {
  if (holder === 'cat') return target === 'fish' || target === 'prop' || target === 'lure';
  return holder === 'dog' && target === 'cat';
}

// What the fold reads of the entity table: identity, never a pose.
export type Identities = ReadonlyMap<NetId, Pick<Entity, 'kind' | 'home'>>;

// A client's side: the kind of its character (ADR 0009).
export function sideOf(entities: Identities, client: ClientId): Kind | undefined {
  for (const e of entities.values()) if (e.home === client && isCharacter(e.kind)) return e.kind;
  return undefined;
}

// Folds one message of the relay's order into the table and says whether it was accepted. The table
// depends on nothing but the messages and the entity table's identities, so every client that folds
// the same order holds the same table.
export function fold(t: OwnershipTable, m: FoldMessage, entities: Identities): boolean {
  const homeOr = (id: NetId, fallback: ClientId): ClientId => {
    const home = entities.get(id)?.home ?? null;
    return home !== null && !t.gone.has(home) ? home : fallback;
  };
  switch (m.type) {
    case 'spawn':
      t.rows.set(m.id, { owner: m.from, held: false });
      return true;
    case 'claim': {
      const row = t.rows.get(m.id);
      const target = entities.get(m.id);
      // Held by someone else, a touch on an entity with a home (a character), or a hold the side rule
      // refuses: rejected.
      if (!row || !target || (row.held && row.owner !== m.from)) return false;
      if (m.hold ? !mayHold(sideOf(entities, m.from), target.kind) : target.home !== null) return false;
      // A grabbed cat drops what it holds on the spot: its client keeps simulating it, from where it is.
      if (m.hold && target.kind === 'cat') for (const r of t.rows.values()) if (r.owner === target.home && r.held) r.held = false;
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
    case 'hit': {
      // A thrown prop met a dog: what the dog holds goes home, without a handoff pose, as on `left`.
      const dog = entities.get(m.dog);
      if (dog?.kind !== 'dog') return false;
      let freed = false;
      for (const [id, row] of t.rows) {
        if (row.owner !== dog.home || !row.held) continue;
        row.held = false;
        row.owner = homeOr(id, row.owner);
        freed = true;
      }
      return freed;
    }
  }
}

// Whether this client simulates the entity: the fold gives it here and nobody carries it, or this
// client's claim on the prop is in flight. Another player's character given to this client (its
// player left) is not driven: it stays a frozen body.
export function simulatedHere(sim: Sim, e: Entity): boolean {
  const row = sim.ownership.rows.get(e.id);
  if (sim.inFlight.has(e.id)) return true;
  return row?.owner === sim.me && !row.held && (!isCharacter(e.kind) || e.home === sim.me);
}

// The entity this client carries: the fold says it holds it.
export function carried(sim: Sim): Entity | undefined {
  for (const e of sim.entities.values()) {
    const row = sim.ownership.rows.get(e.id);
    if (row?.owner === sim.me && row.held) return e;
  }
  return undefined;
}

// Body types follow the table's decision, on every client at the same message.
export function setBodyTypes(sim: Sim): void {
  for (const e of sim.entities.values()) {
    const type = !simulatedHere(sim, e)
      ? RAPIER.RigidBodyType.KinematicPositionBased // a follower of its carrier or a copy of its owner
      : isCharacter(e.kind)
        ? RAPIER.RigidBodyType.KinematicVelocityBased
        : RAPIER.RigidBodyType.Dynamic;
    if (e.body.bodyType() !== type) e.body.setBodyType(type, true);
  }
}

// A joiner's start (ADR 0006, Join): the host's entities and table as of the `seq` of its `state`,
// taken whole rather than folded; the relay's messages after that `seq` are folded on top.
export function adopt(sim: Sim, entities: Spawn[], table: OwnershipTable): void {
  for (const s of entities) spawnEntity(sim.world, sim.entities, s);
  sim.ownership = table;
  setBodyTypes(sim);
}

// Every client runs this for every message of the relay's order, its own echoed ones included. A noise
// is an event for everyone; a mark only for the marker's side (ADR 0010).
export function receive(sim: Sim, m: SimMessage | Left): void {
  if (m.type === 'noise' || m.type === 'mark') {
    if (m.type === 'noise' || sideOf(sim.entities, m.from) === sideOf(sim.entities, sim.me)) sim.events.push({ ...m });
    return;
  }
  if (m.type === 'spawn') spawnEntity(sim.world, sim.entities, m);
  // This client's own claim is back: the fold decides now, whether it accepts the claim or not.
  const settled = m.type === 'claim' && m.from === sim.me && sim.inFlight.delete(m.id);
  const accepted = fold(sim.ownership, m, sim.entities);
  if (!accepted && !settled) return;
  setBodyTypes(sim);
  if (!accepted) return;
  if (m.type === 'hit') sim.events.push({ type: 'hit', dog: m.dog, from: m.from });
  if (m.type !== 'claim' && m.type !== 'release') return;
  const moving = m.type === 'release' && Math.hypot(m.v.x, m.v.y, m.v.z) > 0;
  if (m.type === 'release' || m.hold) sim.events.push({ type: m.type === 'claim' ? 'grab' : moving ? 'throw' : 'drop', id: m.id, from: m.from });
  const e = sim.entities.get(m.id);
  // The carrier's clock of the wiggle-free starts when its hold on a cat is accepted.
  if (m.type === 'claim' && m.hold && m.from === sim.me && e?.kind === 'cat') sim.grabbedAt = sim.time;
  if (m.type !== 'release' || !e) return;
  // The release carries the handoff state, so the new owner continues the throw or the drop without a gap:
  // a tossed character flies as a leap from the carrier's hands.
  if (simulatedHere(sim, e)) {
    e.body.setTranslation(m.p, true);
    e.body.setRotation(m.q, true);
    e.body.setLinvel(m.v, true);
    if (isCharacter(e.kind)) sim.leap = { ...m.v };
  }
  // "Thrown" is this client's own fact: a prop it released with a velocity (ADR 0009's hit).
  if (m.from === sim.me && !isCharacter(e.kind) && moving) sim.thrown.set(m.id, sim.time);
}
