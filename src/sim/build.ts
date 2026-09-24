import RAPIER from '@dimforge/rapier3d-compat';
import type { Collider, RigidBody, Vector, World } from '@dimforge/rapier3d-compat';
import type { Level, Point, Volume } from '../content/level.ts';
import { GROUPS, halfHeight, propCollider, type Body, type Kind } from './entities.ts';
import type { Side } from './messages.ts';
import type { Sim } from './world.ts';

const DOOR_MASS = 10; // kg: a panel a character's push swings
const DOOR_CLEARANCE = 0.02; // m the panel keeps off the floor and off the jambs it hangs between

// What a content level becomes in the world (ADR 0008). Statics are fixed colliders; a `dogs` blocker is
// met by dog bodies only. Volumes are sensors on one fixed body, in the level's order, so a volume's
// index names it. Debris is a local dynamic body on every client, never an entity. A door is its panel
// on a vertical hinge, a local body on every client: fixed while shut, swung by whoever pushes it once
// open (the round's rule, card 41). Every exit
// also gets a cats blocker, a solid of its box that only cats meet, off until the round says prep. The
// kennel's gate (`latch`) is a static whose groups the round sets: all while shut, dogs only while open.
export type Built = { volumes: Collider[]; exits: Collider[]; gates: Collider[]; debris: { prop: number; body: RigidBody }[]; doors: RigidBody[] };

export function build(world: World, level: Level): Built {
  const gates: Collider[] = [];
  for (const { p, half, blocks } of level.statics) {
    const c = world.createCollider(RAPIER.ColliderDesc.cuboid(half.x, half.y, half.z).setTranslation(p.x, p.y, p.z));
    if (blocks === 'dogs') c.setCollisionGroups(GROUPS.dogsBlocker);
    if (blocks === 'latch') gates.push(c);
  }
  const fixed = world.createRigidBody(RAPIER.RigidBodyDesc.fixed());
  const volumes = level.volumes.map(({ p, half }) =>
    world.createCollider(RAPIER.ColliderDesc.cuboid(half.x, half.y, half.z).setTranslation(p.x, p.y, p.z).setSensor(true), fixed),
  );
  const exits = level.volumes.flatMap(({ role, p, half }) => {
    if (role !== 'exit') return [];
    const desc = RAPIER.ColliderDesc.cuboid(half.x, half.y, half.z).setTranslation(p.x, p.y, p.z);
    return [world.createCollider(desc.setCollisionGroups(GROUPS.catsBlocker).setEnabled(false), fixed)];
  });
  const debris = level.props.flatMap((prop, i) => {
    if (prop.synced) return [];
    const body = world.createRigidBody(RAPIER.RigidBodyDesc.dynamic().setTranslation(prop.p.x, prop.p.y, prop.p.z));
    world.createCollider(propCollider(prop), body);
    return [{ prop: i, body }];
  });
  const doors = level.doors.map(({ panel: { p, half }, hinge }) => {
    const body = world.createRigidBody(RAPIER.RigidBodyDesc.fixed().setTranslation(p.x, p.y, p.z).setAngularDamping(2));
    const [hx, hz] = half.x > half.z ? [half.x - DOOR_CLEARANCE, half.z] : [half.x, half.z - DOOR_CLEARANCE];
    const desc = RAPIER.ColliderDesc.cuboid(hx, half.y - DOOR_CLEARANCE, hz).setTranslation(0, DOOR_CLEARANCE, 0);
    world.createCollider(desc.setMass(DOOR_MASS).setCollisionGroups(GROUPS.body), body);
    const local = { x: hinge.x - p.x, y: hinge.y - p.y, z: hinge.z - p.z };
    world.createImpulseJoint(RAPIER.JointData.revolute(hinge, local, { x: 0, y: 1, z: 0 }), fixed, body, true);
    return body;
  });
  return { volumes, exits, gates, debris, doors };
}

// A point's body: lifted by the kind's own half height, facing the point's yaw.
function onPoint(pt: Point, kind: Kind): Pick<Body, 'p' | 'q'> {
  return { p: { x: pt.p.x, y: pt.p.y + halfHeight(kind), z: pt.p.z }, q: { x: 0, y: Math.sin(pt.yaw / 2), z: 0, w: Math.cos(pt.yaw / 2) } };
}

// What the host spawns for a level: its synced props, a fish at every `fish` point, a trap, no one's
// yet, at every `trapPickup` point and a mystery bag at every `bag` point.
export function levelBodies(level: Level): Body[] {
  return [
    ...level.props.flatMap((prop, i) => (prop.synced ? [{ kind: 'prop' as const, p: prop.p, prop: i }] : [])),
    ...level.points.filter((pt) => pt.role === 'fish').map((pt) => ({ kind: 'fish' as const, ...onPoint(pt, 'fish') })),
    ...level.points.filter((pt) => pt.role === 'trapPickup').map((pt) => ({ kind: 'trap' as const, ...onPoint(pt, 'trap') })),
    ...level.points.filter((pt) => pt.role === 'bag').map((pt) => ({ kind: 'bag' as const, ...onPoint(pt, 'bag') })),
  ];
}

// Where a body of `kind` stands on the `n`-th point of `role`, round the list.
export function pointFor(level: Level, role: Point['role'], kind: Kind, n = 0): Vector | undefined {
  const points = level.points.filter((pt) => pt.role === role);
  const pt = points[n % points.length];
  return pt && onPoint(pt, kind).p;
}

// The `n`-th spawn point of a side: where that side's character stands at the start.
export function spawnPoint(level: Level, side: Side, n: number): Vector | undefined {
  return pointFor(level, side === 'cat' ? 'catSpawn' : 'dogSpawn', side, n);
}

// The index of the first volume of `role` that holds `p`, or -1.
export function volumeAt(sim: Sim, role: Volume['role'], p: Vector): number {
  return sim.level.volumes.findIndex((v, i) => v.role === role && sim.volumes[i]!.containsPoint(p));
}
