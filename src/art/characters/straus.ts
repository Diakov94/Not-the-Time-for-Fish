import * as THREE from 'three';
import { COAT, INK } from '../palette.ts';
import { decal, hex } from '../decals.ts';
import { ball, catEars, coats, rod, type Emote, type Look, type Rig } from '../rig.ts';

// Страус з Межигір'я (card 112): a black plumed cat body high on long thin pink legs that bend at the
// knee, a long cream neck up to a small cream cat's head, a fan of cream-tipped plumes for a tail. The
// silhouette: the tallest cat, all legs and neck, the only one with daylight under its body. Emotes:
// the head buried (into the floor), a high-step strut, the plumes fanned.

const smooth = (x: number) => (x <= 0 ? 0 : x >= 1 ? 1 : x * x * (3 - 2 * x));
const hold = (k: number, a: number, b: number) => Math.min(smooth(k / a), smooth((1 - k) / (1 - b)));

// A plume as an SVG decal: a black vane with a fringe of barbs and a cream tip, drawn on a card two
// faces thick so it shows from both sides; its base at the origin, its tip up +y.
const plume = (vane: number, tip: number) => {
  const barbs = Array.from({ length: 8 }, (_, i) => `M16 ${36 + 7 * i}L2 ${29 + 7 * i}M16 ${36 + 7 * i}L30 ${29 + 7 * i}`).join('');
  return (
    `<svg xmlns="http://www.w3.org/2000/svg" width="64" height="192" viewBox="0 0 32 96">` +
    `<path d="${barbs}" stroke="${hex(vane)}" stroke-width="2.5"/>` +
    `<path d="M16 96C15 76 3 62 4 38C5 18 11 6 16 1C21 6 27 18 28 38C29 62 17 76 16 96Z" fill="${hex(vane)}"/>` +
    `<path d="M16 1C11 6 7 13 6 22Q16 17 26 22C25 13 21 6 16 1Z" fill="${hex(tip)}"/></svg>`
  );
};
function feather(look: THREE.Material, length: number): THREE.Mesh {
  const g = new THREE.BoxGeometry(length / 3, length, 0.004);
  g.translate(0, length / 2, 0);
  return new THREE.Mesh(g, look);
}

// The legs: a hip (the rig's leg pivot), a knee a THIGH below it, the foot a SHIN below that.
const HIP = -0.1;
const THIGH = 0.17;
const SHIN = 0.18;
const knee = (leg: THREE.Object3D) => leg.getObjectByName('knee')!;
// The fan's plumes at rest, radians apart round the tail's axis.
const FAN = [-0.84, -0.56, -0.28, 0, 0.28, 0.56, 0.84];

// A crouch: the body pitched forward by `pitch` and lowered on bent knees by `bend` (the thighs forward,
// the shins back), the hips moved so the feet stay where they stood.
function crouch(rig: Rig, pitch: number, bend: number): void {
  const { body, legs } = rig.parts;
  body.rotation.x += pitch;
  body.position.y -= (THIGH + SHIN) * (1 - Math.cos(bend)) - HIP * (1 - Math.cos(pitch));
  body.position.z -= HIP * Math.sin(pitch);
  for (const leg of [legs[2], legs[3]]) {
    leg.rotation.x = -pitch - bend;
    knee(leg).rotation.x = 2 * bend;
  }
}

const bury: Emote = {
  length: 3,
  pose: (rig, k) => {
    const d = hold(k, 0.25, 0.8);
    crouch(rig, 0.8 * d, 0.95 * d);
    const { head, legs, tail } = rig.parts;
    head.rotation.x += 1.75 * d; // the neck bent down to the floor and the head through it
    head.rotation.z += 0.15 * d * Math.sin(8 * Math.PI * k); // settling in
    tail.rotation.x += 0.35 * d; // the fan up in the air
    legs[0].rotation.z = -0.5 * d;
    legs[1].rotation.z = 0.5 * d;
  },
};

const strut: Emote = {
  length: 2.4,
  pose: (rig, k) => {
    const s = hold(k, 0.1, 0.9);
    const beat = Math.sin(4 * Math.PI * k); // four high steps
    const { body, head, legs, tail } = rig.parts;
    [legs[2], legs[3]].forEach((leg, i) => {
      const lift = s * Math.max(0, i ? -beat : beat);
      leg.rotation.x = -1.6 * lift; // the knee up high
      knee(leg).rotation.x = 2.2 * lift; // the foot hanging under it
    });
    body.rotation.y += 0.15 * s * beat;
    head.rotation.x += 0.35 * s * beat; // the head pumping to the step
    legs[0].rotation.z = -0.4 * s * Math.abs(beat);
    legs[1].rotation.z = 0.4 * s * Math.abs(beat);
    tail.rotation.z += 0.25 * s * beat;
  },
};

