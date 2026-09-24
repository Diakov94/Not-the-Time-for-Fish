import { isDeepStrictEqual } from 'node:util';
import type { Level } from '../../src/content/level.ts';
import { connect, send, type Session } from '../../src/net/client.ts';
import { dump, type Dump, type DumpRow } from '../../src/net/dump.ts';
import { decode, type GameMessage } from '../../src/net/protocol.ts';
import { DELAY_MS, TICK_MS } from '../../src/net/ticks.ts';
import { startRelay } from '../../src/relay/node.ts';
import type { ClientId, Kind, NetId } from '../../src/sim/entities.ts';
import { drainEvents, type SimEvent } from '../../src/sim/events.ts';
import type { Claim, Team } from '../../src/sim/messages.ts';
import { whisker } from '../../src/sim/mines.ts';
import { IDLE, type Intent } from '../../src/sim/movement.ts';
import { fold, sideOf, type Identities } from '../../src/sim/ownership.ts';
import { advance, catsTeam, duration, knobs, newRound, type Round } from '../../src/sim/round.ts';
import { init } from '../../src/sim/world.ts';
import { joinHeadless, playHeadless, type HeadlessClient, type Player, type Thing } from './client.ts';

export const MOVING_MAX = 0.25; // m: a copy against its owner's path around DELAY_MS earlier
export const RESTING_MAX = 0.02; // m: a copy of an entity at rest on its owner for 1 s or more
// GAME.md's visible desync, as card 66 defines it for the runner: a copy more than `off` m from its owner's
// path for more than `for` ms; at most `max` in a run. A second, coarser judge beside the two above.
export const VISIBLE = { off: 0.5, for: 1000, max: 1 };
const FRAME_MS = 1000 / 60; // the runner's loop: a 60 Hz display's frames
// A runner frame more than a network tick after the last is a stall of the runner's own process: every
// client and the relay stopped at once, which no session has (card bug-net-round-at-six-clients-...).
export const STALL_MS = TICK_MS;
const STALL_EVERY = 2000; // ms between the stalls `stall` injects

// A scenario, one file each: the level, what its host spawns beside the level's crates, and each
// client's player by join order (the first joins as the host) on the level the game runs. Its judge adds its own checks to the
// shared ones and prints its own numbers. A round scenario starts in the lobby: the host sides every
// player as its `side` (ADR 0007's reassignment by hand) and starts the round, the characters enter at
// prep, and the run ends once `rounds` rounds are over on every client, or after the run's seconds.
// `seconds` and `heist`: the run's length and the heist's when the command names none.
export type Scenario = {
  about: string;
  level: Level;
  things?: Thing[];
  player: (i: number, level: Level) => Player;
  judge?: (r: Run) => Verdict;
  round?: boolean;
  seconds?: number;
  heist?: number;
};
export type Verdict = { lines: string[]; ok: boolean };
// The runner's knobs, none of them a norm of the game: the tick sender's rate and the interpolation delay
// as fractions of TICK_MS's rate and DELAY_MS (card 66's negatives; `ticks: 0` sends none, card 11's), the
// heist's length for a round scenario (card 63: every client's phase start is moved back at its heist's
// fold, so the host's clock ends it sooner), how many rounds a round scenario plays, and `stall`: every
// STALL_EVERY one client in turn stalls this many ms, as a busy tab does: no frames, its messages held
// until it resumes, then the whole gap in one frame. It paints nothing meanwhile, so its copies are not
// judged; its own bodies stand still, the truth the others' copies are held against. A stall starts
// after a frame the client ticked in, or while it sends none: what an owner moves between its last tick
// and a stall never leaves it (up to a tick's motion, 0.45 m at a dog's sprint), and no copy can show it.
export type Options = { ticks?: number; delay?: number; heist?: number; rounds?: number; stall?: number };

