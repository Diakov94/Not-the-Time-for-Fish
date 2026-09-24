import RAPIER from '@dimforge/rapier3d-compat';
import type { Capsule, Collider, Vector } from '@dimforge/rapier3d-compat';
import { entityOf, isCharacter, type Entity, type Kind } from './entities.ts';
import type { Claim, Hit, Release, SimMessage } from './messages.ts';
import { myCharacter, speedsOf, yawOf } from './movement.ts';
import { carried, mayHold, setBodyTypes, simulatedHere } from './ownership.ts';
import type { Sim } from './world.ts';

const REACH = 1.5; // the forward shape cast travels at most this far
const PROBE_RADIUS = 0.25;
const FEET = 0.05; // the probe stays this far above the character's feet, clear of the floor
const HAND = 1; // the anchor is this far ahead of the carrier's centre (a capsule 0.25-0.4 + crate 0.5 + a gap)
const LIFT = 0.3; // and this far above it
const THROW_PITCH = (5 * Math.PI) / 180; // a 6 m/s throw touches down 3.55 m from the thrower
const LUNGE_TIME = 0.2; // s of dash at the dog's lunge speed: 1.5 m
const LUNGE_COOLDOWN = 1.5; // s from one lunge to the next
const WIGGLE = 8; // s a grabbed cat stays held, by the carrier's clock
const THROWN = 2; // s a thrown prop counts as thrown

// How a kind is held and thrown, where it differs from the Prototype's crate: `hand` m ahead of the
// carrier's centre, thrown at `speed` m/s and `pitch` above the facing. A fish is held close and tossed
// ~3 m (GAME.md: between cats, over a sofa, never the fence). A dog holds a cat just clear of its own
// capsule, so a cat grabbed at contact (the end of a lunge) moves 0.1 m and never into the fish it drops.
// A cat is tossed as a lob, 83.5 deg at 7.55 m/s: it lands ~2 m from the dog on flat ground, and from
// 0.8-1.2 m beside the kennel its feet rise past the hatch's 2.5 m edge (card 18) and it drops in.
type Held = { hand: number; speed: number; pitch: number };
const CRATE: Held = { hand: HAND, speed: 6, pitch: THROW_PITCH };
const HELD: Partial<Record<Kind, Held>> = {
  fish: { hand: 0.7, speed: 5.5, pitch: THROW_PITCH },
  cat: { hand: 0.75, speed: 7.55, pitch: (83.5 * Math.PI) / 180 },
};
const heldAs = (kind: Kind): Held => HELD[kind] ?? CRATE;
export const handOf = (kind: Kind): number => heldAs(kind).hand;

// Where a carrier at `p` facing `yaw` holds what it carries.
export function anchor(p: Vector, yaw: number, hand = HAND): Vector {
  return { x: p.x + Math.sin(yaw) * hand, y: p.y + LIFT, z: p.z + Math.cos(yaw) * hand };
}

// A grab never takes anything by itself: it turns the first entity a forward shape cast meets into a
// hold claim for the relay, and the fold decides when the claim comes back. A dog lunges first: a short
// dash of its own body, at most once per cooldown, whose end makes the claim (`grabStep`).
export function grab(sim: Sim): Claim | null {
  const c = myCharacter(sim);
  if (!c || carried(sim)) return null;
  if (speedsOf(c).lunge === 0) return reach(sim, c);
  if (sim.lunge === null && sim.time >= sim.lungeReady) {
    sim.lunge = sim.time + LUNGE_TIME;
    sim.lungeReady = sim.time + LUNGE_COOLDOWN;
  }
  return null;
}

// Card 05's grab. A grabbed prop is simulated here until the claim comes back, as a touched one is. The
// side rule applies before the cast (ADR 0009): what this character may not hold is not there for it,
// so a claim the fold would refuse is never made.
function reach(sim: Sim, c: Entity): Claim | null {
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

// A throw is a release with a velocity, the held kind's speed at its pitch above the facing; the fold
// hands the entity over when the release comes back, and the new owner starts from its pose and velocity.
export function throwCarried(sim: Sim): Release | null {
  const held = carried(sim);
  const c = myCharacter(sim);
  if (!held || !c) return null;
  const yaw = yawOf(c.body.rotation());
  const { speed, pitch } = heldAs(held.kind);
  const ahead = Math.cos(pitch) * speed;
  return release(sim, held, { x: Math.sin(yaw) * ahead, y: Math.sin(pitch) * speed, z: Math.cos(yaw) * ahead });
}

function release(sim: Sim, held: Entity, v: Release['v']): Release {
  return { type: 'release', from: sim.me, id: held.id, p: held.body.translation(), q: held.body.rotation(), v };
}

// Every step after the world's: the end of a lunge is card 05's grab; a cat held for WIGGLE by this
// client's clock wiggles free, whatever its own client does; a prop this client threw that meets a dog is
// a hit, once per throw, and a pushed prop never is.
export function grabStep(sim: Sim): SimMessage[] {
  const out: SimMessage[] = [];
  const c = myCharacter(sim);
  if (sim.lunge !== null && sim.time >= sim.lunge - 1e-9) {
    sim.lunge = null;
    const claim = c && !carried(sim) ? reach(sim, c) : null;
    if (claim) out.push(claim);
  }
  const held = carried(sim);
  if (held?.kind === 'cat' && sim.grabbedAt !== null && sim.time - sim.grabbedAt >= WIGGLE - 1e-9) {
    sim.grabbedAt = null;
    out.push(release(sim, held, { x: 0, y: 0, z: 0 }));
  }
  for (const [id, at] of sim.thrown) {
    const e = sim.entities.get(id);
    if (!e || sim.time - at > THROWN || !simulatedHere(sim, e)) {
      sim.thrown.delete(id);
      continue;
    }
    const dog = touching(sim, e, 'dog');
    if (!dog) continue;
    sim.thrown.delete(id);
    out.push({ type: 'hit', from: sim.me, dog: dog.id } satisfies Hit);
  }
  return out;
}

// The first entity of `kind` in contact with `e`'s body.
function touching(sim: Sim, e: Entity, kind: Kind): Entity | undefined {
  let found: Entity | undefined;
  sim.world.contactPairsWith(e.body.collider(0), (other) => {
    const o = entityOf(sim.entities, other);
    if (found || o?.kind !== kind) return;
    sim.world.contactPair(e.body.collider(0), other, (m) => {
      if (m.numContacts() > 0) found = o;
    });
  });
  return found;
}
