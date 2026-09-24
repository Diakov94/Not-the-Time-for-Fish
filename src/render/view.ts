import type { Ball, Capsule, Cuboid, Shape, Vector } from '@dimforge/rapier3d-compat';
import * as THREE from 'three';
import { isCharacter, type Entity, type NetId } from '../sim/entities.ts';
import { STEP, type Sim } from '../sim/world.ts';

// Where the camera orbits its target from: the app's mouse input sets it.
export type Look = { yaw: number; pitch: number }; // yaw 0 looks along +z; pitch > 0 looks down
// What the camera orbits, the app's choice (card 51 spectates): an entity by its net id, EYE above its
// centre, or a fixed point to free-look around.
export type Target = NetId | Vector;

// A view of the sim, never a fact (ADR 0003): one Object3D per row of the entity table, keyed by net id,
// posed from its Rapier body on every frame.
export type View = {
  renderer: THREE.WebGLRenderer;
  scene: THREE.Scene;
  camera: THREE.PerspectiveCamera;
  objects: Map<NetId, THREE.Object3D>;
};

// An entity is drawn as its body is shaped: the sim's collider is the one owner of every kind's size.
function geometry(shape: Shape): THREE.BufferGeometry {
  if ('halfExtents' in shape) {
    const h = (shape as Cuboid).halfExtents;
    return new THREE.BoxGeometry(2 * h.x, 2 * h.y, 2 * h.z);
  }
  if ('halfHeight' in shape) return new THREE.CapsuleGeometry((shape as Capsule).radius, 2 * (shape as Capsule).halfHeight, 4, 12);
  return new THREE.SphereGeometry((shape as Ball).radius, 12, 8);
}
const NOSE = new THREE.BoxGeometry(0.15, 0.15, 0.2); // shows a character's facing: its grab reaches forward
const CRATE = new THREE.MeshStandardMaterial({ color: 0xb07a45 });
const MINE = new THREE.MeshStandardMaterial({ color: 0xf28c28 }); // this player's character
const THEIRS = new THREE.MeshStandardMaterial({ color: 0x3f7fd0 });
const LEVEL = new THREE.MeshStandardMaterial({ color: 0x9aa59a });
const DISTANCE = 6; // m from the camera to the point above the character it looks at
const EYE = 1; // m: that point's height above the character's centre

export function createView(canvas: HTMLCanvasElement, sim: Sim): View {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
  renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0xbfd8e8);
  scene.add(new THREE.HemisphereLight(0xffffff, 0x445544, 1.5));
  const sun = new THREE.DirectionalLight(0xffffff, 2);
  sun.position.set(4, 10, -3);
  scene.add(sun);
  // The level's static geometry is the world's colliders without a body, drawn as they stand.
  sim.world.forEachCollider((c) => {
    if (c.parent()) return;
    const h = (c.shape as Cuboid).halfExtents;
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(2 * h.x, 2 * h.y, 2 * h.z), LEVEL);
    const p = c.translation();
    const q = c.rotation();
    mesh.position.set(p.x, p.y, p.z);
    mesh.quaternion.set(q.x, q.y, q.z, q.w);
    scene.add(mesh);
  });
  const camera = new THREE.PerspectiveCamera(60, 1, 0.1, 200);
  camera.position.set(0, 12, -14);
  camera.lookAt(0, 0, 0);
  return { renderer, scene, camera, objects: new Map() };
}

const size = new THREE.Vector2();
const eye = new THREE.Vector3();
const axis = new THREE.Vector3();
const back = new THREE.Quaternion();

// One frame. The sim has stepped up to its current pose and holds `accumulator` seconds not yet stepped,
// so the moment to show lies STEP - accumulator before the current pose, between it and the previous one.
export function draw(view: View, sim: Sim, look: Look, target: Target | undefined): void {
  const { renderer, scene, camera, objects } = view;
  const { clientWidth: w, clientHeight: h } = renderer.domElement;
  if (renderer.getSize(size).x !== w || size.y !== h) {
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
  }
  const lag = STEP - sim.accumulator;
  for (const e of sim.entities.values()) place(objects.get(e.id) ?? add(view, sim, e), e, lag);
  for (const [id, o] of objects) {
    if (sim.entities.has(id)) continue;
    scene.remove(o);
    objects.delete(id);
  }
  const o = typeof target === 'string' ? objects.get(target) : undefined;
  const at = o ? eye.copy(o.position).setY(o.position.y + EYE) : typeof target === 'object' ? eye.set(target.x, target.y, target.z) : null;
  if (at) follow(camera, at, look);
  renderer.render(scene, camera);
}

function add(view: View, sim: Sim, e: Entity): THREE.Object3D {
  const material = !isCharacter(e.kind) ? CRATE : e.home === sim.me ? MINE : THEIRS;
  const shape = e.body.collider(0).shape;
  const o = new THREE.Mesh(geometry(shape), material);
  if (isCharacter(e.kind)) o.add(new THREE.Mesh(NOSE, material).translateY(0.3).translateZ((shape as Capsule).radius));
  view.scene.add(o);
  view.objects.set(e.id, o);
  return o;
}

// The body's pose `lag` seconds before its current one, read back along its own velocities: Rapier moved
// it from exactly there in the last step (kinematic copies, the carried prop and the driven character to
// 1e-8 m; a falling dynamic body to 1 mm, from gravity inside the step). So the frame shows the sim's
// previous and current poses interpolated, and nothing keeps a pose between frames.
function place(o: THREE.Object3D, e: Entity, lag: number): void {
  const b = e.body;
  const p = b.translation();
  const v = b.linvel();
  const q = b.rotation();
  const w = b.angvel();
  o.position.set(p.x - v.x * lag, p.y - v.y * lag, p.z - v.z * lag);
  o.quaternion.set(q.x, q.y, q.z, q.w);
  const turn = Math.hypot(w.x, w.y, w.z);
  if (turn > 0) o.quaternion.premultiply(back.setFromAxisAngle(axis.set(w.x / turn, w.y / turn, w.z / turn), -turn * lag));
}

// The third-person camera: DISTANCE behind the point it looks at, orbiting it by `look`.
function follow(camera: THREE.PerspectiveCamera, at: THREE.Vector3, look: Look): void {
  const flat = Math.cos(look.pitch) * DISTANCE;
  camera.position.set(at.x - Math.sin(look.yaw) * flat, at.y + Math.sin(look.pitch) * DISTANCE, at.z - Math.cos(look.yaw) * flat);
  camera.lookAt(at);
}
