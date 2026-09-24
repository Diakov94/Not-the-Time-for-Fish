/// <reference types="vite/client" />
import * as THREE from 'three';
import type { Character } from '../content/characters.ts';
import { COAT, DEFAULT, INK, material } from './palette.ts';

// ADR 0011's rig: one skeleton per side, named parts a character file dresses and the poses every
// character shares. A character stands upright in its side's frame (a cat 0.5 x 0.9 m, a dog 0.8 x 1.4 m,
// feet at the bottom, +z its facing), scaled to its capsule. The rig takes the sim's facts and the time
// as arguments and imports nothing of the sim: render's view collects the facts once a frame.

export type Side = Character['side'];
export type Anchor = 'head' | 'back' | 'collar';
// The four legs: fore left and right (a standing character's arms), hind left and right.
export type Legs = [THREE.Group, THREE.Group, THREE.Group, THREE.Group];
export type Parts = { body: THREE.Group; head: THREE.Group; ears: THREE.Group; muzzle: THREE.Group; legs: Legs; tail: THREE.Group };
export type Rig = {
  side: Side;
  root: THREE.Group; // the look render places on the body; its children are in frame units
  parts: Parts;
  // Where cosmetics attach. A head anchor sits on the top of the head, +y out of it, and carries the
  // head's radius in `userData.r` for a hat to fit; a character that reshapes its head moves it.
  anchors: Record<Anchor, THREE.Object3D>;
  emotes: Emote[]; // the character's, in its roster order
  rest: Map<THREE.Object3D, [THREE.Vector3, THREE.Euler]>; // every pivot's dressed pose
  walked: number; // m travelled over the ground: the legs' clock
  at: number; // the time of the last pose
  emote: { n: number; at: number } | null; // the last emote event's number and when it arrived
};
// An emote poses the rig over its length; `k` runs from 0 to 1. It starts and ends in idle.
export type Emote = { length: number; pose: (rig: Rig, k: number) => void };
// A character file's default export: its geometry on the rig and its emotes by the roster's names.
export type Look = { dress: (rig: Rig, c: Character) => void; emotes?: Record<string, Emote> };

// What the sim says a character is doing this frame (ADR 0011: the sim owns it, the rig only draws it).
export type Facts = {
  speed: number; // m/s over the ground, the body's velocity
  stride: number; // m travelled per leg cycle: the side's step stride (card 23)
  pace: { sneak: number | null; walk: number }; // the side's speeds, m/s; a side without a sneak has null
  carrying: boolean; // its player holds something
  held: boolean; // another player holds it
  stunned: boolean;
  hidden: boolean;
};
export type Pose = 'idle' | 'walk' | 'run' | 'sneak' | 'carry' | 'stunned' | 'tumble' | 'emote';

export const FRAME: Record<Side, { w: number; h: number }> = { cat: { w: 0.5, h: 0.9 }, dog: { w: 0.8, h: 1.4 } };
const STILL = 0.3; // m/s: slower than this is standing
const RUN = 1.25; // times the walk: faster than this is a run
const TAU = 2 * Math.PI;

// A character's three colours: the palette's coat slots its roster entry names.
export function coats(c: Character): { fur: number; belly: number; accent: number } {
  const { fur, belly, accent } = c.palette;
  return { fur: COAT[fur] ?? DEFAULT, belly: COAT[belly] ?? DEFAULT, accent: COAT[accent] ?? DEFAULT };
}

