import * as THREE from 'three';
import { decal, hex } from '../decals.ts';
import { COAT, INK, material } from '../palette.ts';
import { ball, block, coats, rod, type Emote, type Look } from '../rig.ts';

// ДСНС-ик: the sapper after Patron. A small liver-and-white spaniel, a head shorter than the other dogs,
// long feathered ears hanging past its jaw, in an orange vest with two white reflective bands and ДСНС on
// the back, under an orange helmet with a white stripe. Its body sits low on short legs, so its top is a
// fifth under the dog frame's.
const { smoothstep } = THREE.MathUtils;
// Up over the first `a` of an emote, held, down over the last `a`.
const held = (k: number, a: number) => smoothstep(k, 0, a) * (1 - smoothstep(k, 1 - a, 1));
const ARM = new THREE.Vector3(0.03, -0.22, 0.06).normalize(); // the right fore leg at rest, from its shoulder
const turn = new THREE.Quaternion();
// Turns a fore leg from its rest to point along `to` (unit), by `s` from 0 to 1.
const aim = (leg: THREE.Group, to: THREE.Vector3, s: number) => leg.quaternion.slerp(turn.setFromUnitVectors(ARM, to), s);
const LIFT = new THREE.Vector3(-0.02, 0.16, 0.05); // the tapping shoulder, raised
const BRIM = new THREE.Vector3(0.29, 0.96, -0.1).normalize(); // from there up to the helmet's brim
const TAPPED = new THREE.Vector3(0.4, 0.9, 0).normalize(); // and just off it, between taps
const LETTERS = `<svg xmlns="http://www.w3.org/2000/svg" width="128" height="48"><text x="64" y="38" text-anchor="middle" font-family="sans-serif" font-weight="900" font-size="36" fill="${hex(COAT.white!)}">ДСНС</text></svg>`;

// The sapper's sit: sniffs along the ground, sits on its haunches and points a fore paw at the spot.
const sapper: Emote = {
  length: 2.8,
  pose: ({ parts: { body, head, legs } }, k) => {
    const sniff = smoothstep(k, 0, 0.08) * (1 - smoothstep(k, 0.34, 0.44));
    const sit = smoothstep(k, 0.38, 0.5) * (1 - smoothstep(k, 0.88, 1));
    body.rotation.x = 0.45 * sniff - 0.15 * sit;
    body.position.y = -0.03 * sniff - 0.1 * sit;
    head.rotation.x = sniff * (0.45 + 0.12 * Math.sin(14 * Math.PI * k)) + 0.4 * sit;
    head.rotation.y = 0.35 * sniff * Math.sin(4 * Math.PI * k);
    legs[2].rotation.x = legs[3].rotation.x = -1.3 * sit;
    legs[1].rotation.x = -0.75 * sit * smoothstep(k, 0.52, 0.6);
    legs[1].rotation.z = -0.2 * sit;
  },
};
// Taps its helmet's brim twice with a fore paw, the head tipped into it.
const helmet: Emote = {
  length: 1.5,
  pose: ({ parts: { head, legs } }, k) => {
    const s = held(k, 0.2);
    const tap = Math.max(0, Math.sin(8 * Math.PI * k));
    legs[1].position.addScaledVector(LIFT, s);
    aim(legs[1], tap > 0.5 ? TAPPED : BRIM, s);
    head.rotation.z = -0.3 * s;
    head.rotation.x = 0.08 * s * tap;
  },
};
// Wags: the stub tail a blur, the rear wiggling after it, a little bounce and a tilted head.
const wag: Emote = {
  length: 1.6,
  pose: ({ parts: { body, head, tail } }, k) => {
    const s = held(k, 0.15);
    tail.rotation.z = 0.9 * s * Math.sin(12 * Math.PI * k);
    body.rotation.y = 0.18 * s * Math.sin(6 * Math.PI * k);
    body.position.y += 0.035 * s * Math.abs(Math.sin(6 * Math.PI * k));
    head.rotation.z = 0.25 * s;
  },
};

