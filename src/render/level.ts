/// <reference types="vite/client" />
import * as THREE from 'three';
import type { Box, Door, Level, Point, Static } from '../content/level.ts';
import { DEFAULT, GOLD, LABEL, material, VOLUME, WALLS, WOOD } from '../art/palette.ts';
import { block, frameOf, themeOf, type Theme } from '../art/themes.ts';

// ADR 0008: the level is content's data, and render draws what content lists and nothing else, so a
// change to the house changes the picture with no change here. Each part sits at its box and looks like
// its label (GAME.md, Art Direction: low-poly, flat shading, warm homey colours). ADR 0011: a label with a
// shape in the map's theme is built inside its box; any other label is its plain box, in DEFAULT if the
// palette has no colour for it. A `dogs` blocker is an opening only cats pass, so it is drawn open (the
// theme's `gap`), never as a wall. Content's props carry labels from the same table (card 30); looks.ts
// takes its table, material, box and shapes from here until card 110.
export { LABEL as COLOUR, DEFAULT, material } from '../art/palette.ts';
export { block } from '../art/themes.ts';
const DEV_KEY = 'F8'; // shows and hides the volumes, in dev only
// The map drawn when the level is none of the named maps (a test's level).
const MAP = 'country-house';

// The theme of the map drawn last, which the props' looks share, and that level's volumes, which DEV_KEY
// shows and hides.
let theme: Theme = themeOf(MAP);
let volumes: THREE.Group | undefined;
// One tint per volume role, shared by every level drawn, so a level owns no material.
const tints = new Map<string, THREE.Material>();

// A label's shape built in `b`, for a label that has one.
export function shaped(label: string, b: Box): THREE.Object3D | undefined {
  return theme[label]?.(b);
}

function part(s: Static): THREE.Object3D {
  const shape = theme[s.label] ?? (s.blocks === 'dogs' ? theme.gap : undefined);
  if (shape) return shape(s);
  return block(2 * s.half.x, 2 * s.half.y, 2 * s.half.z, material(LABEL[s.label] ?? DEFAULT), s.p.x, s.p.y, s.p.z);
}

// A door: a casing that stays in the wall, standing proud of it so a door seen along its wall still
// shows, and the panel with a knob on both faces at its free end, returned for the view to swing with
// the sim's door body.
function door({ panel, hinge }: Door, parts: THREE.Group): THREE.Object3D {
  const casing = frameOf(panel);
  for (const x of [-casing.l - 0.04, casing.l + 0.04]) casing.group.add(block(0.08, 2 * casing.h, 0.3, material(WALLS.trim), x));
  parts.add(casing.group);
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
  parts.add(swing.add(f.group));
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

// The whole level in the theme of its map, the name `levels` gives it (a map's content file name), in one
// group for the view to drop when the round's map changes (card 142); returns the group and the door
// panels, index for index with the level's doors. The volumes are hidden; in dev, DEV_KEY shows and hides them.
export function drawLevel(level: Level, levels: Readonly<Record<string, Level>>): { parts: THREE.Group; doors: THREE.Object3D[] } {
  theme = themeOf(Object.keys(levels).find((name) => levels[name] === level) ?? MAP);
  const parts = new THREE.Group();
  for (const s of level.statics) parts.add(part(s));
  const doors = level.doors.map((d) => door(d, parts));
  for (const p of level.points) {
    const o = point(p);
    if (o) parts.add(o);
  }
  if (import.meta.env.DEV && !volumes)
    addEventListener('keydown', (e) => {
      if (e.code === DEV_KEY && volumes) volumes.visible = !volumes.visible;
    });
  volumes = new THREE.Group();
  volumes.visible = false;
  for (const v of level.volumes) {
    let tint = tints.get(v.role);
    if (!tint) tints.set(v.role, (tint = new THREE.MeshBasicMaterial({ color: VOLUME[v.role], transparent: true, opacity: 0.2, depthWrite: false })));
    volumes.add(block(2 * v.half.x, 2 * v.half.y, 2 * v.half.z, tint, v.p.x, v.p.y, v.p.z));
  }
  parts.add(volumes);
  return { parts, doors };
}
