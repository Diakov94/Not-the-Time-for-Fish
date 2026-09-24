import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import type { Box, Vec3 } from '../content/level.ts';
import { CLOTH, GLASS, GOLD, INK, KIND, material, METAL, PAINT, WOOD } from './palette.ts';
import { covered, type Pattern } from './patterns.ts';
import { block, frameOf } from './themes.ts';

// ADR 0011: the props' looks. The kinds the sim spawns (fish, lure, mine, trap, bag), sized from the
// collider render hands in, and the furniture families every map's theme reuses, each built inside the
// box it is given in the theme's frame (`frameOf`: local x along the longer side, a front on +z). GAME.md,
// Art Direction: low-poly, flat shading, the palette's warm home range.

// Parts: a ball, a rod between two points, an upright cylinder standing on y (tapered if asked).
type V3 = [number, number, number];
export function ball(r: number, colour: number, [x, y, z]: V3, s: V3 = [1, 1, 1]): THREE.Mesh {
  const m = new THREE.Mesh(new THREE.IcosahedronGeometry(r, 1), material(colour));
  m.position.set(x, y, z);
  m.scale.set(...s);
  return m;
}
const up = new THREE.Vector3(0, 1, 0);
export function rod(r: number, colour: number | THREE.Material, from: V3, to: V3, sides = 6): THREE.Mesh {
  const a = new THREE.Vector3(...from);
  const d = new THREE.Vector3(...to).sub(a);
  const m = new THREE.Mesh(new THREE.CylinderGeometry(r, r, d.length(), sides), typeof colour === 'number' ? material(colour) : colour);
  m.position.copy(a).addScaledVector(d, 0.5);
  m.quaternion.setFromUnitVectors(up, d.normalize());
  return m;
}
function cone(r: number, h: number, colour: number, [x, y, z]: V3, tilt: V3 = [0, 0, 0]): THREE.Mesh {
  const m = new THREE.Mesh(new THREE.ConeGeometry(r, h, 5), material(colour));
  m.position.set(x, y, z);
  m.rotation.set(...tilt);
  return m;
}
export function drum(top: number, bottom: number, h: number, colour: number, [x, y, z]: V3, sides = 10): THREE.Mesh {
  const m = new THREE.Mesh(new THREE.CylinderGeometry(top, bottom, h, sides), material(colour));
  m.position.set(x, y, z);
  return m;
}

// A look's parts in one mesh: every part in a palette colour becomes vertex colours of one mesh in
// PAINTED, and each pattern, glass or decal one mesh of its own, so a look costs a draw call or two, not
// one per part (card 116: ≤ 500 a frame). The parts' poses are baked into the geometry; the look's own
// pose stays on the group returned.
const PAINTED = new THREE.MeshLambertMaterial({ vertexColors: true, flatShading: true });
export function bake(root: THREE.Object3D): THREE.Object3D {
  root.updateMatrixWorld(true);
  const inverse = root.matrixWorld.clone().invert();
  const byMaterial = new Map<THREE.Material, THREE.BufferGeometry[]>();
  root.traverse((o) => {
    if (!(o instanceof THREE.Mesh)) return;
    const g = (o.geometry.index ? o.geometry.toNonIndexed() : o.geometry.clone()).applyMatrix4(inverse.clone().multiply(o.matrixWorld));
    const m: THREE.Material = o.material;
    const plain = m instanceof THREE.MeshLambertMaterial && !m.map && !m.transparent;
    if (plain) g.setAttribute('color', new THREE.Float32BufferAttribute(Array.from({ length: g.getAttribute('position').count }, () => m.color.toArray()).flat(), 3));
    const key = plain ? PAINTED : m;
    if (!byMaterial.has(key)) byMaterial.set(key, []);
    byMaterial.get(key)!.push(g);
  });
  const out = new THREE.Group();
  out.position.copy(root.position);
  out.quaternion.copy(root.quaternion);
  for (const [m, parts] of byMaterial) out.add(new THREE.Mesh(mergeGeometries(parts)!, m));
  return out;
}

