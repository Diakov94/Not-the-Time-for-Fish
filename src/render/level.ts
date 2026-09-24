/// <reference types="vite/client" />
import * as THREE from 'three';
import type { Box, Door, Level, Point, Static } from '../content/level.ts';
import { CLAY, DEFAULT, GLASS, GOLD, INK, LABEL, material, METAL, OVERLAY, PAINT, VOLUME, WALLS, WOOD } from '../art/palette.ts';

// ADR 0008: the level is content's data, and render draws what content lists and nothing else, so a
// change to the house changes the picture with no change here. Each part sits at its box and looks like
// its label (GAME.md, Art Direction: low-poly, flat shading, warm homey colours; placeholders). A label
// with a shape below is built inside its box; any other label is its plain box, in DEFAULT if the palette
// has no colour for it. A `dogs` blocker is an opening only cats pass, so it is drawn open, never as a wall.
// Content's props carry labels from the same table (card 30). Every colour is the palette's (ADR 0011);
// looks.ts takes its table and material from here until card 110.
export { LABEL as COLOUR, DEFAULT, material } from '../art/palette.ts';
const ROUTE = OVERLAY.route; // the frame of an opening only cats pass: an exit or a cat route
const HOLE = 0.6; // m: the height of a cat route's hole in its wall
const DEV_KEY = 'F8'; // shows and hides the volumes, in dev only

const GLASS_MATERIAL = new THREE.MeshLambertMaterial({ color: GLASS.pane, transparent: true, opacity: 0.35, depthWrite: false });

// A box of size w x h x d at (x, y, z) in its part's frame.
export function block(w: number, h: number, d: number, m: THREE.Material, x = 0, y = 0, z = 0): THREE.Mesh {
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), m);
  mesh.position.set(x, y, z);
  return mesh;
}

// A part's frame: its box's centre, turned so that local x runs along the box's longer horizontal side.
// `l` is that side's half length, `t` the half thickness across it, `h` the half height.
type Frame = { l: number; t: number; h: number; group: THREE.Group };
function frameOf(b: Box): Frame {
  const group = new THREE.Group();
  group.position.set(b.p.x, b.p.y, b.p.z);
  const alongX = b.half.x >= b.half.z;
  if (!alongX) group.rotation.y = Math.PI / 2;
  return { l: alongX ? b.half.x : b.half.z, t: alongX ? b.half.z : b.half.x, h: b.half.y, group };
}

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

// A top on four legs, a seat with a back (and arms), a crate's slatted edges.
function table(b: Box, colour: number): THREE.Group {
  const { l, t, h, group } = frameOf(b);
  const m = material(colour);
  group.add(block(2 * l, 0.06, 2 * t, m, 0, h - 0.03));
  for (const x of [-l + 0.06, l - 0.06]) for (const z of [-t + 0.06, t - 0.06]) group.add(block(0.07, 2 * h - 0.06, 0.07, m, x, -0.03, z));
  return group;
}
function seat(b: Box, colour: number, arms: boolean): THREE.Group {
  const { l, t, h, group } = frameOf(b);
  const m = material(colour);
  const back = Math.min(0.2, t);
  group.add(block(2 * l, h, 2 * t, m, 0, -h / 2), block(2 * l, 2 * h, back, m, 0, 0, -t + back / 2));
  if (arms) for (const x of [-l + 0.06, l - 0.06]) group.add(block(0.12, 1.3 * h, 2 * t, m, x, -0.35 * h));
  return group;
}
function crate(b: Box): THREE.Group {
  const { l, t, h, group } = frameOf(b);
  group.add(block(2 * l - 0.02, 2 * h - 0.02, 2 * t - 0.02, material(LABEL.crate!)));
  const m = material(WOOD.mahogany);
  for (const y of [-h + 0.04, h - 0.04]) for (const z of [-t, t]) group.add(block(2 * l, 0.08, 0.02, m, 0, y, z));
  return group;
}

