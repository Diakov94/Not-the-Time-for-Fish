import { COAT, INK } from '../palette.ts';
import { ball, block, catEars, coats, rod, type Look } from '../rig.ts';

// Золотий Батон: a golden cat shaped like a loaf, crust-scored across its back, its head sunk into it,
// on four stub paws. The MVP's placeholder, moved from render onto the rig (card 110); card 112 finishes it.
export default {
  dress: (rig, c) => {
    const { fur, accent } = coats(c);
    const { body, head, muzzle, legs, tail } = rig.parts;
    body.add(ball(0.22, fur, [0, -0.2, 0], [1.25, 1, 1.3]));
    for (const z of [-0.24, -0.15, -0.06]) {
      const score = block([0.2, 0.04, 0.05], accent, [0, -0.2 + 0.22 * Math.sqrt(1 - (z / 0.286) ** 2) - 0.01, z]);
      score.rotation.y = 0.5;
      body.add(score);
    }
    head.position.set(0, -0.05, 0.12);
    head.add(ball(0.15, fur, [0, 0.11, 0]));
    catEars(rig, fur, 0.08, 0.24, 0.2, -0.1);
    for (const x of [-1, 1]) head.add(ball(0.022, INK.black, [0.055 * x, 0.14, 0.14]));
    muzzle.add(ball(0.02, COAT.nose!, [0, 0.1, 0.15]));
    const paws: [number, number, number][] = [[-0.15, -0.34, 0.16], [0.15, -0.34, 0.16], [-0.13, -0.36, -0.12], [0.13, -0.36, -0.12]];
    legs.forEach((leg, i) => {
      leg.position.set(...paws[i]!);
      leg.add(rod(0.04, fur, [0, -0.08, 0], [0, 0, 0]));
    });
    tail.position.set(0, -0.3, -0.26);
    tail.add(rod(0.04, fur, [0, 0, 0], [0, 0.1, -0.1]));
    rig.anchors.head.position.set(0, 0.26, 0);
    rig.anchors.head.userData.r = 0.15;
    rig.anchors.collar.position.set(0, 0.03, 0.12);
    rig.anchors.collar.userData.r = 0.17; // round the sunk head
    rig.anchors.back.position.set(0, -0.2, -0.29);
    rig.anchors.back.userData.r = 0.22;
  },
} satisfies Look;
