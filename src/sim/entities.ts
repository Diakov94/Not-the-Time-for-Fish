import RAPIER from '@dimforge/rapier3d-compat';
import type { Collider, ColliderDesc, RigidBody } from '@dimforge/rapier3d-compat';
import type { Prop } from '../content/level.ts';
import { IMPACT } from './events.ts';
import type { Spawn } from './messages.ts';
import type { Sim } from './world.ts';

export type NetId = string; // `<client id>:<counter>` (ADR 0006)
export type ClientId = string;
// ADR 0009: a character's side is its kind, `cat` or `dog`; the rest are the game's props.
export type Kind = 'cat' | 'dog' | 'fish' | 'mine' | 'trap' | 'bag' | 'lure' | 'prop';

// The one owner of identity (ADR 0004). The pose and velocity live in `body`, never here.
export type Entity = {
  id: NetId;
  kind: Kind;
  home: ClientId | null; // its player's client for a character, none for a prop
  prop?: number; // a content prop's index in the level's props: its shape, mass and label (ADR 0008)
  body: RigidBody;
};

export type Entities = Map<NetId, Entity>;

export function isCharacter(kind: Kind): boolean {
  return kind === 'cat' || kind === 'dog';
}

// ADR 0009: mines and traps are never held or pushed. Each is a fixed sensor where it was put: characters
// walk over it, and the client that simulates a character finds it with a query of its own.
export function isFixture(kind: Kind): boolean {
  return kind === 'mine' || kind === 'trap';
}

export const CRATE_HALF = 0.5; // a prop content does not describe: a test's crate, 1 kg

// Collision groups, Rapier's `memberships << 16 | filter`. A blocker belongs to its own group only and
// meets a body whose filter lets it in: a `dogs` blocker only dog bodies, a cats blocker only cats.
const ALL = 0xffff;
const DOGS_BLOCKER = 0x1;
const CATS_BLOCKER = 0x2;
const groups = (memberships: number, filter: number) => ((memberships << 16) | filter) >>> 0;
export const GROUPS = {
  all: groups(ALL, ALL), // Rapier's default: a static meets everyone
  dogsBlocker: groups(DOGS_BLOCKER, ALL),
  catsBlocker: groups(CATS_BLOCKER, ALL),
  dog: groups(ALL, ALL & ~CATS_BLOCKER),
  cat: groups(ALL, ALL & ~DOGS_BLOCKER),
  body: groups(ALL, ALL & ~(DOGS_BLOCKER | CATS_BLOCKER)), // everything else passes both
};

// A content prop's collider: its shape and mass (ADR 0008: content is self-describing).
export function propCollider(prop: Prop): ColliderDesc {
  const { shape } = prop;
  const desc = 'ball' in shape ? RAPIER.ColliderDesc.ball(shape.ball) : RAPIER.ColliderDesc.cuboid(shape.box.x, shape.box.y, shape.box.z);
  return desc.setMass(prop.mass).setCollisionGroups(GROUPS.body);
}

// Every kind's body. A character is a capsule its player drives: a cat 0.5 m wide and 0.9 m tall, a dog
// 0.8 m wide and 1.4 m tall, so a gap between the two widths is a cat route (card 19 sizes its gaps to
// these). A fixture is a fixed sensor; everything else is a dynamic prop. Bags and lures are
// placeholders until their card (42); a `prop` takes its body from content.
const COLLIDER: Record<Kind, () => ColliderDesc> = {
  cat: () => RAPIER.ColliderDesc.capsule(0.2, 0.25),
  dog: () => RAPIER.ColliderDesc.capsule(0.3, 0.4),
  fish: () => RAPIER.ColliderDesc.cuboid(0.1, 0.08, 0.3).setMass(1),
  mine: () => RAPIER.ColliderDesc.cuboid(0.25, 0.05, 0.25).setMass(2),
  trap: () => RAPIER.ColliderDesc.cuboid(0.15, 0.1, 0.15).setMass(1),
  bag: () => RAPIER.ColliderDesc.ball(0.25).setMass(1),
  lure: () => RAPIER.ColliderDesc.ball(0.12).setMass(0.3),
  prop: () => RAPIER.ColliderDesc.cuboid(CRATE_HALF, CRATE_HALF, CRATE_HALF),
};

// How far a kind's body reaches below its centre: a body spawned on a content point is lifted by it.
export function halfHeight(kind: Kind): number {
  const shape = COLLIDER[kind]().shape as { halfExtents?: { y: number }; halfHeight?: number; radius?: number };
  return shape.halfExtents?.y ?? (shape.halfHeight ?? 0) + (shape.radius ?? 0);
}

// A body to spawn, before it has an id; `spawnOf` gives it the next of this client's net ids.
export type Body = Pick<Spawn, 'kind' | 'p' | 'q' | 'prop'>;
export function spawnOf(sim: Sim, b: Body): Spawn {
  return { type: 'spawn', from: sim.me, id: `${sim.me}:${sim.spawned++}`, home: isCharacter(b.kind) ? sim.me : null, ...b };
}

export function spawnEntity(sim: Sim, s: Spawn): Entity {
  const { world } = sim;
  const desc = isCharacter(s.kind)
    ? RAPIER.RigidBodyDesc.kinematicVelocityBased()
    : isFixture(s.kind)
      ? RAPIER.RigidBodyDesc.fixed()
      : RAPIER.RigidBodyDesc.dynamic();
  const body = world.createRigidBody(desc.setTranslation(s.p.x, s.p.y, s.p.z).setRotation(s.q ?? { x: 0, y: 0, z: 0, w: 1 }));
  if (isFixture(s.kind)) body.sleep(); // at rest from the start: its owner sends its pose once (ADR 0006)
  const prop = s.prop === undefined ? undefined : sim.level.props[s.prop];
  const kindGroups = s.kind === 'dog' ? GROUPS.dog : s.kind === 'cat' ? GROUPS.cat : GROUPS.body;
  const collider = world.createCollider(prop ? propCollider(prop) : COLLIDER[s.kind]().setCollisionGroups(kindGroups).setSensor(isFixture(s.kind)), body);
  // Contacts that press above IMPACT weights are reported: the noise of an impact (ADR 0010).
  collider.setActiveEvents(RAPIER.ActiveEvents.CONTACT_FORCE_EVENTS);
  collider.setContactForceEventThreshold(IMPACT * collider.mass() * -world.gravity.y);
  const e: Entity = { id: s.id, kind: s.kind, home: s.home, ...(s.prop !== undefined && { prop: s.prop }), body };
  sim.entities.set(e.id, e);
  return e;
}

// The entity whose body a collider belongs to; none for the level's statics.
export function entityOf(entities: Entities, c: Collider | null | undefined): Entity | undefined {
  const b = c?.parent();
  for (const e of entities.values()) if (b && e.body.handle === b.handle) return e;
  return undefined;
}
