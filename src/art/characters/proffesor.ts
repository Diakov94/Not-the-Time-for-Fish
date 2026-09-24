import * as THREE from 'three';
import { INK } from '../palette.ts';
import { ball, block, catEars, coats, cone, rod, standard, type Emote, type Look, type Rig, type V3 } from '../rig.ts';

// Проффесор (card 112): a stooped grey tabby with a cream belly under a black mortarboard, a gold
// tassel hanging from its corner and swinging with the head. The silhouette: the head low and forward
// of a hunched back, the board a flat square wider than the head. Emotes: the lecture (a paw raised,
// the head nodding the tassel about), the cap adjusted with both paws, a doze that ends with a start.

const bell = (k: number) => Math.sin(Math.PI * k);
const smooth = (x: number) => (x <= 0 ? 0 : x >= 1 ? 1 : x * x * (3 - 2 * x));
// 1 from `a` of the way in to `b` of the way out, easing in and out over the rest.
const hold = (k: number, a: number, b: number) => Math.min(smooth(k / a), smooth((1 - k) / (1 - b)));

// A tabby's stripes are its fur a shade darker.
const darker = (colour: number) => new THREE.Color(colour).multiplyScalar(0.7).getHex();

// The tassel is a pendulum on the board's corner: a bob a `length` below it, integrated in the world
// from the time of the rig's last pose, so it lags behind whatever turns the head and settles hanging
// straight down. It is aimed on the frame it is drawn, after the pose has placed the head.
const DOWN = new THREE.Vector3(0, -1, 0);
const GRAVITY = new THREE.Vector3(0, -9.8, 0);
function swinging(rig: Rig, tassel: THREE.Object3D, length: number): void {
  const bob = new THREE.Vector3();
  const last = new THREE.Vector3();
  const at = new THREE.Vector3();
  const v = new THREE.Vector3();
  const turn = new THREE.Quaternion();
  let t = -Infinity;
  tassel.onBeforeRender = () => {
    at.setFromMatrixPosition(tassel.matrixWorld);
    const dt = rig.at - t;
    if (dt > 0.1 || dt < 0) last.copy(bob.copy(at).addScaledVector(DOWN, length));
    else if (dt > 0) {
      v.copy(bob).sub(last).multiplyScalar(0.94);
      last.copy(bob);
      bob.add(v).addScaledVector(GRAVITY, dt * dt);
    }
    t = rig.at;
    bob.sub(at).setLength(length).add(at);
    v.copy(bob).sub(at).normalize().applyQuaternion(tassel.parent!.getWorldQuaternion(turn).invert());
    tassel.quaternion.setFromUnitVectors(DOWN, v);
    tassel.updateMatrixWorld();
  };
}

const lecture: Emote = {
  length: 2.4,
  pose: (rig, k) => {
    const s = bell(k);
    const { head, legs } = rig.parts;
    head.rotation.x -= 0.15 * s; // it looks up to speak
    legs[1].position.y += 0.08 * s; // the right paw raised beside the head, a claw wagging
    legs[1].rotation.x -= 2.2 * s;
    legs[1].rotation.z = 0.8 * s * (1 + 0.3 * Math.sin(8 * Math.PI * k));
    head.rotation.x += 0.2 * s * Math.sin(6 * Math.PI * k); // nodding at each point made
    head.rotation.y += 0.25 * s * Math.sin(2 * Math.PI * k);
  },
};

const cap: Emote = {
  length: 1.8,
  pose: (rig, k) => {
    const s = hold(k, 0.25, 0.75);
    const { head, ears, legs } = rig.parts;
    for (const [i, x] of [[0, -1], [1, 1]] as const) {
      legs[i].position.y += 0.13 * s; // both paws up to the board's edges
      legs[i].position.z += 0.06 * s;
      legs[i].rotation.x -= 2.45 * s;
      legs[i].rotation.z = 0.3 * x * s;
    }
    ears.rotation.z = 0.25 * bell(k) * Math.sin(3 * Math.PI * k); // tipped one way, the other, then square
    ears.rotation.y = 0.3 * bell(k);
    head.rotation.x -= 0.15 * s;
  },
};

const doze: Emote = {
  length: 3,
  pose: (rig, k) => {
    const d = hold(k, 0.2, 0.82);
    const { body, head, legs, tail } = rig.parts;
    head.rotation.x += 0.65 * d; // the chin sinks to the chest
    head.rotation.z += 0.12 * d;
    body.scale.x = body.scale.z = 1 + 0.05 * d * Math.max(0, Math.sin(4 * Math.PI * k)); // two slow snores
    for (const leg of [legs[0], legs[1]]) leg.rotation.x += 0.6 * d; // the arms drop
    tail.rotation.x += 0.4 * d;
    if (k > 0.82) head.rotation.x -= 0.35 * Math.sin((Math.PI * (k - 0.82)) / 0.18); // awake with a start
  },
};

export default {
  dress: (rig, c) => {
    const { fur, belly, accent } = coats(c);
    standard(rig, fur, belly);
    const { body, head, ears, legs, tail } = rig.parts;
    const stripe = darker(fur);
    // The stoop: a hump between the shoulders, the head down in front of it.
    body.add(ball(0.13, fur, [0, 0.04, -0.1], [1.25, 1.1, 1]));
    head.position.set(0, 0.02, 0.13);
    head.rotation.x = 0.3;
    for (const paw of [legs[0], legs[1]]) paw.rotation.x = -0.35; // the arms hang forward of the stoop
    // The tabby's bands round the body and the tail, and the M on the brow.
    for (const [y, r] of [[0.02, 0.172], [-0.09, 0.197], [-0.2, 0.172]] as const) body.add(ball(r, stripe, [0, y, -0.012], [1, 0.1, 0.95]));
    for (const at of [[0, 0.12, -0.08], [0, 0.32, -0.14]] as V3[]) tail.add(ball(0.042, stripe, at, [1, 0.6, 1]));
    for (const x of [-0.05, 0, 0.05]) {
      const m = block([0.015, 0.07, 0.02], stripe, [x, 0.22, 0.12]);
      m.rotation.x = -0.6;
      head.add(m);
    }
    catEars(rig, fur, 0.11, 0.2, 0.7);
    // The mortarboard tops the head, so a worn hat replaces it: a skull cap, the board set square on
    // the diagonal, the button, and the tassel over the right corner.
    ears.add(rod(0.13, INK.black, [0, 0.2, 0], [0, 0.3, 0]));
    const board = block([0.4, 0.03, 0.4], INK.black, [0, 0.31, 0]);
    board.rotation.y = Math.PI / 4;
    const corner: V3 = [0.28, 0.32, 0];
    ears.add(board, ball(0.02, accent, [0, 0.33, 0]), rod(0.008, accent, [0, 0.33, 0], corner));
    const tassel = cone(0.028, 0.12, accent, corner);
    tassel.geometry.translate(0, -0.06, 0); // hung from its tip
    ears.add(tassel);
    swinging(rig, tassel, 0.12);
    rig.anchors.head.position.set(0, 0.26, 0);
    rig.anchors.collar.position.set(0, 0.05, 0.06);
  },
  emotes: { lecture, cap, doze },
} satisfies Look;
