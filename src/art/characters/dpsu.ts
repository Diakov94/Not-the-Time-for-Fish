import * as THREE from 'three';
import { CLOTH, COAT, GOLD, INK, material, PAINT } from '../palette.ts';
import { ball, block, coats, rod, type Emote, type Look, type Rig } from '../rig.ts';

// ДПСУ-шка: a stout fawn dog, barrel-bodied on short thick legs, a broad head with a cream muzzle, under
// a green peaked cap with a gold cockade, and a red-and-white striped barrier pole strapped across its
// back, one end over the right shoulder. The pole and a folded pass are pivots of its own, kept per rig.
const { smoothstep } = THREE.MathUtils;
// Up over the first `a` of an emote, held, down over the last `a`.
const held = (k: number, a: number) => smoothstep(k, 0, a) * (1 - smoothstep(k, 1 - a, 1));
const POLE = 0.45; // the pole's rest tilt, rad above level
const READ = new THREE.Vector3(0, 0.12, 0.42); // where the pass is held up to be read
const ARM = new THREE.Vector3(0.03, -0.24, 0.07).normalize(); // the right fore leg at rest, from its shoulder
const LIFT = new THREE.Vector3(-0.07, 0.22, 0.15); // the saluting shoulder, raised and forward
const PEAK = new THREE.Vector3(-0.05, 0.24, 0.08).normalize(); // from there to the cap's peak
const turn = new THREE.Quaternion();
const kit = new WeakMap<Rig, { pole: THREE.Group; papers: THREE.Group }>();

// The barrier raised: the pole swings up on its hinge to upright, the head following it up.
const barrier: Emote = {
  length: 2,
  pose: (rig, k) => {
    const s = held(k, 0.3);
    kit.get(rig)!.pole.rotation.z = POLE + 1.1 * s;
    rig.parts.head.rotation.x = -0.3 * s;
    rig.parts.head.rotation.y = 0.35 * s;
    rig.parts.legs[0].rotation.x = -1.2 * s;
  },
};
// Papers checked: a pass drawn from the chest, held up in both fore paws, read line by line, put away.
const papers: Emote = {
  length: 2.6,
  pose: (rig, k) => {
    const s = held(k, 0.2);
    const { head, legs } = rig.parts;
    const pass = kit.get(rig)!.papers;
    pass.position.lerp(READ, s);
    pass.rotation.x = -0.5 * s;
    legs[0].rotation.x = legs[1].rotation.x = -1.35 * s;
    legs[0].rotation.z = 0.35 * s;
    legs[1].rotation.z = -0.35 * s;
    head.rotation.x = 0.3 * s;
    head.rotation.y = 0.2 * s * Math.sin(5 * Math.PI * k);
  },
};
// The salute: chest out, chin up, a fore paw snapped to the cap's peak and held.
const salute: Emote = {
  length: 1.8,
  pose: ({ parts: { body, head, legs } }, k) => {
    const s = held(k, 0.12);
    legs[1].position.addScaledVector(LIFT, s);
    legs[1].quaternion.slerp(turn.setFromUnitVectors(ARM, PEAK), s);
    body.rotation.x = -0.08 * s;
    head.rotation.x = -0.12 * s;
  },
};

export default {
  dress: (rig, c) => {
    const { fur, belly, accent } = coats(c);
    const { body, head, ears, muzzle, legs, tail } = rig.parts;
    const [fl, fr, hl, hr] = legs;
    // A barrel body with a cream chest, on short thick legs.
    body.add(ball(0.34, fur, [0, -0.22, 0], [1.15, 1, 1.05]), ball(0.2, belly, [0, -0.24, 0.2], [1.1, 1.2, 0.6]));
    hl.position.set(-0.17, -0.46, 0);
    hr.position.set(0.17, -0.46, 0);
    for (const leg of [hl, hr]) leg.add(rod(0.085, fur, [0, -0.23, 0.02], [0, 0, 0]));
    fl.position.set(-0.34, -0.04, 0.05);
    fr.position.set(0.34, -0.04, 0.05);
    fl.add(rod(0.065, fur, [0, 0, 0], [-0.03, -0.24, 0.07]));
    fr.add(rod(0.065, fur, [0, 0, 0], [0.03, -0.24, 0.07]));
    // A broad head, a deep cream muzzle, short drop ears (on the head, so a hat keeps them).
    head.position.set(0, 0.06, 0.05);
    head.add(ball(0.23, fur, [0, 0.18, 0], [1.12, 0.95, 1]));
    for (const x of [-1, 1]) {
      head.add(ball(0.035, INK.black, [0.09 * x, 0.23, 0.18]));
      head.add(ball(0.08, fur, [0.24 * x, 0.18, -0.01], [0.55, 1.1, 0.9]));
    }
    muzzle.add(block([0.24, 0.16, 0.2], belly, [0, 0.1, 0.2]), ball(0.05, INK.black, [0, 0.18, 0.3]));
    // The peaked cap tops the head (a worn hat replaces it): a band, a crown flaring over it, a black
    // peak slanting down over the eyes, a gold cockade.
    const cap = (bottom: number, top: number, h: number, y: number) => {
      const m = new THREE.Mesh(new THREE.CylinderGeometry(top, bottom, h, 12), material(accent));
      m.position.y = y;
      return m;
    };
    const peak = ball(0.15, INK.black, [0, 0.33, 0.19], [1, 0.14, 0.75]);
    peak.rotation.x = 0.3;
    ears.add(cap(0.215, 0.215, 0.08, 0.34), cap(0.215, 0.28, 0.07, 0.41), peak, ball(0.03, GOLD.brass, [0, 0.36, 0.22]));
    // The barrier pole across the back on a hinge behind the left shoulder: six red and white stripes
    // and the strap that holds it, across the chest.
    const pole = new THREE.Group();
    pole.position.set(-0.3, 0.02, -0.36);
    pole.rotation.z = POLE;
    for (let i = 0; i < 6; i++) pole.add(rod(0.035, i % 2 ? COAT.white! : PAINT.cherry, [-0.12 + 0.19 * i, 0, 0], [0.07 + 0.19 * i, 0, 0]));
    const strap = [rod(0.02, INK.sole, [-0.3, 0.02, 0.24], [0, -0.17, 0.38]), rod(0.02, INK.sole, [0, -0.17, 0.38], [0.3, -0.36, 0.23])];
    const pass = new THREE.Group();
    pass.position.set(0, -0.22, 0);
    pass.add(block([0.16, 0.2, 0.01], CLOTH.linen, [0, 0, 0]), block([0.1, 0.015, 0.012], INK.black, [0, 0.04, 0]));
    pass.add(block([0.06, 0.06, 0.012], PAINT.cobalt, [0.03, -0.05, 0]));
    body.add(pole, ...strap, pass);
    kit.set(rig, { pole, papers: pass });
    tail.position.set(0, -0.36, -0.32);
    tail.add(rod(0.055, fur, [0, 0, 0], [0, 0.14, -0.1]));
    rig.anchors.head.position.set(0, 0.36, 0);
    rig.anchors.head.userData.r = 0.25;
    rig.anchors.collar.position.set(0, 0.07, 0.05);
    rig.anchors.collar.userData.r = 0.25;
    rig.anchors.back.position.set(0, -0.24, -0.37);
    rig.anchors.back.userData.r = 0.38;
  },
  emotes: { barrier, papers, salute },
} satisfies Look;
