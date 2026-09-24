import * as THREE from 'three';
import type { Box } from '../../content/level.ts';
import { decal, hex } from '../decals.ts';
import { CLAY, GLASS, INK, LABEL, material, METAL, OVERLAY, PAINT, WOOD } from '../palette.ts';
import { covered, pattern, type Pattern } from '../patterns.ts';
import { block, frameOf, type Frame, type Theme } from '../themes.ts';

// The country house's theme (ADR 0011): its labels' shapes, each built inside its box and in the label's
// palette colour; any other label is a plain box (GAME.md, Art Direction: low-poly, flat shading). The
// Ukrainian domestic details are patterns (card 108): embroidered cloth on the sofa, a kilim over the
// bed, a tiled kitchen worktop, the grain of the living room's table, and a bone over the doghouse door.
const ROUTE = OVERLAY.route; // the frame of an opening only cats pass: an exit or a cat route
const HOLE = 0.6; // m: the height of a cat route's hole in its wall
const GLASS_MATERIAL = new THREE.MeshLambertMaterial({ color: GLASS.pane, transparent: true, opacity: 0.35, depthWrite: false });

// The two posts of an opening, `w` wide, standing just proud of its faces, and a lintel over it if asked.
function posts({ l, t, h, group }: Frame, w: number, colour: number, lintel: boolean): THREE.Group {
  const m = material(colour);
  for (const x of [-l + w / 2, l - w / 2]) group.add(block(w, 2 * h, 2 * t + 0.04, m, x));
  if (lintel) group.add(block(2 * l, w, 2 * t + 0.04, m, 0, h - w / 2));
  return group;
}

// A cat route in a wall: the wall stands over a hole HOLE high, framed in ROUTE.
function hole(f: Frame, fill: number): void {
  const { l, t, h, group } = f;
  group.add(block(2 * l, 2 * h - HOLE, 2 * t, material(fill), 0, HOLE / 2));
  const m = material(ROUTE);
  for (const x of [-l + 0.03, l - 0.03]) group.add(block(0.06, HOLE, 2 * t + 0.04, m, x, -h + HOLE / 2));
  group.add(block(2 * l, 0.06, 2 * t + 0.04, m, 0, -h + HOLE));
}

// A panel hanging from the hole's top edge on one face, swung open by `open` radians.
function flap(f: Frame, panel: THREE.Object3D, open: number): THREE.Group {
  const hinge = new THREE.Group();
  hinge.position.set(0, -f.h + HOLE - 0.03, -f.t - 0.02);
  hinge.rotation.x = open;
  panel.position.y = -HOLE / 2;
  hinge.add(panel);
  f.group.add(hinge);
  return f.group;
}

// The doghouse's sign: a bone, white on a black outline.
const bone = (attrs: string) =>
  `<g ${attrs}><rect x="24" y="23" width="80" height="18"/><circle cx="24" cy="20" r="12"/><circle cx="24" cy="44" r="12"/><circle cx="104" cy="20" r="12"/><circle cx="104" cy="44" r="12"/></g>`;
const BONE = `<svg xmlns="http://www.w3.org/2000/svg" width="128" height="64" viewBox="0 0 128 64">${bone(`fill="${hex(INK.black)}" stroke="${hex(INK.black)}" stroke-width="8"`)}${bone(`fill="${hex(PAINT.porcelain)}"`)}</svg>`;

// A top on four legs (the top in a pattern if asked), a seat with a back (and arms) in its colour or all
// in a cloth, a crate's slatted edges.
function table(b: Box, colour: number, top?: Pattern): THREE.Group {
  const { l, t, h, group } = frameOf(b);
  const m = material(colour);
  group.add(top ? covered(2 * l, 0.06, 2 * t, top, 0, h - 0.03) : block(2 * l, 0.06, 2 * t, m, 0, h - 0.03));
  for (const x of [-l + 0.06, l - 0.06]) for (const z of [-t + 0.06, t - 0.06]) group.add(block(0.07, 2 * h - 0.06, 0.07, m, x, -0.03, z));
  return group;
}
function seat(b: Box, colour: number, arms: boolean, cloth?: Pattern): THREE.Group {
  const { l, t, h, group } = frameOf(b);
  const m = material(colour);
  const part = (w: number, hh: number, d: number, x: number, y: number, z = 0) => (cloth ? covered(w, hh, d, cloth, x, y, z) : block(w, hh, d, m, x, y, z));
  const back = Math.min(0.2, t);
  group.add(part(2 * l, h, 2 * t, 0, -h / 2), part(2 * l, 2 * h, back, 0, 0, -t + back / 2));
  if (arms) for (const x of [-l + 0.06, l - 0.06]) group.add(part(0.12, 1.3 * h, 2 * t, x, -0.35 * h));
  return group;
}
function crate(b: Box): THREE.Group {
  const { l, t, h, group } = frameOf(b);
  group.add(block(2 * l - 0.02, 2 * h - 0.02, 2 * t - 0.02, material(LABEL.crate!)));
  const m = material(WOOD.mahogany);
  for (const y of [-h + 0.04, h - 0.04]) for (const z of [-t, t]) group.add(block(2 * l, 0.08, 0.02, m, 0, y, z));
  return group;
}

