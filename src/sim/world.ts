import RAPIER from '@dimforge/rapier3d-compat';
import type { Collider, EventQueue, KinematicCharacterController, RigidBody, Vector, World } from '@dimforge/rapier3d-compat';
import type { Level } from '../content/level.ts';
import { build } from './build.ts';
import type { ClientId, Entities, NetId } from './entities.ts';
import { roundStep } from './heist.ts';
import { noises, type SimEvent } from './events.ts';
import { carry, grabStep } from './grab.ts';
import { mineStep, stunned } from './mines.ts';
import { smell, type Scent } from './scent.ts';
import { drive, IDLE, myCharacter, type Intent } from './movement.ts';
import type { SimMessage } from './messages.ts';
import { newOwnershipTable, type OwnershipTable } from './ownership.ts';
import { clock, newRound, removals, type Round } from './round.ts';
import { touchClaims } from './touch.ts';

export const STEP = 1 / 60;
const GRAVITY = 9.81;

export type Sim = {
  me: ClientId; // the client this sim runs on
  level: Level; // the content level the world is built from (ADR 0008)
  world: World;
  controller: KinematicCharacterController; // drives this client's own character
  entities: Entities;
  ownership: OwnershipTable;
  accumulator: number; // seconds of passed-in time not yet stepped
  time: number; // seconds stepped: the clock of the touch-claim limit
  inFlight: Set<NetId>; // props this client claimed or grabbed whose claim has not come back yet
  touchedAt: Map<NetId, number>; // when this client last produced a touch claim for a prop
  volumes: Collider[]; // the level's volumes as sensors, index for index
  exits: Collider[]; // the exits' cats blockers, on during prep
  gates: Collider[]; // the kennel's gate, open to all but dogs until `gateUntil`
  debris: { prop: number; body: RigidBody }[]; // the level's unsynced props, local bodies with their content prop
  doors: RigidBody[]; // the level's door panels, index for index
  spawned: number; // this client's net id counter: ids are `<client>:<n>`
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
  sneaking: boolean; // the own cat sneaks this step
  round: Round; // ADR 0007's round table
  outbox: SimMessage[]; // what the fold asked this client to send (the host's answers, spawns), for the next step
  phaseAt: number; // this client's time at the fold of the current phase: the start its remaining time counts from
  heistAt: number; // and of the heist: `at` in `secured` counts from it
  called: boolean; // this client, as the host, sent the current phase's successor
  opening: { storage: number; until: number } | null; // the own cat's work at a door storage
  securing: Set<NetId>; // fish this client sent `secured` for
  capturing: boolean; // this client's cat sent `captured` and the table has not answered
  digOut: number | null; // when this client's captured cat digs out, by its own clock
  gateUntil: number; // this client's time the kennel's gate shuts again after a rescue
  away: Map<ClientId, { name: string | null; at: number }>; // who left, as whom, and when by this client's clock
  stunUntil: number; // when this client's cat's stun ends, by its own clock
  used: number; // mines this client's dog planted since its last resupply
  planting: Work | null; // this client's dog's plant in progress
  defusing: (Work & { id: NetId }) | null; // this client's cat's defuse in progress, of mine `id`
  resupplyAt: number | null; // since when this client's dog has stood in the doghouse
  ending: Set<NetId>; // entities this client sent the message that ends them for (a blast, a defuse)
};

// A timed action of the own character: when it started and ends, and where the character stood then.
export type Work = { since: number; until: number; from: Vector };

export async function init(): Promise<void> {
  await RAPIER.init();
}

export function createWorld(level: Level, me: ClientId): Sim {
  const world = new RAPIER.World({ x: 0, y: -GRAVITY, z: 0 });
  world.timestep = STEP;
  const { volumes, exits, gates, debris, doors } = build(world, level);
  const controller = world.createCharacterController(0.01);
  controller.setApplyImpulsesToDynamicBodies(true);
  controller.enableSnapToGround(0.1); // keeps a grounded character on the floor (see drive)
  return {
    me,
    level,
    world,
    controller,
    entities: new Map(),
    ownership: newOwnershipTable(),
    accumulator: 0,
    time: 0,
    inFlight: new Set(),
    touchedAt: new Map(),
    volumes,
    exits,
    gates,
    debris,
    doors,
    spawned: 0,
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
    sneaking: false,
    round: newRound(),
    outbox: [],
    phaseAt: 0,
    heistAt: 0,
    called: false,
    opening: null,
    securing: new Set(),
    capturing: false,
    digOut: null,
    gateUntil: 0,
    away: new Map(),
    stunUntil: 0,
    used: 0,
    planting: null,
    defusing: null,
    resupplyAt: null,
    ending: new Set(),
  };
}

// Advances the sim by `dt` seconds of passed-in time in fixed 60 Hz steps; the sim never reads a clock.
// `intent` is this client's player input, held for every step of the call. Returns the messages the
// steps produced (a lunge's grab, a wiggle-free, a hit, noise, touch claims, the host's clock and
// removals) and the fold's outbox, for the caller to send. `host` is the host the relay names now.
export function step(sim: Sim, dt: number, intent: Intent = IDLE, host?: ClientId): SimMessage[] {
  const out: SimMessage[] = sim.outbox.splice(0);
  sim.accumulator += dt;
  while (sim.accumulator >= STEP) {
    sim.accumulator -= STEP;
    sim.time += STEP;
    const c = myCharacter(sim);
    const act = stunned(sim) ? IDLE : intent; // a stunned cat's intent is not its own
    if (c) drive(sim, c, act);
    carry(sim);
    sim.world.step(sim.queue);
    smell(sim);
    out.push(...grabStep(sim), ...noises(sim, act), ...touchClaims(sim), ...mineStep(sim, act), ...roundStep(sim), ...clock(sim, host), ...removals(sim, host));
  }
  return out;
}
