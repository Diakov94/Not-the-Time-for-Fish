import { isDeepStrictEqual } from 'node:util';
import { dump, type Dump } from '../../src/net/dump.ts';
import type { GameMessage } from '../../src/net/protocol.ts';
import { DELAY_MS, TICK_MS } from '../../src/net/ticks.ts';
import { startRelay } from '../../src/relay/node.ts';
import type { ClientId, Kind } from '../../src/sim/entities.ts';
import { drainEvents, type SimEvent } from '../../src/sim/events.ts';
import type { Level } from '../../src/sim/level.ts';
import type { Claim } from '../../src/sim/messages.ts';
import { fold, sideOf, type Identities } from '../../src/sim/ownership.ts';
import { init } from '../../src/sim/world.ts';
import { joinHeadless, playHeadless, type HeadlessClient, type Player, type Thing } from './client.ts';

export const MOVING_MAX = 0.25; // m: a copy against its owner's path around DELAY_MS earlier
export const RESTING_MAX = 0.02; // m: a copy of an entity at rest on its owner for 1 s or more

// A scenario, one file each: the level, what its host spawns beside the level's crates, and each
// client's player by join order (the first joins as the host). Its judge adds its own checks to the
// shared ones and prints its own numbers.
export type Scenario = { about: string; level: Level; things?: Thing[]; player: (i: number) => Player; judge?: (r: Run) => Verdict };
export type Verdict = { lines: string[]; ok: boolean };

// Every frame of the game: each client's dump (its fold's table and every pose), the events it drained,
// and the ticks it had sent so far.
export type Sample = { t: number; dumps: Dump[]; events: SimEvent[][]; ticks: number[] };
// What crossed one client's socket while the game ran: bytes each way, messages in, and every message it
// sent but a tick, stamped: the stream's claims, releases and hits.
export type Wire = { up: number; down: number; in: number; sent: { at: number; m: GameMessage }[] };
// A finished game as the judges read it; `ids` are the clients in join order.
export type Run = { samples: Sample[]; wires: Wire[]; ids: ClientId[]; start: number };

export type Divergence = { id: string; kind: string; moving: number; resting: number; exact: number };
// Per client, rates per second of the game: ticks sent (and the fewest in any whole second), kB up and
// down, events drained.
export type Traffic = { id: ClientId; side?: Kind; ticks: number; minTicks: number; up: number; down: number; events: number };
export type Result = {
  divergence: Divergence[];
  clients: Traffic[];
  sidesAgree: boolean; // every client sees every client's side as the scenario gave it
  tablesAgree: boolean; // every client's fold table deep-equal to the host's at the end
  claims: number;
  doomed: number;
  relayIn: number; // messages/s the relay ordered
  relayOut: number; // messages/s it delivered
  cpu: number; // the Node process's CPU time over the game's wall time
  verdict: Verdict;
  code: 0 | 1;
};
type V = { x: number; y: number; z: number };

const dist = (a: V, b: V) => Math.hypot(a.x - b.x, a.y - b.y, a.z - b.z);
const rowOf = (d: Dump, id: string) => d.entities.find((e) => e.id === id);

// The last sample at or before `t`, by bisection (-1 if none).
export function indexAt(samples: Sample[], t: number): number {
  let lo = -1;
  let hi = samples.length;
  while (hi - lo > 1) {
    const mid = (lo + hi) >> 1;
    if (samples[mid]!.t <= t) lo = mid;
    else hi = mid;
  }
  return lo;
}

// Client `c`'s pose of `id` at time `t`, between the samples around it.
function poseAt(samples: Sample[], c: number, id: string, t: number): V | undefined {
  const j = indexAt(samples, t);
  const a = samples[j] && rowOf(samples[j].dumps[c]!, id)?.p;
  const b = samples[j + 1] && rowOf(samples[j + 1]!.dumps[c]!, id)?.p;
  if (!a || !b) return a;
  const k = (t - samples[j]!.t) / (samples[j + 1]!.t - samples[j]!.t);
  return { x: a.x + (b.x - a.x) * k, y: a.y + (b.y - a.y) * k, z: a.z + (b.z - a.z) * k };
}

