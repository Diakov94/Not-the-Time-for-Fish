import * as THREE from 'three';
import type { Sim } from '../sim/world.ts';

// CONTEXT.md, Team marker (card 58): a spot a player marks by hand for its own team, drawn for every
// `mark` in the event list; the sim lists a mark for the marker's side only (ADR 0010), so render draws
// what it is given. A pin stands on the point, seen through walls, the same size on screen at any
// distance, and goes after MARK_TIME. Shape tells it from a noise ping (a ring) and value reads in
// greyscale: a white pin with a black rim and a black eye. Render keeps each pin's age only.
const MARK_TIME = 10; // s
const FADE = 1; // s: the last of them it fades over
const SIZE = 0.035; // the pin's height per metre from the camera: about 45 px on a 1000 px tall screen

// A pin in its own plane, its tip at the origin and its head a circle of radius 0.4 at y = 1, `eye` a
// hole in the head.
function pin(eye: boolean): THREE.ShapeGeometry {
  const [r, h] = [0.4, 1];
  const a = Math.asin(r / h);
  const s = new THREE.Shape().moveTo(0, 0).lineTo(r * Math.cos(a), h - r * Math.sin(a));
  s.absarc(0, h, r, -a, Math.PI + a, false).lineTo(0, 0);
  if (eye) s.holes.push(new THREE.Path().absarc(0, h, 0.15, 0, 2 * Math.PI, true));
  return new THREE.ShapeGeometry(s, 16);
}
const FACE = pin(true);
const RIM = pin(false).translate(0, -1, 0).scale(1.3, 1.3, 1).translate(0, 1, 0);

export type Markers = { pins: { pin: THREE.Group; born: number }[] };

export function createMarkers(): Markers {
  return { pins: [] };
}

const at = new THREE.Vector3();

export function drawMarkers(m: Markers, sim: Sim, scene: THREE.Scene, camera: THREE.Camera): void {
  for (const e of sim.events) {
    if (e.type !== 'mark') continue;
    const g = new THREE.Group();
    for (const [geometry, colour] of [
      [RIM, 0x111111],
      [FACE, 0xffffff],
    ] as const) {
      const mesh = new THREE.Mesh(geometry, new THREE.MeshBasicMaterial({ color: colour, transparent: true, depthTest: false, side: THREE.DoubleSide }));
      mesh.renderOrder = 12;
      g.add(mesh);
    }
    g.position.set(e.p.x, e.p.y, e.p.z);
    scene.add(g);
    m.pins.push({ pin: g, born: sim.time });
  }
  m.pins = m.pins.filter(({ pin: g, born }) => {
    const age = sim.time - born;
    if (age >= MARK_TIME) {
      scene.remove(g);
      for (const c of g.children) ((c as THREE.Mesh).material as THREE.Material).dispose();
      return false;
    }
    g.quaternion.copy(camera.quaternion);
    g.scale.setScalar(SIZE * camera.getWorldPosition(at).distanceTo(g.position));
    for (const c of g.children) ((c as THREE.Mesh).material as THREE.MeshBasicMaterial).opacity = Math.min(1, (MARK_TIME - age) / FADE);
    return true;
  });
}