// Shapes in a part's frame, flat-shaded in a palette colour.
const up = new THREE.Vector3(0, 1, 0);
export type V3 = [number, number, number];
export function ball(r: number, colour: number, at: V3, s: V3 = [1, 1, 1]): THREE.Mesh {
  const m = new THREE.Mesh(new THREE.IcosahedronGeometry(r, 1), material(colour));
  m.position.set(...at);
  m.scale.set(...s);
  return m;
}
export function rod(r: number, colour: number, from: V3, to: V3): THREE.Mesh {
  const a = new THREE.Vector3(...from);
  const d = new THREE.Vector3(...to).sub(a);
  const m = new THREE.Mesh(new THREE.CylinderGeometry(r, r, d.length(), 6), material(colour));
  m.position.copy(a).addScaledVector(d, 0.5);
  m.quaternion.setFromUnitVectors(up, d.normalize());
  return m;
}
export function cone(r: number, h: number, colour: number, at: V3, tilt: V3 = [0, 0, 0]): THREE.Mesh {
  const m = new THREE.Mesh(new THREE.ConeGeometry(r, h, 5), material(colour));
  m.position.set(...at);
  m.rotation.set(...tilt);
  return m;
}
export function block(size: V3, colour: number, at: V3): THREE.Mesh {
  const m = new THREE.Mesh(new THREE.BoxGeometry(...size), material(colour));
  m.position.set(...at);
  return m;
}
function pivot(parent: THREE.Object3D, at: V3): THREE.Group {
  const g = new THREE.Group();
  g.position.set(...at);
  parent.add(g);
  return g;
}

// The skeleton's joints per side, in the frame: the body's centre, the neck, the four legs' hips and
// shoulders, the tail's root, and the anchors.
const JOINTS: Record<Side, { neck: V3; legs: [V3, V3, V3, V3]; tail: V3; head: V3; r: number; collar: V3; back: V3 }> = {
  cat: {
    neck: [0, 0.1, 0.02],
    legs: [[-0.17, -0.02, 0.02], [0.17, -0.02, 0.02], [-0.09, -0.25, 0], [0.09, -0.25, 0]],
    tail: [0, -0.25, -0.15],
    head: [0, 0.26, 0],
    r: 0.16,
    collar: [0, 0.1, 0.02],
    back: [0, -0.06, -0.18],
  },
  dog: {
    neck: [0, 0.12, 0.04],
    legs: [[-0.27, 0, 0.04], [0.27, 0, 0.04], [-0.14, -0.38, 0], [0.14, -0.38, 0]],
    tail: [0, -0.3, -0.26],
    head: [0, 0.4, 0],
    r: 0.22,
    collar: [0, 0.1, 0.04],
    back: [0, -0.12, -0.3],
  },
};

// An undressed rig: the joints and anchors only.
function skeleton(side: Side): Rig {
  const j = JOINTS[side];
  const root = new THREE.Group();
  const body = pivot(root, [0, 0, 0]);
  const head = pivot(body, j.neck);
  const ears = pivot(head, [0, 0, 0]);
  const muzzle = pivot(head, [0, 0, 0]);
  const legs = j.legs.map((p) => pivot(body, p)) as Legs;
  const tail = pivot(body, j.tail);
  const top = pivot(head, j.head);
  top.userData.r = j.r;
  const anchors = { head: top, collar: pivot(body, j.collar), back: pivot(body, j.back) };
  return { side, root, parts: { body, head, ears, muzzle, legs, tail }, anchors, emotes: [], rest: new Map(), walked: 0, at: 0, emote: null };
}

