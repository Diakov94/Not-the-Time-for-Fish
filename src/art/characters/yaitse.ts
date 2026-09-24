import * as THREE from 'three';
import { COAT, INK, material } from '../palette.ts';
import { ball, coats, cone, rod, type Emote, type Look, type Rig } from '../rig.ts';

// Яйце: a white cat shaped like an egg standing on its broad end, no neck, the lid above a cracked line
// round its top is the head; tiny ears, tiny yolk-coloured feet, arm nubs. The egg stands on the tail's
// pivot moved to its base, so the rig's tail sway rocks the whole egg on its feet: it wobbles as it walks
// (and leans back when it runs or sneaks, as the tail lifts). Emotes: the topple, a wobble, a peek.
const H = 0.72; // the egg's height, from its base (the tail's pivot) up
const R = 0.21; // its widest radius
const BASE = -0.43; // the base in the frame; the feet reach the ground at -0.45
const RIM = 0.6 * H; // the crack: the head's pivot, the lid above it
const TAU = 2 * Math.PI;
// The egg's radius at height y over its base: broad below, narrow at the top.
const radius = (y: number) => {
  const u = Math.min(1, Math.max(0, y / H));
  return R * 2 * Math.sqrt(u * (1 - u)) * (1 - 0.18 * (2 * u - 1));
};
// The shell from height a to b over the base, drawn from `from` up: a flat-shaded lathe of ten sides.
function shell(a: number, b: number, from: number, colour: number): THREE.Mesh {
  const profile = Array.from({ length: 9 }, (_, i) => a + ((b - a) * i) / 8).map((y) => new THREE.Vector2(radius(y), y - from));
  return new THREE.Mesh(new THREE.LatheGeometry(profile, 10), material(colour));
}
// The crack: a zigzag just under the rim, one tube round the shell.
function crack(): THREE.Mesh {
  const path = new THREE.CurvePath<THREE.Vector3>();
  const at = (i: number) => {
    const y = RIM - (i % 2 ? 0.035 : 0.004);
    const r = radius(y) + 0.004;
    return new THREE.Vector3(r * Math.sin((TAU * i) / 26), y, r * Math.cos((TAU * i) / 26));
  };
  for (let i = 0; i < 26; i++) path.add(new THREE.LineCurve3(at(i), at(i + 1)));
  return new THREE.Mesh(new THREE.TubeGeometry(path, 52, 0.007, 3, true), material(INK.black));
}

const smooth = (x: number) => (x <= 0 ? 0 : x >= 1 ? 1 : x * x * (3 - 2 * x));
// The body turned by `a` about z round the point where the egg's right side meets the ground, so it
// falls over its own edge rather than its centre.
function tip(rig: Rig, a: number): void {
  const [px, py] = [0.2, -0.45];
  const { body } = rig.parts;
  body.rotation.z = -a;
  body.position.x = px - (px * Math.cos(a) + py * Math.sin(a));
  body.position.y = py - (-px * Math.sin(a) + py * Math.cos(a));
}

// GAME.md's topple: it teeters, falls flat on its side with a bounce, kicks its feet, rights itself and
// rocks to a stop, back upright at the end of its length.
const topple = {
  length: 3.2,
  pose: (rig, k) => {
    const { head, legs, tail } = rig.parts;
    if (k < 0.15) tail.rotation.z += 0.25 * Math.sin((TAU * 2 * k) / 0.15) * (k / 0.15);
    let a = 0;
    if (k < 0.35) a = 1.5 * smooth((k - 0.12) / 0.23) ** 2;
    else if (k < 0.45) a = 1.5 - 0.18 * Math.sin((Math.PI * (k - 0.35)) / 0.1);
    else if (k < 0.72) a = 1.5;
    else a = 1.5 * (1 - smooth((k - 0.72) / 0.18));
    tip(rig, a);
    if (k > 0.45 && k < 0.72) {
      const kick = Math.sin((Math.PI * (k - 0.45)) / 0.27);
      legs[2].rotation.x = 0.9 * kick * Math.sin(TAU * 6 * k);
      legs[3].rotation.x = -0.9 * kick * Math.sin(TAU * 6 * k);
      legs[0].rotation.z = legs[1].rotation.z = 0.6 * kick * Math.sin(TAU * 5 * k);
      head.rotation.z = 0.12 * kick; // the lid knocked askew
    }
    if (k > 0.9) tail.rotation.z += 0.2 * Math.sin((TAU * 2 * (k - 0.9)) / 0.1) * (1 - (k - 0.9) / 0.1);
  },
} satisfies Emote;

