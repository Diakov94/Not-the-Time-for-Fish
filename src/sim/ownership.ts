import RAPIER from '@dimforge/rapier3d-compat';
import type { Level } from '../content/level.ts';
import { isCharacter, isFixture, spawnEntity, type ClientId, type Entity, type Kind, type NetId } from './entities.ts';
import type { Blast, Claim, Cleared, Defused, Despawn, Hit, Left, Pickup, Release, SimMessage, Spawn, Sprung } from './messages.ts';
import { blasted } from './mines.ts';
import { barked } from './perks.ts';
import { trapEnded } from './traps.ts';
import { isRound, receiveRound, settle, turned, type RoundMessage } from './round.ts';
import type { Sim } from './world.ts';

// ADR 0006's, 0007's and 0009's messages, in the relay's order.
export type FoldMessage = Spawn | Claim | Release | Left | Hit | Despawn | Blast | Defused | Sprung | Cleared | Pickup;

export type Ownership = { owner: ClientId; held: boolean };

// The one owner of authority. `gone` records the clients the relay announced as left, in its order,
// only so the home rule knows whether a home is still in the room; membership stays the relay's.
export type OwnershipTable = { rows: Map<NetId, Ownership>; gone: Set<ClientId> };

export function newOwnershipTable(): OwnershipTable {
  return { rows: new Map(), gone: new Set() };
}

// The heaviest prop a cat carries, kg (GAME.md, Movement asymmetry: a cat moves light props only). The
// Architect's assumption for the Producer: a chair's 5 kg; a 10 kg crate stays a push.
export const CAT_CARRY = 5;

// ADR 0009: whether a holder may hold a target of `mass` kg. The side rule is written here only: the fold
// rejects a hold claim it refuses, and `grab` never makes one.
export function mayHold(holder: Kind | undefined, target: Kind, mass = 0): boolean {
  if (holder === 'cat') return target === 'fish' || target === 'lure' || (target === 'prop' && mass <= CAT_CARRY);
  return holder === 'dog' && target === 'cat';
}

// What the fold reads of the entity table: identity, never a pose.
export type Identities = ReadonlyMap<NetId, Pick<Entity, 'kind' | 'home' | 'variant' | 'prop'>>;

// An entity's mass as content describes it (ADR 0008), by its prop index; 0 for one content does not
// describe (a test's crate).
export const massOf = (e: Pick<Entity, 'prop'>, level?: Pick<Level, 'props'>): number => (e.prop === undefined ? 0 : (level?.props[e.prop]?.mass ?? 0));

// A client's side: the kind of its character (ADR 0009).
export function sideOf(entities: Identities, client: ClientId): Kind | undefined {
  for (const e of entities.values()) if (e.home === client && isCharacter(e.kind)) return e.kind;
  return undefined;
}

