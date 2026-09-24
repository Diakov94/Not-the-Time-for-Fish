import * as THREE from 'three';
import { COAT, INK, material, METAL } from '../palette.ts';
import { ball, block, coats, cone, rod, type Look, type Rig } from '../rig.ts';

// ДБР-р-р: the DBR's dog, a stocky brindle bulldog: the widest and lowest dog, its broad earless head
// sunk into the shoulders, a flat fawn muzzle with jowls over an underbite, two teeth up, bowed legs,
// dark brindle streaks down its back and a red collar ringed with steel spikes. Emotes: the growl (the
// whole body shakes), a sit, a roll.

// A pose's weight over an emote: up over the first `a` of it, held, down over the last `a`, eased.
const hold = (k: number, a = 0.2) => {
  const t = Math.max(0, Math.min(1, k / a, (1 - k) / a));
  return t * t * (3 - 2 * t);
};
const jaw = (rig: Rig) => rig.parts.muzzle.getObjectByName('jaw')!;
const up = new THREE.Vector3(0, 1, 0);
// The body's outline across its width (x, y): paws, sides, the head's corners and top. Rolled by an
// angle, its lowest point is put back on the floor, where the paws stand.
const HULL = [[-0.2, -0.68], [0.2, -0.68], [-0.53, -0.25], [0.53, -0.25], [-0.34, 0.17], [0.34, 0.17], [0, 0.4]] as const;
const FEET = 0.68;

