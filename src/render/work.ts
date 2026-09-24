import * as THREE from 'three';
import { OVERLAY } from '../art/palette.ts';
import { characterOf, type NetId } from '../sim/entities.ts';
import { progress, stunnedUntil } from '../sim/mines.ts';
import type { Sim } from '../sim/world.ts';
import { STAR } from './juice.ts';

// Card 57 and its review: what a character is going through, drawn over its head from the sim's queries:
// stars circling over every cat `stunnedUntil` says is stunned (its own client's fact for the own cat,
// derived from the folded blast for the others), and over this client's own character a ring filling from
// `progress` while a plant or a defuse runs, gone the frame it stops. A slipped dog tumbles in its rig
// (view.ts reads the same query). Render keeps the meshes and nothing of the stun or the work.
const STARS = 5;
const SEGMENTS = 48; // of the ring's arc

// `stars` holds a circle of stars per cat stunned at once, made when a frame first needs it (the first at
// once, so its shader compiles with the scene's, card 57), hidden while unused.
export type Work = { stars: THREE.Group; gold: THREE.Material; ring: THREE.Group; arc: THREE.RingGeometry };

function circle(gold: THREE.Material): THREE.Group {
  const stars = new THREE.Group();
  for (let i = 0; i < STARS; i++) stars.add(new THREE.Mesh(STAR, gold));
  return stars;
}

export function createWork(scene: THREE.Scene): Work {
  const gold = new THREE.MeshBasicMaterial({ color: OVERLAY.star, side: THREE.DoubleSide });
  const stars = new THREE.Group().add(circle(gold));
  // A white arc filling clockwise from the top over a black ring, drawn over everything.
  const arc = new THREE.RingGeometry(0.16, 0.24, SEGMENTS, 1, Math.PI / 2, 2 * Math.PI);
  const ring = new THREE.Group();
  for (const [geometry, colour] of [
    [new THREE.RingGeometry(0.13, 0.27, SEGMENTS), OVERLAY.rim],
    [arc, OVERLAY.white],
  ] as const) {
    const m = new THREE.Mesh(geometry, new THREE.MeshBasicMaterial({ color: colour, depthTest: false, side: THREE.DoubleSide }));
    m.renderOrder = 11;
    ring.add(m);
  }
  ring.children[1]!.scale.x = -1;
  stars.visible = ring.visible = false;
  scene.add(stars, ring);
  return { stars, gold, ring, arc };
}

const box = new THREE.Box3();

export function drawWork(w: Work, sim: Sim, objects: Map<NetId, THREE.Object3D>, camera: THREE.Camera): void {
  let n = 0;
  for (const e of sim.entities.values()) {
    const o = objects.get(e.id);
    if (e.kind !== 'cat' || !o || sim.time >= stunnedUntil(sim, e)) continue;
    if (n === w.stars.children.length) w.stars.add(circle(w.gold));
    const stars = w.stars.children[n++]!;
    stars.position.set(o.position.x, box.setFromObject(o).max.y + 0.12, o.position.z);
    stars.children.forEach((s, i) => {
      const a = 5 * sim.time + (i * 2 * Math.PI) / STARS;
      s.position.set(0.28 * Math.sin(a), 0.04 * Math.sin(3 * a), 0.28 * Math.cos(a));
      s.quaternion.copy(camera.quaternion);
      s.scale.setScalar(0.6);
    });
  }
  w.stars.children.forEach((stars, i) => (stars.visible = i < n));
  w.stars.visible = n > 0;
  const me = characterOf(sim.entities, sim.me);
  const o = me && objects.get(me.id);
  const work = progress(sim);
  w.ring.visible = o !== undefined && work !== null;
  if (!o || !work) return;
  w.ring.position.set(o.position.x, box.setFromObject(o).max.y + 0.45, o.position.z);
  w.ring.quaternion.copy(camera.quaternion);
  w.arc.setDrawRange(0, 6 * Math.ceil(SEGMENTS * Math.min(1, work.done)));
}
