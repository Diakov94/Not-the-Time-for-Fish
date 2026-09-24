import RAPIER from '@dimforge/rapier3d-compat';
import type { Capsule, Collider, Rotation } from '@dimforge/rapier3d-compat';
import { volumeAt } from './build.ts';
import { isCharacter, type Entity } from './entities.ts';
import { carried, simulatedHere } from './ownership.ts';
import type { Sim } from './world.ts';

// A player's input for one step; `move` is a world-space direction, length up to 1. `jump` held inside
// a climb volume climbs; `sneak` is the cats' toggle, held here as its current state; `sniff` is the
// dogs' held action and `defuse` the cats' (E held, card 49).
export type Intent = { move: { x: number; z: number }; sprint: boolean; jump: boolean; sneak?: boolean; sniff?: boolean; defuse?: boolean };
export const IDLE: Intent = { move: { x: 0, z: 0 }, sprint: false, jump: false };

// The one table of speeds, m/s, per side (GAME.md, Movement asymmetry): dogs are faster on open ground,
// cats sneak, jump and climb, only dogs lunge. A carrying character moves at `carry` at most; `sneak` is
// null for a side that does not sneak, and a zero `jump`, `climb` or `lunge` is a move it does not have.
// `push` is the mass, kg, a character shoves props with: a dog barges a 20 kg barricade and a door out
// of its way, a cat moves light props only.
export const SPEED = {
  cat: { walk: 4, sprint: 6, sneak: 1.6, carry: 4.2, jump: 4.6, climb: 1.5, lunge: 0, push: 0.1 },
  dog: { walk: 4, sprint: 9, sneak: null, carry: 2, jump: 0, climb: 0, lunge: 7.5, push: 100 },
};
export const speedsOf = (c: Entity) => SPEED[c.kind === 'dog' ? 'dog' : 'cat'];
// 720 deg/s. Rapier silently clamps angular velocity at 15 pi rad/s (45 deg per step at 60 Hz), so a
// faster turn leaves the body short of what `drive` set, and a carried crate 0.77 m off its anchor.
const TURN_SPEED = 4 * Math.PI;

// Whether there is something under the character's centre. The controller counts any contact within a
// few cm as ground, a wall's top edge beside the capsule included, and a grounded character is held at
// no vertical speed: a cat tossed past the kennel's edge hovered there.
function footing(sim: Sim, c: Entity): boolean {
  const s = c.body.collider(0).shape as Capsule;
  const down = new RAPIER.Ray(c.body.translation(), { x: 0, y: -1, z: 0 });
  const reach = s.halfHeight + s.radius + 0.1;
  const groups = c.body.collider(0).collisionGroups(); // a blocker this character passes is no footing
  return sim.world.castRay(down, reach, true, RAPIER.QueryFilterFlags.EXCLUDE_SENSORS, groups, undefined, c.body) !== null;
}

// The character this client drives: its own, while the fold leaves it here and nobody carries it.
export function myCharacter(sim: Sim): Entity | undefined {
  for (const e of sim.entities.values()) if (isCharacter(e.kind) && simulatedHere(sim, e)) return e;
  return undefined;
}

// Rotation about y only: the facing, 0 looking along +z.
export function yawOf(q: Rotation): number {
  return 2 * Math.atan2(q.y, q.w);
}

// The only writer of a driven character's motion: the intent becomes a desired step, Rapier's
// character controller clips it against the world and pushes dynamic bodies with impulses, and the
// result is the body's velocity, which Rapier integrates into the pose. The velocity stays in the body,
// so gravity and a throw's momentum are read back from it on the next step.
export function drive(sim: Sim, c: Entity, intent: Intent): void {
  const dt = sim.world.timestep;
  const s = speedsOf(c);
  const v = c.body.linvel();
  const grounded = !sim.leap && sim.controller.computedGrounded() && footing(sim, c);
  const len = Math.hypot(intent.move.x, intent.move.z);
  const carrying = carried(sim) !== undefined;
  // A dog sniffs while it holds the action and carries nothing, and walks meanwhile.
  sim.sniffing = intent.sniff === true && c.kind === 'dog' && !carrying;
  sim.sneaking = intent.sneak === true && s.sneak !== null;
  let speed = intent.sprint && !sim.sniffing ? s.sprint : s.walk;
  if (intent.sneak && s.sneak !== null) speed = s.sneak;
  if (carrying) speed = Math.min(speed, s.carry);
  const k = speed / Math.max(len, 1);
  const p = c.body.translation();
  const climbing = s.climb > 0 && intent.jump && volumeAt(sim, 'climb', p) >= 0;
  // The mantle: a leap keeps its own velocity while airborne, so a rising character keeps its forward
  // speed against a ledge and steps onto it once its feet clear the top, where the controller's clipped
  // speed would drop it; and the lift the controller gives over a lip moves the pose, never the leap.
  const rising = sim.leap && sim.leap.y > 0 ? sim.leap : null;
  // A lunge is a dash along the facing, whatever the intent.
  const dash = sim.lunge !== null ? yawOf(c.body.rotation()) : null;
  const vx = dash !== null ? Math.sin(dash) * s.lunge : grounded || climbing ? intent.move.x * k : (rising ?? v).x;
  const vz = dash !== null ? Math.cos(dash) * s.lunge : grounded || climbing ? intent.move.z * k : (rising ?? v).z;
  // A grounded character never presses into the floor: the controller stops on that contact instead of
  // sliding (5 of 120 sprint steps lost, 3.7 % of the distance); snap-to-ground keeps it on the floor.
  const takeoff = grounded && !climbing && intent.jump && s.jump > 0;
  const vy = climbing ? s.climb : grounded ? (takeoff ? s.jump : 0) : (sim.leap ?? v).y + sim.world.gravity.y * dt;
  if (takeoff) sim.leap = { x: vx, y: vy, z: vz };
  const body = c.body.collider(0);
  const flags = RAPIER.QueryFilterFlags.EXCLUDE_SENSORS;
  // A dog barges an open door: its movement never stops at the panel, its body shoves it aside. The
  // predicate runs inside Rapier's query, so it reads only handles taken before it.
  const open = new Set(c.kind === 'dog' ? sim.doors.filter((d) => d.isDynamic()).map((d) => d.collider(0).handle) : []);
  const barge = open.size > 0 ? (col: Collider) => !open.has(col.handle) : undefined;
  sim.controller.setCharacterMass(s.push);
  sim.controller.computeColliderMovement(body, { x: vx * dt, y: vy * dt, z: vz * dt }, flags, body.collisionGroups(), barge);
  const m = sim.controller.computedMovement();
  c.body.setLinvel({ x: m.x / dt, y: m.y / dt, z: m.z / dt }, true);
  if (sim.leap) sim.leap.y = Math.min(vy, m.y / dt); // a ceiling stops the rise
  if (climbing || (m.y <= 0 && sim.controller.computedGrounded())) sim.leap = null;
  const turn = len > 0 && dash === null ? Math.atan2(intent.move.x, intent.move.z) - yawOf(c.body.rotation()) : 0;
  const w = Math.atan2(Math.sin(turn), Math.cos(turn)) / dt;
  c.body.setAngvel({ x: 0, y: Math.max(-TURN_SPEED, Math.min(TURN_SPEED, w)), z: 0 }, true);
}
