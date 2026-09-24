import RAPIER from '@dimforge/rapier3d-compat';
import type { Collider, ColliderDesc, RigidBody, World } from '@dimforge/rapier3d-compat';
import { CRATE_HALF } from './level.ts';
import type { Spawn } from './messages.ts';

export type NetId = string; // `<client id>:<counter>` (ADR 0006)
export type ClientId = string;
// ADR 0009: a character's side is its kind, `cat` or `dog`; the rest are the game's props.
export type Kind = 'cat' | 'dog' | 'fish' | 'mine' | 'trap' | 'bag' | 'lure' | 'prop';

// The one owner of identity (ADR 0004). The pose and velocity live in `body`, never here.
export type Entity = {
  id: NetId;
  kind: Kind;
  home: ClientId | null; // its player's client for a character, none for a prop
  body: RigidBody;
};

export type Entities = Map<NetId, Entity>;

export function isCharacter(kind: Kind): boolean {
  return kind === 'cat' || kind === 'dog';
}

// Every kind's body. A character is a capsule its player drives: a cat 0.5 m wide and 0.9 m tall, a dog
// 0.8 m wide and 1.4 m tall, so a gap between the two widths is a cat route (card 19 sizes its gaps to
// these). Everything else is a dynamic prop. Mines, traps, bags and lures are placeholders until their
// cards (39, 40, 42), and a `prop` is the Prototype's crate until content gives props shapes (card 26).
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

export function spawnEntity(world: World, entities: Entities, s: Spawn): Entity {
  const body = world.createRigidBody(
    (isCharacter(s.kind) ? RAPIER.RigidBodyDesc.kinematicVelocityBased() : RAPIER.RigidBodyDesc.dynamic()).setTranslation(
      s.p.x,
      s.p.y,
      s.p.z,
    ),
  );
  world.createCollider(COLLIDER[s.kind](), body);
  const e: Entity = { id: s.id, kind: s.kind, home: s.home, body };
  entities.set(e.id, e);
  return e;
}

// The entity whose body a collider belongs to; none for the level's statics.
export function entityOf(entities: Entities, c: Collider | null | undefined): Entity | undefined {
  const b = c?.parent();
  for (const e of entities.values()) if (b && e.body.handle === b.handle) return e;
  return undefined;
}
