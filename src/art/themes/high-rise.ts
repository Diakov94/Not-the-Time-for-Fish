import * as THREE from 'three';
import type { Box } from '../../content/level.ts';
import { decal, hex } from '../decals.ts';
import { CLAY, CLOTH, GLASS, GOLD, GREENERY, INK, KIND, LABEL, material, METAL, OVERLAY, PAINT, WALLS, WOOD } from '../palette.ts';
import { pattern } from '../patterns.ts';
import { bake, ball, drum, rod, upholstered } from '../props.ts';
import { block, frameOf, type Theme } from '../themes.ts';
import house from './country-house.ts';

// The high-rise's theme (ADR 0011, card 143): one floor of a panel block, every label its map lists drawn
// inside its box. What the flat shares with the country house (its furniture, the kennel's bars, the
// doghouse, the walls, the debris) is the house theme's own builder, reused by label; the rest is the
// block's: a concrete slab and panel facade with windows, a glazed balcony, vent shafts with louvres, a
// lift, a flight of stairs and the landing's mailboxes (an SVG decal). GAME.md's domestic details: a kilim
// on the wall over the bed, grandma's glass cabinet for the wardrobe, embroidered cloth on the sofa.
const CONCRETE = METAL.steel; // the shafts, the stairs, the lift's wall, the next floor's slab
const PANEL = METAL.silver; // the facade's panels
const SEAM = WALLS.putty; // the slab's score lines
const ROUTE = OVERLAY.route; // the frame of an opening only cats pass: an exit or a cat route
const HOLE = 0.6; // m: the height of a vent's hole in its wall
const SHAFT = 3; // m: a blocker taller than this stands in a vent shaft (4 m), a lower one in the flat (2.8 m)
const REUSED = ['table', 'coffee table', 'bedside table', 'armchair', 'chair', 'stool', 'bin', 'wardrobe', 'aquarium', 'kennel', 'kennel gate', 'doghouse', 'counter', 'fridge', 'wall', 'gap', 'drainpipe', 'curtain', 'cardboard box', 'barricade', 'plate', 'cup', 'jar', 'apple', 'vase', 'shoe', 'flower pot'];

// Post boxes, three by five, each with a slot and its flat's number.
const MAIL = `<svg xmlns="http://www.w3.org/2000/svg" width="240" height="180" viewBox="0 0 240 180"><rect width="240" height="180" fill="${hex(METAL.zinc)}"/>${Array.from({ length: 15 }, (_, i) => {
  const [x, y] = [8 + 78 * (i % 3), 6 + 34.8 * Math.floor(i / 3)];
  return `<rect x="${x}" y="${y}" width="70" height="30" fill="${hex(METAL.steel)}"/><rect x="${x + 8}" y="${y + 6}" width="36" height="5" fill="${hex(INK.black)}"/><text x="${x + 60}" y="${y + 25}" font-family="sans-serif" font-weight="bold" font-size="14" text-anchor="end" fill="${hex(INK.black)}">${i + 1}</text>`;
}).join('')}</svg>`;
// The lift's call light: an arrow up.
const CALL = `<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 32 32"><rect width="32" height="32" fill="${hex(INK.black)}"/><path d="M16 5 L27 25 L5 25 Z" fill="${hex(GOLD.spark)}"/></svg>`;
// The tv's picture: a fish in the sea.
const SHOW = `<svg xmlns="http://www.w3.org/2000/svg" width="128" height="72" viewBox="0 0 128 72"><rect width="128" height="72" fill="${hex(PAINT.cobalt)}"/><rect y="52" width="128" height="20" fill="${hex(GLASS.pane)}"/><ellipse cx="60" cy="34" rx="26" ry="14" fill="${hex(KIND.fish.body)}"/><path d="M84 34 L104 20 L104 48 Z" fill="${hex(KIND.fish.fin)}"/><circle cx="46" cy="30" r="4" fill="${hex(PAINT.porcelain)}"/><circle cx="45" cy="30" r="2" fill="${hex(INK.black)}"/></svg>`;

