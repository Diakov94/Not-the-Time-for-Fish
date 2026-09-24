import RAPIER from '@dimforge/rapier3d-compat';
import type { Collider, EventQueue, KinematicCharacterController, RigidBody, Vector, World } from '@dimforge/rapier3d-compat';
import type { Level } from '../content/level.ts';
import { build } from './build.ts';
import type { ClientId, Entities, NetId, Variant } from './entities.ts';
import { roundStep } from './heist.ts';
import { noises, type SimEvent } from './events.ts';
import { carry, grabStep } from './grab.ts';
import { mineStep, stunned } from './mines.ts';
import { smell, type Scent } from './scent.ts';
import { pickups, slips } from './traps.ts';
import { perkStep, type Perk } from './perks.ts';
import { drive, IDLE, myCharacter, type Intent } from './movement.ts';
import type { SimMessage } from './messages.ts';
import { newOwnershipTable, type OwnershipTable } from './ownership.ts';
import { clock, newRound, removals, type Refusal, type Round } from './round.ts';
import { touchClaims } from './touch.ts';

export const STEP = 1 / 60;
const GRAVITY = 9.81;

export type Sim = {
  me: ClientId; // the client this sim runs on
  level: Level; // the content level the world is built from (ADR 0008): the one given, or the round's map
  levels: Readonly<Record<string, Level>>; // the maps this client can build, by name: the ones the host may pick (card 128)
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
  holder: ClientId | null; // whose hold on this client's own character was accepted last since prep: a capture's `by`
  thrown: Map<NetId, number>; // props this client threw, and when
  events: SimEvent[]; // what happened since the loop last drained it (ADR 0008)
  queue: EventQueue; // the world's contact force reports, drained every step
  impacts: Set<string>; // collider pairs pressing above the impact threshold in the last step
  pinged: Map<NetId, number>; // when a body this client simulates last pinged an impact
  ownerSpeed: Map<NetId, number>; // m/s each copy moves at by its owner's last pose applied here (ADR 0006)
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
  refused: Refusal | null; // why the fold refused this client's own latest hello (card 68)
  stunUntil: number; // when this client's cat's stun ends, by its own clock
  wetUntil: number; // when this client's cat a water bomb splashed dries, by its own clock (card 129)
  stunned: Map<NetId, number>; // until when the others' characters are stunned, by the ends this client folded
  soaked: Map<NetId, number>; // until when the others' cats are wet, by the splashes this client folded
  used: number; // mines this client's dog planted since its last resupply
  planting: Work | null; // this client's dog's plant in progress
  defusing: (Work & { id: NetId }) | null; // this client's cat's defuse in progress, of mine `id`
  resupplyAt: number | null; // since when this client's dog has stood in the doghouse
  ending: Set<NetId>; // entities this client sent the message that ends them for (a blast, a defuse, ...)
  trap: Extract<Variant, 'noise' | 'slip'> | null; // the trap in this client's cat's hand, by variant; null for none
  doorWork: { door: number; until: number } | null; // the own cat's work at a shut house door
  barged: Set<number>; // house doors this client's dog barged open, ahead of the round table
  perk: { kind: Perk; until: number | null } | null; // this client's perk slot: until when, null for one use
  outside: Vector | null; // where the own character last stood outside a hiding spot
  jumpHeld: boolean; // the own character's jump was held last step
  airJumped: boolean; // the own cat used its Acrobat jump since it last stood
  carrierPing: number | null; // when this client, the pinging carrier, last pinged; null while it is not
  emoteUntil: number; // when this client's last emote ends, by its own clock
};

// A timed action of the own character: when it started and ends, and where the character stood then.
export type Work = { since: number; until: number; from: Vector };

export async function init(): Promise<void> {
  await RAPIER.init();
}

// What a level builds (ADR 0008): Rapier's world with the level in it, and the controller that drives this
// client's own character there.
function built(level: Level) {
  const world = new RAPIER.World({ x: 0, y: -GRAVITY, z: 0 });
  world.timestep = STEP;
  const { volumes, exits, gates, debris, doors } = build(world, level);
  const controller = world.createCharacterController(0.01);
  controller.setApplyImpulsesToDynamicBodies(true);
  controller.enableSnapToGround(0.1); // keeps a grounded character on the floor (see drive)
  return { level, world, controller, volumes, exits, gates, debris, doors };
}

export function createWorld(level: Level, me: ClientId, levels: Sim['levels'] = {}): Sim {
  return {
    me,
    levels,
    ...built(level),
    entities: new Map(),
    ownership: newOwnershipTable(),
    accumulator: 0,
    time: 0,
    inFlight: new Set(),
    touchedAt: new Map(),
    spawned: 0,
    leap: null,
    lunge: null,
    lungeReady: 0,
    grabbedAt: null,
    holder: null,
    thrown: new Map(),
    events: [],
    queue: new RAPIER.EventQueue(true),
    impacts: new Set(),
    pinged: new Map(),
    ownerSpeed: new Map(),
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
    refused: null,
    stunUntil: 0,
    wetUntil: 0,
    stunned: new Map(),
    soaked: new Map(),
    used: 0,
    planting: null,
    defusing: null,
    resupplyAt: null,
    ending: new Set(),
    trap: 'noise',
    doorWork: null,
    barged: new Set(),
    perk: null,
    outside: null,
    jumpHeld: false,
    airJumped: false,
    carrierPing: null,
    emoteUntil: 0,
  };
}

// The world follows the round table's map (card 128), at prep and at a joiner's state: a map this client
// has a level for and the world was not built from is built anew in its place, the old world freed. No
// entity lives in it then: prep has cleared the entity and ownership tables (ADR 0007), and a joiner has
// adopted nothing yet.
export function follow(sim: Sim): void {
  const level = sim.round.map === null ? undefined : sim.levels[sim.round.map];
  if (!level || level === sim.level) return;
  sim.world.free();
  Object.assign(sim, built(level));
  sim.impacts.clear();
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
    const act = stunned(sim) ? IDLE : intent; // a stunned cat's or a slipped dog's intent is not its own
    if (c) drive(sim, c, act);
    carry(sim);
    sim.world.step(sim.queue);
    smell(sim);
    perkStep(sim);
    out.push(...grabStep(sim), ...noises(sim, act), ...touchClaims(sim), ...mineStep(sim, act), ...pickups(sim), ...slips(sim), ...roundStep(sim), ...clock(sim, host), ...removals(sim, host));
  }
  return out;
}
