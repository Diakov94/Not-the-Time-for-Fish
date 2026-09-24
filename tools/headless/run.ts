import { isDeepStrictEqual } from 'node:util';
import type { Level } from '../../src/content/level.ts';
import { send, type Session } from '../../src/net/client.ts';
import { dump, type Dump, type DumpRow } from '../../src/net/dump.ts';
import { decode, type GameMessage } from '../../src/net/protocol.ts';
import { DELAY_MS, TICK_MS } from '../../src/net/ticks.ts';
import { startRelay } from '../../src/relay/node.ts';
import type { ClientId, Kind, NetId } from '../../src/sim/entities.ts';
import { drainEvents, type SimEvent } from '../../src/sim/events.ts';
import type { Claim, Team } from '../../src/sim/messages.ts';
import { fold, sideOf, type Identities } from '../../src/sim/ownership.ts';
import { advance, catsTeam, duration, knobs, newRound, type Round } from '../../src/sim/round.ts';
import { init } from '../../src/sim/world.ts';
import { joinHeadless, playHeadless, type HeadlessClient, type Player, type Thing } from './client.ts';

export const MOVING_MAX = 0.25; // m: a copy against its owner's path around DELAY_MS earlier
export const RESTING_MAX = 0.02; // m: a copy of an entity at rest on its owner for 1 s or more
const FRAME_MS = 1000 / 60; // the runner's loop: a 60 Hz display's frames

// A scenario, one file each: the level, what its host spawns beside the level's crates, and each
// client's player by join order (the first joins as the host). Its judge adds its own checks to the
// shared ones and prints its own numbers. A round scenario starts in the lobby: the host sides every
// player as its `side` (ADR 0007's reassignment by hand) and starts the round, the characters enter at
// prep, and the run ends once `rounds` rounds are over on every client, or after the run's seconds.
// `seconds`: the run's length when the command names none.
export type Scenario = { about: string; level: Level; things?: Thing[]; player: (i: number) => Player; judge?: (r: Run) => Verdict; round?: boolean; seconds?: number };
export type Verdict = { lines: string[]; ok: boolean };
// A round scenario's knobs, neither a norm of the game: the heist's length (every client's phase start is
// moved back at its heist's fold, so the host's clock ends it sooner), and how many rounds it plays.
export type Options = { heist?: number; rounds?: number };

// Every frame of the game: each client's dump (its fold's table and every pose), the events it drained,
// and the ticks it had sent so far.
export type Sample = { t: number; dumps: Dump[]; events: SimEvent[][]; ticks: number[] };
// A message after which a client's round table was not what it was before: when (real time, and this
// client's sim time), the relay's `seq`, the type, the table after it, and how late by this client's clock
// it came against the end of the phase before (NaN for a phase with no clock).
export type Turn = { at: number; time: number; seq: number; by: string; round: Round; late: number };
// What crossed one client's socket while the game ran: bytes each way, messages in, every message it
// sent but a tick, stamped: the stream's claims, releases and hits; and its round table's turns.
export type Wire = { up: number; down: number; in: number; sent: { at: number; m: GameMessage }[]; turns: Turn[] };
// A finished game as the judges read it; `ids` are the clients in join order, `ends` their round tables at
// the end.
export type Run = { samples: Sample[]; wires: Wire[]; ids: ClientId[]; ends: Round[]; start: number; heist?: number };

