import RAPIER from '@dimforge/rapier3d-compat';
import type { Collider, KinematicCharacterController, World } from '@dimforge/rapier3d-compat';
import type { ClientId, Entities, NetId } from './entities.ts';
import type { Level } from './level.ts';
import { carry } from './grab.ts';
import { drive, IDLE, myCharacter, type Intent } from './movement.ts';
import type { Claim } from './messages.ts';
import { newOwnershipTable, type OwnershipTable } from './ownership.ts';
import { touchClaims } from './touch.ts';

export const STEP = 1 / 60;
const GRAVITY = 9.81;

export type Sim = {
  me: ClientId; // the client this sim runs on
  world: World;
  controller: KinematicCharacterController; // drives this client's own character
  entities: Entities;
  ownership: OwnershipTable;
  accumulator: number; // seconds of passed-in time not yet stepped
  time: number; // seconds stepped: the clock of the touch-claim limit
  inFlight: Set<NetId>; // props this client claimed or grabbed whose claim has not come back yet
  touchedAt: Map<NetId, number>; // when this client last produced a touch claim for a prop
  climbs: Collider[]; // the level's climb volumes, sensors
  leap: { x: number; y: number; z: number } | null; // the own character's velocity since its take-off, while airborne
};

export async function init(): Promise<void> {
  await RAPIER.init();
}

export function createWorld(level: Level, me: ClientId): Sim {
  const world = new RAPIER.World({ x: 0, y: -GRAVITY, z: 0 });
  world.timestep = STEP;
  const h = level.halfSize;
  const wall = level.wallHeight / 2;
  world.createCollider(RAPIER.ColliderDesc.cuboid(h, 0.5, h).setTranslation(0, -0.5, 0));
  for (const [x, z, hx, hz] of [
    [h, 0, 0.25, h],
    [-h, 0, 0.25, h],
    [0, h, h, 0.25],
    [0, -h, h, 0.25],
  ] as const) {
    world.createCollider(RAPIER.ColliderDesc.cuboid(hx, wall, hz).setTranslation(x, wall, z));
  }
  const climbs = (level.climbs ?? []).map(({ p, half }) =>
    world.createCollider(RAPIER.ColliderDesc.cuboid(half.x, half.y, half.z).setTranslation(p.x, p.y, p.z).setSensor(true)),
  );
  const controller = world.createCharacterController(0.01);
  controller.setApplyImpulsesToDynamicBodies(true);
  controller.enableSnapToGround(0.1); // keeps a grounded character on the floor (see drive)
  return {
    me,
    world,
    controller,
    entities: new Map(),
    ownership: newOwnershipTable(),
    accumulator: 0,
    time: 0,
    inFlight: new Set(),
    touchedAt: new Map(),
    climbs,
    leap: null,
  };
}

// Advances the sim by `dt` seconds of passed-in time in fixed 60 Hz steps; the sim never reads a clock.
// `intent` is this client's player input, held for every step of the call. Returns the touch claims
// the steps produced, for the caller to send.
export function step(sim: Sim, dt: number, intent: Intent = IDLE): Claim[] {
  const claims: Claim[] = [];
  sim.accumulator += dt;
  while (sim.accumulator >= STEP) {
    sim.accumulator -= STEP;
    sim.time += STEP;
    const c = myCharacter(sim);
    if (c) drive(sim, c, intent);
    carry(sim);
    sim.world.step();
    claims.push(...touchClaims(sim));
  }
  return claims;
}
