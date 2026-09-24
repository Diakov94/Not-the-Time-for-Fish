import { dump, type Dump } from '../../src/net/dump.ts';
import { DELAY_MS, TICK_MS } from '../../src/net/ticks.ts';
import { startRelay } from '../../src/relay/node.ts';
import { drainEvents } from '../../src/sim/events.ts';
import { prototypeRoom } from '../../src/sim/level.ts';
import { init } from '../../src/sim/world.ts';
import { joinHeadless, playHeadless, type HeadlessClient } from './client.ts';

export const MOVING_MAX = 0.25; // m: a copy against its owner's path around DELAY_MS earlier
export const RESTING_MAX = 0.02; // m: a copy of an entity at rest on its owner for 1 s or more

export type Divergence = { id: string; kind: string; moving: number; resting: number; exact: number };
export type Result = { divergence: Divergence[]; ticks: Record<string, number>; code: 0 | 1 };
type Sample = { t: number; dumps: Dump[] };
type V = { x: number; y: number; z: number };

const dist = (a: V, b: V) => Math.hypot(a.x - b.x, a.y - b.y, a.z - b.z);
const rowOf = (d: Dump, id: string) => d.entities.find((e) => e.id === id);

// The last sample at or before `t`, by bisection (-1 if none).
function indexAt(samples: Sample[], t: number): number {
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

// The headless game: the Node relay on an ephemeral port, `clients` scripted clients for `seconds`
// of real time, every client's dump sampled each frame. `ticks: false` disables the tick sender.
export async function run(clients: number, seconds: number, ticks = true): Promise<Result> {
  await init();
  const relay = await startRelay();
  const url = `ws://localhost:${relay.port}/headless`;
  const cs: HeadlessClient[] = [];
  try {
    for (let i = 0; i < clients; i++) cs.push(await joinHeadless(url, i));
    const samples: Sample[] = [];
    // The game starts once every client holds every entity and shows its owner's pose of each it does
    // not own.
    const shown = ({ session: { sim, receiver } }: HeadlessClient, now: number) =>
      sim.entities.size === prototypeRoom.crates.length + clients &&
      [...sim.entities.keys()].every(
        (id) => sim.ownership.rows.get(id)?.owner === sim.me || (receiver.get(id)?.[0]?.at ?? Infinity) <= now - DELAY_MS,
      );
    const joined = performance.now();
    let start = Infinity;
    let last = joined;
    while (last - start < seconds * 1000) {
      await new Promise((r) => setTimeout(r, 16));
      const now = performance.now();
      if (start === Infinity && cs.every((c) => shown(c, now))) {
        start = now;
        if (!ticks) for (const c of cs) c.session.lastTick = Infinity; // the tick sender never fires again
      }
      if (start === Infinity && now - joined > 5000) throw new Error('the clients never all held every entity');
      for (const c of cs) playHeadless(c, (now - start) / 1000, (now - last) / 1000);
      for (const c of cs) drainEvents(c.session.sim); // the runner is the loop that owns the frame
      last = now;
      if (start < Infinity) samples.push({ t: now, dumps: cs.map((c) => dump(c.session.sim)) });
    }
    const div = divergence(samples);
    const over = div.some((d) => d.moving > MOVING_MAX || d.resting > RESTING_MAX);
    return {
      divergence: div,
      ticks: Object.fromEntries(cs.map((c) => [c.session.sim.me, c.session.ticks])),
      code: over ? 1 : 0,
    };
  } finally {
    for (const c of cs) c.session.ws.close();
    await relay.close();
  }
}
