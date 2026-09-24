import * as THREE from 'three';
import { GLASS, GOLD, INK, material, PAINT, WOOD } from '../palette.ts';
import { ball, block, coats, rod, standard, type Look, type Rig } from '../rig.ts';

// НАБУ-ГАВ: the NABU's dog, a white terrier detective: a square head with a beard, brown ears folded
// down its sides (under a hat, not hidden by it), a brown patch over one eye and a saddle on its back,
// a carrot tail up, and a big magnifying glass held at its side (the round shape no other dog has).
// Emotes: the inspection (the glass to the eye), a note taken, a point.

// A pose's weight over an emote: up over the first `a` of it, held, down over the last `a`, eased.
const hold = (k: number, a = 0.2) => {
  const t = Math.max(0, Math.min(1, k / a, (1 - k) / a));
  return t * t * (3 - 2 * t);
};
const part = (rig: Rig, name: string) => rig.root.getObjectByName(name)!;
const paw = new THREE.Vector3();

export default {
  dress: (rig, c) => {
    const { fur, belly, accent } = coats(c);
    standard(rig, fur, belly);
    const { body, head, legs, tail } = rig.parts;
    head.add(block([0.38, 0.3, 0.36], fur, [0, 0.2, 0.02]), block([0.18, 0.1, 0.14], belly, [0, 0.06, 0.25]));
    for (const x of [-1, 1]) {
      const ear = block([0.05, 0.22, 0.16], accent, [0.215 * x, 0.24, 0]);
      ear.rotation.z = 0.2 * x;
      head.add(ear, block([0.08, 0.03, 0.03], fur, [0.08 * x, 0.32, 0.215])); // an ear and a bushy brow
      head.add(ball(0.035, INK.black, [0.09 * x, 0.26, 0.215])); // the eyes, on the square head's face
    }
    head.add(ball(0.065, accent, [-0.09, 0.26, 0.2], [1, 1, 0.4]));
    body.add(ball(0.14, accent, [0.1, -0.08, -0.26], [1, 1, 0.45]));
    tail.add(rod(0.045, fur, [0, 0, 0], [0, 0.26, -0.06]), ball(0.05, accent, [0, 0.28, -0.065]));
    // The glass in the right fore paw, upright at its side: a wooden handle, a brass ring, the lens.
    const glass = new THREE.Group();
    glass.name = 'glass';
    glass.position.set(0.03, -0.25, 0.06);
    const ring = new THREE.Mesh(new THREE.TorusGeometry(0.14, 0.025, 6, 16), material(GOLD.brass));
    const lens = new THREE.Mesh(new THREE.CylinderGeometry(0.13, 0.13, 0.01, 14), material(GLASS.pane));
    ring.position.set(0, 0.36, 0.04);
    lens.position.copy(ring.position);
    lens.rotation.x = Math.PI / 2;
    glass.add(rod(0.025, WOOD.door, [0, -0.04, 0], [0, 0.22, 0.04]), ring, lens);
    legs[1].add(glass);
    // The notebook, tucked in the body's middle until a note is taken: rest puts it back after the emote.
    const note = new THREE.Group();
    note.name = 'note';
    note.position.set(0, -0.18, 0);
    note.add(block([0.14, 0.18, 0.02], PAINT.cobalt, [0, 0, 0]), block([0.12, 0.16, 0.022], PAINT.porcelain, [0.01, 0, 0.005]));
    body.add(note);
  },
  emotes: {
    // The glass raised to the right eye, the head leaning into it, a slow look left and right.
    inspect: {
      length: 2.4,
      pose: (rig, k) => {
        const { body, head, legs } = rig.parts;
        const e = hold(k);
        body.rotation.x = 0.12 * e;
        head.rotation.y = 0.3 * Math.sin(2 * Math.PI * k) * e;
        legs[1].rotation.x = -1.6 * e;
        part(rig, 'glass').rotation.x = 1.6 * e;
        part(rig, 'glass').position.x -= 0.2 * e;
      },
    },
    // The notebook out in the left fore paw, the head bowed to it, the right paw scribbling.
    note: {
      length: 2.2,
      pose: (rig, k) => {
        const { head, legs } = rig.parts;
        const e = hold(k);
        legs[0].rotation.x = -1.1 * e;
        legs[0].rotation.z = 0.4 * e;
        legs[0].updateMatrix();
        const note = part(rig, 'note');
        note.position.lerp(paw.set(-0.03, -0.27, 0.1).applyMatrix4(legs[0].matrix), e);
        note.rotation.x = -0.8 * e;
        legs[1].rotation.x = (-0.9 + 0.12 * Math.sin(2 * Math.PI * 8 * k)) * e;
        legs[1].rotation.z = -0.4 * e;
        head.rotation.x = 0.35 * e;
        head.rotation.y = -0.2 * e;
      },
    },
    // A pointer's stance: the left fore paw straight out ahead, a hind leg lifted, the tail stiff up.
    point: {
      length: 2,
      pose: (rig, k) => {
        const { body, head, legs, tail } = rig.parts;
        const e = hold(k, 0.15);
        body.rotation.x = 0.1 * e;
        head.rotation.x = -0.1 * e;
        legs[0].rotation.x = -1.55 * e;
        legs[2].rotation.x = -0.7 * e;
        tail.rotation.x = 0.3 * e;
        tail.rotation.z *= 1 - e;
      },
    },
  },
} satisfies Look;