// Every frame of the game, per connection in join order (a rejoin is a connection of its own): its dump
// (its fold's table and every pose; null while it is not in the game), the events it drained, the ticks it
// had sent so far, the intent its player held and whether its cat felt the whisker cue.
export type Sample = { t: number; dumps: (Dump | null)[]; events: SimEvent[][]; ticks: number[]; intents: Intent[]; cues: boolean[] };
// A message after which a client's round table was not what it was before: when (real time, and this
// client's sim time), the relay's `seq`, the type, the table after it, and how late by this client's clock
// it came against the end of the phase before (NaN for a phase with no clock).
export type Turn = { at: number; time: number; seq: number; by: string; round: Round; late: number };
// What crossed one connection's socket while the game ran: bytes each way, messages in, every message it
// sent but a tick, stamped: the stream's claims, releases and hits; and its round table's turns.
export type Wire = { up: number; down: number; in: number; sent: { at: number; m: GameMessage }[]; turns: Turn[] };
// A finished game as the judges read it, per connection: its client id, its player's index, when it began
// (a rejoin's connect) and its round table at the end (null once gone).
export type Run = { samples: Sample[]; wires: Wire[]; ids: ClientId[]; seats: number[]; opened: number[]; ends: (Round | null)[]; start: number; heist?: number };

export type Divergence = { id: string; kind: string; moving: number; resting: number; exact: number; stalled: number };
// Per connection, rates per second of the time it was in the game: ticks sent (the fewest in any whole
// second, and the rate while it had something to send), kB up and down, events drained.
export type Traffic = { id: ClientId; side?: Kind; ticks: number; minTicks: number; rate: number; up: number; down: number; events: number };
export type Result = {
  divergence: Divergence[];
  stalls: { n: number; longest: number }; // the runner's own stalls, and the longest, ms
  injected: number; // the client stalls `stall` injected
  visible: { id: NetId; kind: Kind; n: number }[]; // visible desyncs by entity
  clients: Traffic[];
  sidesAgree: boolean; // every client sees every client's side as the scenario gave it
  tablesAgree: boolean; // every client's fold table deep-equal to the host's at the end
  roundsAgree: boolean; // and its round table
  claims: number;
  doomed: number;
  relayIn: number; // messages/s the relay ordered
  relayOut: number; // messages/s it delivered
  cpu: number; // the Node process's CPU time over the game's wall time
  verdict: Verdict;
  code: 0 | 1;
};
type V = { x: number; y: number; z: number };
// One frame as the online judges read it: each connection's rows by net id, and per entity the connection
// that simulates it then, the one whose own table gives it to itself.
type Frame = { t: number; rows: (Map<NetId, DumpRow> | undefined)[]; own: Map<NetId, number> };

const dist = (a: V, b: V) => Math.hypot(a.x - b.x, a.y - b.y, a.z - b.z);

// The last frame at or before `t`, by bisection (-1 if none).
function indexAt(frames: { t: number }[], t: number): number {
  let lo = -1;
  let hi = frames.length;
  while (hi - lo > 1) {
    const mid = (lo + hi) >> 1;
    if (frames[mid]!.t <= t) lo = mid;
    else hi = mid;
  }
  return lo;
}

// The pose of `id` in a frame, on the connection that simulates it then.
const truth = (f: Frame | undefined, id: NetId) => f?.rows[f.own.get(id) ?? -1]?.get(id)?.p;

// The simulated pose of `id` at time `t`, between the frames around it.
function poseAt(frames: Frame[], id: NetId, t: number): V | undefined {
  const j = indexAt(frames, t);
  const a = truth(frames[j], id);
  const b = truth(frames[j + 1], id);
  if (!a || !b) return a;
  const k = (t - frames[j]!.t) / (frames[j + 1]!.t - frames[j]!.t);
  return { x: a.x + (b.x - a.x) * k, y: a.y + (b.y - a.y) * k, z: a.z + (b.z - a.z) * k };
}

// How far `p` is from the simulated path of `id` between times t0 and t1.
function offPath(p: V, frames: Frame[], id: NetId, t0: number, t1: number): number | undefined {
  const inside = frames.slice(indexAt(frames, t0) + 1, indexAt(frames, t1) + 1).map((f) => truth(f, id));
  const path = [poseAt(frames, id, t0), ...inside, poseAt(frames, id, t1)].filter((q) => q !== undefined);
  let best = path.length > 0 ? dist(p, path[0]!) : undefined;
  for (let i = 1; i < path.length; i++) {
    const [a, b] = [path[i - 1]!, path[i]!];
    const ab = dist(a, b) ** 2;
    const k = ab === 0 ? 0 : Math.max(0, Math.min(1, ((p.x - a.x) * (b.x - a.x) + (p.y - a.y) * (b.y - a.y) + (p.z - a.z) * (b.z - a.z)) / ab));
    best = Math.min(best!, dist(p, { x: a.x + (b.x - a.x) * k, y: a.y + (b.y - a.y) * k, z: a.z + (b.z - a.z) * k }));
  }
  return best;
}