// How far `p` is from client `c`'s path of `id` between times t0 and t1.
function offPath(p: V, samples: Sample[], c: number, id: string, t0: number, t1: number): number | undefined {
  const inside = samples.slice(indexAt(samples, t0) + 1, indexAt(samples, t1) + 1).map((s) => rowOf(s.dumps[c]!, id)?.p);
  const path = [poseAt(samples, c, id, t0), ...inside, poseAt(samples, c, id, t1)].filter((q) => q !== undefined);
  let best = path.length > 0 ? dist(p, path[0]!) : undefined;
  for (let i = 1; i < path.length; i++) {
    const [a, b] = [path[i - 1]!, path[i]!];
    const ab = dist(a, b) ** 2;
    const k = ab === 0 ? 0 : Math.max(0, Math.min(1, ((p.x - a.x) * (b.x - a.x) + (p.y - a.y) * (b.y - a.y) + (p.z - a.z) * (b.z - a.z)) / ab));
    best = Math.min(best!, dist(p, { x: a.x + (b.x - a.x) * k, y: a.y + (b.y - a.y) * k, z: a.z + (b.z - a.z) * k }));
  }
  return best;
}

// Per entity, the largest distance between a copy and its owner over the run, each copy held against
// the owner its own client's fold names. A copy shows its owner's pose DELAY_MS late by design, and each
// client steps at its own 60 Hz phase and ticks at 20 Hz, so a moving entity's copy is held against the
// owner's path within one network tick of DELAY_MS before (`exact`, printed but not judged, is the
// owner's pose exactly DELAY_MS before). An entity at rest on its owner for 1 s is resting, and its copy
// is held against the owner's pose now, unless the copy's client has a claim on it in flight: that
// client simulates the prop itself until the fold decides (ADR 0006), so the prop is moving there.
function divergence(samples: Sample[]): Divergence[] {
  return samples.at(-1)!.dumps[0]!.entities.map(({ id, kind }) => {
    const d: Divergence = { id, kind, moving: 0, resting: 0, exact: 0 };
    const restSince: (number | null)[] = []; // per client: since when its body of `id` has slept
    for (const { t, dumps } of samples) {
      const rows = dumps.map((x) => rowOf(x, id));
      rows.forEach((row, c) => (restSince[c] = row?.rest ? (restSince[c] ?? t) : null));
      for (const [k, row] of rows.entries()) {
        const o = dumps.findIndex((x) => x.me === row?.owner);
        const truth = rows[o];
        if (!row || !truth || o === k) continue; // this client owns it in its own view: no copy
        const since = restSince[o];
        if (since != null && t - since >= 1000 && !row.inFlight) d.resting = Math.max(d.resting, dist(row.p, truth.p));
        else {
          const then = poseAt(samples, o, id, t - DELAY_MS);
          if (!then) continue;
          d.moving = Math.max(d.moving, offPath(row.p, samples, o, id, t - DELAY_MS - TICK_MS, t - DELAY_MS + TICK_MS)!);
          d.exact = Math.max(d.exact, dist(row.p, then));
        }
      }
    }
    return d;
  });
}

