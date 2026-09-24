import RAPIER from '@dimforge/rapier3d-compat';
import type { RigidBody, Vector, World } from '@dimforge/rapier3d-compat';
import { CRATE_HALF } from './level.ts';

export type NetId = string; // `<client id>:<counter>` (ADR 0006)
export type ClientId = string;
export type Kind = 'character' | 'crate';

// The one owner of identity (ADR 0004). The pose and velocity live in `body`, never here.
export type Entity = {
  id: NetId;
  kind: Kind;
  home: ClientId | null; // its player's client for a character, none for a prop
  body: RigidBody;
};

export type Entities = Map<NetId, Entity>;

export type Spawn = { type: 'spawn'; from: ClientId; id: NetId; kind: Kind; home: ClientId | null; p: Vector };

export const CAPSULE_HALF_HEIGHT = 0.5;
export const CAPSULE_RADIUS = 0.35;

export function spawnEntity(world: World, entities: Entities, s: Spawn): Entity {
  const body = world.createRigidBody(
    (s.kind === 'crate' ? RAPIER.RigidBodyDesc.dynamic() : RAPIER.RigidBodyDesc.kinematicVelocityBased()).setTranslation(
      s.p.x,
      s.p.y,
      s.p.z,
    ),
  );
  world.createCollider(
    s.kind === 'crate'
      ? RAPIER.ColliderDesc.cuboid(CRATE_HALF, CRATE_HALF, CRATE_HALF)
      : RAPIER.ColliderDesc.capsule(CAPSULE_HALF_HEIGHT, CAPSULE_RADIUS),
    body,
  );
  const e: Entity = { id: s.id, kind: s.kind, home: s.home, body };
  entities.set(e.id, e);
  return e;
}