// See-through glass: the aquarium's panes, a cabinet's doors.
export const GLASS_MATERIAL = new THREE.MeshLambertMaterial({ color: GLASS.pane, transparent: true, opacity: 0.35, depthWrite: false });
const SPARK = new THREE.MeshBasicMaterial({ color: GOLD.spark }); // unlit, so it shows in any shade

// The kinds. A fish: a long body over a pale belly, a tail fin spread flat behind it, a dorsal fin, two
// side fins and white eyes; the lure is one in its own colours at its own collider's size (card 57).
function fish(half: Vec3, { body, fin }: { body: number; fin: number }): THREE.Object3D {
  const g = new THREE.Group();
  g.add(ball(1, body, [0, 0.05 * half.y, 0.05 * half.z], [0.9 * half.x, 0.85 * half.y, 0.72 * half.z]));
  g.add(ball(1, PAINT.porcelain, [0, -0.3 * half.y, 0.1 * half.z], [0.7 * half.x, 0.55 * half.y, 0.55 * half.z]));
  const tail = cone(1, 1, fin, [0, 0, -0.8 * half.z], [Math.PI / 2, 0, 0]);
  tail.scale.set(1.1 * half.x, 0.35 * half.z, 0.25 * half.y);
  const dorsal = cone(0.35 * half.z, 0.25 * half.z, fin, [0, 0.8 * half.y, 0]);
  dorsal.scale.x = 0.3;
  g.add(tail, dorsal);
  for (const x of [-1, 1]) {
    const side = cone(0.2 * half.z, 0.3 * half.z, fin, [0.8 * half.x * x, -0.2 * half.y, 0.25 * half.z], [-1.2, 0, 0.6 * x]);
    side.scale.x = 0.3;
    g.add(side, ball(0.2 * half.x, PAINT.porcelain, [0.62 * half.x * x, 0.25 * half.y, 0.5 * half.z]));
    g.add(ball(0.1 * half.x, INK.black, [0.75 * half.x * x, 0.27 * half.y, 0.55 * half.z]));
  }
  return bake(g);
}

// A cartoon firecracker bundle: three red sticks with paper caps bound with a yellow band, sunk to half
// their thickness into the floor under the body (card 57: concealed, never hidden), and a fuse standing
// clear of them with an unlit spark that shows from any side.
function mine(half: Vec3): THREE.Object3D {
  const g = new THREE.Group();
  const r = half.y * 0.95;
  const y = -half.y; // the floor the body lies on
  for (const z of [-2.1 * r, 0, 2.1 * r]) {
    g.add(rod(r, KIND.mine.stick, [-0.8 * half.x, y, z], [0.8 * half.x, y, z]));
    for (const x of [-1, 1]) g.add(rod(1.05 * r, PAINT.porcelain, [0.8 * half.x * x, y, z], [0.86 * half.x * x, y, z]));
  }
  g.add(block(0.25 * half.x, 2.1 * r, 6.6 * r, material(KIND.mine.band), 0, y));
  g.add(rod(0.008, INK.black, [0.86 * half.x, y, 0], [0.95 * half.x, y + 3 * r, 0]));
  const spark = new THREE.Mesh(new THREE.IcosahedronGeometry(0.04, 0), SPARK);
  spark.position.set(0.95 * half.x, y + 3 * r + 0.03, 0);
  return bake(g.add(spark));
}

