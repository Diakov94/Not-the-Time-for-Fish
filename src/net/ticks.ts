import type { ClientId, NetId } from '../sim/entities.ts';
import { applySnapshot, readSnapshot, type Snapshot } from '../sim/snapshot.ts';
import type { Sim } from '../sim/world.ts';
import type { Tick } from './protocol.ts';

export const TICK_MS = 50; // the ~20 Hz network tick
export const DELAY_MS = 100; // a copy shows its owner's pose this long after the snapshot arrived

// The sender's only memory: the owned entities whose `rest` it has sent. Clearing it on `joined`
// resends every owned entity once, so a joiner learns each pose from that pose's owner.
export type Rested = Set<NetId>;

// One network tick (ADR 0006): every entity the fold gives this client that moved since the last
// tick, with `rest` on the first tick its body sleeps and nothing after that. Null: nothing to send.
export function tick(sim: Sim, rested: Rested): Tick | null {
  const s: Snapshot[] = [];
  for (const e of sim.entities.values()) {
    if (sim.ownership.rows.get(e.id)?.owner !== sim.me) {
      rested.delete(e.id);
      continue;
    }
    if (e.body.isSleeping() && rested.has(e.id)) continue;
    const snap = readSnapshot(e);
    s.push(snap);
    if (snap.rest) rested.add(e.id);
    else rested.delete(e.id);
  }
  return s.length > 0 ? { type: 'tick', from: sim.me, s } : null;
}

// The receiver's buffer: per entity, the snapshots around the pose it shows, stamped with arrival time.
// It takes a snapshot only from the fold's owner as of its arrival in the relay's order, so the previous
// owner's snapshots already in it carry the copy on across an ownership change until the new owner's take
// over. A client's own tick never enters it: it empties the buffer of every entity it names, since
// nothing buffered before is a target while this client simulates the entity.
type Entry = { at: number; from: ClientId; s: Snapshot };
export type Receiver = Map<NetId, Entry[]>;

// A resting pose is final: it is placed at once. A moving one joins the buffer; after a pause (the
// body rested, or this client simulated it) the buffer restarts from the copy's current pose one tick
// earlier, so the copy moves off without a jump. An entity's first pose starts the buffer alone: a
// joiner's copy has no pose of its own to start from.
export function receiveTick(sim: Sim, r: Receiver, t: Tick, at: number): void {
  for (const s of t.s) {
    const e = sim.entities.get(s.id);
    if (!e) continue;
    if (t.from === sim.me) {
      r.set(s.id, []);
      continue;
    }
    if (sim.ownership.rows.get(s.id)?.owner !== t.from) continue;
    const entry = { at, from: t.from, s };
    const list = r.get(s.id);
    if (s.rest || !list) {
      if (s.rest) applySnapshot(sim, t.from, s);
      r.set(s.id, [entry]);
    } else if (list.length === 0 || list.at(-1)!.at < at - 2 * TICK_MS) {
      r.set(s.id, [{ at: at - TICK_MS, from: t.from, s: readSnapshot(e) }, entry]);
    } else list.push(entry);
  }
}

type V = { x: number; y: number; z: number };
const lerp = (a: V, b: V, k: number): V => ({
  x: a.x + (b.x - a.x) * k,
  y: a.y + (b.y - a.y) * k,
  z: a.z + (b.z - a.z) * k,
});

function mix(a: Snapshot, b: Snapshot, k: number): Snapshot {
  const sign = a.q.x * b.q.x + a.q.y * b.q.y + a.q.z * b.q.z + a.q.w * b.q.w < 0 ? -1 : 1;
  const q = { ...lerp(a.q, { x: sign * b.q.x, y: sign * b.q.y, z: sign * b.q.z }, k), w: a.q.w + (sign * b.q.w - a.q.w) * k };
  const n = Math.hypot(q.x, q.y, q.z, q.w);
  return { ...b, p: lerp(a.p, b.p, k), q: { x: q.x / n, y: q.y / n, z: q.z / n, w: q.w / n }, rest: false };
}

// Every frame: each copy goes to its owner's pose DELAY_MS ago, between the two snapshots around it.
// The sim's snapshot rule leaves alone a body this client simulates or carries.
export function interpolate(sim: Sim, r: Receiver, now: number): void {
  const t = now - DELAY_MS;
  for (const list of r.values()) {
    while (list.length > 1 && list[1]!.at <= t) list.shift();
    const [a, b] = list as [Entry?, Entry?];
    if (!a || a.at > t) continue;
    applySnapshot(sim, (b ?? a).from, b ? mix(a.s, b.s, (t - a.at) / (b.at - a.at)) : a.s);
  }
}
