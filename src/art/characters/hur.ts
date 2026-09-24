import * as THREE from 'three';
import { decal, hex } from '../decals.ts';
import { INK } from '../palette.ts';
import { ball, coats, cone, rod, type Emote, type Look } from '../rig.ts';

// ГУР-р: a lean grey sighthound, narrow-chested on long thin legs, its long pale snout out of a dark
// pointed hood that falls into a capelet over the shoulders, a pale owl on its back. The hood is what
// tops the head (a worn hat replaces it); the small rose ears fold back under it.
const { smoothstep } = THREE.MathUtils;
// Up over the first `a` of an emote, held, down over the last `a`.
const held = (k: number, a: number) => smoothstep(k, 0, a) * (1 - smoothstep(k, 1 - a, 1));
const ARM = new THREE.Vector3(0.02, -0.32, 0.05).normalize(); // the right fore leg at rest, from its shoulder
const SIGHT = new THREE.Vector3(-0.08, 0.24, 0.18).normalize(); // from the lifted shoulder to before the eye
const LIFT = new THREE.Vector3(-0.05, 0.12, 0.08); // the shoulder raised and brought forward to sight
const turn = new THREE.Quaternion();
const owl = (c: number) =>
  `<svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" fill="${hex(c)}"><path d="M12 6 L24 18 H40 L52 6 L52 40 Q32 62 12 40 Z"/><circle cx="23" cy="30" r="8" fill="${hex(INK.black)}"/><circle cx="41" cy="30" r="8" fill="${hex(INK.black)}"/><circle cx="23" cy="30" r="3"/><circle cx="41" cy="30" r="3"/><path d="M28 38 L36 38 L32 46 Z" fill="${hex(INK.black)}"/></svg>`;

// The vanish: pulls the hood down over its face and folds into a crouch, then straightens.
const vanish: Emote = {
  length: 2.2,
  pose: ({ parts: { body, head, ears, legs } }, k) => {
    const s = held(k, 0.25);
    ears.rotation.x = 0.55 * s;
    head.rotation.x = 0.35 * s;
    body.position.y = -0.14 * s;
    body.rotation.x = 0.3 * s;
    legs[2].rotation.x = legs[3].rotation.x = -0.8 * s;
    legs[0].rotation.x = legs[1].rotation.x = -0.5 * s;
    legs[0].rotation.z = 0.5 * s;
    legs[1].rotation.z = -0.5 * s;
  },
};
// The scope: a curled fore paw held to the eye like a sight, the head sweeping slowly side to side.
const scope: Emote = {
  length: 2.4,
  pose: ({ parts: { body, head, legs } }, k) => {
    const s = held(k, 0.18);
    legs[1].position.addScaledVector(LIFT, s);
    legs[1].quaternion.slerp(turn.setFromUnitVectors(ARM, SIGHT), s);
    legs[0].rotation.x = -1.1 * s;
    legs[0].rotation.z = -0.3 * s;
    head.rotation.y = 0.45 * s * Math.sin(2 * Math.PI * k);
    body.rotation.y = 0.3 * s * Math.sin(2 * Math.PI * k);
    body.rotation.x = 0.08 * s;
  },
};
// One slow, knowing nod.
const nod: Emote = {
  length: 1.6,
  pose: ({ parts: { head } }, k) => {
    head.rotation.x = 0.4 * Math.sin(Math.PI * k) ** 2;
  },
};

export default {
  dress: (rig, c) => {
    const { fur, belly, accent } = coats(c);
    const { body, head, ears, muzzle, legs, tail } = rig.parts;
    const [fl, fr, hl, hr] = legs;
    // A narrow, deep chest tapering to a tucked waist, on long thin legs.
    body.add(ball(0.24, fur, [0, -0.14, 0.02], [0.85, 1.35, 0.85]), ball(0.13, belly, [0, -0.08, 0.13], [0.9, 1.4, 0.6]));
    hl.position.set(-0.1, -0.46, 0);
    hr.position.set(0.1, -0.46, 0);
    for (const leg of [hl, hr]) leg.add(rod(0.04, fur, [0, -0.23, 0.02], [0, 0, 0]));
    fl.position.set(-0.2, 0.04, 0.04);
    fr.position.set(0.2, 0.04, 0.04);
    fl.add(rod(0.035, fur, [0, 0, 0], [-0.02, -0.32, 0.05]));
    fr.add(rod(0.035, fur, [0, 0, 0], [0.02, -0.32, 0.05]));
    // A narrow skull, a long tapering pale snout, eyes at the hood's edge, rose ears folded back.
    head.position.set(0, 0.16, 0.04);
    head.add(ball(0.15, fur, [0, 0.19, 0], [0.9, 1, 1.1]));
    for (const x of [-1, 1]) {
      head.add(ball(0.028, INK.black, [0.065 * x, 0.23, 0.15]));
      head.add(cone(0.035, 0.1, fur, [0.09 * x, 0.3, -0.1], [-1.3, 0, 0.3 * x]));
    }
    muzzle.add(cone(0.075, 0.3, belly, [0, 0.14, 0.27], [Math.PI / 2, 0, 0]), ball(0.035, INK.black, [0, 0.14, 0.41]));
    // The hood: set back from the face, peaked behind; the capelet it falls into, the owl on the back.
    ears.add(ball(0.19, accent, [0, 0.26, -0.06], [1.1, 1.1, 1.05]), cone(0.1, 0.24, accent, [0, 0.44, -0.11], [-0.4, 0, 0]));
    body.add(ball(0.24, accent, [0, 0.06, -0.03], [1.15, 0.75, 1.1]));
    const badge = new THREE.Mesh(new THREE.PlaneGeometry(0.11, 0.11), decal(owl(belly)));
    badge.position.set(0, 0.07, -0.29);
    badge.rotation.y = Math.PI;
    body.add(badge);
    // A long thin tail, carried low and hooked up at the tip.
    tail.position.set(0, -0.44, -0.16);
    tail.add(rod(0.025, fur, [0, 0, 0], [0, -0.16, -0.14]), rod(0.025, fur, [0, -0.16, -0.14], [0, -0.1, -0.26]));
    rig.anchors.head.position.set(0, 0.35, 0);
    rig.anchors.head.userData.r = 0.16;
    rig.anchors.collar.position.set(0, 0.12, 0.04);
    rig.anchors.collar.userData.r = 0.26; // round the capelet
    rig.anchors.back.position.set(0, -0.12, -0.21);
    rig.anchors.back.userData.r = 0.2;
  },
  emotes: { vanish, scope, nod },
} satisfies Look;
