import * as THREE from 'three';
import { GLASS, OVERLAY } from '../art/palette.ts';
import { settings } from '../settings/store.ts';
import type { Sim } from '../sim/world.ts';

// GAME.md, Game Feel (card 33): cartoon impact stars and camera shake on a loud impact, both read from
// the frame's event list; card 39's blast feeds the same path. Every viewer sees the stars. The shake is
// an offset `follow` adds to the camera, proportional to the impact's loudness and how near it is to
// the camera's target; the target itself never moves. Render keeps each burst's and shake's age only.
// Which noises are impacts is the sim's word: the noise's `cause` (card 23), an impact or a blast. A
// mine's `blast` event, on every client at the fold, is a comic "boom" puff and a shockwave ring on the
// floor (card 57), gone after PUFF_TIME; the ring is the look of a bang, not the blast's reach. A water
// bomb's blast (card 129) is a splash instead: drops thrown up and out that fall back, and a ring of
// water, in the same time.
const IMPACTS = new Set(['impact', 'blast']);
export const SHAKE = 0.1; // m: the shake of the loudest noise at the target; none under reduced motion (card 117)
const SHAKE_RANGE = 8; // m: an impact this far from the target shakes nothing
const SHAKE_TIME = 0.25; // s
const STARS = 6; // per burst
const STAR_TIME = 0.5; // s
const PUFF_TIME = 0.8; // s
const PUFFS = 7; // balls of smoke per puff
const DROPS = 12; // drops per splash
const DROP = 0.07; // m: a drop's radius
const FALL = 2.5; // m: how far a drop has fallen back by the splash's end

export type Juice = {
  bursts: { stars: THREE.Group; born: number }[];
  shakes: { amp: number; born: number }[];
  puffs: { puff: THREE.Group; born: number }[];
  offset: THREE.Vector3;
};

export function createJuice(): Juice {
  return { bursts: [], shakes: [], puffs: [], offset: new THREE.Vector3() };
}

const outline: THREE.Vector2[] = [];
for (let i = 0; i < 10; i++) {
  const r = i % 2 ? 0.08 : 0.18;
  outline.push(new THREE.Vector2(r * Math.sin((i * Math.PI) / 5), r * Math.cos((i * Math.PI) / 5)));
}
export const STAR = new THREE.ShapeGeometry(new THREE.Shape(outline));
const SMOKE = new THREE.IcosahedronGeometry(1, 1);
const WAVE = new THREE.RingGeometry(0.85, 1, 32).rotateX(-Math.PI / 2);

function burst(p: { x: number; y: number; z: number }): THREE.Group {
  const g = new THREE.Group();
  g.position.set(p.x, p.y + 0.4, p.z);
  const m = new THREE.MeshBasicMaterial({ color: OVERLAY.star, transparent: true, side: THREE.DoubleSide });
  for (let i = 0; i < STARS; i++) {
    const star = new THREE.Mesh(STAR, m);
    star.userData.dir = new THREE.Vector3(Math.sin((i * 2 * Math.PI) / STARS), 0.8, Math.cos((i * 2 * Math.PI) / STARS));
    g.add(star);
  }
  return g;
}

// A puff: a ball of smoke at the mine and more around it, and a flat ring lying on its floor.
function puff(p: { x: number; y: number; z: number }): THREE.Group {
  const g = new THREE.Group();
  g.position.set(p.x, p.y, p.z);
  const smoke = new THREE.MeshLambertMaterial({ color: OVERLAY.smoke, flatShading: true, transparent: true });
  for (let i = 0; i < PUFFS; i++) {
    const ball = new THREE.Mesh(SMOKE, smoke);
    const a = (i * 2 * Math.PI) / (PUFFS - 1);
    ball.userData.dir = i === 0 ? new THREE.Vector3(0, 0.5, 0) : new THREE.Vector3(0.45 * Math.sin(a), 0.25 + 0.15 * (i % 2), 0.45 * Math.cos(a));
    g.add(ball);
  }
  return g.add(new THREE.Mesh(WAVE, new THREE.MeshBasicMaterial({ color: OVERLAY.white, transparent: true, side: THREE.DoubleSide })));
}

// A splash: drops thrown up and out round the bomb, and a ring of water lying on its floor.
function splash(p: { x: number; y: number; z: number }): THREE.Group {
  const g = new THREE.Group();
  g.position.set(p.x, p.y, p.z);
  g.userData.water = true;
  const water = new THREE.MeshLambertMaterial({ color: GLASS.pane, flatShading: true, transparent: true });
  for (let i = 0; i < DROPS; i++) {
    const drop = new THREE.Mesh(SMOKE, water);
    const a = (i * 2 * Math.PI) / DROPS;
    drop.userData.dir = new THREE.Vector3(0.6 * Math.sin(a), 1.2 + 0.4 * (i % 3), 0.6 * Math.cos(a));
    drop.scale.setScalar(DROP);
    g.add(drop);
  }
  return g.add(new THREE.Mesh(WAVE, new THREE.MeshBasicMaterial({ color: GLASS.pane, transparent: true, side: THREE.DoubleSide })));
}

// One of each effect, for the view to compile their shaders before its first frame.
export function samples(): THREE.Object3D[] {
  return [burst({ x: 0, y: 0, z: 0 }), puff({ x: 0, y: 0, z: 0 }), splash({ x: 0, y: 0, z: 0 })];
}

// Starts this frame's bursts and shakes, moves the live ones on, and returns the camera's offset for
// `target`, the point it orbits: none while the viewer asks for reduced motion (ADR 0012), when the stars
// and puffs still play, for they are not motion of the viewer.
export function drawJuice(j: Juice, sim: Sim, scene: THREE.Scene, camera: THREE.Camera, target: THREE.Vector3 | null): THREE.Vector3 {
  for (const e of sim.events) {
    if (e.type === 'blast') {
      const p = (e.variant === 'water' ? splash : puff)(e.p);
      scene.add(p);
      j.puffs.push({ puff: p, born: sim.time });
    }
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
  j.puffs = j.puffs.filter(({ puff: g, born }) => {
    const t = (sim.time - born) / PUFF_TIME;
    const [smoke, wave] = [g.children[0], g.children.at(-1)].map((m) => (m as THREE.Mesh).material as THREE.Material);
    if (t >= 1) {
      scene.remove(g);
      smoke!.dispose();
      wave!.dispose();
      return false;
    }
    for (const ball of g.children.slice(0, -1)) {
      ball.position.copy(ball.userData.dir).multiplyScalar(0.5 + 1.5 * t);
      if (g.userData.water) ball.position.y -= FALL * t * t;
      else ball.scale.setScalar(0.3 + 0.3 * Math.sqrt(t));
    }
    g.children.at(-1)!.scale.setScalar(0.3 + 2 * t);
    smoke!.opacity = 1 - t * t;
    wave!.opacity = 1 - t;
    return true;
  });
  j.shakes = j.shakes.filter(({ born }) => sim.time - born < SHAKE_TIME);
  const amp = settings().reducedMotion ? 0 : j.shakes.reduce((a, { amp: s, born }) => a + s * (1 - (sim.time - born) / SHAKE_TIME), 0);
  const t = sim.time;
  return j.offset.set(Math.sin(97 * t), Math.sin(131 * t + 1), Math.sin(113 * t + 2)).multiplyScalar(Math.min(SHAKE, amp) / Math.sqrt(3));
}