export default {
  dress: (rig, c) => {
    const { fur, belly, accent } = coats(c);
    const { body, head, muzzle, legs, tail } = rig.parts;
    const [fl, fr, hl, hr] = legs;
    body.add(ball(0.34, fur, [0, -0.25, 0], [1.2, 0.95, 1.05]), ball(0.2, belly, [0, -0.22, 0.2], [1.2, 1.1, 0.6]));
    // Brindle: dark streaks, meridian arcs on the body's shell, each at its own height.
    const streaks = new THREE.Group();
    streaks.position.set(0, -0.25, 0);
    streaks.scale.set(1.2, 0.95, 1.05);
    for (const [i, a] of [0.3, 0.8, 1.25, 1.85, 2.35, 2.85].entries()) {
      const s = new THREE.Mesh(new THREE.TorusGeometry(0.343, 0.007, 3, 6, 0.5 + 0.2 * (i % 3)), material(COAT.black!));
      s.rotation.set(0, a, -0.6 + 0.3 * ((i * 2) % 3));
      streaks.add(s);
    }
    body.add(streaks);
    // Bowed legs, thick and short, planted wide, with fawn paws.
    hl.position.set(-0.2, -0.45, -0.05);
    hr.position.set(0.2, -0.45, -0.05);
    fl.position.set(-0.36, -0.05, 0.08);
    fr.position.set(0.36, -0.05, 0.08);
    for (const [leg, x] of [[fl, -1], [fr, 1]] as const) leg.add(rod(0.08, fur, [0, 0, 0], [0.06 * x, -0.3, 0.05]), ball(0.09, belly, [0.06 * x, -0.32, 0.08], [1, 0.7, 1.2]));
    for (const leg of [hl, hr]) leg.add(rod(0.085, fur, [0, -0.2, 0], [0, 0, 0]), ball(0.09, belly, [0, -0.18, 0.04], [1, 0.6, 1.3]));
    // The broad head sunk low, a fawn blaze, the eyes wide apart.
    head.position.set(0, 0.02, 0.1);
    head.add(ball(0.25, fur, [0, 0.15, 0.02], [1.35, 0.9, 1]), block([0.06, 0.14, 0.04], belly, [0, 0.28, 0.21]));
    for (const x of [-1, 1]) head.add(ball(0.04, INK.black, [0.11 * x, 0.22, 0.21]), ball(0.08, belly, [0.09 * x, 0.07, 0.25], [1, 0.9, 0.8]));
    muzzle.add(block([0.24, 0.1, 0.1], belly, [0, 0.12, 0.26]), ball(0.05, INK.black, [0, 0.16, 0.31], [1.3, 0.8, 0.8]));
    // The underbite: the lower jaw juts past the muzzle, two teeth up out of it, hinged to open.
    const j = new THREE.Group();
    j.name = 'jaw';
    j.position.set(0, 0.04, 0.14);
    j.add(block([0.26, 0.07, 0.16], belly, [0, -0.01, 0.1]));
    for (const x of [-1, 1]) j.add(cone(0.02, 0.06, COAT.white!, [0.08 * x, 0.05, 0.15]));
    muzzle.add(j);
    tail.position.set(0, -0.42, -0.35);
    tail.add(ball(0.06, fur, [0, 0.02, -0.03]));
    // The spiked collar round the neck.
    const collar = new THREE.Mesh(new THREE.TorusGeometry(0.27, 0.045, 6, 16), material(accent));
    collar.position.set(0, 0, 0.03);
    collar.rotation.x = Math.PI / 2;
    body.add(collar);
    for (let i = 0; i < 8; i++) {
      const out = new THREE.Vector3(Math.sin((i * Math.PI) / 4), 0, Math.cos((i * Math.PI) / 4));
      const spike = cone(0.035, 0.11, METAL.silver, [0.34 * out.x, 0, 0.03 + 0.34 * out.z]);
      spike.quaternion.setFromUnitVectors(up, out);
      body.add(spike);
    }
    rig.anchors.head.position.set(0, 0.37, 0.02);
    rig.anchors.head.userData.r = 0.3;
    rig.anchors.head.scale.set(1.3, 0.9, 1); // a hat takes the broad head's proportions
    rig.anchors.collar.position.set(0, 0, 0.03);
    rig.anchors.collar.userData.r = 0.42; // a scarf goes round the spiked collar
    rig.anchors.back.position.set(0, -0.22, -0.36);
    rig.anchors.back.userData.r = 0.38;
  },
  emotes: {
    // Head down, the jaw open, fore legs braced wide, and the whole body shaking.
    growl: {
      length: 1.8,
      pose: (rig, k) => {
        const { body, head, legs, tail } = rig.parts;
        const e = hold(k, 0.15);
        body.position.x += 0.025 * Math.sin(2 * Math.PI * 22 * k) * e;
        body.rotation.z += 0.05 * Math.sin(2 * Math.PI * 17 * k) * e;
        head.rotation.x = 0.25 * e;
        jaw(rig).rotation.x = 0.35 * e;
        legs[0].rotation.z = -0.35 * e;
        legs[1].rotation.z = 0.35 * e;
        tail.rotation.z *= 1 - e;
      },
    },
    // Sits down: the hind legs out in front, a lean back and a tilted head.
    sit: {
      length: 2.2,
      pose: (rig, k) => {
        const { body, head, legs } = rig.parts;
        const e = hold(k);
        body.position.y -= 0.1 * e;
        body.rotation.x = -0.1 * e;
        legs[2].rotation.x = legs[3].rotation.x = -1.1 * e;
        legs[0].rotation.x = legs[1].rotation.x = 0.15 * e;
        head.rotation.z = 0.25 * Math.sin(Math.PI * k) * e;
      },
    },
    // Drops down and rolls over sideways once, paws up at the middle, and back on its feet.
    roll: {
      length: 2.4,
      pose: (rig, k) => {
        const { body, legs } = rig.parts;
        const e = hold(k, 0.15);
        const r = Math.max(0, Math.min(1, (k - 0.15) / 0.7));
        const a = 2 * Math.PI * r * r * (3 - 2 * r);
        body.rotation.z = a;
        body.position.y -= FEET + Math.min(...HULL.map(([x, y]) => x * Math.sin(a) + y * Math.cos(a)));
        for (const [i, leg] of legs.entries()) leg.rotation.x = 0.3 * Math.sin(2 * Math.PI * 3 * k + i) * e;
      },
    },
  },
} satisfies Look;