const fan: Emote = {
  length: 2.4,
  pose: (rig, k) => {
    const s = hold(k, 0.2, 0.8);
    const { head, legs, tail } = rig.parts;
    for (const p of tail.children) p.rotation.z *= 1 + 0.8 * s; // spread to a half wheel
    tail.rotation.x += 0.55 * s; // raised upright
    tail.rotation.z += 0.06 * s * Math.sin(24 * Math.PI * k); // and shivered
    legs[0].rotation.z = -0.9 * s;
    legs[1].rotation.z = 0.9 * s;
    head.rotation.x -= 0.2 * s;
    head.rotation.y += 0.35 * s * Math.sin(2 * Math.PI * k);
  },
};

export default {
  dress: (rig, c) => {
    const { fur, belly, accent } = coats(c);
    const { body, head, muzzle, legs, tail } = rig.parts;
    const [fl, fr, hl, hr] = legs;
    const plumes = decal(plume(fur, belly));
    // The legs: pink, thin, a knob at the knee, three toes forward.
    for (const [leg, x] of [[hl, -0.065], [hr, 0.065]] as const) {
      leg.position.set(x, HIP, 0);
      const joint = new THREE.Group();
      joint.name = 'knee';
      joint.position.y = -THIGH;
      joint.add(ball(0.024, accent, [0, 0, 0]), rod(0.015, accent, [0, 0, 0], [0, -SHIN, 0]));
      for (const t of [-0.4, 0, 0.4]) joint.add(rod(0.012, accent, [0, -SHIN + 0.01, 0], [0.05 * Math.sin(t), -SHIN + 0.005, 0.05 * Math.cos(t)]));
      leg.add(rod(0.019, accent, [0, 0, 0], [0, -THIGH, 0]), joint);
    }
    // The body, its plumes drooping round the sides and back, and a wing plume on each side.
    body.add(ball(0.16, fur, [0, 0.02, -0.02], [1.1, 0.85, 1.3]));
    for (let i = 0; i < 7; i++) {
      const a = Math.PI / 2 + (i * Math.PI) / 6;
      const p = feather(plumes, 0.2);
      p.position.set(0.14 * Math.sin(a), -0.02, -0.02 + 0.16 * Math.cos(a));
      p.rotation.set(2.1, a, 0, 'YXZ');
      body.add(p);
    }
    for (const [wing, x] of [[fl, -1], [fr, 1]] as const) {
      wing.position.set(0.15 * x, 0.06, 0);
      const p = feather(plumes, 0.2);
      p.rotation.set(2.5, 0, -0.25 * x);
      wing.add(p);
    }
    // The long neck, the small head, big eyes, the ears.
    head.position.set(0, 0.08, 0.13);
    head.add(rod(0.032, belly, [0, 0, 0], [0, 0.24, 0.03]), ball(0.085, belly, [0, 0.28, 0.05], [1, 0.95, 1.1]));
    for (const x of [-1, 1]) head.add(ball(0.022, INK.black, [0.036 * x, 0.3, 0.125]));
    muzzle.add(ball(0.015, COAT.nose!, [0, 0.27, 0.14]));
    catEars(rig, belly, 0.045, 0.35, 0.35, 0.03);
    // The fan: seven plumes spread round the tail, tilted back.
    tail.position.set(0, 0.06, -0.19);
    tail.rotation.x = -0.6;
    for (const a of FAN) {
      const p = new THREE.Group();
      p.rotation.z = a;
      tail.add(p.add(feather(plumes, 0.3)));
    }
    rig.anchors.head.position.set(0, 0.35, 0.05);
    rig.anchors.head.userData.r = 0.085;
    head.add(rig.anchors.collar); // a collar piece goes up the neck and follows it down
    rig.anchors.collar.position.set(0, 0.12, 0.015);
    rig.anchors.collar.userData.r = 0.05;
    rig.anchors.back.position.set(0, 0.02, -0.22);
    rig.anchors.back.userData.r = 0.17;
  },
  emotes: { bury, strut, fan },
} satisfies Look;
