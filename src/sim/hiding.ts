import type { Rotation, Vector } from '@dimforge/rapier3d-compat';
import type { Box } from '../content/level.ts';
import { volumeAt } from './build.ts';
import type { Entity } from './entities.ts';
import type { Sim } from './world.ts';

// `p` in the frame of a body at `t` turned by `q`: the offset rotated by q's conjugate.
function local(p: Vector, t: Vector, q: Rotation): Vector {
  const v = { x: p.x - t.x, y: p.y - t.y, z: p.z - t.z };
  const [x, y, z] = [-q.x, -q.y, -q.z];
  const c = { x: 2 * (y * v.z - z * v.y), y: 2 * (z * v.x - x * v.z), z: 2 * (x * v.y - y * v.x) };
  return { x: v.x + q.w * c.x + (y * c.z - z * c.y), y: v.y + q.w * c.y + (z * c.x - x * c.z), z: v.z + q.w * c.z + (x * c.y - y * c.x) };
}

const inside = (p: Vector, b: Box) => Math.abs(p.x - b.p.x) <= b.half.x && Math.abs(p.y - b.p.y) <= b.half.y && Math.abs(p.z - b.p.z) <= b.half.z;

// ADR 0010: whether `cat` is hidden, derived on each client from the poses it holds: its body is inside a
// hiding spot, a level's volume or one a prop carries, which moves with the prop's body (card 19). No flag
// travels; card 42's Bark and card 56's peek camera read it.
export function hidden(sim: Sim, cat: Entity): boolean {
  const p = cat.body.translation();
  if (volumeAt(sim, 'hidingSpot', p) >= 0) return true;
  for (const e of sim.entities.values()) {
    const spot = e.prop === undefined ? undefined : sim.level.props[e.prop]?.hidingSpot;
    if (spot && inside(local(p, e.body.translation(), e.body.rotation()), spot)) return true;
  }
  return false;
}