// Taps a client's socket for its Wire; installed once the client plays, before the game starts.
function tap({ session: { ws, sim } }: HeadlessClient): Wire {
  const w: Wire = { up: 0, down: 0, in: 0, sent: [] };
  const send = ws.send.bind(ws);
  ws.send = (text: string) => {
    w.up += Buffer.byteLength(text);
    const m = JSON.parse(text) as GameMessage;
    if (m.type !== 'tick') w.sent.push({ at: performance.now(), m: { ...m, from: sim.me } });
    send(text);
  };
  const receive = ws.onmessage!;
  ws.onmessage = (e) => {
    w.down += Buffer.byteLength(String(e.data));
    w.in++;
    receive.call(ws, e);
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

// The headless game: the Node relay on an ephemeral port, one scripted client per player of the scenario
// for `seconds` of real time, every client's dump sampled each frame, then the shared judges and the
// scenario's. `ticks: false` disables the tick sender.
export async function run(scenario: Scenario, clients: number, seconds: number, ticks = true): Promise<Result> {
  await init();
  const relay = await startRelay();
  const url = `ws://localhost:${relay.port}/headless`;
  const cs: HeadlessClient[] = [];
  try {
    for (let i = 0; i < clients; i++) cs.push(await joinHeadless(url, scenario.level, scenario.player(i), i === 0 ? scenario.things : []));
    const ids = cs.map((c) => c.session.sim.me);
    const wires = cs.map(tap);
    const samples: Sample[] = [];
    // The game starts once every client holds the host's entities, every client's character among them,
    // and shows its owner's pose of each it does not own. No level is read: whatever the level and the
    // scenario spawned is in the host's table.
    const entityIds = (c: HeadlessClient) => [...c.session.sim.entities.keys()].sort().join();
    const ready = (c: HeadlessClient, now: number) => {
      const { sim, receiver } = c.session;
      return (
        entityIds(c) === entityIds(cs[0]!) &&
        ids.every((id) => sideOf(sim.entities, id)) &&
        [...sim.entities.keys()].every(
          (id) => sim.ownership.rows.get(id)?.owner === sim.me || (receiver.get(id)?.[0]?.at ?? Infinity) <= now - DELAY_MS,
        )
      );
    };
    const joined = performance.now();
    let start = Infinity;
    let last = joined;
    let cpu = process.cpuUsage();
    while (last - start < seconds * 1000) {
      await new Promise((r) => setTimeout(r, 16));
      const now = performance.now();
      if (start === Infinity && cs.every((c) => ready(c, now))) {
        start = now;
        cpu = process.cpuUsage();
        for (const w of wires) Object.assign(w, { up: 0, down: 0, in: 0, sent: [] });
        if (!ticks) for (const c of cs) c.session.lastTick = Infinity; // the tick sender never fires again
      }
      if (start === Infinity && now - joined > 5000) throw new Error('the clients never all held every entity');
      for (const c of cs) playHeadless(c, (now - start) / 1000, (now - last) / 1000);
      const events = cs.map((c) => drainEvents(c.session.sim)); // the runner is the loop that owns the frame
      last = now;
      if (start < Infinity) samples.push({ t: now, dumps: cs.map((c) => dump(c.session.sim)), events, ticks: cs.map((c) => c.session.ticks) });
    }
    const s = (last - start) / 1000;
    const used = process.cpuUsage(cpu);
    const traffic = cs.map((c, i) => ({
      id: ids[i]!,
      side: sideOf(c.session.sim.entities, ids[i]!),
      ticks: (c.session.ticks - samples[0]!.ticks[i]!) / s,
      minTicks: minTicks(samples, i, start, last),
      up: wires[i]!.up / 1000 / s,
      down: wires[i]!.down / 1000 / s,
      events: samples.reduce((n, x) => n + x.events[i]!.length, 0),
    }));
    const relayIn = wires[0]!.in / s; // every message the relay orders reaches every client once
    const relayOut = wires.reduce((n, w) => n + w.in, 0) / s;
    await new Promise((r) => setTimeout(r, 100)); // what is still in flight is folded everywhere
    const ends = cs.map((c) => table(dump(c.session.sim)));
    const identities = cs[0]!.session.sim.entities;
    const claims = wires.flatMap((w) => w.sent.map((x) => x.m)).filter((m): m is Claim => m.type === 'claim');
    const div = divergence(samples);
    const verdict = scenario.judge?.({ samples, wires, ids, start }) ?? { lines: [], ok: true };
    const r = {
      divergence: div,
      clients: traffic,
      sidesAgree: cs.every((c) => ids.every((id, i) => sideOf(c.session.sim.entities, id) === scenario.player(i).side)),
      tablesAgree: ends.every((t) => isDeepStrictEqual(t, ends[0])),
      claims: claims.length,
      doomed: claims.filter((m) => doomed(m, identities)).length,
      relayIn,
      relayOut,
      cpu: (used.user + used.system) / 1000 / (last - start),
    };
    const over = div.some((d) => d.moving > MOVING_MAX || d.resting > RESTING_MAX);
    return { ...r, verdict, code: over || !r.sidesAgree || !r.tablesAgree || r.doomed > 0 || !verdict.ok ? 1 : 0 };
  } finally {
    for (const c of cs) c.session.ws.close();
    await relay.close();
  }
}
