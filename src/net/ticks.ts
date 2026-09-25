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
// It takes a snapshot only from the fold's owner as of its arrival in the relay's order (ADR 0006), so
// across an ownership change the previous owner's snapshots already in it still carry the copy until the
// new owner's take over. A client's own tick never enters it: it empties the buffer of every entity it
// names, since nothing buffered before is a target while this client simulates the entity.
type Entry = { at: number; from: ClientId; s: Snapshot };
export type Receiver = Map<NetId, Entry[]>;

// A resting pose is final: it is placed at once. A moving one joins the buffer; after its owner's pause
// (the body rested) the buffer restarts from the copy's current pose one tick earlier, so the copy moves
// off without a jump. After this client simulated the entity, the new owner's first pose counts from one
// tick before it came, as at any handoff (see interpolate). An entity's first pose starts the buffer
// alone: a joiner's copy has no pose of its own to start from.
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
    const last = list?.at(-1);
    if (s.rest || !list) {
      if (s.rest) applySnapshot(sim, t.from, s);
      r.set(s.id, [entry]);
    } else if (!last) {
      r.set(s.id, [{ ...entry, at: at - TICK_MS }, entry]);
    } else if (last.from === t.from && last.at < at - 2 * TICK_MS) {
      r.set(s.id, [{ at: at - TICK_MS, from: t.from, s: readSnapshot(e) }, entry]);
    } else {
      list.push(entry);
      // One owner ticks every TICK_MS; its ticks that came closer were held on the way (all of a stalled
      // receiver's at once), so each takes its place a tick before the one after it. The first of an
      // owner's run keeps its place, set by a handoff (see interpolate) or a restart above: a tick earlier
      // still, a carrier's first pose with a catch-up tick close behind showed ~20 ms after it was simulated.
      for (let i = list.length - 2; i > 0 && list[i - 1]!.from === t.from && list[i]!.from === t.from && list[i]!.at > list[i + 1]!.at - TICK_MS; i--) list[i]!.at = list[i + 1]!.at - TICK_MS;
    }
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

// Before every step, at its moment: each copy goes to its owner's pose DELAY_MS ago, between the two
// snapshots around it.
// Two owners' snapshots are never blended, since a handoff can jump (a grabbed cat into the carrier's
// mouth): the new owner's first tick came within a tick of the fold, so its pose shows from one tick
// before it came, and the previous owner's last until then. The sim's snapshot rule leaves alone a body
// this client simulates or carries.
export function interpolate(sim: Sim, r: Receiver, now: number): void {
  const t = now - DELAY_MS;
  for (const list of r.values()) {
    while (list.length > 1 && list[1]!.at <= t) list.shift();
    const [a, b] = list as [Entry?, Entry?];
    if (!a || a.at > t) continue;
    const k = !b ? 0 : b.from === a.from ? (t - a.at) / (b.at - a.at) : t < b.at - TICK_MS ? 0 : 1;
    applySnapshot(sim, (b ?? a).from, b && k > 0 ? mix(a.s, b.s, k) : a.s);
  }
}
