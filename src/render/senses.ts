import type { Ball, Capsule, Shape } from '@dimforge/rapier3d-compat';
import * as THREE from 'three';
import { OVERLAY } from '../art/palette.ts';
import type { NetId } from '../sim/entities.ts';
import { sideOf } from '../sim/ownership.ts';
import { sniffed } from '../sim/scent.ts';
import type { Sim } from '../sim/world.ts';

// GAME.md, HUD contextual: a dog's senses, drawn in the world (card 32). A sniffing dog sees the trail
// the sim's `sniffed` query returns as rimmed marks on the floor, the older ones smaller and darker; every noise
// ping in the event list is a ring at its source, as big as the noise is loud, swelling as it fades over
// PING_TIME and seen through walls. A cat sees neither: dogs are heard, not marked (audio). Shape and value
// tell them apart, not hue (GAME.md, Accessibility): the trail is black-rimmed diamonds fading from near
// white to near black, a ping a white ring edged in black. Render keeps no trail and no ping, only each
// ring's age.
const MARKS = 512; // the most trail marks drawn at once
const FADE = 30; // s: a mark this old is drawn at its faintest (the sniff window, GAME.md)
const PING_TIME = 2; // s
const NEW = new THREE.Color(OVERLAY.fresh);
const OLD = new THREE.Color(OVERLAY.stale);

export type Senses = { trail: THREE.InstancedMesh; rim: THREE.InstancedMesh; pings: { ring: THREE.Object3D; born: number }[] };

export function createSenses(scene: THREE.Scene): Senses {
  const diamond = new THREE.CylinderGeometry(0.15, 0.15, 0.02, 4);
  const marks = (m: THREE.Material) => {
    const o = new THREE.InstancedMesh(diamond, m, MARKS);
    o.count = 0;
    o.frustumCulled = false;
    scene.add(o);
    return o;
  };
  return { trail: marks(new THREE.MeshBasicMaterial()), rim: marks(new THREE.MeshBasicMaterial({ color: OVERLAY.rim })), pings: [] };
}

// How far a body's centre is above its bottom, so a sample of its pose marks the floor under it.
function lift(shape: Shape | undefined): number {
  if (!shape) return 0;
  if ('halfHeight' in shape) return (shape as Capsule).halfHeight + (shape as Capsule).radius;
  return 'radius' in shape ? (shape as Ball).radius : 0;
}

const EDGE = new THREE.RingGeometry(0.8, 1, 24);
const CORE = new THREE.RingGeometry(0.55, 0.8, 24);
function ring(loud: number): THREE.Object3D {
  const g = new THREE.Group();
  for (const [geometry, colour] of [
    [EDGE, OVERLAY.rim],
    [CORE, OVERLAY.white],
  ] as const) {
    const m = new THREE.MeshBasicMaterial({ color: colour, transparent: true, depthTest: false, side: THREE.DoubleSide });
    g.add(new THREE.Mesh(geometry, m));
  }
  g.renderOrder = 10;
  for (const c of g.children) c.renderOrder = 10;
  g.userData.size = 0.4 + 1.6 * loud; // m: the radius a ping starts at
  return g;
}

const m4 = new THREE.Matrix4();
const at = new THREE.Vector3();
const flat = new THREE.Quaternion();
const size = new THREE.Vector3();
const colour = new THREE.Color();

export function drawSenses(s: Senses, sim: Sim, scene: THREE.Scene, camera: THREE.Camera): void {
  const dog = sideOf(sim.entities, sim.me) === 'dog';
  let n = 0;
  const lifts = new Map<NetId, number>();
  for (const mark of dog ? sniffed(sim).trail : []) {
    if (n === MARKS) break;
    let h = lifts.get(mark.id);
    if (h === undefined) lifts.set(mark.id, (h = lift(sim.entities.get(mark.id)?.body.collider(0).shape)));
    const f = Math.max(0, 1 - (sim.time - mark.t) / FADE);
    m4.compose(at.set(mark.p.x, mark.p.y - h + 0.03, mark.p.z), flat, size.setScalar(0.5 + 0.5 * f));
    s.trail.setMatrixAt(n, m4);
    s.rim.setMatrixAt(n, m4.compose(at.setY(at.y - 0.01), flat, size.multiplyScalar(1.4)));
    s.trail.setColorAt(n++, colour.copy(OLD).lerp(NEW, f));
  }
  s.trail.count = s.rim.count = n;
  s.trail.instanceMatrix.needsUpdate = s.rim.instanceMatrix.needsUpdate = true;
  if (s.trail.instanceColor) s.trail.instanceColor.needsUpdate = true;

  if (dog)
    for (const e of sim.events) {
      // A dog's own steps ring at its own feet at every stride: it knows it is walking.
      if (e.type !== 'noise' || (e.cause === 'step' && e.from === sim.me)) continue;
      const r = ring(e.loud);
      r.position.set(e.p.x, e.p.y, e.p.z);
      scene.add(r);
      s.pings.push({ ring: r, born: sim.time });
    }
  s.pings = s.pings.filter(({ ring: r, born }) => {
    const t = (sim.time - born) / PING_TIME;
    if (t >= 1 || !dog) {
      scene.remove(r);
      for (const c of r.children) ((c as THREE.Mesh).material as THREE.Material).dispose();
      return false;
    }
    r.quaternion.copy(camera.quaternion);
    r.scale.setScalar(r.userData.size * (0.6 + 0.6 * t));
    for (const c of r.children) ((c as THREE.Mesh).material as THREE.MeshBasicMaterial).opacity = 1 - t;
    return true;
  });
}

// The pings render shows now, each where it rang and how far through its PING_TIME it is, 0 to 1 (the
// HUD's arrows fade with them, card 61).
export function livePings(s: Senses, sim: Sim): { p: THREE.Vector3; age: number }[] {
  return s.pings.map(({ ring, born }) => ({ p: ring.position, age: (sim.time - born) / PING_TIME }));
}