export type Divergence = { id: string; kind: string; moving: number; resting: number; exact: number };
// Per client, rates per second of the game: ticks sent (the fewest in any whole second, and the rate while
// it had something to send), kB up and down, events drained.
export type Traffic = { id: ClientId; side?: Kind; ticks: number; minTicks: number; rate: number; up: number; down: number; events: number };
export type Result = {
  divergence: Divergence[];
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
// One frame as the online judges read it: each client's rows by net id, and per entity the client that
// simulates it then, the one whose own table gives it to itself.
type Frame = { t: number; rows: Map<NetId, DumpRow>[]; own: Map<NetId, number> };

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
// (ADR 0006), so the prop is moving there. `seen` keeps every entity's identity for the doomed-claim judge,
// since a round's entities end before the run does.
function judges(ids: ClientId[]) {
  const seen = new Map<NetId, Pick<DumpRow, 'kind' | 'home'>>();
  const frames: Frame[] = [];
  const div = new Map<NetId, Divergence>();
  const restSince: Map<NetId, number>[] = []; // per client: since when its body of each entity has slept
  const see = (t: number, dumps: Dump[]) => {
    const rows = dumps.map((d) => new Map(d.entities.map((e) => [e.id, e])));
    const own = new Map<NetId, number>();
    for (const [c, r] of rows.entries()) for (const row of r.values()) if (row.owner === ids[c] && !own.has(row.id)) own.set(row.id, c);
    for (const r of rows) for (const { id, kind, home } of r.values()) if (!seen.has(id)) seen.set(id, { kind, home });
    frames.push({ t, rows, own });
    while (frames.length > 1 && frames[1]!.t <= t - DELAY_MS - TICK_MS) frames.shift();
    for (const [c, r] of rows.entries()) {
      const next = new Map<NetId, number>();
      for (const row of r.values()) if (row.rest) next.set(row.id, restSince[c]?.get(row.id) ?? t);
      restSince[c] = next;
    }
    for (const [k, r] of rows.entries()) {
      for (const row of r.values()) {
        const d = div.get(row.id) ?? { id: row.id, kind: row.kind, moving: 0, resting: 0, exact: 0 };
        div.set(row.id, d);
        const o = own.get(row.id) ?? -1;
        const now = rows[o]?.get(row.id);
        if (!now || row.owner === ids[k]) continue; // this client owns it in its own view, or nobody in the game simulates it
        const since = restSince[o]!.get(row.id);
        if (since !== undefined && t - since >= 1000 && !row.inFlight) {
          d.resting = Math.max(d.resting, dist(row.p, now.p));
          continue;
        }
        const then = poseAt(frames, row.id, t - DELAY_MS);
        if (!then) continue;
        d.moving = Math.max(d.moving, offPath(row.p, frames, row.id, t - DELAY_MS - TICK_MS, t - DELAY_MS + TICK_MS)!);
        d.exact = Math.max(d.exact, dist(row.p, then));
      }
    }
  };
  const byId = <T extends { id: string }>(m: Map<string, T>) => [...m.values()].sort((a, b) => (a.id < b.id ? -1 : 1));
  return { see, divergence: () => byId(div), identities: (): Identities => seen };
}

// A dump whose rows that did not change since the client's last one are that one's rows, so a long run
// holds one object per change rather than one per frame.
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

// Taps a client's socket for its Wire, from its first message on: bytes, messages in, what it sends but
// ticks, and its round table's turns. With `heist`, the heist's phase start is moved back at its fold.
function tap({ ws, sim }: Session, heist?: number): Wire {
  const w: Wire = { up: 0, down: 0, in: 0, sent: [], turns: [] };
  const send = ws.send.bind(ws);
  ws.send = (text: string) => {
    w.up += Buffer.byteLength(text);
    const m = JSON.parse(text) as GameMessage;
    if (m.type !== 'tick') w.sent.push({ at: performance.now(), m: { ...m, from: sim.me } });
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

// The fewest ticks client `c` sent in any whole second of the game.
function minTicks(samples: Sample[], c: number, start: number, end: number): number {
  let min = Infinity;
  for (let t = start; t + 1000 <= end; t += 1000) {
    min = Math.min(min, samples[indexAt(samples, t + 1000)]!.ticks[c]! - samples[indexAt(samples, t)]!.ticks[c]!);
  }
  return min;
}

// The team that plays `side` in the round the lobby starts.
const FIRST_CATS = catsTeam(newRound());
const teamFor = (side: Player['side']): Team => (side === 'cat' ? FIRST_CATS : FIRST_CATS === 'A' ? 'B' : 'A');

// A client of the game, its Wire, and its tick intervals of at most two network ticks (the rate it ticks at
// while it has something to send).
type Link = { c: HeadlessClient; wire: Wire; ticks: { last: number; sum: number; n: number } };

// The headless game: the Node relay on an ephemeral port, one scripted client per player of the scenario
// for `seconds` of real time at 60 frames a second, every client's dump sampled each frame and judged
// online, then the shared judges and the scenario's. `ticks: false` disables the tick sender.
export async function run(scenario: Scenario, clients: number, seconds: number, ticks = true, o: Options = {}): Promise<Result> {
  const { heist, rounds = 1 } = o;
  await init();
  const relay = await startRelay();
  const url = `ws://localhost:${relay.port}/headless`;
  const links: Link[] = [];
  try {
    for (let i = 0; i < clients; i++) {
      const c = await joinHeadless(url, scenario.level, `p${i}`, scenario.player(i), i === 0 ? scenario.things : [], !scenario.round);
      links.push({ c, wire: tap(c.session, heist), ticks: { last: NaN, sum: 0, n: 0 } });
    }
    const cs = links.map((l) => l.c);
    const ids = cs.map((c) => c.session.sim.me);
    const samples: Sample[] = [];
    const judge = judges(ids);
    const last = cs.map(() => new Map<NetId, DumpRow>());
    // A lobby game starts once every client holds the host's entities, every client's character among
    // them, and shows its owner's pose of each it does not own: a pose DELAY_MS old is set as the copy's
    // target, and the world steps it there within two frames. No level is read: whatever the level and the
    // scenario spawned is in the host's table. A round game starts once every client's roster sides every
    // player as the scenario does.
    const entityIds = (c: HeadlessClient) => [...c.session.sim.entities.keys()].sort().join();
    const shows = (c: HeadlessClient, now: number) => {
      const { sim, receiver } = c.session;
      return (
        entityIds(c) === entityIds(cs[0]!) &&
        ids.every((id) => sideOf(sim.entities, id)) &&
        [...sim.entities.keys()].every((id) => sim.ownership.rows.get(id)?.owner === sim.me || (receiver.get(id)?.[0]?.at ?? Infinity) <= now - DELAY_MS - 2 * FRAME_MS)
      );
    };
    const teamOf = (c: HeadlessClient, of: HeadlessClient) => c.session.sim.round.roster.find((p) => p.name === of.name)?.team;
    const sided = (c: HeadlessClient) => cs.every((of) => teamOf(c, of) === teamFor(of.player.side));
    const ready = (now: number) => cs.every((c) => (scenario.round ? sided(c) : shows(c, now)));
    const over = () => cs.every((c) => c.session.sim.round.results.length >= rounds && c.session.sim.round.phase === 'over');
    const joined = performance.now();
    let start = Infinity;
    let prev = joined;
    let next = joined;
    let asked = false; // the host sent the scenario's sides
    let pressed = ''; // the phase and round the host last pressed its button in
    let cpu = process.cpuUsage();
    while (prev - start < seconds * 1000 && !(scenario.round && start < Infinity && over())) {
      next += FRAME_MS;
      await new Promise((r) => setTimeout(r, Math.max(0, next - performance.now())));
      const now = performance.now();
      if (now - next > 100) next = now; // behind by more than a few frames: no burst to catch up
      const first = cs[0]!;
      if (start === Infinity && scenario.round && !asked && cs.every((c) => teamOf(first, c))) {
        asked = true;
        for (const c of cs) if (teamOf(first, c) !== teamFor(c.player.side)) send(first.session, { type: 'roster', from: first.session.sim.me, name: c.name, team: teamFor(c.player.side) });
      }
      if (start === Infinity && ready(now)) {
        start = now;
        cpu = process.cpuUsage();
        for (const l of links) Object.assign(l.wire, { up: 0, down: 0, in: 0, sent: [] });
        if (!ticks) for (const c of cs) c.session.lastTick = Infinity; // the tick sender never fires again
      }
      if (start === Infinity && now - joined > 5000) throw new Error('the clients never all held every entity');
      // The host's button, once per phase: a round game starts at once, and its next round when one is over.
      const h = cs.find((c) => c.session.host === c.session.sim.me)?.session;
      const m = scenario.round && start < Infinity && h && !over() ? advance(h.sim, h.sim.me) : null;
      const key = h && `${h.sim.round.phase}:${h.sim.round.round}`;
      if (h && m && key !== pressed && (h.sim.round.phase === 'over' || h.sim.round.round === 0)) {
        pressed = key!;
        send(h, m);
      }
      const dt = (now - prev) / 1000;
      for (const { c, ticks: gaps } of links) {
        const sent = c.session.ticks;
        playHeadless(c, (now - start) / 1000, dt);
        if (c.session.ticks === sent) continue;
        if (now - gaps.last <= 2 * TICK_MS) [gaps.sum, gaps.n] = [gaps.sum + now - gaps.last, gaps.n + 1];
        gaps.last = now;
      }
      const events = cs.map((c) => drainEvents(c.session.sim)); // the runner is the loop that owns the frame
      prev = now;
      if (start === Infinity) continue;
      const dumps = cs.map((c, i) => intern(last[i]!, dump(c.session.sim)));
      samples.push({ t: now, dumps, events, ticks: cs.map((c) => c.session.ticks) });
      judge.see(now, dumps);
    }
    const s = (prev - start) / 1000;
    const used = process.cpuUsage(cpu);
    await new Promise((r) => setTimeout(r, 100)); // what is still in flight is folded everywhere
    const traffic = links.map(({ c, wire, ticks: gaps }, i) => ({
      id: ids[i]!,
      side: sideOf(c.session.sim.entities, ids[i]!) ?? c.player.side,
      ticks: (c.session.ticks - samples[0]!.ticks[i]!) / s,
      minTicks: minTicks(samples, i, start, prev),
      rate: gaps.n > 0 ? 1000 / (gaps.sum / gaps.n) : 0,
      up: wire.up / 1000 / s,
      down: wire.down / 1000 / s,
      events: samples.reduce((n, x) => n + x.events[i]!.length, 0),
    }));
    const relayIn = links[0]!.wire.in / s; // every message the relay orders reaches every client once
    const relayOut = links.reduce((n, l) => n + l.wire.in, 0) / s;
    const ends = cs.map((c) => table(dump(c.session.sim)));
    const tables = cs.map((c) => c.session.sim.round);
    const claims = links.flatMap((l) => l.wire.sent.map((x) => x.m)).filter((m): m is Claim => m.type === 'claim');
    const div = judge.divergence();
    const errors = cs.flatMap((c) => (c.error ? [`${c.name}'s script stopped: ${c.error}`] : []));
    const verdict = scenario.judge?.({ samples, wires: links.map((l) => l.wire), ids, ends: tables, start, ...(heist !== undefined && { heist }) }) ?? { lines: [], ok: true };
    const r = {
      divergence: div,
      clients: traffic,
      sidesAgree: cs.every((c) => (scenario.round ? sided(c) : ids.every((id, i) => sideOf(c.session.sim.entities, id) === scenario.player(i).side))),
      tablesAgree: ends.every((t) => isDeepStrictEqual(t, ends[0])),
      roundsAgree: tables.every((t) => isDeepStrictEqual(t, tables[0])),
      claims: claims.length,
      doomed: claims.filter((m) => doomed(m, judge.identities())).length,
      relayIn,
      relayOut,
      cpu: (used.user + used.system) / 1000 / (prev - start),
    };
    const bad = div.some((d) => d.moving > MOVING_MAX || d.resting > RESTING_MAX);
    const ok = !bad && r.sidesAgree && r.tablesAgree && r.roundsAgree && r.doomed === 0 && errors.length === 0 && verdict.ok;
    return { ...r, verdict: { lines: [...errors, ...verdict.lines], ok: verdict.ok }, code: ok ? 0 : 1 };
  } finally {
    for (const { c } of links) c.session.ws.close();
    await relay.close();
  }
}