// A trap is a noise maker: a teal alarm clock on two feet, a white face with four ticks and two hands,
// two brass bells and the hammer between them.
function trap(half: Vec3): THREE.Object3D {
  const g = new THREE.Group();
  const r = Math.min(half.x, half.y);
  const z = 0.51 * half.z;
  const face = new THREE.Mesh(new THREE.CircleGeometry(0.75 * r, 12), material(KIND.trap.face));
  face.position.z = z;
  g.add(rod(0.9 * r, KIND.trap.body, [0, 0, -0.5 * half.z], [0, 0, 0.5 * half.z], 12), face);
  for (let i = 0; i < 4; i++) g.add(block(0.08 * r, 0.08 * r, 0.02, material(INK.black), 0.6 * r * Math.sin((i * Math.PI) / 2), 0.6 * r * Math.cos((i * Math.PI) / 2), z));
  g.add(block(0.05 * r, 0.55 * r, 0.02, material(INK.black), 0, 0.25 * r, z + 0.01), block(0.4 * r, 0.05 * r, 0.02, material(INK.black), 0.18 * r, 0, z + 0.01));
  g.add(rod(0.04 * r, GOLD.brass, [0, 0.9 * r, 0], [0, 1.25 * r, 0]), ball(0.08 * r, GOLD.brass, [0, 1.3 * r, 0]));
  for (const x of [-1, 1]) g.add(ball(0.4 * r, GOLD.brass, [0.55 * r * x, 0.95 * r, 0], [1, 0.7, 1]), ball(0.15 * r, INK.black, [0.6 * r * x, -0.95 * r, 0]));
  return bake(g);
}

// A mystery bag: a purple sack tied with a gold cord, its neck tufted, a gold star patch on its front.
function bag(r: number): THREE.Object3D {
  const g = new THREE.Group();
  g.add(ball(0.92 * r, KIND.bag.sack, [0, -0.12 * r, 0], [1, 0.85, 1]));
  const tie = new THREE.Mesh(new THREE.TorusGeometry(0.28 * r, 0.08 * r, 5, 10), material(GOLD.brass));
  tie.position.y = 0.66 * r;
  tie.rotation.x = Math.PI / 2;
  const patch = cone(0.3 * r, 0.1 * r, GOLD.star, [0, -0.1 * r, 0.8 * r], [Math.PI / 2, 0, 0]);
  g.add(tie, patch, cone(0.4 * r, 0.4 * r, KIND.bag.sack, [0, 0.9 * r, 0], [Math.PI, 0, 0]));
  return bake(g);
}

export const KINDS = {
  fish: (half: Vec3) => fish(half, KIND.fish),
  lure: (half: Vec3) => fish(half, KIND.lure),
  mine,
  trap,
  bag,
};

// The furniture families, each in its label's colour. A table: a top (in a pattern if asked) on four
// legs joined by an apron under it.
export function table(b: Box, colour: number, top?: Pattern): THREE.Group {
  const { l, t, h, group } = frameOf(b);
  const m = material(colour);
  group.add(top ? covered(2 * l, 0.06, 2 * t, top, 0, h - 0.03) : block(2 * l, 0.06, 2 * t, m, 0, h - 0.03));
  group.add(block(2 * l - 0.16, 0.08, 2 * t - 0.16, m, 0, h - 0.1));
  for (const x of [-l + 0.06, l - 0.06]) for (const z of [-t + 0.06, t - 0.06]) group.add(block(0.07, 2 * h - 0.06, 0.07, m, x, -0.03, z));
  return group;
}

// A wooden chair: a seat at half height on four legs, a back of two posts and two rails on -z.
export function chair(b: Box, colour: number): THREE.Group {
  const { l, t, h, group } = frameOf(b);
  const m = material(colour);
  const w = 0.05;
  group.add(block(2 * l, 0.05, 2 * t, m, 0, -0.03));
  for (const x of [-l + w, l - w]) {
    for (const z of [-t + w, t - w]) group.add(block(w, h - 0.05, w, m, x, -h / 2 - 0.03, z));
    group.add(block(w, h, w, m, x, h / 2, -t + w));
  }
  for (const y of [0.45 * h, 0.85 * h]) group.add(block(2 * l - 2 * w, 0.08, 0.03, m, 0, y, -t + w));
  return group;
}

