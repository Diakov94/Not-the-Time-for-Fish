import RAPIER from '@dimforge/rapier3d-compat';
import type { Collider, RigidBody, Vector } from '@dimforge/rapier3d-compat';
import * as THREE from 'three';
import type { Level } from '../content/level.ts';
import { wear } from '../art/cosmetics.ts';
import { band, emote, pose, type Facts, type Rig } from '../art/rig.ts';
import { settings } from '../settings/store.ts';
import { entityOf, isCharacter, type Entity, type NetId } from '../sim/entities.ts';
import { STEPS } from '../sim/events.ts';
import { hidden } from '../sim/hiding.ts';
import { stunned } from '../sim/mines.ts';
import { speedsOf, yawOf } from '../sim/movement.ts';
import { STEP, type Sim } from '../sim/world.ts';
import { drawLevel } from './level.ts';
import { buildLook, debrisLook, freeLooks, lookOf, wornOf } from './looks.ts';
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
  orbit: THREE.Vector3; // the point the camera orbited on the last frame drawn: where the player is (the ear)
  objects: Map<NetId, THREE.Object3D>;
  level: Level; // the content level drawn, the sim's `level` as of the last frame drawn
  parts: THREE.Group; // that level's statics, doors, points and volumes
  doors: THREE.Object3D[]; // the level's door panels, index for index with the sim's door bodies
  debris: THREE.Object3D[]; // the level's debris, index for index with the sim's local debris bodies
  senses: Senses;
  juice: Juice;
  work: Work;
  markers: Markers;
  peek: Peek;
};
// The last peek pose, until when the camera blends from it back to the orbit, and the own cat's look the
// peek put out of sight.
type Peek = { from: THREE.Vector3; turn: THREE.Quaternion; until: number; unseen: THREE.Object3D | null };

const DISTANCE = 6; // m from the camera to the point above the character it looks at
const EYE = 1; // m: that point's height above the character's centre
const LENS = new RAPIER.Ball(0.2); // what the camera keeps clear of a wall: twice its near plane
const NO_TURN = { x: 0, y: 0, z: 0, w: 1 };
const PEEK_EYE = 0.25; // m above the cat's centre: its head, under a 0.8 m box's top
const BLEND = 0.25; // s from the peek view back to the orbit

export function createView(canvas: HTMLCanvasElement, sim: Sim): View {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
  renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0xbfd8e8);
  scene.add(new THREE.HemisphereLight(0xffffff, 0x445544, 1.5));
  const sun = new THREE.DirectionalLight(0xffffff, 2);
  sun.position.set(4, 10, -3);
  scene.add(sun);
  const camera = new THREE.PerspectiveCamera(60, 1, 0.1, 200);
  camera.position.set(0, 12, -14);
  camera.lookAt(0, 0, 0);
  const view = { renderer, scene, camera, orbit: new THREE.Vector3(), objects: new Map(), level: sim.level, parts: new THREE.Group(), doors: [], debris: [], senses: createSenses(scene), juice: createJuice(), work: createWork(scene), markers: createMarkers(), peek: { from: new THREE.Vector3(), turn: new THREE.Quaternion(), until: -Infinity, unseen: null } };
  drawLevelOf(view, sim);
  return view;
}