// The side's standard body in the character's fur and belly, on the skeleton's joints: a cat small,
// with a tall curled tail; a dog a head taller, broad, a muzzle forward, a short tail. Ears are the file's.
// A character file calls it and adds its detail, or builds its own on the same parts.
export function standard(rig: Rig, fur: number, belly: number): void {
  const { body, head, muzzle, legs, tail } = rig.parts;
  const [fl, fr, hl, hr] = legs;
  if (rig.side === 'cat') {
    for (const leg of [hl, hr]) leg.add(rod(0.045, fur, [0, -0.18, 0], [0, 0, 0]));
    body.add(ball(0.19, fur, [0, -0.09, 0], [1, 1.15, 0.95]), ball(0.13, belly, [0, -0.11, 0.08]));
    fl.add(rod(0.035, fur, [0, 0, 0], [-0.03, -0.16, 0.05]));
    fr.add(rod(0.035, fur, [0, 0, 0], [0.03, -0.16, 0.05]));
    head.add(ball(0.16, fur, [0, 0.11, 0]));
    for (const x of [-1, 1]) head.add(ball(0.025, INK.black, [0.06 * x, 0.14, 0.13]));
    muzzle.add(ball(0.022, COAT.nose!, [0, 0.1, 0.15]));
    tail.add(rod(0.035, fur, [0, 0, 0], [0, 0.2, -0.13]), rod(0.035, fur, [0, 0.2, -0.13], [0, 0.45, -0.15]));
    tail.add(rod(0.035, fur, [0, 0.45, -0.15], [0, 0.57, -0.07]));
  } else {
    for (const leg of [hl, hr]) leg.add(rod(0.07, belly, [0, -0.3, 0], [0, 0, 0]));
    body.add(ball(0.3, fur, [0, -0.18, 0], [1, 1.1, 1]));
    fl.add(rod(0.055, fur, [0, 0, 0], [-0.03, -0.25, 0.06]));
    fr.add(rod(0.055, fur, [0, 0, 0], [0.03, -0.25, 0.06]));
    head.add(ball(0.22, fur, [0, 0.18, 0]));
    for (const x of [-1, 1]) head.add(ball(0.035, INK.black, [0.09 * x, 0.25, 0.16]));
    muzzle.add(block([0.2, 0.14, 0.22], belly, [0, 0.13, 0.22]), ball(0.045, INK.black, [0, 0.17, 0.34]));
    tail.add(rod(0.05, fur, [0, 0, 0], [0, 0.2, -0.16]));
  }
}

// A cat's pointed ears, `spread` apart and `y` up the head, tilted outward.
export function catEars(rig: Rig, colour: number, spread: number, y: number, tilt: number, z = -0.02): void {
  for (const x of [-1, 1]) rig.parts.ears.add(cone(0.055, 0.12, colour, [spread * x, y, z], [0, 0, -tilt * x]));
}

// A look for a character: its file's dressing on its side's skeleton, scaled to the capsule (radius and
// half height, m). The dressed pose is the rest every pose starts from.
export function rigFor(c: Character, look: Look, radius: number, halfHeight: number): Rig {
  const rig = skeleton(c.side);
  look.dress(rig, c);
  rig.emotes = c.emotes.map((name) => look.emotes?.[name] ?? CHEER);
  rig.root.traverse((o) => {
    if (o !== rig.root && o instanceof THREE.Group) rig.rest.set(o, [o.position.clone(), o.rotation.clone()]);
  });
  const f = FRAME[c.side];
  const w = 2 * radius;
  rig.root.scale.set(w / f.w, (w + 2 * halfHeight) / f.h, w / f.w);
  rig.root.userData.rig = rig;
  return rig;
}

// The emote a character without its own plays: a hop with a fore paw waved (cards 112-115 replace it).
const CHEER: Emote = {
  length: 1.2,
  pose: (rig, k) => {
    const s = Math.sin(Math.PI * k);
    rig.parts.body.position.y += 0.08 * Math.abs(Math.sin(2 * Math.PI * k));
    rig.parts.legs[1].rotation.x = -2.6 * s;
    rig.parts.legs[1].rotation.z = 0.4 * s * Math.sin(6 * Math.PI * k);
    rig.parts.head.rotation.z = 0.2 * s;
  },
};

// An `emote` event for this character arrived at `t`.
export function emote(rig: Rig, n: number, t: number): void {
  if (n >= 0 && n < rig.emotes.length) rig.emote = { n, at: t };
}