// Upholstered: a sofa (a cushion per 0.9 m) or an armchair (one): a base on short legs, the cushions and
// the back in the cloth (a pattern if asked), and an arm at each end; the back on -z, or +z if `side` is 1.
export function upholstered(b: Box, colour: number, cloth?: Pattern, side: 1 | -1 = -1): THREE.Group {
  const { l, t, h, group } = frameOf(b);
  const part = (w: number, hh: number, d: number, x: number, y: number, z = 0) => (cloth ? covered(w, hh, d, cloth, x, y, z) : block(w, hh, d, material(colour), x, y, z));
  const [leg, arm, back] = [0.08, Math.min(0.12, l / 4), Math.min(0.2, t)];
  for (const x of [-l + 0.05, l - 0.05]) for (const z of [-t + 0.05, t - 0.05]) group.add(block(0.06, leg, 0.06, material(WOOD.walnut), x, -h + leg / 2, z));
  group.add(block(2 * l, 0.8 * h - leg, 2 * t, material(colour), 0, -h + leg + (0.8 * h - leg) / 2));
  const n = Math.max(1, Math.round((2 * l - 2 * arm) / 0.9));
  const w = (2 * l - 2 * arm) / n;
  for (let i = 0; i < n; i++) {
    const x = -l + arm + w * (i + 0.5);
    group.add(part(w - 0.02, 0.2 * h, 2 * t - back, x, -0.1 * h, (-side * back) / 2), part(w - 0.02, 1.2 * h, back, x, 0.4 * h, side * (t - back / 2)));
  }
  for (const x of [-l + arm / 2, l - arm / 2]) group.add(part(arm, 1.3 * h - leg, 2 * t, x, -0.35 * h + leg / 2));
  return group;
}

// A bed: a wooden frame, a linen mattress, a blanket in its colour over the foot two thirds, a pillow and
// a headboard at the head on +z.
export function bed(b: Box, colour: number): THREE.Group {
  const { l, t, h, group } = frameOf(b);
  const wood = material(WOOD.walnut);
  group.add(block(2 * l, 0.5 * h, 2 * t - 0.08, wood, 0, -0.75 * h, -0.04), block(2 * l, 2 * h, 0.08, wood, 0, 0, t - 0.04));
  group.add(block(2 * l - 0.06, 0.3 * h, 2 * t - 0.12, material(CLOTH.linen), 0, -0.35 * h, -0.06));
  group.add(block(2 * l - 0.02, 0.32 * h, 1.3 * t, material(colour), 0, -0.33 * h, -t + 0.65 * t));
  group.add(ball(1, PAINT.porcelain, [0, -0.1 * h, t - 0.3], [0.6 * l, 0.12, 0.18]));
  return group;
}