// The level drawn is the content the sim's world was built from (`sim.level`), and it follows the world
// when the round's map rebuilds it at prep (card 142): the old level's parts and debris are dropped and
// freed, the new level is drawn in its map's theme, with its door and debris indices anew.
function drawLevelOf(view: View, sim: Sim): void {
  const { scene, work } = view;
  freeLooks(scene, [view.parts, ...view.debris]);
  const { parts, doors } = drawLevel(sim.level, sim.levels);
  const debris = sim.debris.map((d) => debrisLook(sim, d));
  scene.add(parts, ...debris);
  Object.assign(view, { level: sim.level, parts, doors, debris });
  // Every effect's shader compiles now, not on the frame that first shows it (card 57: the first blast's
  // frame took 96 ms), and again for a new level's theme: one of each is added and the hidden overlays
  // shown while the scene compiles.
  const effects = samples();
  scene.add(...effects);
  work.stars.visible = work.ring.visible = true;
  view.renderer.compile(scene, view.camera);
  scene.remove(...effects);
  work.stars.visible = work.ring.visible = false;
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
  if (view.level !== sim.level) drawLevelOf(view, sim);
  const lag = STEP - sim.accumulator;
  const { palette, reducedMotion } = settings(); // this viewer's choices (ADR 0012), read once a frame
  const gone: THREE.Object3D[] = [];
  for (const e of sim.entities.values()) {
    const o = objects.get(e.id);
    // A character whose look the roster changed is built anew.
    if (o?.userData.look !== undefined && o.userData.look !== lookOf(sim, e)) {
      scene.remove(o);
      gone.push(o);
    }
    const drawn = o && o.parent ? o : add(view, sim, e);
    place(drawn, e.body, lag);
    const rig = drawn.userData.rig as Rig | undefined;
    if (rig) {
      wear(rig, wornOf(sim, e));
      // The band shows the side (card 117 after ADR 0014: A the cats, B the dogs); the side is the kind.
      band(rig, e.kind === 'cat' ? 'A' : e.kind === 'dog' ? 'B' : undefined, palette);
      pose(rig, facts(sim, e), sim.time);
    }
  }
  // An emote plays on its sender's character from the frame its event arrives (ADR 0013).
  for (const ev of sim.events) {
    if (ev.type !== 'emote') continue;
    const c = [...sim.entities.values()].find((e) => e.home === ev.from && isCharacter(e.kind));
    const rig = c && (objects.get(c.id)?.userData.rig as Rig | undefined);
    if (rig) emote(rig, ev.n, sim.time);
  }
  sim.doors.forEach((b, i) => place(view.doors[i]!, b, lag));
  sim.debris.forEach((d, i) => place(view.debris[i]!, d.body, lag));
  for (const [id, o] of objects) {
    if (sim.entities.has(id)) continue;
    gone.push(o);
    objects.delete(id);
  }
  freeLooks(scene, gone);
  const o = typeof target === 'string' ? objects.get(target) : undefined;
  const at = o ? eye.copy(o.position).setY(o.position.y + EYE) : typeof target === 'object' ? eye.set(target.x, target.y, target.z) : null;
  if (at) view.orbit.copy(at);
  const shake = drawJuice(view.juice, sim, scene, camera, at);
  const e = typeof target === 'string' ? sim.entities.get(target) : undefined;
  if (view.peek.unseen) view.peek.unseen.visible = true;
  view.peek.unseen = null;
  if (o && e?.kind === 'cat' && e.home === sim.me && hidden(sim, e)) peek(view, sim, o, e);
  else if (at) {
    follow(camera, sim, at, o ? EYE : 0, look, e?.body, shake);
    const k = reducedMotion ? 0 : Math.max(0, (view.peek.until - sim.time) / BLEND); // instant under reduced motion
    camera.position.lerp(view.peek.from, k * k * (3 - 2 * k));
    camera.quaternion.slerp(view.peek.turn, k * k * (3 - 2 * k));
  }
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

// What the sim says a character is doing this frame (ADR 0011), for its rig: its speed over the ground
// from its body, its side's stride and paces, the ownership table's holds, and the queries' stun (its own
// client's fact, so only the own cat's) and hiding.
function facts(sim: Sim, e: Entity): Facts {
  const v = e.body.linvel();
  const s = speedsOf(e);
  let carrying = false;
  for (const row of sim.ownership.rows.values()) carrying ||= row.held && row.owner === e.home;
  return {
    speed: Math.hypot(v.x, v.z),
    stride: STEPS[e.kind === 'dog' ? 'dog' : 'cat'].stride,
    pace: { sneak: s.sneak, walk: s.walk },
    carrying,
    held: sim.ownership.rows.get(e.id)?.held ?? false,
    stunned: e.home === sim.me && stunned(sim),
    hidden: e.kind === 'cat' && hidden(sim, e),
  };
}

// The body's pose `lag` seconds before its current one, read back along its own velocities: Rapier moved
// it from exactly there in the last step (kinematic copies, the carried prop and the driven character to
// 1e-8 m; a falling dynamic body to 1 mm, from gravity inside the step). So the frame shows the sim's
// previous and current poses interpolated, and nothing keeps a pose between frames.
export function place(o: THREE.Object3D, b: RigidBody, lag: number): void {
  const p = b.translation();
  const v = b.linvel();
  const q = b.rotation();
  const w = b.angvel();
  o.position.set(p.x - v.x * lag, p.y - v.y * lag, p.z - v.z * lag);
  o.quaternion.set(q.x, q.y, q.z, q.w);
  const turn = Math.hypot(w.x, w.y, w.z);
  if (turn > 0) o.quaternion.premultiply(back.setFromAxisAngle(axis.set(w.x / turn, w.y / turn, w.z / turn), -turn * lag));
}

// GAME.md, Camera (card 56): while the sim's `hidden` says the player's own cat is in a hiding spot, the
// camera leaves the orbit for a fixed view from the cat's head, inside the spot, looking level toward
// where the cat last stood outside one (the sim's `outside`): out of the way it came in, never through
// the spot's walls. The cat's own look is out of sight meanwhile. Leaving, the camera blends back to the
// orbit over BLEND, or at once under reduced motion.
function peek(view: View, sim: Sim, o: THREE.Object3D, cat: Entity): void {
  const { camera, peek } = view;
  camera.position.set(o.position.x, o.position.y + PEEK_EYE, o.position.z);
  const out = sim.outside;
  const [dx, dz] = out ? [out.x - o.position.x, out.z - o.position.z] : [0, 0];
  const yaw = Math.hypot(dx, dz) > 1e-3 ? Math.atan2(dx, dz) : yawOf(cat.body.rotation());
  camera.lookAt(camera.position.x + Math.sin(yaw), camera.position.y, camera.position.z + Math.cos(yaw));
  peek.from.copy(camera.position);
  peek.turn.copy(camera.quaternion);
  peek.until = sim.time + BLEND;
  peek.unseen = o;
  o.visible = false;
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

const projected = new THREE.Vector3();

// Where a world point falls on the canvas, in CSS pixels from its top left, through the camera of the
// frame render drew last (the HUD's ping arrows, card 61). A point behind the camera comes out mirrored
// through the centre, and says so.
export function project(view: View, p: Vector): { x: number; y: number; behind: boolean } {
  const v = projected.set(p.x, p.y, p.z).project(view.camera);
  const { clientWidth: w, clientHeight: h } = view.renderer.domElement;
  return { x: ((v.x + 1) / 2) * w, y: ((1 - v.y) / 2) * h, behind: v.z > 1 };
}
