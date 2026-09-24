import { INK } from '../palette.ts';
import { ball, catEars, coats, cone, rod, type Look } from '../rig.ts';

// Страус з Межигір'я: a black-plumed cat on long thin legs, a long cream neck and an ostrich plume.
// The MVP's placeholder, moved from render onto the rig (card 110); card 112 finishes it.
export default {
  dress: (rig, c) => {
    const { fur, belly, accent } = coats(c);
    const { body, head, legs, tail } = rig.parts;
    const [fl, fr, hl, hr] = legs;
    hl.position.set(-0.07, -0.15, 0);
    hr.position.set(0.07, -0.15, 0);
    for (const leg of [hl, hr]) leg.add(rod(0.022, accent, [0, -0.3, 0], [0, 0, 0]));
    body.add(ball(0.17, fur, [0, -0.06, -0.02], [1.1, 0.85, 1.25]));
    fl.position.set(-0.16, -0.02, -0.06);
    fr.position.set(0.16, -0.02, -0.06);
    for (const wing of [fl, fr]) wing.add(ball(0.07, belly, [0, -0.04, -0.02], [0.5, 0.7, 1.4]));
    head.position.set(0, 0.02, 0.08);
    head.add(rod(0.04, belly, [0, 0, 0], [0, 0.24, 0.04]), ball(0.11, belly, [0, 0.28, 0.04]));
    catEars(rig, belly, 0.06, 0.38, 0.3, -0.08);
    for (const x of [-1, 1]) head.add(ball(0.02, INK.black, [0.045 * x, 0.3, 0.14]));
    for (const t of [-0.35, 0, 0.35]) rig.parts.ears.add(cone(0.025, 0.2, belly, [0.12 * Math.sin(t), 0.48, 0.02], [0, 0, -t]));
    tail.position.set(0, 0, -0.2);
    for (const t of [-0.4, 0.4]) tail.add(cone(0.04, 0.2, belly, [0.05 * t, 0, -0.02], [-1.1, 0, t]));
    rig.anchors.head.position.set(0, 0.39, 0.04);
    rig.anchors.head.userData.r = 0.11;
    rig.anchors.collar.position.set(0, 0.12, 0.1);
    rig.anchors.collar.userData.r = 0.08;
    rig.anchors.back.position.set(0, -0.06, -0.23);
  },
} satisfies Look;
