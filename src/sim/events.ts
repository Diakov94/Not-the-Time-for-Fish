import RAPIER from '@dimforge/rapier3d-compat';
import type { Collider, Vector } from '@dimforge/rapier3d-compat';
import { entityOf, isCharacter, type ClientId, type Entity, type NetId } from './entities.ts';
import type { Mark, Noise } from './messages.ts';
import { myCharacter, type Intent } from './movement.ts';
import { simulatedHere } from './ownership.ts';
import type { Sim } from './world.ts';

// What happened, one list per frame (ADR 0008): appended by `receive` for the messages that are events
// and by the fold's accepted grabs, throws, drops and hits; read by every view; drained by the loop that
// owns the frame. Never sent. `loud` runs from 0 to 1, a mine's blast or a sprung trap.
export type SimEvent =
  | { type: 'noise'; p: Vector; loud: number; from: ClientId }
  | { type: 'mark'; p: Vector; from: ClientId }
  | { type: 'grab' | 'throw' | 'drop'; id: NetId; from: ClientId }
  | { type: 'hit'; dog: NetId; from: ClientId };

export const IMPACT = 5; // a contact is an impact above this many times its body's weight
const LOUDEST_IMPACT = 100; // weights of force that are as loud as a blast
const RESTING = 0.05; // m/s: a copy slower than this rests on its owner
const IMPACT_GAP = 0.5; // s a body that pinged an impact stays quiet
// A character's steps: one ping per stride of travel on the ground. A dog is always loud; a sneaking cat
// is silent. A dog's stride is shorter, so a walking dog pings at least as often as a sprinting cat.
const STEPS = { cat: { stride: 2, loud: 0.15 }, dog: { stride: 1.2, loud: 0.3 } };

// The loop's end of a frame: every view has read the list.
export function drainEvents(sim: Sim): SimEvent[] {
  return sim.events.splice(0);
}

// A team marker (ADR 0010): the point a ray from `from` along `dir` meets, cast for the app.
export function markAt(sim: Sim, from: Vector, dir: Vector): Mark | null {
  const n = Math.hypot(dir.x, dir.y, dir.z);
  const ray = new RAPIER.Ray(from, { x: dir.x / n, y: dir.y / n, z: dir.z / n });
  const skip = myCharacter(sim)?.body;
  const hit = sim.world.castRay(ray, 100, true, RAPIER.QueryFilterFlags.EXCLUDE_SENSORS, undefined, undefined, skip);
  return hit ? { type: 'mark', from: sim.me, p: ray.pointAt(hit.timeOfImpact) } : null;
}

// The noise born on this client (ADR 0010), for the caller to send; every client, this one included,
// hears it from the echo. An impact is the first step a contact on a body this client simulates presses
// above IMPACT weights; the loudest of a step wins, and its bodies stay quiet for IMPACT_GAP, so a crate
// that knocks a vase and digs into the floor pings once. When the other body is a synced one simulated
// elsewhere, the owner of the lower net id sends, unless the other's owner cannot have felt it: a
// character, a held body or a copy at rest is no dynamic body there, and this client's touch claim takes
// a resting prop before its copy of the impact happens there. An impact left to the other client quiets
// its bodies here all the same. The steps are this client's own character's.
export function noises(sim: Sim, intent: Intent): Noise[] {
  const out: Noise[] = [];
  const pressing = new Set<string>();
  const onsets: { ids: NetId[]; noise: Noise; send: boolean }[] = [];
  sim.queue.drainContactForceEvents((ev) => {
    const pair = [ev.collider1(), ev.collider2()].sort((a, b) => a - b);
    const key = pair.join(':');
    pressing.add(key);
    if (sim.impacts.has(key)) return;
    const [a, b] = pair.map((h) => sim.world.getCollider(h)) as [Collider, Collider];
    const [ea, eb] = [entityOf(sim.entities, a), entityOf(sim.entities, b)];
    const mine = ea && simulatedHere(sim, ea) ? ea : eb && simulatedHere(sim, eb) ? eb : undefined;
    const other = mine === ea ? eb : ea;
    if (!mine) return;
    const weight = mine.body.mass() * -sim.world.gravity.y;
    const loud = Math.min(1, ev.totalForceMagnitude() / (LOUDEST_IMPACT * weight));
    let p = mine.body.translation();
    sim.world.contactPair(a, b, (m) => {
      p = (m.numSolverContacts() > 0 && m.solverContactPoint(0)) || p;
    });
    const noise: Noise = { type: 'noise', from: sim.me, p, loud };
    onsets.push({ ids: [mine.id, ...(other ? [other.id] : [])], noise, send: sends(sim, mine, other) });
  });
  sim.impacts = pressing;
  for (const { ids, noise, send } of onsets.sort((x, y) => Number(x.send) - Number(y.send) || y.noise.loud - x.noise.loud)) {
    if (ids.some((id) => sim.time - (sim.pinged.get(id) ?? -Infinity) < IMPACT_GAP)) continue;
    for (const id of ids) sim.pinged.set(id, sim.time);
    if (send) out.push(noise);
  }
  const c = myCharacter(sim);
  if (c && sim.controller.computedGrounded()) {
    const s = STEPS[c.kind === 'dog' ? 'dog' : 'cat'];
    const v = c.body.linvel();
    sim.stride += Math.hypot(v.x, v.z) * sim.world.timestep;
    if (sim.stride >= s.stride) {
      sim.stride -= s.stride;
      const p = c.body.translation();
      if (c.kind === 'dog' || !intent.sneak) out.push({ type: 'noise', from: sim.me, p, loud: s.loud });
    }
  }
  return out;
}

function sends(sim: Sim, mine: Entity, other: Entity | undefined): boolean {
  if (!other || simulatedHere(sim, other)) return true;
  const v = other.body.linvel();
  const felt = !isCharacter(other.kind) && !sim.ownership.rows.get(other.id)?.held && Math.hypot(v.x, v.y, v.z) > RESTING;
  return !felt || mine.id < other.id;
}
