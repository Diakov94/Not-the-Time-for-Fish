import * as THREE from 'three';
import { COAT, GOLD, INK } from '../palette.ts';
import { ball, catEars, coats, type Emote, type Look, type V3 } from '../rig.ts';

// Золотий Батон (card 112): a golden cat shaped like a long loaf, lying low along its facing, four
// diagonal crust scores across its back opening on cream crumb, the head sunk into the loaf's front
// end, a stub tail, four stub paws. The silhouette: the lowest and longest of the cats, nothing above
// its back but the ears. Emotes: rising like dough, a roll onto its back, a glisten (the crust catches
// the light: two glints run along it).

const bell = (k: number) => Math.sin(Math.PI * k);
const smooth = (x: number) => (x <= 0 ? 0 : x >= 1 ? 1 : x * x * (3 - 2 * x));
const hold = (k: number, a: number, b: number) => Math.min(smooth(k / a), smooth((1 - k) / (1 - b)));

// The loaf in the frame: its centre, its half width, height and length. It rests on the floor (-0.45).
const LOAF = { y: -0.29, w: 0.21, h: 0.17, l: 0.34 };
const FLOOR = -0.45;
// Where the loaf's top is at `z` along it, and its slope there.
const top = (z: number) => LOAF.y + LOAF.h * Math.sqrt(1 - (z / LOAF.l) ** 2);
const slope = (z: number) => Math.atan((LOAF.h * z) / (LOAF.l * LOAF.l * Math.sqrt(1 - (z / LOAF.l) ** 2)));

// A glint the size of a crumb, unshaded so it reads as light, not paint.
const GLINT = new THREE.MeshBasicMaterial({ color: GOLD.spark });

// A crust score: a dark ridge cut on the diagonal, the cream crumb showing along its middle.
function score(z: number, crust: number, crumb: number): THREE.Object3D {
  const g = new THREE.Group();
  g.position.set(0, top(z) - 0.012, z);
  g.rotation.x = slope(z);
  const cut = new THREE.Group();
  cut.rotation.y = 0.55;
  cut.add(ball(1, crust, [0, 0, 0], [0.17, 0.03, 0.045]), ball(1, crumb, [0, 0.012, 0], [0.15, 0.025, 0.018]));
  return g.add(cut);
}

// The loaf keeps its bottom on the floor while the body pivot (the frame's centre, above it) scales or
// turns it: rotate (0, LOAF.y) by `turn` round z and scale it by `rise` in y, and undo the shift.
function planted(rig: Parameters<Emote['pose']>[0], turn: number, rise: number): void {
  const { body } = rig.parts;
  body.rotation.z += turn;
  body.position.x -= -LOAF.y * Math.sin(turn);
  // On its side the loaf is wider than tall, and on its back it lies on the crust scores' ridges.
  body.position.y += LOAF.y * (1 - Math.cos(turn)) + (LOAF.w - LOAF.h) * Math.sin(turn) ** 2 + 0.02 * (1 - Math.cos(turn));
  body.scale.y *= rise;
  body.position.y -= FLOOR * (rise - 1);
}

const rise: Emote = {
  length: 2.4,
  pose: (rig, k) => {
    const s = bell(k);
    const f = 1 + 0.55 * s + 0.06 * s * Math.sin(6 * Math.PI * k); // it proves, puffs, wobbles and sinks back
    planted(rig, 0, f);
    rig.parts.body.scale.x *= 1 + 0.08 * s;
    rig.parts.body.scale.z *= 1 + 0.06 * s;
    rig.parts.head.rotation.x -= 0.2 * s;
  },
};

const roll: Emote = {
  length: 2.6,
  pose: (rig, k) => {
    const on = hold(k, 0.35, 0.65);
    planted(rig, Math.PI * on, 1);
    const kick = on * on * Math.sin(10 * Math.PI * k); // the paws paddle in the air
    rig.parts.legs.forEach((leg, i) => (leg.rotation.x = 0.5 * kick * (i % 2 ? 1 : -1)));
    rig.parts.tail.rotation.y = 0.8 * kick;
    rig.parts.head.rotation.x += 1.3 * on; // the head tucked along the loaf, clear of the floor
    rig.parts.head.rotation.z += 0.3 * on * Math.sin(4 * Math.PI * k);
  },
};

const glisten: Emote = {
  length: 2,
  pose: (rig, k) => {
    const s = bell(k);
    const { body, head } = rig.parts;
    const glint = body.getObjectByName('glint')!;
    const up = hold(k, 0.1, 0.9);
    const z = 0.25 - 0.5 * k; // along the crust, head to tail,
    glint.position.z += z * up;
    glint.position.y += (top(z) + 0.015 - glint.position.y) * up; // up out of the loaf onto it
    glint.rotation.y = 6 * Math.PI * k; // twinkling edge on and face on
    planted(rig, 0.12 * s * Math.sin(2 * Math.PI * k), 1); // turning its crust to the light
    head.rotation.x -= 0.3 * s; // chin up, proud
  },
};

export default {
  dress: (rig, c) => {
    const { fur, belly, accent } = coats(c);
    const { body, head, muzzle, legs, tail } = rig.parts;
    body.add(ball(LOAF.w, fur, [0, LOAF.y, 0], [1, LOAF.h / LOAF.w, LOAF.l / LOAF.w]));
    for (const z of [-0.2, -0.1, 0, 0.1]) body.add(score(z, accent, belly));
    // The head sunk into the front end, its eyes and nose just above the crust.
    head.position.set(0, -0.31, 0.24);
    head.add(ball(0.13, fur, [0, 0.11, 0], [1.1, 0.95, 1]), ball(0.07, belly, [0, 0.06, 0.1], [1.2, 0.8, 0.8]));
    for (const x of [-1, 1]) head.add(ball(0.02, INK.black, [0.05 * x, 0.14, 0.12]));
    muzzle.add(ball(0.018, COAT.nose!, [0, 0.1, 0.16]));
    catEars(rig, fur, 0.075, 0.21, 0.35, -0.02);
    // Stub paws in cream under the four corners, and a stub tail.
    const paws: V3[] = [[-0.12, -0.39, 0.19], [0.12, -0.39, 0.19], [-0.12, -0.39, -0.19], [0.12, -0.39, -0.19]];
    legs.forEach((leg, i) => {
      leg.position.set(...paws[i]!);
      leg.add(ball(0.045, belly, [0, -0.02, 0.01], [1, 0.7, 1.3]));
    });
    tail.position.set(0, -0.3, -0.32);
    tail.add(ball(0.05, fur, [0, 0.02, -0.04], [0.9, 0.9, 1.3]));
    // The glisten's glints wait inside the loaf until it plays.
    const glint = new THREE.Group();
    glint.name = 'glint';
    glint.position.set(0, LOAF.y, 0);
    for (const x of [-0.07, 0, 0.08]) {
      const m = new THREE.Mesh(new THREE.OctahedronGeometry(0.05, 0), GLINT);
      m.position.set(x, 0.01 * Math.abs(x), -1.5 * x);
      m.scale.set(0.5, 1.6, 0.15);
      glint.add(m);
    }
    body.add(glint);
    rig.anchors.head.position.set(0, 0.24, 0);
    rig.anchors.head.userData.r = 0.14;
    rig.anchors.collar.position.set(0, -0.2, 0.22);
    rig.anchors.collar.userData.r = 0.16; // round the sunk head, where it meets the loaf
    rig.anchors.back.position.set(0, LOAF.y, -LOAF.l);
    rig.anchors.back.userData.r = LOAF.w;
  },
  emotes: { rise, roll, glisten },
} satisfies Look;
