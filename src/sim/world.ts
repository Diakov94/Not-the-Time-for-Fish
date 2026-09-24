import RAPIER from '@dimforge/rapier3d-compat';
import type { Collider, EventQueue, KinematicCharacterController, World } from '@dimforge/rapier3d-compat';
import type { ClientId, Entities, NetId } from './entities.ts';
import type { Level } from './level.ts';
import { noises, type SimEvent } from './events.ts';
import { carry, grabStep } from './grab.ts';
import { smell, type Scent } from './scent.ts';
import { drive, IDLE, myCharacter, type Intent } from './movement.ts';
import type { SimMessage } from './messages.ts';
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
  lunge: number | null; // when the own dog's dash in progress ends
  lungeReady: number; // when the own dog may lunge again
  grabbedAt: number | null; // when this client's hold on a cat was accepted: the carrier's clock of the wiggle-free
  thrown: Map<NetId, number>; // props this client threw, and when
  events: SimEvent[]; // what happened since the loop last drained it (ADR 0008)
  queue: EventQueue; // the world's contact force reports, drained every step
  impacts: Set<string>; // collider pairs pressing above the impact threshold in the last step
  pinged: Map<NetId, number>; // when a body this client simulates last pinged an impact
  stride: number; // m the own character has walked since its last step ping
  scent: Map<NetId, Scent[]>; // each cat's and lure's trail as this client applied its poses (ADR 0010)
  sniffing: boolean; // the own dog sniffs this step
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
    lunge: null,
    lungeReady: 0,
    grabbedAt: null,
    thrown: new Map(),
    events: [],
    queue: new RAPIER.EventQueue(true),
    impacts: new Set(),
    pinged: new Map(),
    stride: 0,
    scent: new Map(),
    sniffing: false,
  };
}

// Advances the sim by `dt` seconds of passed-in time in fixed 60 Hz steps; the sim never reads a clock.
// `intent` is this client's player input, held for every step of the call. Returns the messages the
// steps produced (a lunge's grab, a wiggle-free, a hit, noise, touch claims), for the caller to send.
export function step(sim: Sim, dt: number, intent: Intent = IDLE): SimMessage[] {
  const out: SimMessage[] = [];
  sim.accumulator += dt;
  while (sim.accumulator >= STEP) {
    sim.accumulator -= STEP;
    sim.time += STEP;
    const c = myCharacter(sim);
    if (c) drive(sim, c, intent);
    carry(sim);
    sim.world.step(sim.queue);
    smell(sim);
    out.push(...grabStep(sim), ...noises(sim, intent), ...touchClaims(sim));
  }
  return out;
}