// Grandma's china cabinet (GAME.md): a carcass on a plinth under a cornice, wooden doors below with brass
// knobs, glass doors above over two shelves of plates and cups, all on its front at +z.
export function cabinet(b: Box, colour: number): THREE.Group {
  const { l, t, h, group } = frameOf(b);
  const m = material(colour);
  const mid = -0.1 * h; // the lower doors' top
  const [top, glazed] = [h - 0.1, (mid + h - 0.1) / 2]; // the cornice's underside, the glazed part's middle
  group.add(block(2 * l, mid + h - 0.1, 2 * t - 0.1, m, 0, (mid - h + 0.1) / 2, -0.05), block(2 * l, 0.1, 2 * t, m, 0, h - 0.05), block(2 * l - 0.1, 0.1, 2 * t - 0.05, material(WOOD.stained), 0, -h + 0.05));
  group.add(block(2 * l, 0.06, 2 * t - 0.02, m, 0, mid), block(2 * l, top - mid, 0.04, m, 0, glazed, -t + 0.02));
  for (const x of [-l + 0.02, l - 0.02]) group.add(block(0.04, top - mid, 2 * t, m, x, glazed));
  const n = Math.max(2, Math.round(l));
  const w = (2 * l) / n;
  for (let i = 0; i < n; i++) {
    const x = -l + w * (i + 0.5);
    group.add(block(w - 0.04, mid + h - 0.14, 0.04, m, x, (mid - h + 0.1) / 2 + 0.02, t - 0.03));
    group.add(ball(0.025, GOLD.brass, [x + (i % 2 ? -1 : 1) * (w / 2 - 0.08), mid - 0.15, t]));
    group.add(block(w - 0.04, h - mid - 0.14, 0.02, GLASS_MATERIAL, x, (mid + h) / 2 - 0.04, t - 0.02));
  }
  for (const y of [mid + 0.03, mid + 0.5 * (h - mid)]) {
    group.add(block(2 * l - 0.04, 0.03, 2 * t - 0.1, m, 0, y, -0.05));
    for (let x = -l + 0.15; x < l - 0.1; x += 0.22) {
      // A plate standing on its edge against the back, in a cobalt rim, and a cup before it.
      group.add(rod(0.09, PAINT.porcelain, [x, y + 0.1, -t + 0.05], [x, y + 0.1, -t + 0.065], 10), rod(0.1, PAINT.cobalt, [x, y + 0.1, -t + 0.04], [x, y + 0.1, -t + 0.05], 10));
      group.add(drum(0.03, 0.025, 0.06, PAINT.mustard, [x + 0.11, y + 0.045, 0.05]));
    }
  }
  return group;
}
// A crate: a dark inside behind three slats on every side face and four corner posts.
export function crate(b: Box, colour: number): THREE.Group {
  const { l, t, h, group } = frameOf(b);
  const m = material(colour);
  group.add(block(2 * l - 0.06, 2 * h - 0.06, 2 * t - 0.06, material(INK.shadow)));
  for (const y of [-0.66 * h, 0, 0.66 * h]) {
    for (const z of [-t + 0.015, t - 0.015]) group.add(block(2 * l, 0.25 * h, 0.03, m, 0, y, z));
    for (const x of [-l + 0.015, l - 0.015]) group.add(block(0.03, 0.25 * h, 2 * t, m, x, y));
  }
  for (const x of [-l + 0.04, l - 0.04]) for (const z of [-t + 0.04, t - 0.04]) group.add(block(0.08, 2 * h, 0.08, material(WOOD.mahogany), x, 0, z));
  group.add(block(2 * l, 0.03, 2 * t, m, 0, h - 0.015), block(2 * l, 0.03, 2 * t, m, 0, -h + 0.015));
  return group;
}

// A stool: a round seat on three splayed legs, a rung ring between them.
export function stool(b: Box, colour: number): THREE.Group {
  const { l, t, h, group } = frameOf(b);
  const r = Math.min(l, t);
  group.add(drum(r, r, 0.05, colour, [0, h - 0.025, 0], 12));
  for (let i = 0; i < 3; i++) {
    const [s, c] = [Math.sin((i * 2 * Math.PI) / 3), Math.cos((i * 2 * Math.PI) / 3)];
    group.add(rod(0.025, colour, [0.55 * r * s, h - 0.05, 0.55 * r * c], [0.9 * r * s, -h + 0.02, 0.9 * r * c]));
  }
  const rung = new THREE.Mesh(new THREE.TorusGeometry(0.7 * r, 0.015, 4, 12), material(colour));
  rung.rotation.x = Math.PI / 2;
  rung.position.y = -0.4 * h;
  return group.add(rung);
}

// A pedal bin: a tapered drum, its lid with a handle, a black pedal at its front.
export function bin(b: Box, colour: number): THREE.Group {
  const { l, t, h, group } = frameOf(b);
  const r = Math.min(l, t);
  group.add(drum(0.95 * r, 0.8 * r, 2 * h - 0.06, colour, [0, -0.03, 0], 12), drum(r, r, 0.04, METAL.steel, [0, h - 0.04, 0], 12));
  group.add(block(0.12, 0.02, 0.03, material(METAL.steel), 0, h - 0.01, 0), block(0.1, 0.03, 0.1 * r, material(INK.black), 0, -h + 0.05, 0.85 * r));
  return group;
}