// The judges of every copy, fed one frame at a time so a long run keeps only the last few hundred ms. Per
// entity, the largest distance between a copy and the body its owner simulates, over the run. The truth at
// each moment is the pose on the client whose own table gives it the entity then: across a handoff (a grab,
// a toss) the new owner's rows from before it are a copy of their own, 100 ms late, and no truth. A copy
// shows its owner's pose DELAY_MS late by design, and each client steps at its own 60 Hz phase and ticks at
// 20 Hz, so a moving entity's copy is held against the simulated path within one network tick of DELAY_MS
// before (`exact`, printed but not judged, is the simulated pose exactly DELAY_MS before). An entity at rest
// on its owner for 1 s is resting, and its copy is held against the owner's pose now, unless the copy's
// client has a claim on it in flight: that client simulates the prop itself until the fold decides
// (ADR 0006), so the prop is moving there. A copy further than VISIBLE.off from that path or pose is off;
// an entity off on any client for longer than VISIBLE.for is one visible desync. `seen` keeps every
// entity's identity for the doomed-claim judge, since a round's entities end before the run does.
// An entity's path starts at its spawn's pose (`births`, from its spawner's `spawn`), taken as the truth
// of the frame before its first: its owner may step it on before the runner's first look (under load a
// dog sprinted 0.3 m, or a stall's worth, from its spawn before the first frame that held it).
// Through a stall of the runner's own process (`stall`) every client froze at once and its owners jumped
// a stall's motion in one frame, so no copy's timing is the game's: until a moving judge's window has
// cleared the stall, a copy is held against its owner's whole path since the stall began (`stalled`).
function judges(ids: ClientId[], births: Map<NetId, V>) {
  const seen = new Map<NetId, Pick<DumpRow, 'kind' | 'home'>>();
  const frames: Frame[] = [];
  const div = new Map<NetId, Divergence>();
  const stalls: { from: number; to: number }[] = []; // those whose frames are still judged separately
  const stalled = { n: 0, longest: 0 };
  const restSince: Map<NetId, number>[] = []; // per connection: since when its body of each entity has slept
  const offSince = new Map<NetId, { at: number; counted: boolean }>();
  const visible = new Map<NetId, { id: NetId; kind: Kind; n: number }>();
  const see = (t: number, dumps: (Dump | null)[], paused: boolean[]) => {
    const rows = dumps.map((d) => d && new Map(d.entities.map((e) => [e.id, e])));
    const own = new Map<NetId, number>();
    for (const [c, r] of rows.entries()) for (const row of r?.values() ?? []) if (row.owner === ids[c] && !own.has(row.id)) own.set(row.id, c);
    for (const r of rows) for (const { id, kind, home } of r?.values() ?? []) if (!seen.has(id)) seen.set(id, { kind, home });
    const before = frames.at(-1);
    for (const [id, o] of own) {
      const p = births.get(id);
      if (!p || !before || truth(before, id)) continue;
      births.delete(id);
      (before.rows[o] ??= new Map()).set(id, { ...rows[o]!.get(id)!, p });
      before.own.set(id, o);
    }
    frames.push({ t, rows: rows.map((r) => r ?? undefined), own });
    while (stalls.length > 0 && stalls[0]!.to <= t - DELAY_MS - TICK_MS) stalls.shift();
    const through = stalls[0];
    const keep = Math.min(t, through?.from ?? t) - DELAY_MS - TICK_MS;
    while (frames.length > 1 && frames[1]!.t <= keep) frames.shift();
    for (const [c, r] of rows.entries()) {
      const next = new Map<NetId, number>();
      for (const row of r?.values() ?? []) if (row.rest) next.set(row.id, restSince[c]?.get(row.id) ?? t);
      restSince[c] = next;
    }
    const off = new Map<NetId, Kind>();
    for (const [k, r] of rows.entries()) {
      for (const row of r?.values() ?? []) {
        const d = div.get(row.id) ?? { id: row.id, kind: row.kind, moving: 0, resting: 0, exact: 0, stalled: 0 };
        div.set(row.id, d);
        const o = own.get(row.id) ?? -1;
        const now = rows[o]?.get(row.id);
        if (!now || row.owner === ids[k]) continue; // this client owns it in its own view, or nobody in the game simulates it
        if (paused[k]) continue; // a stalled client paints nothing
        const since = restSince[o]!.get(row.id);
        let far: number;
        if (since !== undefined && t - since >= 1000 && !row.inFlight) {
          far = dist(row.p, now.p);
          d.resting = Math.max(d.resting, far);
        } else {
          const then = poseAt(frames, row.id, t - DELAY_MS);
          if (!then) continue;
          if (through) {
            far = offPath(row.p, frames, row.id, through.from - DELAY_MS - TICK_MS, t)!;
            d.stalled = Math.max(d.stalled, far);
          } else {
            far = offPath(row.p, frames, row.id, t - DELAY_MS - TICK_MS, t - DELAY_MS + TICK_MS)!;
            d.moving = Math.max(d.moving, far);
            d.exact = Math.max(d.exact, dist(row.p, then));
          }
        }
        if (far > VISIBLE.off) off.set(row.id, row.kind);
      }
    }
    for (const id of offSince.keys()) if (!off.has(id)) offSince.delete(id);
    for (const [id, kind] of off) {
      const o = offSince.get(id) ?? { at: t, counted: false };
      offSince.set(id, o);
      if (o.counted || t - o.at <= VISIBLE.for) continue;
      o.counted = true;
      const v = visible.get(id) ?? { id, kind, n: 0 };
      visible.set(id, { ...v, n: v.n + 1 });
    }
  };
  const byId = <T extends { id: string }>(m: Map<string, T>) => [...m.values()].sort((a, b) => (a.id < b.id ? -1 : 1));
  const stall = (from: number, to: number) => {
    stalls.push({ from, to });
    [stalled.n, stalled.longest] = [stalled.n + 1, Math.max(stalled.longest, to - from)];
  };
  return { see, stall, stalls: () => stalled, divergence: () => byId(div), visible: () => byId(visible), identities: (): Identities => seen };
}