// Which pose the facts ask for: a stun tumbles for as long as it lasts, a held body hangs stunned, an
// emote plays standing still, then the gait from the speed against the side's own paces.
export function poseOf(rig: Rig, f: Facts, t: number): Pose {
  if (f.stunned) return 'tumble';
  if (f.held) return 'stunned';
  const e = rig.emote && rig.emotes[rig.emote.n];
  if (e && t - rig.emote!.at < e.length && f.speed < STILL && !f.carrying) return 'emote';
  if (f.carrying) return 'carry';
  if (f.speed < STILL) return f.hidden && f.pace.sneak !== null ? 'sneak' : 'idle';
  if (f.pace.sneak !== null && f.speed <= (f.pace.sneak + f.pace.walk) / 2) return 'sneak';
  return f.speed > RUN * f.pace.walk ? 'run' : 'walk';
}

// One frame of a character: every pivot back to its rest, then the pose. The legs cycle once per stride
// of ground travelled, so at any speed the feet keep pace with the sim's steps; nothing else of a pose is
// kept between frames.
export function pose(rig: Rig, f: Facts, t: number): Pose {
  rig.walked += f.speed * Math.max(0, t - rig.at);
  rig.at = t;
  for (const [o, [p, r]] of rig.rest) {
    o.position.copy(p);
    o.rotation.copy(r);
  }
  const { body, head, ears, legs, tail } = rig.parts;
  const [fl, fr, hl, hr] = legs;
  const which = poseOf(rig, f, t);
  const phase = TAU * (rig.walked / f.stride);
  const swing = (a: number, b: number) => {
    hl.rotation.x = a * Math.sin(phase);
    hr.rotation.x = -a * Math.sin(phase);
    fl.rotation.x = -b * Math.sin(phase);
    fr.rotation.x = b * Math.sin(phase);
  };
  const breathe = 1 + 0.02 * Math.sin(TAU * t * 0.4);
  body.scale.set(1, breathe, 1);
  tail.rotation.z = 0.15 * Math.sin(TAU * t * 0.5);
  switch (which) {
    case 'idle':
      head.rotation.y = 0.15 * Math.sin(TAU * t * 0.13);
      break;
    case 'walk':
      swing(0.45, 0.35);
      body.position.y = 0.012 * Math.abs(Math.cos(phase));
      tail.rotation.z = 0.25 * Math.sin(phase);
      break;
    case 'run':
      swing(0.9, 0.8);
      body.rotation.x = 0.22;
      body.position.y = 0.03 * Math.abs(Math.cos(phase));
      head.rotation.x = -0.15;
      tail.rotation.x = -0.5;
      break;
    case 'sneak':
      swing(0.3, 0.25);
      body.position.y = -0.06;
      body.rotation.x = 0.35;
      head.rotation.x = -0.3;
      ears.rotation.x = -0.5;
      tail.rotation.x = -0.9;
      break;
    case 'carry':
      swing(0.4, 0);
      fl.rotation.x = fr.rotation.x = -1.3;
      body.rotation.x = -0.08;
      break;
    case 'stunned':
      for (const [i, leg] of legs.entries()) leg.rotation.x = 0.2 * Math.sin(TAU * t * 0.7 + i);
      head.rotation.z = 0.5 * Math.sin(TAU * t * 0.35);
      head.rotation.x = 0.4;
      tail.rotation.x = 0.6;
      break;
    case 'tumble':
      body.rotation.x = TAU * 0.9 * t;
      body.rotation.z = 0.4 * Math.sin(TAU * t * 0.6);
      for (const [i, leg] of legs.entries()) leg.rotation.x = 1.2 * Math.sin(TAU * t * 1.5 + i * 1.7);
      head.rotation.y = 0.6 * Math.sin(TAU * t * 1.1);
      break;
    case 'emote':
      rig.emotes[rig.emote!.n]!.pose(rig, (t - rig.emote!.at) / rig.emotes[rig.emote!.n]!.length);
      break;
  }
  return which;
}

// Every character file, found by its path and keyed by the roster's id (ADR 0011: no index lists them).
const LOOKS: Record<string, Look> = Object.fromEntries(
  Object.entries(import.meta.glob<Look>('./characters/*.ts', { eager: true, import: 'default' })).map(([path, look]) => [path.slice(13, -3), look]),
);
export const lookFor = (id: string): Look | undefined => LOOKS[id];
