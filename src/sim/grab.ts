import RAPIER from '@dimforge/rapier3d-compat';
import type { Capsule, Collider, Vector } from '@dimforge/rapier3d-compat';
import { entityOf, isCharacter, type Kind } from './entities.ts';
import type { Claim, Release } from './messages.ts';
import { myCharacter, yawOf } from './movement.ts';
import { carried, mayHold, setBodyTypes, simulatedHere } from './ownership.ts';
import type { Sim } from './world.ts';

const REACH = 1.5; // the forward shape cast travels at most this far
const PROBE_RADIUS = 0.25;
const FEET = 0.05; // the probe stays this far above the character's feet, clear of the floor
const HAND = 1; // the anchor is this far ahead of the carrier's centre (a capsule 0.25-0.4 + crate 0.5 + a gap)
const LIFT = 0.3; // and this far above it
const THROW_PITCH = (5 * Math.PI) / 180; // a 6 m/s throw touches down 3.55 m from the thrower

// How a kind is held and thrown, where it differs from the Prototype's crate: `hand` m ahead of the
// carrier's centre, thrown at `speed` m/s. A fish is held close and tossed ~3 m (GAME.md: between cats,
// over a sofa, never the fence).
type Held = { hand: number; speed: number };
const CRATE: Held = { hand: HAND, speed: 6 };
const HELD: Partial<Record<Kind, Held>> = { fish: { hand: 0.7, speed: 5.5 } };
const heldAs = (kind: Kind): Held => HELD[kind] ?? CRATE;

// Where a carrier at `p` facing `yaw` holds what it carries.
export function anchor(p: Vector, yaw: number, hand = HAND): Vector {
  return { x: p.x + Math.sin(yaw) * hand, y: p.y + LIFT, z: p.z + Math.cos(yaw) * hand };
}

// A grab never takes anything by itself: it turns the first entity a forward shape cast meets into a
// hold claim for the relay, and the fold decides when the claim comes back. A grabbed prop is simulated
// here until then, as a touched one is. The side rule applies before the cast (ADR 0009): what this
// character may not hold is not there for it, so a claim the fold would refuse is never made.
export function grab(sim: Sim): Claim | null {
  const c = myCharacter(sim);
  if (!c || carried(sim)) return null;
  const yaw = yawOf(c.body.rotation());
  const holdable = (col: Collider) => {
    const e = entityOf(sim.entities, col);
    return !e || mayHold(c.kind, e.kind);
  };
  // The probe is as tall as the character from just above its feet, so a fish on the floor is in reach.
  const body = c.body.collider(0).shape as Capsule;
  const p = c.body.translation();
  const hit = sim.world.castShape(
    { x: p.x, y: p.y + FEET / 2, z: p.z },
    { x: 0, y: 0, z: 0, w: 1 },
    { x: Math.sin(yaw), y: 0, z: Math.cos(yaw) },
    new RAPIER.Capsule(Math.max(0, body.halfHeight + body.radius - PROBE_RADIUS - FEET / 2), PROBE_RADIUS),
    0,
    REACH,
    true,
    RAPIER.QueryFilterFlags.EXCLUDE_SENSORS,
    undefined,
    undefined,
    c.body,
    holdable,
  );
  const e = entityOf(sim.entities, hit?.collider);
  if (!e) return null;
  if (!isCharacter(e.kind) && !simulatedHere(sim, e)) {
    sim.inFlight.add(e.id);
    setBodyTypes(sim);
  }
  return { type: 'claim', from: sim.me, id: e.id, hold: true };
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
  const next = { x: p.x + v.x * dt, y: p.y + v.y * dt, z: p.z + v.z * dt };
  held.body.setNextKinematicTranslation(anchor(next, yaw, heldAs(held.kind).hand));
  held.body.setNextKinematicRotation({ x: 0, y: Math.sin(yaw / 2), z: 0, w: Math.cos(yaw / 2) });
}

// A throw is a release with a velocity, the held kind's speed forward and slightly up; the fold hands
// the entity over when the release comes back, and the new owner starts from its pose and velocity.
export function throwCarried(sim: Sim): Release | null {
  const held = carried(sim);
  const c = myCharacter(sim);
  if (!held || !c) return null;
  const yaw = yawOf(c.body.rotation());
  const { speed } = heldAs(held.kind);
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
