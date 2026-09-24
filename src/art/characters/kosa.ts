import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { INK, material } from '../palette.ts';
import { block, catEars, coats, rod, standard, type Emote, type Look, type Rig, type V3 } from '../rig.ts';

// Коса: a prim smoke-grey cat, white chest, a thick wheat-blond braid wound twice round the top of its
// head as a crown, its end over the shoulder down the chest; ears flat out to the sides under it, a stern
// brow, the tail held low. Emotes: the braid flicked, a curtsy, the stern look (held).
const TAU = 2 * Math.PI;
// A braid: plaited lobes, alternately tilted, along `at` (a point and the direction the braid runs there
// in the xz-plane or down), as one mesh.
function braid(colour: number, lobes: { at: V3; turn: number; down?: boolean }[], size: number): THREE.Mesh {
  const parts = lobes.map(({ at, turn, down }, i) => {
    const g = new THREE.IcosahedronGeometry(size, 0).scale(0.8, 0.8, 1.5);
    const e = down ? new THREE.Euler(Math.PI / 2, i % 2 ? 0.5 : -0.5, 0) : new THREE.Euler(i % 2 ? 0.45 : -0.45, turn, 0, 'YXZ');
    return g.applyMatrix4(new THREE.Matrix4().makeRotationFromEuler(e)).translate(...at);
  });
  return new THREE.Mesh(mergeGeometries(parts), material(colour));
}
// The pivots the emotes move, per rig.
const moving = new WeakMap<Rig, { plait: THREE.Group; brows: THREE.Group[] }>();

export default {
  dress: (rig, c) => {
    const { fur, belly, accent } = coats(c);
    standard(rig, fur, belly);
    catEars(rig, fur, 0.14, 0.17, 1.05, 0);
    const { head, ears, tail } = rig.parts;
    // The crown in two tiers, the braid wound twice round the top of the head: a round, tall top where
    // another cat has ears or a flat cap.
    const tier = (n: number, r: number, y: number) =>
      Array.from({ length: n }, (_, i) => {
        const a = (TAU * i) / n;
        return { at: [r * Math.sin(a), y, r * Math.cos(a) - 0.01] as V3, turn: a + Math.PI / 2 };
      });
    ears.add(braid(accent, [...tier(16, 0.13, 0.24), ...tier(11, 0.085, 0.3)], 0.045));
    // The end, from the side of the crown over the shoulder down the chest: a pivot the flick swings.
    const plait = new THREE.Group();
    plait.position.set(0.13, 0.22, -0.02);
    plait.add(braid(accent, [0, 1, 2, 3, 4, 5].map((i) => ({ at: [0.005 * i, -0.055 * i, 0.022 * i] as V3, turn: 0, down: true })), 0.034));
    plait.add(new THREE.Mesh(new THREE.ConeGeometry(0.032, 0.07, 5), material(accent)).translateY(-0.34).translateZ(0.13));
    ears.add(plait);
    // The tail held low and swept along behind, not curled up.
    tail.clear();
    tail.add(rod(0.035, fur, [0, 0, 0], [0, -0.14, -0.12]), rod(0.035, fur, [0, -0.14, -0.12], [0.06, -0.17, -0.32]));
    tail.add(rod(0.035, fur, [0.06, -0.17, -0.32], [0.12, -0.1, -0.38]));
    const brows = [-1, 1].map((x) => {
      const brow = new THREE.Group();
      brow.position.set(0.06 * x, 0.185, 0.135);
      brow.rotation.z = 0.4 * x; // the inner ends down: a frown
      brow.add(block([0.075, 0.02, 0.02], INK.black, [0, 0, 0]));
      head.add(brow);
      return brow;
    });
    moving.set(rig, { plait, brows });
    rig.anchors.head.userData.r = 0.16;
  },
  emotes: { flick: flick(), curtsy: curtsy(), stare: stare() },
} satisfies Look;

const smooth = (x: number) => (x <= 0 ? 0 : x >= 1 ? 1 : x * x * (3 - 2 * x));

// The braid flicked: a toss of the head sends the end out to the side, where it swings back and settles.
function flick(): Emote {
  return {
    length: 1.6,
    pose: (rig, k) => {
      const { plait } = moving.get(rig)!;
      const toss = Math.sin(Math.PI * smooth(k / 0.3));
      rig.parts.head.rotation.z -= 0.35 * toss;
      rig.parts.head.rotation.y += 0.25 * toss;
      plait.rotation.z += 1.6 * Math.sin(Math.PI * Math.min(1, k / 0.35)) + (k > 0.35 ? 0.4 * Math.sin((TAU * 2 * (k - 0.35)) / 0.65) * (1 - k) : 0);
    },
  };
}

// A curtsy: one hind leg back, a dip, the fore paws holding out an invisible skirt, the head bowed.
function curtsy(): Emote {
  return {
    length: 2.4,
    pose: (rig, k) => {
      const { body, head, legs } = rig.parts;
      const e = smooth(Math.min(k, 1 - k) * 3.5);
      body.position.y -= 0.04 * e;
      body.rotation.x += 0.12 * e;
      head.rotation.x += 0.35 * e;
      legs[2].rotation.x += 0.8 * e;
      legs[3].rotation.x -= 0.5 * e;
      legs[0].rotation.z -= 0.7 * e;
      legs[1].rotation.z += 0.7 * e;
      legs[0].rotation.x -= 0.3 * e;
      legs[1].rotation.x -= 0.3 * e;
    },
  };
}

// The stern look, held: chin down, the brows lowered and knitted over the eyes, the fore paws on the
// hips, the tail stiff; held for most of its length.
function stare(): Emote {
  return {
    length: 3,
    pose: (rig, k) => {
      const { body, head, legs, tail } = rig.parts;
      const e = smooth(Math.min(k, 1 - k) * 8);
      head.rotation.x += 0.2 * e;
      body.rotation.x += 0.06 * e;
      for (const [i, brow] of moving.get(rig)!.brows.entries()) {
        brow.position.y -= 0.02 * e;
        brow.rotation.z += (i ? 0.25 : -0.25) * e;
      }
      legs[0].rotation.z -= 0.6 * e;
      legs[1].rotation.z += 0.6 * e;
      tail.rotation.x -= 0.3 * e;
      tail.rotation.z *= 1 - e;
    },
  };
}
