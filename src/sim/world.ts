import RAPIER from '@dimforge/rapier3d-compat';
import type { World } from '@dimforge/rapier3d-compat';
import type { Entities } from './entities.ts';
import type { Level } from './level.ts';

export const STEP = 1 / 60;
const GRAVITY = 9.81;

export type Sim = {
  world: World;
  entities: Entities;
  accumulator: number; // seconds of passed-in time not yet stepped
};

export async function init(): Promise<void> {
  await RAPIER.init();
}

export function createWorld(level: Level): Sim {
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
  return { world, entities: new Map(), accumulator: 0 };
}

// Advances the sim by `dt` seconds of passed-in time in fixed 60 Hz steps; the sim never reads a clock.
export function step(sim: Sim, dt: number): void {
  sim.accumulator += dt;
  while (sim.accumulator >= STEP) {
    sim.accumulator -= STEP;
    sim.world.step();
  }
}