export default {
  dress: (rig, c) => {
    const { fur, belly, accent } = coats(c);
    const { body, head, ears, muzzle, legs, tail } = rig.parts;
    const [fl, fr, hl, hr] = legs;
    // A compact body low on short legs.
    body.add(ball(0.27, fur, [0, -0.3, 0]));
    hl.position.set(-0.13, -0.52, 0);
    hr.position.set(0.13, -0.52, 0);
    for (const leg of [hl, hr]) leg.add(rod(0.065, belly, [0, -0.17, 0.02], [0, 0, 0]));
    fl.position.set(-0.24, -0.14, 0.05);
    fr.position.set(0.24, -0.14, 0.05);
    fl.add(rod(0.05, belly, [0, 0, 0], [-0.03, -0.22, 0.06]));
    fr.add(rod(0.05, belly, [0, 0, 0], [0.03, -0.22, 0.06]));
    // The vest: an orange shell round the middle, two reflective bands and the service's letters behind.
    body.add(ball(0.285, accent, [0, -0.27, 0], [1.03, 0.72, 1.03]));
    for (const y of [-0.22, -0.32]) {
      const band = new THREE.Mesh(new THREE.TorusGeometry(0.285, 0.014, 4, 18), material(COAT.white!));
      band.position.y = y;
      band.rotation.x = Math.PI / 2;
      body.add(band);
    }
    const letters = new THREE.Mesh(new THREE.PlaneGeometry(0.24, 0.09), decal(LETTERS));
    letters.position.set(0, -0.27, -0.3);
    letters.rotation.y = Math.PI;
    body.add(letters);
    // A round spaniel head with a long white muzzle and a blaze up the forehead.
    head.position.set(0, -0.04, 0.05);
    head.add(ball(0.2, fur, [0, 0.18, 0]), block([0.07, 0.14, 0.05], belly, [0, 0.27, 0.17]));
    for (const x of [-1, 1]) head.add(ball(0.03, INK.black, [0.08 * x, 0.23, 0.16]));
    muzzle.add(block([0.15, 0.12, 0.2], belly, [0, 0.12, 0.2]), ball(0.04, INK.black, [0, 0.16, 0.31]));
    // The ears: long, hanging past the jaw, a feathered lobe at each end; on the head, so a hat keeps them.
    for (const x of [-1, 1]) {
      const ear = ball(0.1, fur, [0.19 * x, 0.1, -0.02], [0.5, 1.5, 0.85]);
      ear.rotation.z = 0.15 * x;
      head.add(ear, ball(0.075, fur, [0.21 * x, -0.04, -0.01], [0.7, 0.9, 0.9]));
    }
    // The helmet tops the head (a worn hat replaces it): an orange dome, a white stripe, a brim.
    const dome = new THREE.Mesh(new THREE.SphereGeometry(0.22, 10, 5, 0, 2 * Math.PI, 0, Math.PI / 2), material(accent));
    dome.position.y = 0.23;
    const brim = new THREE.Mesh(new THREE.CylinderGeometry(0.25, 0.25, 0.025, 12), material(accent));
    brim.position.set(0, 0.235, 0.02);
    const stripe = new THREE.Mesh(new THREE.TorusGeometry(0.222, 0.02, 4, 10, Math.PI), material(COAT.white!));
    stripe.position.y = 0.23;
    stripe.rotation.y = Math.PI / 2;
    ears.add(dome, brim, stripe);
    // A short docked tail, carried high.
    tail.position.set(0, -0.44, -0.24);
    tail.add(rod(0.045, fur, [0, 0, 0], [0, 0.12, -0.08]));
    rig.anchors.head.position.set(0, 0.38, 0);
    rig.anchors.head.userData.r = 0.21;
    rig.anchors.collar.position.set(0, -0.04, 0.05);
    rig.anchors.collar.userData.r = 0.2;
    rig.anchors.back.position.set(0, -0.3, -0.29);
    rig.anchors.back.userData.r = 0.28;
  },
  emotes: { sapper, helmet, wag },
} satisfies Look;
