import { INK } from '../palette.ts';
import { ball, block, catEars, coats, rod, standard, type Look } from '../rig.ts';

// Проффесор: a grey tabby under a black mortarboard with a gold tassel. The MVP's placeholder, moved
// from render onto the rig (card 110); card 112 finishes it and adds its emotes.
export default {
  dress: (rig, c) => {
    const { fur, belly, accent } = coats(c);
    standard(rig, fur, belly);
    catEars(rig, fur, 0.11, 0.23, 0.6);
    const { head } = rig.parts;
    const board = block([0.34, 0.025, 0.34], INK.black, [0, 0.3, 0]);
    board.rotation.y = Math.PI / 4;
    head.add(rod(0.1, INK.black, [0, 0.23, 0], [0, 0.3, 0]), board);
    head.add(rod(0.008, accent, [0, 0.315, 0], [0.2, 0.3, 0]), rod(0.008, accent, [0.2, 0.3, 0], [0.21, 0.2, 0]), ball(0.025, accent, [0.21, 0.19, 0]));
    rig.anchors.head.position.set(0, 0.32, 0); // a hat sits on the board
  },
} satisfies Look;
