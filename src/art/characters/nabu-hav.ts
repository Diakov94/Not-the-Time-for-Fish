import * as THREE from 'three';
import { GLASS, GOLD, material, WOOD } from '../palette.ts';
import { ball, block, coats, rod, standard, type Look } from '../rig.ts';

// НАБУ-ГАВ: a white terrier with brown floppy ears, holding a big magnifying glass up beside its head.
// The MVP's placeholder, moved from render onto the rig (card 110); card 114 finishes it.
export default {
  dress: (rig, c) => {
    const { fur, belly, accent } = coats(c);
    standard(rig, fur, belly);
    const { head, ears, legs } = rig.parts;
    for (const x of [-1, 1]) {
      const ear = block([0.08, 0.26, 0.14], accent, [0.21 * x, 0.12, -0.02]);
      ear.rotation.z = 0.3 * x;
      ears.add(ear);
    }
    head.add(ball(0.06, accent, [-0.09, 0.26, 0.15], [1, 1, 0.4]));
    const ring = new THREE.Mesh(new THREE.TorusGeometry(0.14, 0.03, 6, 14), material(GOLD.brass));
    ring.position.set(0.19, 0.33, 0.16);
    const lens = new THREE.Mesh(new THREE.CircleGeometry(0.13, 14), material(GLASS.pane));
    lens.position.copy(ring.position);
    legs[1].add(rod(0.03, WOOD.door, [0.05, -0.08, 0.08], [0.15, 0.18, 0.14]), ring, lens);
  },
} satisfies Look;
