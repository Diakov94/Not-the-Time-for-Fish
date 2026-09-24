import * as THREE from 'three';
import { isCharacter, type NetId } from '../sim/entities.ts';
import { progress, stunned } from '../sim/mines.ts';
import type { Sim } from '../sim/world.ts';
import { STAR } from './juice.ts';

// Card 57: what this client's own character is going through, drawn over its head from the sim's queries
// of this client's own facts: stars circling while `stunned` says so (the others see the launch and the
// blast, not the stun), and a ring filling from `progress` while a plant or a defuse runs, gone the frame
// it stops. Render keeps the meshes and nothing of the stun or the work.
const STARS = 5;
const SEGMENTS = 48; // of the ring's arc

export type Work = { stars: THREE.Group; ring: THREE.Group; arc: THREE.RingGeometry };

export function createWork(scene: THREE.Scene): Work {
  const stars = new THREE.Group();
  const gold = new THREE.MeshBasicMaterial({ color: 0xffd23a, side: THREE.DoubleSide });
  for (let i = 0; i < STARS; i++) stars.add(new THREE.Mesh(STAR, gold));
  // A white arc filling clockwise from the top over a black ring, drawn over everything.
  const arc = new THREE.RingGeometry(0.16, 0.24, SEGMENTS, 1, Math.PI / 2, 2 * Math.PI);
  const ring = new THREE.Group();
  for (const [geometry, colour] of [
    [new THREE.RingGeometry(0.13, 0.27, SEGMENTS), 0x111111],
    [arc, 0xffffff],
  ] as const) {
    const m = new THREE.Mesh(geometry, new THREE.MeshBasicMaterial({ color: colour, depthTest: false, side: THREE.DoubleSide }));
    m.renderOrder = 11;
    ring.add(m);
  }
  ring.children[1]!.scale.x = -1;
  stars.visible = ring.visible = false;
  scene.add(stars, ring);
  return { stars, ring, arc };
}

const box = new THREE.Box3();

export function drawWork(w: Work, sim: Sim, objects: Map<NetId, THREE.Object3D>, camera: THREE.Camera): void {
  const me = [...sim.entities.values()].find((e) => e.home === sim.me && isCharacter(e.kind));
  const o = me && objects.get(me.id);
  const work = progress(sim);
  w.stars.visible = o !== undefined && stunned(sim);
  w.ring.visible = o !== undefined && work !== null;
  if (!o || (!w.stars.visible && !w.ring.visible)) return;
  const top = box.setFromObject(o).max.y;
  if (w.stars.visible) {
    w.stars.position.set(o.position.x, top + 0.12, o.position.z);
    w.stars.children.forEach((s, i) => {
      const a = 5 * sim.time + (i * 2 * Math.PI) / STARS;
      s.position.set(0.28 * Math.sin(a), 0.04 * Math.sin(3 * a), 0.28 * Math.cos(a));
      s.quaternion.copy(camera.quaternion);
      s.scale.setScalar(0.6);
    });
  }
  if (work) {
    w.ring.position.set(o.position.x, top + 0.45, o.position.z);
    w.ring.quaternion.copy(camera.quaternion);
    w.arc.setDrawRange(0, 6 * Math.ceil(SEGMENTS * Math.min(1, work.done)));
  }
}