const theme: Theme = {
  // The floor slab in screed, scored every 3 m.
  'floor slab': (s) => {
    const { l, t, h, group } = frameOf(s);
    group.add(block(2 * l, 2 * h, 2 * t, material(WALLS.floor)));
    for (let x = -l + 3; x < l; x += 3) group.add(block(0.04, 0.01, 2 * t, material(SEAM), x, h + 0.005));
    for (let z = -t + 3; z < t; z += 3) group.add(block(2 * l, 0.01, 0.04, material(SEAM), 0, h + 0.005, z));
    return group;
  },
  // Panels 3 m wide, each with a white-framed window over a tin sill, on both faces.
  facade: (s) => {
    const { l, t, h, group } = frameOf(s);
    group.add(block(2 * l, 2 * h, 2 * t, material(PANEL)));
    for (let x = -l + 1.5; x < l - 1; x += 3) {
      const y = -h + 1.7;
      group.add(block(1.4, 1.4, 2 * t + 0.04, material(PAINT.enamel), x, y), block(1.2, 1.2, 2 * t + 0.06, material(GLASS.pane), x, y));
      group.add(block(0.06, 1.2, 2 * t + 0.08, material(PAINT.enamel), x, y), block(1.5, 0.06, 2 * t + 0.2, material(METAL.tin), x, y - 0.73));
      group.add(block(0.04, 2 * h, 2 * t + 0.02, material(METAL.tin), x + 1.5));
    }
    return group;
  },
  // The glazed balcony: a ribbed tin parapet 1.1 m high, white-framed panes a metre wide above it.
  'balcony rail': (s) => {
    const { l, t, h, group } = frameOf(s);
    const low = Math.min(1.1, 2 * h);
    group.add(block(2 * l, low, 2 * t, material(METAL.tin), 0, -h + low / 2));
    for (let x = -l + 0.1; x < l; x += 0.2) group.add(block(0.05, low, 2 * t + 0.03, material(METAL.zinc), x, -h + low / 2));
    const top = 2 * h - low;
    if (top <= 0) return group;
    group.add(block(2 * l, top, 2 * t - 0.08, material(GLASS.pane), 0, h - top / 2));
    const n = Math.max(1, Math.round(2 * l));
    for (let i = 0; i <= n; i++) group.add(block(0.06, top, 2 * t, material(PAINT.enamel), -l + (2 * l * i) / n, h - top / 2));
    for (const y of [-h + low + 0.03, h - 0.03, -h + low + 0.45 * top]) group.add(block(2 * l, 0.06, 2 * t, material(PAINT.enamel), 0, y));
    return group;
  },
  // Concrete on a zinc plinth, a louvred grille every 3 m on both faces.
  'vent shaft': (s) => {
    const { l, t, h, group } = frameOf(s);
    group.add(block(2 * l, 2 * h, 2 * t, material(CONCRETE)), block(2 * l, 0.3, 2 * t + 0.04, material(METAL.zinc), 0, -h + 0.15));
    for (let x = -l + 1.5; x < l - 0.5; x += 3) {
      group.add(block(0.8, 0.6, 2 * t + 0.02, material(INK.shadow), x, h - 1.2));
      for (let i = 0; i < 4; i++) group.add(block(0.8, 0.05, 2 * t + 0.06, material(METAL.steel), x, h - 1.42 + 0.145 * i));
    }
    return group;
  },
  // The way to the neighbour's balcony: the glazing goes on above a cat's height, framed in ROUTE below.
  'balcony gap': (s) => {
    const { l, t, h, group } = frameOf(s);
    group.add(block(2 * l, 2 * h - 1.2, 2 * t - 0.08, material(GLASS.pane), 0, 0.6), block(2 * l, 0.08, 2 * t, material(ROUTE), 0, -h + 1.2));
    for (const x of [-l + 0.03, l - 0.03]) group.add(block(0.06, 2 * h, 2 * t + 0.04, material(ROUTE), x));
    return group;
  },
  // A vent's hole HOLE high, framed in ROUTE, its louvred grille knocked out and leaning on the wall.
  vent: (s) => {
    const { l, t, h, group } = frameOf(s);
    group.add(block(2 * l, 2 * h - HOLE, 2 * t, material(2 * h > SHAFT ? CONCRETE : LABEL.wall!), 0, HOLE / 2));
    for (const x of [-l + 0.03, l - 0.03]) group.add(block(0.06, HOLE, 2 * t + 0.04, material(ROUTE), x, -h + HOLE / 2));
    group.add(block(2 * l, 0.06, 2 * t + 0.04, material(ROUTE), 0, -h + HOLE));
    const grille = new THREE.Group();
    grille.position.set(0, -h + HOLE / 2 - 0.02, -t - 0.12);
    grille.rotation.x = 0.25;
    for (let i = 0; i < 4; i++) grille.add(block(2 * l - 0.1, 0.05, 0.03, material(METAL.steel), 0, -0.2 + 0.13 * i));
    for (const x of [-l + 0.07, l - 0.07]) grille.add(block(0.05, HOLE - 0.06, 0.04, material(METAL.steel), x));
    return group.add(grille);
  },
  // The stairwell's steel door in its shaft, open a crack a cat slips through, under a concrete lintel.
  'stairwell door': (s) => {
    const { l, t, h, group } = frameOf(s);
    group.add(block(2 * l, 2 * h - 2.1, 2 * t, material(CONCRETE), 0, 1.05), block(2 * l, 0.08, 2 * t + 0.04, material(ROUTE), 0, -h + 2.1));
    for (const x of [-l + 0.04, l - 0.04]) group.add(block(0.08, 2.1, 2 * t + 0.04, material(ROUTE), x, -h + 1.05));
    const leaf = new THREE.Group();
    leaf.position.set(-l + 0.08, -h + 1.05, -t);
    leaf.rotation.y = 0.2;
    leaf.add(block(2 * l - 0.2, 2, 0.05, material(METAL.iron), l - 0.1, 0, -0.03), ball(0.04, METAL.silver, [2 * l - 0.35, 0, -0.08]));
    return group.add(leaf);
  },
  // The next floor's slab: concrete over a whitewashed ceiling.
  ceiling: (s) => {
    const { l, t, h, group } = frameOf(s);
    return group.add(block(2 * l, h, 2 * t, material(CONCRETE), 0, h / 2), block(2 * l, h, 2 * t, material(WALLS.trim), 0, -h / 2));
  },
  // The tv's sideboard: walnut on a plinth, two doors with brass knobs on -z (in the flat, toward the
  // sofa), a lace runner on top.
  cabinet: (s) => {
    const { l, t, h, group } = frameOf(s);
    group.add(block(2 * l, 2 * h - 0.08, 2 * t, material(WOOD.walnut), 0, 0.04), block(2 * l - 0.06, 0.08, 2 * t - 0.06, material(WOOD.stained), 0, -h + 0.04));
    for (const x of [-l / 2, l / 2]) group.add(block(l - 0.04, 2 * h - 0.2, 0.02, material(WOOD.honey), x, 0.04, -t - 0.01), ball(0.025, GOLD.brass, [x - Math.sign(x) * (l / 2 - 0.08), 0.04, -t - 0.03]));
    return group.add(block(1.2 * l, 0.01, 2 * t + 0.02, material(CLOTH.linen), 0, h + 0.005));
  },
  // A cast-iron radiator: white fins every 8 cm on two pipes, a brass valve at one end.
  radiator: (s) => {
    const { l, t, h, group } = frameOf(s);
    const n = Math.max(2, Math.round((2 * l) / 0.08));
    for (let i = 0; i < n; i++) group.add(block(0.06, 2 * h, 2 * t, material(PAINT.enamel), -l + (2 * l * (i + 0.5)) / n));
    for (const y of [-h + 0.08, h - 0.08]) group.add(rod(0.02, PAINT.enamel, [-l, y, 0], [l, y, 0]));
    return group.add(ball(0.04, GOLD.brass, [l - 0.02, h - 0.08, 0]));
  },
  // A loft bed on high rails with a cat's room under it. A rail (over 0.6 m high) is a walnut side board
  // with a drawer on each face; the top is the mattress, a blanket over its foot, a pillow and a headboard
  // at the head, and the kilim on the wall behind it. In the flat the head is at the north wall, the frame's
  // -x.
  bed: (s) => {
    const { l, t, h, group } = frameOf(s);
    if (h > 0.3) {
      group.add(block(2 * l, 2 * h, 2 * t, material(WOOD.walnut)));
      for (const z of [-1, 1]) group.add(block(2 * l - 0.3, 0.35, 0.02, material(WOOD.honey), 0, -h + 0.3, z * (t + 0.01)), ball(0.03, GOLD.brass, [0, -h + 0.3, z * (t + 0.03)]));
      return group;
    }
    group.add(block(2 * l, 0.1, 2 * t, material(WOOD.walnut), 0, -h + 0.05), block(2 * l - 0.04, 2 * h - 0.1, 2 * t - 0.04, material(CLOTH.linen), 0, 0.05));
    group.add(block(1.3 * l, 0.06, 2 * t + 0.02, material(LABEL.bed!), 0.35 * l, h - 0.02), ball(1, PAINT.porcelain, [-l + 0.3, h, 0], [0.18, 0.1, 0.6 * t]));
    return group.add(block(0.06, 0.6, 2 * t, material(WOOD.walnut), -l + 0.03, h + 0.3), block(0.02, 1.1, 1.6, pattern('rug'), -l - 0.089, h + 0.85));
  },
  // The lift in its concrete core, its doors on -z (toward the flat): two steel leaves in an iron frame,
  // the call button beside them and a lit arrow over them.
  lift: (s) => {
    const { l, t, h, group } = frameOf(s);
    const z = -t - 0.02;
    group.add(block(2 * l, 2 * h, 2 * t, material(CONCRETE)), block(1.4, 2.25, 0.04, material(METAL.iron), 0, -h + 1.125, z));
    for (const x of [-0.3, 0.3]) group.add(block(0.58, 2.1, 0.04, material(METAL.silver), x, -h + 1.05, z - 0.01));
    group.add(block(0.12, 0.2, 0.03, material(METAL.steel), 0.95, -h + 1.2, z), ball(0.025, GOLD.spark, [0.95, -h + 1.2, z - 0.02]));
    return group.add(block(0.2, 0.2, 0.01, decal(CALL), 0, -h + 2.45, z - 0.01));
  },
  // A step of the flight: concrete, a pale tread and a dark nosing on its front, -z in the stairwell.
  stairs: (s) => {
    const { x, y, z } = s.half;
    const group = new THREE.Group();
    group.position.set(s.p.x, s.p.y, s.p.z);
    return group.add(block(2 * x, 2 * y, 2 * z, material(CONCRETE)), block(2 * x, 0.02, 2 * z, material(WALLS.plaster), 0, y + 0.01), block(2 * x, 0.05, 0.05, material(INK.sole), 0, y - 0.01, -z));
  },
  // The landing's post boxes on the wall, their front at +z.
  mailboxes: (s) => {
    const { l, t, h, group } = frameOf(s);
    return group.add(block(2 * l, 2 * h, 2 * t, material(METAL.zinc)), block(2 * l - 0.04, 2 * h - 0.04, 0.01, decal(MAIL), 0, 0, t + 0.006));
  },
  // The sofa in embroidered cloth, its back to its hiding spot: in the flat the living room's west wall.
  sofa: (s) => upholstered(s, LABEL.sofa!, 'embroidery'),
  // Pine sides and three shelves, pairs of shoes and trainers on the two lower ones.
  'shoe rack': (s) => {
    const { l, t, h, group } = frameOf(s);
    const m = material(WOOD.pine);
    for (const x of [-l + 0.02, l - 0.02]) group.add(block(0.04, 2 * h, 2 * t, m, x));
    for (const y of [-h + 0.02, 0, h - 0.02]) group.add(block(2 * l, 0.03, 2 * t, m, 0, y));
    [INK.sole, CLOTH.poppy, WOOD.mahogany, PAINT.enamel].forEach((c, i) => {
      const [x, y] = [-l + 0.18 + 0.28 * (i % 2) + 0.45 * Math.floor(i / 2), i % 2 ? 0.05 : -h + 0.07];
      for (const dx of [-0.05, 0.05]) group.add(block(0.08, 0.08, 2 * t - 0.04, material(c), x + dx, y));
    });
    return group;
  },
  // A folding clothes dryer: crossed silver legs at each end, five rails, a towel, a shirt, socks and a sheet.
  'laundry rack': (s) => {
    const { l, t, h, group } = frameOf(s);
    for (const x of [-l + 0.03, l - 0.03]) for (const z of [-1, 1]) group.add(rod(0.012, METAL.silver, [x, -h, z * t], [x, h - 0.02, -z * t]));
    for (const z of [-0.8, -0.4, 0, 0.4, 0.8]) group.add(rod(0.008, METAL.silver, [-l, h - 0.02, z * t], [l, h - 0.02, z * t]));
    for (const [x, w, z, drop, c] of [
      [-0.3, 0.5, -0.8, 0.5, CLOTH.sage],
      [0.25, 0.4, -0.4, 0.4, CLOTH.denim],
      [-0.1, 0.1, 0, 0.2, CLOTH.poppy],
      [0.05, 0.1, 0, 0.2, CLOTH.poppy],
      [0, 1, 0.4, 0.7, CLOTH.linen],
    ] as const)
      group.add(block(w * l * 1.6, Math.min(drop, 1.6 * h), 0.02, material(c), x * l, h - 0.02 - Math.min(drop, 1.6 * h) / 2, z * t));
    return group;
  },
  // A rubber plant in a terracotta pot: a stem with big leaves round it up to the top.
  'potted plant': (s) => {
    const { l, h, group } = frameOf(s);
    group.add(drum(0.75 * l, 0.55 * l, 0.8 * h, CLAY.terracotta, [0, -0.6 * h, 0]), drum(0.7 * l, 0.7 * l, 0.02, WOOD.stained, [0, -0.2 * h + 0.01, 0]));
    group.add(rod(0.02, WOOD.walnut, [0, -0.2 * h, 0], [0, 0.9 * h, 0]));
    for (let i = 0; i < 7; i++) group.add(ball(0.4 * l, i % 2 ? GREENERY.leaf : GREENERY.grass, [0.5 * l * Math.sin(2.4 * i), -0.05 * h + 0.14 * h * i, 0.5 * l * Math.cos(2.4 * i)], [1, 0.25, 0.5]));
    return group;
  },
  // A bicycle side on along x, front at +x: two tyres, a poppy frame, a saddle and the handlebar.
  bicycle: (s) => {
    const { l, t, h, group } = frameOf(s);
    const r = Math.min(h - 0.02, 0.36 * l);
    const [back, front, hub] = [-l + r, l - r, -h + r];
    for (const x of [back, front]) {
      const tyre = new THREE.Mesh(new THREE.TorusGeometry(r - 0.03, 0.03, 4, 16), material(INK.sole));
      tyre.position.set(x, hub, 0);
      group.add(tyre, rod(0.015, METAL.silver, [x, hub, -0.03], [x, hub, 0.03]));
    }
    type V3 = [number, number, number];
    const [rear, crank, seat, head, fore]: V3[] = [[back, hub, 0], [0, hub, 0], [-0.2 * l, h - 0.12, 0], [0.55 * l, h - 0.1, 0], [front, hub, 0]];
    for (const [a, b] of [[rear, crank], [rear, seat], [crank, seat], [seat, head], [crank, head], [head, fore]]) group.add(rod(0.02, CLOTH.poppy, a!, b!));
    group.add(block(0.22, 0.05, 0.1, material(INK.black), -0.2 * l, h - 0.08), rod(0.015, METAL.silver, [0.55 * l, h - 0.05, -t + 0.02], [0.55 * l, h - 0.05, t - 0.02]));
    return group;
  },
  // A hard-shell suitcase in orange, ribbed on both faces, a handle on top and four wheels under it.
  suitcase: (s) => {
    const { l, t, h, group } = frameOf(s);
    group.add(block(2 * l, 2 * h - 0.08, 2 * t, material(PAINT.orange), 0, 0.02));
    for (const x of [-0.6 * l, -0.2 * l, 0.2 * l, 0.6 * l]) group.add(block(0.04, 2 * h - 0.14, 2 * t + 0.02, material(CLAY.terracotta), x, 0.02));
    group.add(rod(0.015, INK.black, [-0.3 * l, h - 0.06, 0], [-0.3 * l, h - 0.01, 0]), rod(0.015, INK.black, [0.3 * l, h - 0.06, 0], [0.3 * l, h - 0.01, 0]), rod(0.015, INK.black, [-0.3 * l, h - 0.01, 0], [0.3 * l, h - 0.01, 0]));
    for (const x of [-l + 0.05, l - 0.05]) for (const z of [-t + 0.05, t - 0.05]) group.add(drum(0.03, 0.03, 0.06, INK.black, [x, -h + 0.03, z], 8));
    return group;
  },
  // A flat tv on its foot, the picture on -z (in the flat, toward the sofa): a fish in the sea.
  tv: (s) => {
    const { l, t, h, group } = frameOf(s);
    group.add(block(2 * l, 2 * h - 0.05, 2 * t, material(INK.black), 0, 0.025), block(0.4 * l, 0.05, 2 * t, material(METAL.iron), 0, -h + 0.025));
    return group.add(block(2 * l - 0.06, 2 * h - 0.11, 0.01, decal(SHOW), 0, 0.025, -t - 0.006));
  },
};

// The house's builders come baked; the block's own are baked here, one mesh per material (props.ts).
export default {
  ...Object.fromEntries(REUSED.map((label) => [label, house[label]!])),
  ...Object.fromEntries(Object.entries(theme).map(([label, build]) => [label, (b: Box) => bake(build(b))])),
} satisfies Theme;
