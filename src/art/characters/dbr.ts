import * as THREE from 'three';
import { COAT, material, METAL } from '../palette.ts';
import { ball, coats, cone, standard, type Look } from '../rig.ts';

// ДБР-р-р: a stocky brindle bulldog, a broad earless head with an underbite, in a spiked collar. The
// MVP's placeholder, moved from render onto the rig (card 110); card 114 finishes it.
const up = new THREE.Vector3(0, 1, 0);
export default {
  dress: (rig, c) => {
    const { fur, belly, accent } = coats(c);
    standard(rig, fur, belly);
    const { body, head } = rig.parts;
    head.add(ball(0.25, fur, [0, 0.15, 0.01], [1.3, 0.9, 1]));
    for (const x of [-1, 1]) head.add(cone(0.02, 0.06, COAT.white!, [0.06 * x, 0.08, 0.33]));
    const collar = new THREE.Mesh(new THREE.TorusGeometry(0.22, 0.045, 6, 16), material(accent));
    collar.position.set(0, 0.09, 0.02);
    collar.rotation.x = Math.PI / 2;
    body.add(collar);
    for (let i = 0; i < 8; i++) {
      const out = new THREE.Vector3(Math.sin((i * Math.PI) / 4), 0, Math.cos((i * Math.PI) / 4));
      const spike = cone(0.035, 0.11, METAL.silver, [0.29 * out.x, 0.09, 0.02 + 0.29 * out.z]);
      spike.quaternion.setFromUnitVectors(up, out);
      body.add(spike);
    }
    rig.anchors.head.userData.r = 0.3;
    rig.anchors.head.scale.set(1.3, 0.9, 1); // a hat takes the broad head's proportions
    rig.anchors.collar.userData.r = 0.36; // a scarf goes round the spiked collar
  },
} satisfies Look;
