import RAPIER from '@dimforge/rapier3d-compat';
import type { KinematicCharacterController, World } from '@dimforge/rapier3d-compat';
import type { ClientId, Entities } from './entities.ts';
import type { Level } from './level.ts';
import { carry } from './grab.ts';
import { drive, IDLE, myCharacter, type Intent } from './movement.ts';
import { newOwnershipTable, type OwnershipTable } from './ownership.ts';

export const STEP = 1 / 60;
const GRAVITY = 9.81;

export type Sim = {
  me: ClientId; // the client this sim runs on
  world: World;
  controller: KinematicCharacterController; // drives this client's own character
  entities: Entities;
  ownership: OwnershipTable;
  accumulator: number; // seconds of passed-in time not yet stepped
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
  const controller = world.createCharacterController(0.01);
  controller.setApplyImpulsesToDynamicBodies(true);
  controller.enableSnapToGround(0.1); // keeps a grounded character on the floor (see drive)
  return { me, world, controller, entities: new Map(), ownership: newOwnershipTable(), accumulator: 0 };
}

// Advances the sim by `dt` seconds of passed-in time in fixed 60 Hz steps; the sim never reads a clock.
// `intent` is this client's player input, held for every step of the call.
export function step(sim: Sim, dt: number, intent: Intent = IDLE): void {
  sim.accumulator += dt;
  while (sim.accumulator >= STEP) {
    sim.accumulator -= STEP;
    const c = myCharacter(sim);
    if (c) drive(sim, c, intent);
    carry(sim);
    sim.world.step();
  }
}