// A dump whose rows that did not change since the connection's last one are that one's rows, so a long
// run holds one object per change rather than one per frame.
function intern(last: Map<NetId, DumpRow>, d: Dump): Dump {
  const same = (a: DumpRow, b: DumpRow) =>
    a.owner === b.owner && a.held === b.held && a.inFlight === b.inFlight && a.rest === b.rest && a.p.x === b.p.x && a.p.y === b.p.y && a.p.z === b.p.z && a.q.w === b.q.w && a.q.y === b.q.y;
  const entities = d.entities.map((e) => {
    const was = last.get(e.id);
    return was && same(was, e) ? was : e;
  });
  last.clear();
  for (const e of entities) last.set(e.id, e);
  return { ...d, entities };
}

// Taps a connection's socket for its Wire, from its first message on: bytes, messages in, what it sends but
// ticks, and its round table's turns. With `heist`, the heist's phase start is moved back at its fold.
function tap({ ws, sim }: Session, births: Map<NetId, V>, heist?: number): Wire {
  const w: Wire = { up: 0, down: 0, in: 0, sent: [], turns: [] };
  const send = ws.send.bind(ws);
  ws.send = (text: string) => {
    w.up += Buffer.byteLength(text);
    const m = JSON.parse(text) as GameMessage;
    if (m.type !== 'tick') w.sent.push({ at: performance.now(), m: { ...m, from: sim.me } });
    if (m.type === 'spawn') births.set(m.id, m.p);
    send(text);
  };
  const receive = ws.onmessage!;
  ws.onmessage = (e) => {
    const text = String(e.data);
    w.down += Buffer.byteLength(text);
    w.in++;
    const before = JSON.stringify(sim.round);
    const due = sim.phaseAt + (duration(sim.round) ?? NaN);
    const phase = sim.round.phase;
    receive.call(ws, e);
    if (JSON.stringify(sim.round) === before) return;
    const m = decode(text);
    w.turns.push({ at: performance.now(), time: sim.time, seq: m.seq, by: m.type, round: structuredClone(sim.round), late: sim.time - due });
    if (heist !== undefined && m.type === 'phase' && phase !== 'heist' && sim.round.phase === 'heist') sim.phaseAt -= knobs(sim.round).heist - heist;
  };
  return w;
}

// A claim the fold rejects even with its target free: one its sender should never have made (ADR 0009's
// predicate for a hold, ADR 0006's home rule for a touch). The runner asks the fold rather than restating it.
const doomed = (m: Claim, identities: Identities) =>
  !fold({ rows: new Map([[m.id, { owner: m.from, held: false }]]), gone: new Set() }, m, identities);

