import RAPIER from '@dimforge/rapier3d-compat';
import type { Vector } from '@dimforge/rapier3d-compat';
import { myCharacter, yawOf } from './movement.ts';
import { carried, type Claim, type Release } from './ownership.ts';
import type { Sim } from './world.ts';

const REACH = 1.5; // the forward shape cast travels at most this far
const PROBE_RADIUS = 0.25;
const HAND = 1; // the anchor is this far ahead of the carrier's centre (capsule 0.35 + crate 0.5 + a gap)
const LIFT = 0.3; // and this far above it
const THROW_PITCH = (5 * Math.PI) / 180; // a 6 m/s throw touches down 3.55 m from the thrower

// Where a carrier at `p` facing `yaw` holds what it carries.
export function anchor(p: Vector, yaw: number): Vector {
  return { x: p.x + Math.sin(yaw) * HAND, y: p.y + LIFT, z: p.z + Math.cos(yaw) * HAND };
}

// A grab never takes anything by itself: it turns the first entity a forward shape cast meets into a
// hold claim for the relay, and the fold decides when the claim comes back.
export function grab(sim: Sim): Claim | null {
  const c = myCharacter(sim);
  if (!c || carried(sim)) return null;
  const yaw = yawOf(c.body.rotation());
  const hit = sim.world.castShape(
    c.body.translation(),
    { x: 0, y: 0, z: 0, w: 1 },
    { x: Math.sin(yaw), y: 0, z: Math.cos(yaw) },
    new RAPIER.Ball(PROBE_RADIUS),
    0,
    REACH,
    true,
    undefined,
    undefined,
    undefined,
    c.body,
  );
  const body = hit?.collider.parent();
  for (const e of sim.entities.values()) {
    if (body && e.body.handle === body.handle) return { type: 'claim', from: sim.me, id: e.id, hold: true };
  }
  return null;
}

// Runs every fixed step after the carrier moved: the carried entity is a kinematic follower sent to
// the anchor of the pose the carrier reaches in this step, so it is never a step behind.
export function carry(sim: Sim): void {
  const held = carried(sim);
  const c = myCharacter(sim);
  if (!held || !c) return;
  const dt = sim.world.timestep;
  const p = c.body.translation();
  const v = c.body.linvel();
  const yaw = yawOf(c.body.rotation()) + c.body.angvel().y * dt;
  held.body.setNextKinematicTranslation(anchor({ x: p.x + v.x * dt, y: p.y + v.y * dt, z: p.z + v.z * dt }, yaw));
  held.body.setNextKinematicRotation({ x: 0, y: Math.sin(yaw / 2), z: 0, w: Math.cos(yaw / 2) });
}

// A throw is a release with a velocity, `speed` m/s forward and slightly up; the fold hands the
// entity over when the release comes back, and the new owner starts from its pose and velocity.
export function throwCarried(sim: Sim, speed: number): Release | null {
  const held = carried(sim);
  const c = myCharacter(sim);
  if (!held || !c) return null;
  const yaw = yawOf(c.body.rotation());
  const ahead = Math.cos(THROW_PITCH) * speed;
  return {
    type: 'release',
    from: sim.me,
    id: held.id,
    p: held.body.translation(),
    q: held.body.rotation(),
    v: { x: Math.sin(yaw) * ahead, y: Math.sin(THROW_PITCH) * speed, z: Math.cos(yaw) * ahead },
  };
}