// The wobble: it rocks hard on its feet and slowly settles, the lid rattling.
const wobble = {
  length: 2,
  pose: (rig, k) => {
    const { head, legs, tail } = rig.parts;
    const fade = 1 - k;
    tail.rotation.z += 0.45 * Math.sin(TAU * 3 * k) * fade;
    head.rotation.z = 0.08 * Math.sin(TAU * 7 * k) * fade;
    legs[0].rotation.z = -0.8 * Math.max(0, Math.sin(TAU * 3 * k)) * fade;
    legs[1].rotation.z = 0.8 * Math.max(0, -Math.sin(TAU * 3 * k)) * fade;
  },
} satisfies Emote;

// The peek: the lid ducks into the shell, the eyes come up to the crack, look left and right, then the
// lid pops up a little over the yolk and settles.
const peek = {
  length: 2.6,
  pose: (rig, k) => {
    const { head } = rig.parts;
    const lift =
      k < 0.12 ? -0.13 * smooth(k / 0.12)
      : k < 0.3 ? -0.13 + 0.06 * smooth((k - 0.12) / 0.18)
      : k < 0.8 ? -0.07
      : k < 0.9 ? -0.07 + 0.12 * smooth((k - 0.8) / 0.1)
      : 0.05 * (1 - smooth((k - 0.9) / 0.1));
    head.position.y += lift;
    if (k > 0.3 && k < 0.8) head.rotation.y = 0.6 * Math.sin((TAU * (k - 0.3)) / 0.5);
  },
} satisfies Emote;

export default {
  dress: (rig, c) => {
    const { fur, belly, accent } = coats(c);
    const { head, ears, muzzle, legs, tail } = rig.parts; // the body keeps only the feet
    const [fl, fr, hl, hr] = legs;
    tail.position.set(0, BASE, 0);
    tail.add(shell(0, RIM, 0, fur), crack(), ball(0.1, belly, [0, 0.22, radius(0.22) - 0.015], [1, 1.3, 0.35]));
    const yolk = new THREE.Mesh(new THREE.CircleGeometry(radius(RIM - 0.14) - 0.005, 10), material(accent));
    yolk.position.y = RIM - 0.14; // what shows inside when the lid lifts
    yolk.rotation.x = -Math.PI / 2;
    tail.add(yolk, rod(0.03, fur, [0, 0.12, -radius(0.12) + 0.02], [0, 0.08, -0.3]), rod(0.03, fur, [0, 0.08, -0.3], [0, 0.26, -0.34]));
    tail.add(head, fl, fr, rig.anchors.collar, rig.anchors.back);
    head.position.set(0, RIM, 0);
    head.add(shell(RIM, H, RIM, fur));
    for (const x of [-1, 1]) head.add(ball(0.025, INK.black, [0.06 * x, 0.52 - RIM, 0.152]));
    muzzle.add(ball(0.02, COAT.nose!, [0, 0.475 - RIM, radius(0.475)]));
    for (const x of [-1, 1]) ears.add(cone(0.045, 0.1, fur, [0.06 * x, H - 0.04 - RIM, 0], [0, 0, -0.45 * x]));
    for (const [leg, x] of [[fl, -1], [fr, 1]] as const) {
      leg.position.set(0.2 * x, 0.3, 0.03);
      leg.add(ball(0.04, fur, [0.025 * x, -0.03, 0.02], [0.8, 1.3, 0.8]));
    }
    for (const [leg, x] of [[hl, -1], [hr, 1]] as const) {
      leg.position.set(0.08 * x, BASE + 0.03, 0.05);
      leg.add(ball(0.045, accent, [0, -0.03, 0.04], [1, 0.5, 1.5]));
    }
    rig.anchors.head.position.set(0, H - RIM, 0);
    rig.anchors.head.userData.r = 0.16;
    rig.anchors.collar.position.set(0, RIM - 0.02, 0);
    rig.anchors.collar.userData.r = radius(RIM) + 0.01;
    rig.anchors.back.position.set(0, 0.3, -radius(0.3));
    rig.anchors.back.userData.r = R;
  },
  emotes: { topple, wobble, peek },
} satisfies Look;
