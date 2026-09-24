import type { Rotation } from '@dimforge/rapier3d-compat';
import type { Entity } from './entities.ts';
import { simulatedHere } from './ownership.ts';
import type { Sim } from './world.ts';

// A player's input for one step; `move` is a world-space direction, length up to 1.
export type Intent = { move: { x: number; z: number }; sprint: boolean; jump: boolean };
export const IDLE: Intent = { move: { x: 0, z: 0 }, sprint: false, jump: false };

export const WALK_SPEED = 4;
export const SPRINT_SPEED = 7;
const JUMP_SPEED = 5;
// 720 deg/s. Rapier silently clamps angular velocity at 15 pi rad/s (45 deg per step at 60 Hz), so a
// faster turn leaves the body short of what `drive` set, and a carried crate 0.77 m off its anchor.
const TURN_SPEED = 4 * Math.PI;

// The character this client drives: its own, while the fold leaves it here and nobody carries it.
export function myCharacter(sim: Sim): Entity | undefined {
  for (const e of sim.entities.values()) if (e.kind === 'character' && simulatedHere(sim, e)) return e;
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
  const v = c.body.linvel();
  const grounded = sim.controller.computedGrounded();
  const len = Math.hypot(intent.move.x, intent.move.z);
  const k = (intent.sprint ? SPRINT_SPEED : WALK_SPEED) / Math.max(len, 1);
  const vx = grounded ? intent.move.x * k : v.x;
  const vz = grounded ? intent.move.z * k : v.z;
  // A grounded character never presses into the floor: the controller stops on that contact instead of
  // sliding (5 of 120 sprint steps lost, 3.7 % of the distance); snap-to-ground keeps it on the floor.
  const vy = grounded ? (intent.jump ? JUMP_SPEED : 0) : v.y + sim.world.gravity.y * dt;
  sim.controller.computeColliderMovement(c.body.collider(0), { x: vx * dt, y: vy * dt, z: vz * dt });
  const m = sim.controller.computedMovement();
  c.body.setLinvel({ x: m.x / dt, y: m.y / dt, z: m.z / dt }, true);
  const turn = len > 0 ? Math.atan2(intent.move.x, intent.move.z) - yawOf(c.body.rotation()) : 0;
  const w = Math.atan2(Math.sin(turn), Math.cos(turn)) / dt;
  c.body.setAngvel({ x: 0, y: Math.max(-TURN_SPEED, Math.min(TURN_SPEED, w)), z: 0 }, true);
}