const SHAPES: Record<string, (s: Box) => THREE.Object3D> = {
  table: (s) => table(s, LABEL.table!),
  'coffee table': (s) => table(s, LABEL['coffee table']!),
  'bedside table': (s) => table(s, LABEL['bedside table']!),
  sofa: (s) => seat(s, LABEL.sofa!, true),
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
    return group;
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

// A label's shape built in `b`, for a label that has one.
export function shaped(label: string, b: Box): THREE.Object3D | undefined {
  return SHAPES[label]?.(b);
}

function part(s: Static): THREE.Object3D {
  const shape = SHAPES[s.label] ?? (s.blocks === 'dogs' ? SHAPES.gap! : undefined);
  if (shape) return shape(s);
  return block(2 * s.half.x, 2 * s.half.y, 2 * s.half.z, material(LABEL[s.label] ?? DEFAULT), s.p.x, s.p.y, s.p.z);
}

// A door: a casing that stays in the wall, standing proud of it so a door seen along its wall still
// shows, and the panel with a knob on both faces at its free end, returned for the view to swing with
// the sim's door body.
function door({ panel, hinge }: Door, scene: THREE.Scene): THREE.Object3D {
  const casing = frameOf(panel);
  for (const x of [-casing.l - 0.04, casing.l + 0.04]) casing.group.add(block(0.08, 2 * casing.h, 0.3, material(WALLS.trim), x));
  scene.add(casing.group);
  const f = frameOf({ p: { x: 0, y: 0, z: 0 }, half: panel.half });
  f.group.add(block(2 * f.l, 2 * f.h, 2 * f.t, material(WOOD.door)));
  // The hinge's end of the panel in the frame's x (a frame turned about y runs its x along -z).
  const free = -Math.sign(panel.half.x >= panel.half.z ? hinge.x - panel.p.x : panel.p.z - hinge.z);
  for (const z of [-f.t - 0.03, f.t + 0.03]) {
    const knob = new THREE.Mesh(new THREE.IcosahedronGeometry(0.05, 0), material(GOLD.brass));
    knob.position.set(free * (f.l - 0.1), 1 - panel.p.y, z);
    f.group.add(knob);
  }
  const swing = new THREE.Group();
  swing.position.set(panel.p.x, panel.p.y, panel.p.z);
  scene.add(swing.add(f.group));
  return swing;
}

// The kennel's hatch, a frame lying on the cage's top, and its latch, a lever pointing back along its facing.
function point({ role, p, yaw }: Point): THREE.Object3D | null {
  const m = material(GOLD.brass);
  if (role === 'hatch') {
    const g = new THREE.Group();
    g.position.set(p.x, p.y, p.z);
    for (const [x, z, w, d] of [
      [0, -0.5, 1, 0.06],
      [0, 0.5, 1, 0.06],
      [-0.5, 0, 0.06, 1],
      [0.5, 0, 0.06, 1],
    ] as const)
      g.add(block(w, 0.06, d, m, x, 0, z));
    return g;
  }
  if (role === 'latch') {
    const g = new THREE.Group();
    g.position.set(p.x, p.y, p.z);
    g.rotation.y = yaw;
    g.add(block(0.12, 0.25, 0.12, m), block(0.05, 0.05, 0.4, m, 0, 0, -0.2));
    return g;
  }
  return null;
}

// The whole level, once; returns the door panels, index for index with the level's doors. The volumes are
// hidden; in dev, DEV_KEY shows and hides them.
export function drawLevel(scene: THREE.Scene, level: Level): THREE.Object3D[] {
  for (const s of level.statics) scene.add(part(s));
  const doors = level.doors.map((d) => door(d, scene));
  for (const p of level.points) {
    const o = point(p);
    if (o) scene.add(o);
  }
  const volumes = new THREE.Group();
  volumes.visible = false;
  for (const v of level.volumes) {
    const tint = new THREE.MeshBasicMaterial({ color: VOLUME[v.role], transparent: true, opacity: 0.2, depthWrite: false });
    volumes.add(block(2 * v.half.x, 2 * v.half.y, 2 * v.half.z, tint, v.p.x, v.p.y, v.p.z));
  }
  scene.add(volumes);
  if (import.meta.env.DEV)
    addEventListener('keydown', (e) => {
      if (e.code === DEV_KEY) volumes.visible = !volumes.visible;
    });
  return doors;
}