// The fold's facts in a dump: who was seen leaving, and each entity's identity and table row.
const table = ({ gone, entities }: Dump) => ({ gone, rows: entities.map(({ id, kind, home, owner, held }) => ({ id, kind, home, owner, held })) });

// The fewest ticks connection `c` sent in any whole second between `from` and `to`.
function minTicks(samples: Sample[], c: number, from: number, to: number): number {
  let min = Infinity;
  for (let t = from; t + 1000 <= to; t += 1000) {
    min = Math.min(min, samples[indexAt(samples, t + 1000)]!.ticks[c]! - samples[indexAt(samples, t)]!.ticks[c]!);
  }
  return min;
}

// The team that plays `side` in the round the lobby starts.
const FIRST_CATS = catsTeam(newRound());
const teamFor = (side: Player['side']): Team => (side === 'cat' ? FIRST_CATS : FIRST_CATS === 'A' ? 'B' : 'A');

// One connection of the game: its seat (the player), its session, its Wire; `in` from the frame it shows
// every entity its owner's pose (a rejoin first holds the host's world at no pose), `gone` once closed;
// the span it was in the game, and its tick intervals of at most two network ticks (the rate it ticks at
// while it has something to send).
type Link = { c: HeadlessClient; session: Session; wire: Wire; state: 'joining' | 'in' | 'gone'; from: number; to: number; ticks: { last: number; sum: number; n: number } };