// Folds one message of the relay's order into the table and says whether it was accepted. The table
// depends on nothing but the messages, the entity table's identities and the level's content, so every
// client that folds the same order holds the same table. `host` is the host the relay names as of the
// message: only its `despawn` counts.
export function fold(t: OwnershipTable, m: FoldMessage, entities: Identities, host?: ClientId, level?: Pick<Level, 'props'>): boolean {
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
      if (m.hold ? !mayHold(sideOf(entities, m.from), target.kind, massOf(target, level)) : target.home !== null) return false;
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
    case 'despawn':
      // Only the host removes an entity (ADR 0007): its row goes, and `receive` drops the entity.
      return m.from === host && t.rows.delete(m.id);
    case 'blast':
    case 'defused':
      // A cat stepped on a mine or defused it: the first delivered ends the mine.
      return entities.get(m.id)?.kind === 'mine' && sideOf(entities, m.from) === 'cat' && t.rows.delete(m.id);
    case 'sprung':
    case 'cleared':
    case 'pickup': {
      // A noise maker is set off by its own cat only, a planted slip trap by a dog, the one that stepped on
      // it (card 130); a planted trap is cleared by a dog; a trap no one's yet is picked up by a cat, and a
      // bag by anyone playing. The first delivered ends it.
      const e = entities.get(m.id);
      const side = sideOf(entities, m.from);
      if (m.type === 'pickup' && e?.kind === 'bag') return side !== undefined && t.rows.delete(m.id);
      if (e?.kind !== 'trap') return false;
      const sprung = e.variant === 'slip' ? e.home !== null && side === 'dog' : e.home === m.from;
      const ok = m.type === 'sprung' ? sprung : m.type === 'cleared' ? e.home !== null && side === 'dog' : e.home === null && side === 'cat';
      return ok && t.rows.delete(m.id);
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

// Body types follow the table's decision, on every client at the same message; a fixture stays fixed.
export function setBodyTypes(sim: Sim): void {
  for (const e of sim.entities.values()) {
    if (isFixture(e.kind)) continue;
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
  for (const s of entities) spawnEntity(sim, s);
  sim.ownership = table;
  setBodyTypes(sim);
}

// Every client runs this for every message of the relay's order, its own echoed ones included, with the
// host the relay names as of that message. The round's messages go to the round table (ADR 0007); an
// accepted secure, capture, rescue or dig-out is an event where this client holds the fish or the
// sender's character (card 55); a secured fish leaves play, its entity and its row; the round's own ends
// are checked after every message; `phase prep` clears the entity table and the ownership rows before
// the round respawns.
export function receive(sim: Sim, m: SimMessage | Left, host: ClientId): void {
  const { phase, round } = sim.round;
  const accepted = (m.type === 'left' || isRound(m)) && receiveRound(sim, m, host);
  if (accepted && (m.type === 'secured' || m.type === 'captured' || m.type === 'rescue' || m.type === 'dugOut')) {
    const at = m.type === 'secured' ? sim.entities.get(m.fish) : [...sim.entities.values()].find((e) => e.home === m.from && isCharacter(e.kind));
    if (at) sim.events.push({ type: m.type, p: at.body.translation(), from: m.from });
  }
  if (m.type === 'secured' && accepted) remove(sim, m.fish);
  if (!isRound(m)) apply(sim, m, host);
  settle(sim.round, sim.ownership, sim.entities);
  if (sim.round.phase === phase && sim.round.round === round) return;
  if (sim.round.phase === 'prep') {
    for (const e of sim.entities.values()) sim.world.removeRigidBody(e.body);
    sim.entities.clear();
    sim.ownership.rows.clear();
    sim.inFlight.clear();
    sim.scent.clear();
    [sim.leap, sim.lunge, sim.grabbedAt] = [null, null, null];
  }
  turned(sim, host, m.type === 'left' ? m.id : m.from);
}

// An entity leaves play at the message that ends it, on every client: its body, its identity, its row.
function remove(sim: Sim, id: NetId): void {
  sim.world.removeRigidBody(sim.entities.get(id)!.body);
  sim.entities.delete(id);
  sim.ownership.rows.delete(id);
  sim.inFlight.delete(id);
}

// ADR 0006's and 0010's messages. A noise, a bark and an emote (ADR 0013) are events for everyone; a mark
// only for the marker's side. Every cat's client answers a bark for its own cat. A mine's spawn, or a trap's with a home, is a
// plant where it was put (card 55).
function apply(sim: Sim, m: Exclude<SimMessage, RoundMessage> | Left, host: ClientId): void {
  if (m.type === 'noise' || m.type === 'mark' || m.type === 'bark' || m.type === 'emote') {
    if (m.type !== 'mark' || sideOf(sim.entities, m.from) === sideOf(sim.entities, sim.me)) sim.events.push({ ...m });
    if (m.type === 'bark') barked(sim, m);
    return;
  }
  if (m.type === 'spawn') spawnEntity(sim, m);
  if (m.type === 'spawn' && (m.kind === 'mine' || (m.kind === 'trap' && m.home !== null))) sim.events.push({ type: 'planted', kind: m.kind, id: m.id, p: m.p, from: m.from });
  // This client's own claim is back: the fold decides now, whether it accepts the claim or not.
  const settled = m.type === 'claim' && m.from === sim.me && sim.inFlight.delete(m.id);
  const accepted = fold(sim.ownership, m, sim.entities, host, sim.level);
  // A message that ends an entity takes it out of play; the end of a mine, a trap or a pickup is an event
  // where it lay, of its variant; a blast acts on the bodies this client simulates, a pickup fills its
  // picker's hand.
  const trapEnd = m.type === 'sprung' || m.type === 'cleared' || m.type === 'pickup';
  if (accepted && (m.type === 'despawn' || m.type === 'blast' || m.type === 'defused' || trapEnd)) {
    const { kind, body, variant } = sim.entities.get(m.id)!;
    const p = body.translation();
    remove(sim, m.id);
    if (m.type !== 'despawn') sim.events.push({ type: m.type, id: m.id, p, from: m.from, ...(variant && { variant }) });
    if (m.type === 'blast') blasted(sim, m, p, variant);
    if (trapEnd) trapEnded(sim, m, p, kind, variant);
  }
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
  // A hold on this client's own character names its holder: a capture's `by` (ADR 0014).
  if (m.type === 'claim' && m.hold && e?.home === sim.me && isCharacter(e.kind)) sim.holder = m.from;
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
