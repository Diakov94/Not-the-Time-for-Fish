import RAPIER from '@dimforge/rapier3d-compat';
import type { Collider, RigidBody, Vector } from '@dimforge/rapier3d-compat';
import * as THREE from 'three';
import { entityOf, isCharacter, type Entity, type NetId } from '../sim/entities.ts';
import { STEP, type Sim } from '../sim/world.ts';
import { drawLevel } from './level.ts';
import { buildLook, debrisLook, lookOf } from './looks.ts';
import { createJuice, drawJuice, samples, type Juice } from './juice.ts';
import { createMarkers, drawMarkers, type Markers } from './markers.ts';
import { createSenses, drawSenses, type Senses } from './senses.ts';
import { createWork, drawWork, type Work } from './work.ts';

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
  doors: THREE.Object3D[]; // the level's door panels, index for index with the sim's door bodies
  debris: THREE.Object3D[]; // the level's debris, index for index with the sim's local debris bodies
  senses: Senses;
  juice: Juice;
  work: Work;
  markers: Markers;
};

const DISTANCE = 6; // m from the camera to the point above the character it looks at
const EYE = 1; // m: that point's height above the character's centre
const LENS = new RAPIER.Ball(0.2); // what the camera keeps clear of a wall: twice its near plane
const NO_TURN = { x: 0, y: 0, z: 0, w: 1 };

// The level drawn is the content the sim's world was built from (`sim.level`).
export function createView(canvas: HTMLCanvasElement, sim: Sim): View {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
  renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0xbfd8e8);
  scene.add(new THREE.HemisphereLight(0xffffff, 0x445544, 1.5));
  const sun = new THREE.DirectionalLight(0xffffff, 2);
  sun.position.set(4, 10, -3);
  scene.add(sun);
  const doors = drawLevel(scene, sim.level);
  const camera = new THREE.PerspectiveCamera(60, 1, 0.1, 200);
  camera.position.set(0, 12, -14);
  camera.lookAt(0, 0, 0);
  const debris = sim.debris.map((d) => {
    const o = debrisLook(sim, d);
    scene.add(o);
    return o;
  });
  const view = { renderer, scene, camera, objects: new Map(), doors, debris, senses: createSenses(scene), juice: createJuice(), work: createWork(scene), markers: createMarkers() };
  // Every effect's shader compiles now, not on the frame that first shows it (card 57: the first blast's
  // frame took 96 ms): one of each is added and the hidden overlays shown while the scene compiles.
  const effects = samples();
  scene.add(...effects);
  view.work.stars.visible = view.work.ring.visible = true;
  renderer.compile(scene, camera);
  scene.remove(...effects);
  view.work.stars.visible = view.work.ring.visible = false;
  return view;
}

const size = new THREE.Vector2();
const eye = new THREE.Vector3();
const ray = new THREE.Vector3();
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
  for (const e of sim.entities.values()) {
    const o = objects.get(e.id);
    // A character whose look the roster changed is built anew.
    if (o?.userData.look !== undefined && o.userData.look !== lookOf(sim, e)) scene.remove(o);
    place(o && o.parent ? o : add(view, sim, e), e.body, lag);
  }
  sim.doors.forEach((b, i) => place(view.doors[i]!, b, lag));
  sim.debris.forEach((d, i) => place(view.debris[i]!, d.body, lag));
  for (const [id, o] of objects) {
    if (sim.entities.has(id)) continue;
    scene.remove(o);
    objects.delete(id);
  }
  const o = typeof target === 'string' ? objects.get(target) : undefined;
  const at = o ? eye.copy(o.position).setY(o.position.y + EYE) : typeof target === 'object' ? eye.set(target.x, target.y, target.z) : null;
  const shake = drawJuice(view.juice, sim, scene, camera, at);
  if (at) follow(camera, sim, at, o ? EYE : 0, look, typeof target === 'string' ? sim.entities.get(target)?.body : undefined, shake);
  drawSenses(view.senses, sim, scene, camera);
  drawWork(view.work, sim, objects, camera);
  drawMarkers(view.markers, sim, scene, camera);
  renderer.render(scene, camera);
}

// An entity's look is built on first sight from its kind, its collider, a prop's content label and a
// character's look in the roster; nothing of the entity is copied into render.
function add(view: View, sim: Sim, e: Entity): THREE.Object3D {
  const o = buildLook(sim, e);
  view.scene.add(o);
  view.objects.set(e.id, o);
  return o;
}

// The body's pose `lag` seconds before its current one, read back along its own velocities: Rapier moved
// it from exactly there in the last step (kinematic copies, the carried prop and the driven character to
// 1e-8 m; a falling dynamic body to 1 mm, from gravity inside the step). So the frame shows the sim's
// previous and current poses interpolated, and nothing keeps a pose between frames.
function place(o: THREE.Object3D, b: RigidBody, lag: number): void {
  const p = b.translation();
  const v = b.linvel();
  const q = b.rotation();
  const w = b.angvel();
  o.position.set(p.x - v.x * lag, p.y - v.y * lag, p.z - v.z * lag);
  o.quaternion.set(q.x, q.y, q.z, q.w);
  const turn = Math.hypot(w.x, w.y, w.z);
  if (turn > 0) o.quaternion.premultiply(back.setFromAxisAngle(axis.set(w.x / turn, w.y / turn, w.z / turn), -turn * lag));
}

// The third-person camera: DISTANCE behind the point `at`, orbiting it by `look`, and pulled in along that
// line to where a LENS swept out from the point first meets any collider but a character passing by, so
// a wall or a prop is never between it and the point. That includes a blocker the followed body passes:
// a cat route is drawn as a hole with the wall over it, and a camera through it would face that wall.
// The closer it is pulled, the further it looks down from `at` toward the character `lift` below, which
// a camera backed into a wall would otherwise have under its lens and out of view. `shake` is added last
// (card 33).
function follow(
  camera: THREE.PerspectiveCamera,
  sim: Sim,
  at: THREE.Vector3,
  lift: number,
  look: Look,
  body: RigidBody | undefined,
  shake: THREE.Vector3,
): void {
  ray.set(-Math.sin(look.yaw) * Math.cos(look.pitch), Math.sin(look.pitch), -Math.cos(look.yaw) * Math.cos(look.pitch));
  const notCharacter = (c: Collider) => {
    const e = entityOf(sim.entities, c);
    return !e || !isCharacter(e.kind);
  };
  const flags = RAPIER.QueryFilterFlags.EXCLUDE_SENSORS;
  const hit = sim.world.castShape(at, NO_TURN, ray, LENS, 0, DISTANCE, false, flags, undefined, undefined, body, notCharacter);
  const d = hit?.time_of_impact ?? DISTANCE;
  camera.position.copy(ray).multiplyScalar(d).add(at);
  camera.lookAt(at.x, at.y - lift * (1 - d / DISTANCE), at.z);
  camera.position.add(shake);
}
