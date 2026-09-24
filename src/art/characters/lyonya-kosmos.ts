import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { COAT, INK, material } from '../palette.ts';
import { ball, block, catEars, coats, rod, type Emote, type Look, type Rig, type V3 } from '../rig.ts';

// Льоня Космос: the dancing cat. A lanky ginger cat standing tall in a blue tracksuit, a boxy jacket
// with a white zip, long sleeves and long trouser legs, two white stripes down every side, white
// trainers and a white headband. Emotes: the dance (three moves), a spin, a bow.
const TAU = 2 * Math.PI;
// The tracksuit's stripes on one part, as one mesh: two thin white bands down a side at x, from y0 to y1.
function stripes(colour: number, sides: [number, number, number][]): THREE.Mesh {
  const bands = sides.flatMap(([x, y0, y1]) =>
    [-0.014, 0.014].map((z) => new THREE.BoxGeometry(0.008, y0 - y1, 0.01).translate(x, (y0 + y1) / 2, z)),
  );
  return new THREE.Mesh(mergeGeometries(bands), material(colour));
}

export default {
  dress: (rig, c) => {
    const { fur, belly, accent } = coats(c);
    const { body, head, muzzle, legs, tail } = rig.parts;
    const [fl, fr, hl, hr] = legs;
    body.add(block([0.24, 0.3, 0.17], accent, [0, 0.05, 0]), block([0.014, 0.3, 0.01], belly, [0, 0.05, 0.087]));
    body.add(stripes(belly, [[-0.122, 0.2, -0.1], [0.122, 0.2, -0.1]]), block([0.2, 0.03, 0.14], belly, [0, 0.205, 0]));
    for (const [leg, x] of [[hl, -1], [hr, 1]] as const) {
      leg.position.set(0.07 * x, -0.1, 0);
      leg.add(rod(0.042, accent, [0, 0, 0], [0, -0.31, 0]), block([0.08, 0.05, 0.14], belly, [0, -0.325, 0.03]));
      leg.add(stripes(belly, [[0.042 * x, -0.02, -0.29]]));
    }
    for (const [leg, x] of [[fl, -1], [fr, 1]] as const) {
      leg.position.set(0.155 * x, 0.17, 0);
      leg.add(rod(0.034, accent, [0, 0.02, 0], [0, -0.25, 0]), ball(0.036, fur, [0, -0.28, 0.01]));
      leg.add(stripes(belly, [[0.034 * x, 0, -0.24]]));
    }
    head.position.set(0, 0.2, 0.01);
    head.add(ball(0.135, fur, [0, 0.13, 0]), ball(0.06, belly, [0, 0.09, 0.105], [1.2, 0.8, 0.7]));
    for (const x of [-1, 1]) head.add(ball(0.022, INK.black, [0.05 * x, 0.15, 0.115]));
    muzzle.add(ball(0.02, COAT.nose!, [0, 0.115, 0.155]));
    const band = new THREE.Mesh(new THREE.TorusGeometry(0.124, 0.02, 5, 14), material(belly));
    band.position.set(0, 0.19, 0);
    band.rotation.x = Math.PI / 2 - 0.15; // a little higher at the back
    head.add(band);
    catEars(rig, fur, 0.075, 0.27, 0.35);
    tail.position.set(0, -0.08, -0.09);
    tail.add(rod(0.025, fur, [0, 0, 0], [0, -0.1, -0.12]), rod(0.025, fur, [0, -0.1, -0.12], [0, 0.1, -0.2]));
    rig.anchors.head.userData.r = 0.135;
    rig.anchors.collar.position.set(0, 0.2, 0);
    rig.anchors.collar.userData.r = 0.15; // clear of the jacket's shoulders
    rig.anchors.back.position.set(0, 0.05, -0.085);
    rig.anchors.back.userData.r = 0.12;
  },
  emotes: { dance: dance(), spin: spin(), bow: bow() },
} satisfies Look;

const smooth = (x: number) => (x <= 0 ? 0 : x >= 1 ? 1 : x * x * (3 - 2 * x));
// How far into a move `q` (0 to 1) is: in and out over its first and last eighth.
const into = (q: number) => smooth(Math.min(q, 1 - q) * 8);
const set = (o: THREE.Object3D, [x, y, z]: V3) => o.rotation.set(o.rotation.x + x, o.rotation.y + y, o.rotation.z + z);

// Three moves, 1.6 s each, back to standing between them: the disco point, the twist, the squat kicks
// (присядка), arms out.
function dance(): Emote {
  const moves = [
    (rig: Rig, q: number, e: number) => {
      const [fl, fr] = rig.parts.legs;
      const up = Math.sin(TAU * 2 * q) > 0 ? 1 : 0;
      set(fr, [-0.4 * e, 0, (up ? 2.5 : -0.4) * e]);
      set(fl, [0, 0, -0.5 * e]);
      rig.parts.body.rotation.z += 0.12 * e * (up ? -1 : 1);
      rig.parts.head.rotation.z += 0.2 * e * (up ? 1 : -1);
    },
    (rig: Rig, q: number, e: number) => {
      const { body, legs } = rig.parts;
      const w = Math.sin(TAU * 4 * q);
      body.rotation.y += 0.5 * w * e;
      body.position.y -= 0.03 * Math.abs(w) * e;
      legs[2].rotation.x += 0.3 * w * e;
      legs[3].rotation.x -= 0.3 * w * e;
      legs[0].rotation.x += -1 * w * e;
      legs[1].rotation.x += 1 * w * e;
    },
    (rig: Rig, q: number, e: number) => {
      const { body, legs } = rig.parts;
      const kick = Math.sin(TAU * 3 * q);
      body.position.y -= 0.1 * e;
      set(legs[0], [0, 0, -1.5 * e]);
      set(legs[1], [0, 0, 1.5 * e]);
      legs[2].rotation.x -= 1.3 * Math.max(0, kick) * e;
      legs[3].rotation.x -= 1.3 * Math.max(0, -kick) * e;
    },
  ];
  return {
    length: 4.8,
    pose: (rig, k) => {
      const i = Math.min(2, Math.floor(3 * k));
      const q = 3 * k - i;
      moves[i]!(rig, q, into(q));
    },
  };
}

// A pirouette: one full turn on one foot, arms out.
function spin(): Emote {
  return {
    length: 1.6,
    pose: (rig, k) => {
      const { body, legs } = rig.parts;
      const e = Math.sin(Math.PI * k);
      body.rotation.y += TAU * smooth(k);
      body.position.y += 0.04 * e;
      set(legs[0], [0, 0, -1.4 * e]);
      set(legs[1], [0, 0, 1.4 * e]);
      legs[2].rotation.x -= 0.7 * e;
    },
  };
}

// A deep bow, one paw across the chest and the other swept out behind; the legs stay under it.
function bow(): Emote {
  return {
    length: 2.2,
    pose: (rig, k) => {
      const { body, head, legs } = rig.parts;
      const e = smooth(Math.min(k, 1 - k) * 4);
      body.rotation.x += 0.85 * e;
      body.position.y -= 0.04 * e;
      head.rotation.x += 0.25 * e;
      set(legs[1], [-1.2 * e, 0, -0.9 * e]);
      set(legs[0], [0.7 * e, 0, -0.8 * e]);
      legs[2].rotation.x -= 0.85 * e;
      legs[3].rotation.x -= 0.6 * e;
    },
  };
}