// The headless game: the Node relay on an ephemeral port, one scripted client per player of the scenario
// for `seconds` of real time at 60 frames a second, every connection's dump sampled each frame and judged
// online, then the shared judges and the scenario's.
export async function run(scenario: Scenario, clients: number, seconds: number, o: Options = {}): Promise<Result> {
  const { ticks = 1, delay = 1, heist, rounds = 1, stall = 0 } = o;
  await init();
  const relay = await startRelay();
  const url = `ws://localhost:${relay.port}/headless`;
  const seats: HeadlessClient[] = [];
  const links: Link[] = [];
  const link = (c: HeadlessClient, state: Link['state']) => {
    links.push({ c, session: c.session, wire: tap(c.session, births, heist), state, from: Infinity, to: Infinity, ticks: { last: NaN, sum: 0, n: 0 } });
    ids.push(c.session.sim.me);
    last.push(new Map());
  };
  const ids: ClientId[] = [];
  const births = new Map<NetId, V>();
  const opened: number[] = [];
  const last: Map<NetId, DumpRow>[] = [];
  try {
    for (let i = 0; i < clients; i++) {
      opened.push(performance.now());
      seats.push(await joinHeadless(url, scenario.level, `p${i}`, scenario.player(i, scenario.level), i === 0 ? scenario.things : [], !scenario.round));
      link(seats[i]!, 'in');
    }
    const samples: Sample[] = [];
    const judge = judges(ids, births);
    // A client shows the world once it holds `ref`'s entities and its owner's pose of each it does not own:
    // a pose DELAY_MS old is set as the copy's target, and the world steps it there within two frames. No
    // level is read: whatever the level and the scenario spawned is in the other's table.
    const entityIds = (sim: Session['sim']) => [...sim.entities.keys()].sort().join();
    const shows = ({ sim, receiver }: Session, ref: Session, now: number) =>
      entityIds(ref.sim) === entityIds(sim) &&
      [...sim.entities.keys()].every((id) => sim.ownership.rows.get(id)?.owner === sim.me || (receiver.get(id)?.[0]?.at ?? Infinity) <= now - DELAY_MS - 2 * FRAME_MS);
    // A lobby game starts once every client shows the host's world with every character in it; a round
    // game once every client's roster sides every player as the scenario does.
    const teamOf = (s: Session, c: HeadlessClient) => s.sim.round.roster.find((p) => p.name === c.name)?.team;
    const sided = (s: Session) => seats.every((c) => teamOf(s, c) === teamFor(c.player.side));
    const ready = (now: number) =>
      scenario.round ? seats.every((c) => sided(c.session)) : seats.every((c) => shows(c.session, seats[0]!.session, now) && ids.every((id) => sideOf(c.session.sim.entities, id)));
    const present = () => links.filter((l) => l.state === 'in');
    const over = () => present().every((l) => l.session.sim.round.results.length >= rounds && l.session.sim.round.phase === 'over');
    const joined = performance.now();
    let start = Infinity;
    let prev = joined;
    let next = joined;
    let asked = false; // the host sent the scenario's sides
    let pressed = ''; // the phase and round the host last pressed its button in
    let cpu = process.cpuUsage();
    type Stalled = { c: HeadlessClient; from: number; until: number; resume: () => void };
    let stalled: Stalled | null = null;
    let injected = 0;
    const now0 = performance.now.bind(performance);
    while (prev - start < seconds * 1000 && !(scenario.round && start < Infinity && over())) {
      next += FRAME_MS;
      await new Promise((r) => setTimeout(r, Math.max(0, next - performance.now())));
      const now = performance.now();
      if (now - next > 100) next = now; // behind by more than a few frames: no burst to catch up
      const first = seats[0]!.session;
      if (start === Infinity && scenario.round && !asked && seats.every((c) => teamOf(first, c))) {
        asked = true;
        for (const c of seats) if (teamOf(first, c) !== teamFor(c.player.side)) send(first, { type: 'roster', from: first.sim.me, name: c.name, team: teamFor(c.player.side) });
      }
      if (start === Infinity && ready(now)) {
        start = now;
        cpu = process.cpuUsage();
        for (const l of links) Object.assign(l.wire, { up: 0, down: 0, in: 0, sent: [] });
        for (const l of links) l.from = now;
        if (ticks === 0) for (const l of links) l.session.lastTick = Infinity; // the tick sender never fires again
      }
      if (start === Infinity && now - joined > 5000) throw new Error('the clients never all held every entity');
      // The host's button, once per phase: a round game starts at once, and its next round when one is over.
      const h = present().find((l) => l.session.host === l.session.sim.me)?.session;
      const m = scenario.round && start < Infinity && h && !over() ? advance(h.sim, h.sim.me) : null;
      const key = h && `${h.sim.round.phase}:${h.sim.round.round}`;
      if (h && m && key !== pressed && (h.sim.round.phase === 'over' || h.sim.round.round === 0)) {
        pressed = key!;
        send(h, m);
      }
      const dt = (now - prev) / 1000;
      const turn = seats[injected % seats.length]!;
      const tick = links.findLast((l) => l.c === turn)?.ticks.last ?? NaN;
      const quiet = tick === prev || !(now - tick <= 2 * TICK_MS);
      if (stall > 0 && start < Infinity && !stalled && now - start >= (injected + 1) * STALL_EVERY && turn.session && !turn.left && quiet) {
        const ws = turn.session.ws;
        const handler = ws.onmessage!;
        const held: MessageEvent[] = [];
        ws.onmessage = (e) => void held.push(e);
        const resume = () => {
          ws.onmessage = handler;
          for (const e of held) handler.call(ws, e);
        };
        stalled = { c: turn, from: prev, until: now + stall, resume };
        injected++;
      }
      let resumed: Stalled | null = null;
      if (stalled && now >= stalled.until) {
        stalled.resume();
        [resumed, stalled] = [stalled, null];
      }
      for (const c of seats) {
        if (!c.session || stalled?.c === c) continue; // its new tab is still connecting, or it is stalled
        const l = links.findLast((x) => x.c === c)!;
        const sent = c.session.ticks;
        if (delay !== 1) performance.now = () => now0() + DELAY_MS * (1 - delay); // interpolation shows a pose this much later
        const act = playHeadless(c, (now - start) / 1000, resumed?.c === c ? (now - resumed.from) / 1000 : dt);
        performance.now = now0;
        if (c.session.ticks > sent) {
          if (ticks > 0 && ticks < 1) c.session.lastTick += TICK_MS * (1 / ticks - 1);
          if (now - l.ticks.last <= 2 * TICK_MS) [l.ticks.sum, l.ticks.n] = [l.ticks.sum + now - l.ticks.last, l.ticks.n + 1];
          l.ticks.last = now;
        }
        if (act === 'leave' && !c.left) {
          [l.state, l.to, c.left] = ['gone', now, true];
          c.session.ws.close(); // the tab dies: nothing else is cleaned up
        } else if (act === 'rejoin' && c.left) {
          opened.push(now);
          c.session = null as unknown as Session; // no frames until the new tab is up
          void connect(url, scenario.level, c.name).then((session) => {
            [c.session, c.left] = [session, false];
            link(c, 'joining');
          });
        }
      }
      // A rejoin is in the game from the frame it shows another client's world.
      for (const l of links) {
        const ref = present()[0]?.session;
        if (l.state === 'joining' && ref && shows(l.session, ref, now)) [l.state, l.from] = ['in', now];
      }
      const events = links.map((l) => (l.state === 'gone' ? [] : drainEvents(l.session.sim))); // the runner is the loop that owns the frame
      prev = now;
      if (start === Infinity) continue;
      const dumps = links.map((l, i) => (l.state === 'in' ? intern(last[i]!, dump(l.session.sim)) : null));
      const intents = links.map((l) => (l.state === 'in' ? l.c.intent : IDLE));
      if (dt * 1000 > STALL_MS) judge.stall(now - dt * 1000, now);
      const cues = links.map((l) => l.state === 'in' && whisker(l.session.sim));
      samples.push({ t: now, dumps, events, ticks: links.map((l) => l.session.ticks), intents, cues });
      judge.see(now, dumps, links.map((l) => l.c === stalled?.c && l.session === l.c.session));
    }
    const s = (prev - start) / 1000;
    const used = process.cpuUsage(cpu);
    await new Promise((r) => setTimeout(r, 100)); // what is still in flight is folded everywhere
    const here = present();
    const traffic = links.map((l, i) => {
      const [from, to] = [Math.max(l.from, start), Math.min(l.to, prev)];
      const span = Math.max(to - from, 1) / 1000;
      const first = samples[Math.max(0, indexAt(samples, from))]!;
      return {
        id: ids[i]!,
        side: sideOf(l.session.sim.entities, ids[i]!) ?? l.c.player.side,
        ticks: from < to ? (l.session.ticks - (first.ticks[i] ?? l.session.ticks)) / span : 0,
        minTicks: minTicks(samples, i, from, to),
        rate: l.ticks.n > 0 ? 1000 / (l.ticks.sum / l.ticks.n) : 0,
        up: l.wire.up / 1000 / span,
        down: l.wire.down / 1000 / span,
        events: samples.reduce((n, x) => n + (x.events[i]?.length ?? 0), 0),
      };
    });
    const relayIn = Math.max(...links.map((l) => l.wire.in)) / s; // every message the relay orders reaches a client there throughout once
    const relayOut = links.reduce((n, l) => n + l.wire.in, 0) / s;
    const ends = here.map((l) => table(dump(l.session.sim)));
    const tables = here.map((l) => l.session.sim.round);
    const claims = links.flatMap((l) => l.wire.sent.map((x) => x.m)).filter((m): m is Claim => m.type === 'claim');
    const div = judge.divergence();
    const visible = judge.visible();
    const errors = seats.flatMap((c) => (c.error ? [`${c.name}'s script stopped: ${c.error}`] : []));
    const seatOf = links.map((l) => seats.indexOf(l.c));
    const ended = links.map((l) => (l.state === 'in' ? l.session.sim.round : null));
    const verdict = scenario.judge?.({ samples, wires: links.map((l) => l.wire), ids, seats: seatOf, opened, ends: ended, start, ...(heist !== undefined && { heist }) }) ?? { lines: [], ok: true };
    const r = {
      divergence: div,
      stalls: judge.stalls(),
      injected,
      visible,
      clients: traffic,
      sidesAgree: scenario.round ? here.every((l) => sided(l.session)) : here.every((l) => ids.every((id, i) => sideOf(l.session.sim.entities, id) === scenario.player(i, scenario.level).side)),
      tablesAgree: ends.every((t) => isDeepStrictEqual(t, ends[0])),
      roundsAgree: tables.every((t) => isDeepStrictEqual(t, tables[0])),
      claims: claims.length,
      doomed: claims.filter((m) => doomed(m, judge.identities())).length,
      relayIn,
      relayOut,
      cpu: (used.user + used.system) / 1000 / (prev - start),
    };
    const bad = div.some((d) => d.moving > MOVING_MAX || d.stalled > MOVING_MAX || d.resting > RESTING_MAX) || visible.reduce((n, v) => n + v.n, 0) > VISIBLE.max;
    const ok = !bad && r.sidesAgree && r.tablesAgree && r.roundsAgree && r.doomed === 0 && errors.length === 0 && verdict.ok;
    return { ...r, verdict: { lines: [...errors, ...verdict.lines], ok: verdict.ok }, code: ok ? 0 : 1 };
  } finally {
    for (const l of links) if (l.state !== 'gone') l.session.ws.close();
    await relay.close();
  }
}
