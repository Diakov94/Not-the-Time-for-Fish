import { block, coats, cone, standard, type Look } from '../rig.ts';

// ГАВ-БУ: black and tan, two tall pointed ears and dark sunglasses. The MVP's placeholder, moved from
// render onto the rig (card 110); card 114 finishes it.
export default {
  dress: (rig, c) => {
    const { fur, belly, accent } = coats(c);
    standard(rig, fur, belly);
    const { head, ears } = rig.parts;
    for (const x of [-1, 1]) ears.add(cone(0.08, 0.26, fur, [0.12 * x, 0.44, -0.04], [0, 0, -0.2 * x]));
    head.add(block([0.32, 0.03, 0.03], accent, [0, 0.26, 0.19]));
    for (const x of [-1, 1]) head.add(block([0.12, 0.08, 0.03], accent, [0.075 * x, 0.24, 0.2]));
  },
} satisfies Look;
