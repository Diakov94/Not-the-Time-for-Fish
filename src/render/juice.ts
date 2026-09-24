import * as THREE from 'three';
import type { Sim } from '../sim/world.ts';

// GAME.md, Game Feel (card 33): cartoon impact stars and camera shake on a loud impact, both read from
// the frame's event list; card 39's blast feeds the same path. Every viewer sees the stars. The shake is
// an offset `follow` adds to the camera, proportional to the impact's loudness and how near it is to
// the camera's target; the target itself never moves. Render keeps each burst's and shake's age only.
// Which noises are impacts is the sim's word: the noise's `cause` (card 23), an impact or a blast.
const IMPACTS = new Set(['impact', 'blast']);
export const SHAKE = 0.1; // m: the shake of the loudest noise at the target, the one amplitude a reduced-motion toggle will scale (Beta)
const SHAKE_RANGE = 8; // m: an impact this far from the target shakes nothing
const SHAKE_TIME = 0.25; // s
const STARS = 6; // per burst
const STAR_TIME = 0.5; // s

export type Juice = { bursts: { stars: THREE.Group; born: number }[]; shakes: { amp: number; born: number }[]; offset: THREE.Vector3 };

export function createJuice(): Juice {
  return { bursts: [], shakes: [], offset: new THREE.Vector3() };
}

const outline: THREE.Vector2[] = [];
for (let i = 0; i < 10; i++) {
  const r = i % 2 ? 0.08 : 0.18;
  outline.push(new THREE.Vector2(r * Math.sin((i * Math.PI) / 5), r * Math.cos((i * Math.PI) / 5)));
}
const STAR = new THREE.ShapeGeometry(new THREE.Shape(outline));

function burst(p: { x: number; y: number; z: number }): THREE.Group {
  const g = new THREE.Group();
  g.position.set(p.x, p.y + 0.4, p.z);
  const m = new THREE.MeshBasicMaterial({ color: 0xffd23a, transparent: true, side: THREE.DoubleSide });
  for (let i = 0; i < STARS; i++) {
    const star = new THREE.Mesh(STAR, m);
    star.userData.dir = new THREE.Vector3(Math.sin((i * 2 * Math.PI) / STARS), 0.8, Math.cos((i * 2 * Math.PI) / STARS));
    g.add(star);
  }
  return g;
}

// Starts this frame's bursts and shakes, moves the live ones on, and returns the camera's offset for
// `target`, the point it orbits.
export function drawJuice(j: Juice, sim: Sim, scene: THREE.Scene, camera: THREE.Camera, target: THREE.Vector3 | null): THREE.Vector3 {
  for (const e of sim.events) {
    if (e.type !== 'noise' || !IMPACTS.has(e.cause)) continue;
    const stars = burst(e.p);
    scene.add(stars);
    j.bursts.push({ stars, born: sim.time });
    const near = target ? Math.max(0, 1 - target.distanceTo(stars.position) / SHAKE_RANGE) : 0;
    if (near > 0) j.shakes.push({ amp: SHAKE * e.loud * near, born: sim.time });
  }
  j.bursts = j.bursts.filter(({ stars, born }) => {
    const t = (sim.time - born) / STAR_TIME;
    const m = (stars.children[0] as THREE.Mesh).material as THREE.MeshBasicMaterial;
    if (t >= 1) {
      scene.remove(stars);
      m.dispose();
      return false;
    }
    for (const s of stars.children) {
      s.position.copy(s.userData.dir).multiplyScalar(0.3 + 0.7 * t);
      s.quaternion.copy(camera.quaternion);
      s.rotateZ(6 * t);
    }
    m.opacity = 1 - t * t;
    return true;
  });
  j.shakes = j.shakes.filter(({ born }) => sim.time - born < SHAKE_TIME);
  const amp = j.shakes.reduce((a, { amp: s, born }) => a + s * (1 - (sim.time - born) / SHAKE_TIME), 0);
  const t = sim.time;
  return j.offset.set(Math.sin(97 * t), Math.sin(131 * t + 1), Math.sin(113 * t + 2)).multiplyScalar(Math.min(SHAKE, amp) / Math.sqrt(3));
}