const theme: Theme = {
  table: (s) => table(s, LABEL.table!, 'wood'),
  'coffee table': (s) => table(s, LABEL['coffee table']!),
  'bedside table': (s) => table(s, LABEL['bedside table']!),
  sofa: (s) => seat(s, LABEL.sofa!, true, 'embroidery'),
  armchair: (s) => seat(s, LABEL.armchair!, true),
  chair: (s) => seat(s, LABEL.chair!, false),
  'garden chair': (s) => seat(s, LABEL['garden chair']!, false),
  crate,
  // A tank's panes are thin, its stand is not.
  aquarium: (s) =>
    Math.min(s.half.x, s.half.y, s.half.z) < 0.05
      ? block(2 * s.half.x, 2 * s.half.y, 2 * s.half.z, GLASS_MATERIAL, s.p.x, s.p.y, s.p.z)
      : block(2 * s.half.x, 2 * s.half.y, 2 * s.half.z, material(LABEL.aquarium!), s.p.x, s.p.y, s.p.z),
  kennel: (s) => bars(s, LABEL.kennel!),
  'kennel gate': (s) => bars(s, LABEL['kennel gate']!),
  // A gabled doghouse, its ridge along its longer side and its door in one gable end.
  doghouse: (s) => {
    const { l, t, h, group } = frameOf(s);
    const wall = 1.3 * h;
    group.add(block(2 * l, wall, 2 * t, material(LABEL.doghouse!), 0, -h + wall / 2));
    const gable = new THREE.Shape([new THREE.Vector2(-t - 0.08, 0), new THREE.Vector2(t + 0.08, 0), new THREE.Vector2(0, 2 * h - wall)]);
    const roof = new THREE.Mesh(new THREE.ExtrudeGeometry(gable, { depth: 2 * l + 0.16, bevelEnabled: false }), material(CLAY.shade));
    roof.rotation.y = Math.PI / 2;
    roof.position.set(-l - 0.08, -h + wall, 0);
    group.add(roof);
    group.add(block(0.02, 0.6 * wall, 0.9 * t, material(INK.shadow), l + 0.01, -h + 0.3 * wall));
    group.add(block(0.01, 0.25, 0.5, decal(BONE), l + 0.01, -h + 0.8 * wall));
    return group;
  },
  // A worktop of kitchen tiles on its cupboard.
  counter: (s) => {
    const { l, t, h, group } = frameOf(s);
    return group.add(block(2 * l, 2 * h - 0.04, 2 * t, material(LABEL.counter!), 0, -0.02), covered(2 * l, 0.04, 2 * t, 'tiles', 0, h - 0.02));
  },
  // The bed, and a kilim on the wall its head stands against: in the house that is the wall on its +z side.
  bed: (s) => {
    const { l, t, h, group } = frameOf(s);
    return group.add(block(2 * l, 2 * h, 2 * t, material(LABEL.bed!)), block(1.6, 1.1, 0.02, pattern('rug'), 0, h + 0.75, t - 0.011));
  },
  gate: (s) => posts(frameOf(s), 0.14, LABEL.fence!, true),
  gap: (s) => posts(frameOf(s), 0.06, ROUTE, false),
  'cat flap': (s) => {
    const f = frameOf(s);
    hole(f, LABEL['cat flap']!);
    return flap(f, block(2 * f.l - 0.14, HOLE - 0.08, 0.03, material(PAINT.orange)), 0.9);
  },
  vent: (s) => {
    const f = frameOf(s);
    hole(f, LABEL.vent!);
    const grille = new THREE.Group();
    for (const y of [-0.2, 0, 0.2]) grille.add(block(2 * f.l - 0.1, 0.05, 0.03, material(METAL.steel), 0, y * (HOLE - 0.1)));
    for (const x of [-f.l + 0.05, f.l - 0.05]) grille.add(block(0.05, HOLE - 0.1, 0.03, material(METAL.steel), x));
    return flap(f, grille, 1.3);
  },
  // The hole the drainpipe leads to, and the pipe up both faces of the fence from the ground.
  drainpipe: (s) => {
    const f = frameOf(s);
    const tall = s.p.y + f.h;
    for (const z of [-f.t - 0.12, f.t + 0.12]) {
      const pipe = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.07, tall, 8), material(METAL.steel));
      pipe.position.set(0, tall / 2 - s.p.y, z);
      f.group.add(pipe);
    }
    return posts(f, 0.06, ROUTE, true);
  },
};

// A cage wall: bars every 0.2 m between a top and a bottom rail.
function bars(s: Box, colour: number): THREE.Object3D {
  const { l, t, h, group } = frameOf(s);
  const m = material(colour);
  for (const y of [-h + 0.03, h - 0.03]) group.add(block(2 * l, 0.06, 2 * t, m, 0, y));
  const n = Math.max(2, Math.round((2 * l) / 0.2));
  for (let i = 0; i <= n; i++) group.add(block(0.04, 2 * h, 0.04, m, -l + (2 * l * i) / n));
  return group;
}

export default theme;
