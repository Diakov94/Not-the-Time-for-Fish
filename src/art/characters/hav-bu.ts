import * as THREE from 'three';
import { INK, METAL } from '../palette.ts';
import { ball, block, coats, cone, rod, standard, type Look, type Rig } from '../rig.ts';

// ГАВ-БУ: the SBU's dog, an agent in black and tan: two tall pointed ears (the tallest dog's silhouette),
// dark sunglasses, an earpiece's cord down to the collar; tan on the muzzle, the brows, the chest, the
// paws and the legs. Emotes: the glasses (peering over them, pushed back up), a salute, the air sniffed.

// A pose's weight over an emote: up over the first `a` of it, held, down over the last `a`, eased.
const hold = (k: number, a = 0.2) => {
  const t = Math.max(0, Math.min(1, k / a, (1 - k) / a));
  return t * t * (3 - 2 * t);
};
const glasses = (rig: Rig) => rig.parts.head.getObjectByName('glasses')!;

export default {
  dress: (rig, c) => {
    const { fur, belly, accent } = coats(c);
    standard(rig, fur, belly);
    const { body, head, ears, legs } = rig.parts;
    for (const x of [-1, 1]) {
      ears.add(cone(0.075, 0.3, fur, [0.11 * x, 0.47, -0.04], [0, 0, -0.15 * x]));
      ears.add(cone(0.04, 0.2, belly, [0.108 * x, 0.44, -0.01], [0, 0, -0.15 * x]));
      head.add(ball(0.035, belly, [0.08 * x, 0.34, 0.14], [1, 0.6, 0.6])); // the tan brows over the glasses
      head.add(ball(0.05, belly, [0.1 * x, 0.19, 0.15], [1, 0.7, 0.6])); // and the tan cheeks under them
    }
    body.add(ball(0.14, belly, [0, -0.08, 0.25], [1, 1.3, 0.45]));
    for (const [i, x] of [[0, -1], [1, 1]] as const) legs[i].add(ball(0.06, belly, [0.03 * x, -0.27, 0.06]));
    const g = new THREE.Group();
    g.name = 'glasses';
    g.position.set(0, 0.26, 0.2);
    g.add(block([0.34, 0.02, 0.03], METAL.silver, [0, 0.05, 0])); // the frame's top bar catches the light
    for (const x of [-1, 1]) g.add(block([0.14, 0.09, 0.025], accent, [0.078 * x, 0, 0]), block([0.02, 0.02, 0.2], accent, [0.19 * x, 0.03, -0.1]));
    head.add(g);
    // The earpiece in the right ear and its cord down to the collar.
    head.add(ball(0.025, INK.black, [0.2, 0.22, -0.02]), rod(0.008, INK.black, [0.2, 0.22, -0.02], [0.16, -0.06, -0.08]));
  },
  emotes: {
    // Peers over the glasses as they slide down the muzzle, pushes them back up with a paw, chin up.
    glasses: {
      length: 1.8,
      pose: (rig, k) => {
        const { head, legs } = rig.parts;
        const slide = Math.sin(Math.PI * Math.max(0, Math.min(1, (k - 0.1) / 0.55)));
        const cool = Math.sin(Math.PI * Math.max(0, (k - 0.6) / 0.4));
        const paw = Math.sin(Math.PI * Math.max(0, Math.min(1, (k - 0.35) / 0.4)));
        glasses(rig).position.y -= 0.06 * slide;
        glasses(rig).position.z += 0.03 * slide;
        head.rotation.x = 0.3 * slide - 0.25 * cool;
        legs[1].position.y += 0.12 * paw;
        legs[1].rotation.x = -2.1 * paw;
        legs[1].rotation.z = -0.7 * paw;
      },
    },
    // Stands straight, the right fore paw at the brow, the chin up and the tail still.
    salute: {
      length: 1.8,
      pose: (rig, k) => {
        const { body, head, legs, tail } = rig.parts;
        const e = hold(k);
        body.rotation.x = -0.06 * e;
        head.rotation.x = -0.12 * e;
        legs[1].position.y += 0.2 * e;
        legs[1].rotation.x = -2.6 * e;
        legs[1].rotation.z = -0.5 * e;
        legs[0].rotation.z = -0.12 * e;
        tail.rotation.z *= 1 - e;
      },
    },
    // The nose up, sniffing in quick nods, the head sweeping side to side, the ears forward.
    sniff: {
      length: 2.2,
      pose: (rig, k) => {
        const { body, head, ears } = rig.parts;
        const e = hold(k, 0.15);
        head.rotation.x = (-0.5 + 0.08 * Math.sin(2 * Math.PI * 9 * k)) * e;
        head.rotation.y = 0.45 * Math.sin(2 * Math.PI * k) * e;
        ears.rotation.x = 0.15 * e;
        body.position.y += 0.03 * e;
      },
    },
  },
} satisfies Look;
