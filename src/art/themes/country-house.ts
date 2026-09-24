import * as THREE from 'three';
import type { Box } from '../../content/level.ts';
import { decal, hex } from '../decals.ts';
import { CLAY, CLOTH, GLASS, GOLD, GREENERY, INK, LABEL, material, METAL, OVERLAY, PAINT, WALLS, WOOD } from '../palette.ts';
import { covered, pattern } from '../patterns.ts';
import { bake, ball, bed, bin, cabinet, chair, crate, drum, GLASS_MATERIAL, rod, stool, table, upholstered } from '../props.ts';
import { block, frameOf, type Frame, type Theme } from '../themes.ts';

// The country house's theme (ADR 0011): every label the house lists has a shape, built inside its box in
// the label's palette colour (GAME.md, Art Direction: low-poly, flat shading); the furniture is the
// families `props.ts` builds for every map, the debris is drawn through this same table (card 116). The
// Ukrainian domestic details are patterns (card 108): embroidered cloth on the sofa, a kilim over the
// bed, a tiled kitchen worktop, the grain of the living room's table, a bone over the doghouse door; and
// grandma's china cabinet for the wardrobe, jars of preserves under a cloth, sunflowers in the vase.
const ROUTE = OVERLAY.route; // the frame of an opening only cats pass: an exit or a cat route
const HOLE = 0.6; // m: the height of a cat route's hole in its wall

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

const theme: Theme = {
  table: (s) => table(s, LABEL.table!, 'wood'),
  'coffee table': (s) => table(s, LABEL['coffee table']!),
  'bedside table': (s) => table(s, LABEL['bedside table']!),
  // The sofa's back to its hiding spot, on its frame's +z: in the house, the living room's east wall.
  sofa: (s) => upholstered(s, LABEL.sofa!, 'embroidery', 1),
  armchair: (s) => upholstered(s, LABEL.armchair!),
  chair: (s) => chair(s, LABEL.chair!),
  'garden chair': (s) => chair(s, LABEL['garden chair']!),
  crate: (s) => crate(s, LABEL.crate!),
  stool: (s) => stool(s, LABEL.stool!),
  bin: (s) => bin(s, LABEL.bin!),
  wardrobe: (s) => cabinet(s, LABEL.wardrobe!),
  // A tank's panes are thin, its stand is not.
  aquarium: (s) =>
    Math.min(s.half.x, s.half.y, s.half.z) < 0.05
      ? block(2 * s.half.x, 2 * s.half.y, 2 * s.half.z, GLASS_MATERIAL, s.p.x, s.p.y, s.p.z)
      : block(2 * s.half.x, 2 * s.half.y, 2 * s.half.z, material(LABEL.aquarium!), s.p.x, s.p.y, s.p.z),
  kennel: (s) => bars(s, LABEL.kennel!),
  'kennel gate': (s) => bars(s, LABEL['kennel gate']!),
  // A gabled doghouse, its door in one gable end under the bone.
  doghouse: (s) => {
    const f = frameOf(s);
    const wall = gabled(f, 1.3 * f.h, LABEL.doghouse!, CLAY.shade);
    f.group.add(block(0.02, 0.6 * wall, 0.9 * f.t, material(INK.shadow), f.l + 0.01, -f.h + 0.3 * wall));
    return f.group.add(block(0.01, 0.25, 0.5, decal(BONE), f.l + 0.01, -f.h + 0.8 * wall));
  },
  // A worktop of kitchen tiles on its cupboard.
  counter: (s) => {
    const { l, t, h, group } = frameOf(s);
    return group.add(block(2 * l, 2 * h - 0.04, 2 * t, material(LABEL.counter!), 0, -0.02), covered(2 * l, 0.04, 2 * t, 'tiles', 0, h - 0.02));
  },
  // The bed, and a kilim on the wall its head stands against: in the house that is the wall on its +z side.
  bed: (s) => {
    const g = bed(s, LABEL.bed!);
    return g.add(block(1.6, 1.1, 0.02, pattern('rug'), 0, s.half.y + 0.75, Math.min(s.half.x, s.half.z) - 0.011));
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
  // Grass, and tufts with a dandelion here and there along its edges, where no mower reaches.
  ground: (s) => {
    const { l, t, h, group } = frameOf(s);
    group.add(block(2 * l, 2 * h, 2 * t, material(LABEL.ground!)));
    let seed = 7;
    const random = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
    for (let i = 0; i < 400; i++) {
      const [along, into] = [2 * random() - 1, 0.3 + 1.2 * random()];
      const x = i % 4 < 2 ? along * l : (i % 2 ? 1 : -1) * (l - into);
      const z = i % 4 < 2 ? (i % 2 ? 1 : -1) * (t - into) : along * t;
      group.add(drum(0, 0.07, 0.22, GREENERY.leaf, [x, h + 0.11, z], 5));
      if (i % 5 === 0) group.add(ball(0.035, GOLD.star, [x + 0.05, h + 0.2, z]));
    }
    return group;
  },
  // The neighbours' rendered wall: a plinth, a pier every 4 m and a tiled coping.
  'outer wall': (s) => {
    const { l, t, h, group } = frameOf(s);
    const m = material(LABEL['outer wall']!);
    group.add(block(2 * l, 2 * h - 0.1, 2 * t, m, 0, -0.05), block(2 * l, 0.1, 2 * t + 0.1, material(CLAY.tile), 0, h - 0.05));
    group.add(block(2 * l, 0.4, 2 * t + 0.04, material(WALLS.putty), 0, -h + 0.2));
    const n = Math.max(1, Math.round(l / 2));
    for (let i = 0; i <= n; i++) group.add(block(0.4, 2 * h - 0.1, 2 * t + 0.1, m, -l + 0.2 + ((2 * l - 0.4) * i) / n, -0.05));
    return group;
  },
  // Boards 0.14 m wide, one in three a darker plank, every other one a hand shorter, two rails each side.
  fence: (s) => {
    const { l, t, h, group } = frameOf(s);
    const n = Math.max(1, Math.round((2 * l) / 0.14));
    const w = (2 * l) / n;
    for (let i = 0; i < n; i++) {
      const tall = 2 * h - (i % 2) * Math.min(0.1, h / 4);
      group.add(block(w, tall, 2 * t, material(i % 3 ? LABEL.fence! : WOOD.planks), -l + w * (i + 0.5), -h + tall / 2));
    }
    for (const y of [-0.6 * h, 0.6 * h]) for (const z of [-t - 0.02, t + 0.02]) group.add(block(2 * l, 0.1, 0.04, material(WOOD.stained), 0, y, z));
    return group;
  },
  // Plaster between a skirting board and a cornice on both faces.
  wall: (s) => {
    const { l, t, h, group } = frameOf(s);
    group.add(block(2 * l, 2 * h, 2 * t, material(LABEL.wall!)));
    return group.add(block(2 * l, 0.12, 2 * t + 0.03, material(WOOD.stained), 0, -h + 0.06), block(2 * l, 0.06, 2 * t + 0.03, material(WALLS.trim), 0, h - 0.03));
  },
  // Rows of clay tiles over a plastered ceiling, a wooden fascia round the eaves.
  roof: (s) => {
    const { l, t, h, group } = frameOf(s);
    group.add(block(2 * l, h, 2 * t, material(LABEL.roof!), 0, h / 2), block(2 * l, h, 2 * t, material(WALLS.trim), 0, -h / 2));
    for (let x = -l + 0.2; x < l; x += 0.4) group.add(block(0.06, 0.04, 2 * t, material(CLAY.shade), x, h + 0.02));
    for (const z of [-t - 0.02, t + 0.02]) group.add(block(2 * l + 0.08, 2 * h, 0.04, material(WOOD.walnut), 0, 0, z));
    for (const x of [-l - 0.02, l + 0.02]) group.add(block(0.04, 2 * h, 2 * t, material(WOOD.walnut), x));
    return group;
  },
  // Enamel under a chrome trim, on a steel plinth where it stands on the floor.
  fridge: (s) => {
    const { l, t, h, group } = frameOf(s);
    const plinth = s.p.y - h < 0.01 ? 0.06 : 0;
    group.add(block(2 * l, 2 * h - plinth, 2 * t, material(LABEL.fridge!), 0, plinth / 2), block(2 * l, 0.02, 2 * t + 0.01, material(METAL.silver), 0, h - 0.01));
    if (plinth) group.add(block(2 * l - 0.04, plinth, 2 * t - 0.04, material(METAL.zinc), 0, -h + plinth / 2));
    return group;
  },
  // A shed of weathered planks under a tin roof, a door and a dark window on its front.
  shed: (s) => {
    const f = frameOf(s);
    const { l, t, h, group } = f;
    const wall = gabled(f, 1.45 * h, LABEL.shed!, METAL.zinc);
    for (let x = -l + 0.3; x < l; x += 0.3) for (const z of [-t - 0.005, t + 0.005]) group.add(block(0.03, wall, 0.01, material(WOOD.planks), x, -h + wall / 2, z));
    group.add(block(0.9, 1.9, 0.04, material(WOOD.door), 0.6, -h + 0.95, t + 0.02), ball(0.04, GOLD.brass, [0.95, -h + 1, t + 0.05]));
    return group.add(block(0.8, 0.5, 0.03, material(INK.shadow), -l / 2, -h + 1.3, t + 0.015));
  },
  // Split logs stacked across the pile, their cut ends pale, each row set half a log along.
  woodpile: (s) => {
    const { l, t, h, group } = frameOf(s);
    const rows = Math.max(1, Math.round(h / 0.1));
    const r = h / rows;
    for (let j = 0; j < rows; j++)
      for (let x = -l + r * (1 + (j % 2)); x <= l - r + 1e-6; x += 2 * r) {
        const y = -h + r * (2 * j + 1);
        group.add(rod(r, LABEL.woodpile!, [x, y, -t], [x, y, t]));
        for (const z of [-t, t]) group.add(rod(0.8 * r, WOOD.birch, [x, y, z - 0.01], [x, y, z + 0.01]));
      }
    return group;
  },
  // A small saloon: the body on four wheels, a glazed cabin, bumpers, headlamps at +x and lamps behind.
  car: (s) => {
    const { l, t, h, group } = frameOf(s);
    const paint = material(LABEL.car!);
    const [wheel, sill, belt] = [0.3, -h + 0.3, 0.1 * h];
    group.add(block(2 * l - 0.1, belt - sill, 2 * t, paint, 0, (sill + belt) / 2));
    group.add(block(1.1 * l, h - belt - 0.06, 2 * t - 0.2, material(GLASS.pane), -0.1 * l, (belt + h - 0.06) / 2), block(1.2 * l, 0.06, 2 * t - 0.16, paint, -0.1 * l, h - 0.03));
    for (const x of [-0.65 * l, -0.1 * l, 0.45 * l]) group.add(block(0.08, h - belt, 2 * t - 0.18, paint, x, (belt + h) / 2));
    for (const x of [-0.6 * l, 0.6 * l])
      for (const z of [-1, 1]) group.add(rod(wheel, METAL.iron, [x, -h + wheel, z * (t - 0.25)], [x, -h + wheel, z * t], 10), rod(0.12, METAL.silver, [x, -h + wheel, z * t], [x, -h + wheel, z * (t + 0.01)], 8));
    for (const x of [-l + 0.05, l - 0.05]) group.add(block(0.1, 0.12, 2 * t, material(METAL.steel), x, sill + 0.06));
    for (const z of [-0.65 * t, 0.65 * t]) group.add(block(0.04, 0.12, 0.25, material(PAINT.enamel), l - 0.07, belt - 0.15, z), block(0.04, 0.1, 0.2, material(PAINT.apple), -l + 0.07, belt - 0.15, z));
    return group;
  },
  // Pleats in poppy on a brass rod, a linen hem.
  curtain: (s) => {
    const { l, t, h, group } = frameOf(s);
    const n = Math.max(2, Math.round((2 * l) / 0.16));
    const w = (2 * l) / n;
    for (let i = 0; i < n; i++) group.add(block(w, 2 * h - 0.18, t, material(LABEL.curtain!), -l + w * (i + 0.5), 0.01, (i % 2 ? 0.5 : -0.5) * t));
    return group.add(block(2 * l, 0.1, 2 * t, material(CLOTH.linen), 0, -h + 0.05), rod(0.02, GOLD.brass, [-l, h - 0.04, 0], [l, h - 0.04, 0]));
  },
  // Cardboard, a tape strip over its lid and down both ends, a hand hole in each end.
  'cardboard box': (s) => {
    const { l, t, h, group } = frameOf(s);
    group.add(block(2 * l, 2 * h, 2 * t, material(LABEL['cardboard box']!)), block(2 * l + 0.01, 0.01, 0.12, material(WOOD.honey), 0, h));
    for (const x of [-l - 0.003, l + 0.003]) group.add(block(0.006, 0.3, 0.12, material(WOOD.honey), x, h - 0.15), block(0.008, 0.08, 0.25, material(INK.shadow), x, h - 0.35));
    return group;
  },
  // Planks nailed across two posts on trestle feet, and a brace from corner to corner behind them.
  barricade: (s) => {
    const { l, t, h, group } = frameOf(s);
    const m = material(LABEL.barricade!);
    for (const x of [-l + 0.06, l - 0.06]) group.add(block(0.08, 2 * h, 0.08, m, x), block(0.1, 0.08, 2 * t, material(WOOD.stained), x, -h + 0.04));
    for (const y of [-0.45 * h, 0.1 * h, 0.65 * h]) group.add(block(2 * l, 0.14, 0.04, m, 0, y, 0.06));
    const brace = block(0.9 * Math.hypot(2 * l, 1.1 * h), 0.12, 0.04, material(WOOD.weathered), 0, 0.1 * h, -0.06);
    brace.rotation.z = Math.atan2(1.1 * h, 2 * l);
    return group.add(brace);
  },
  // A watermelon, striped along its meridians, its stalk on top.
  watermelon: (s) => {
    const { l, group } = frameOf(s);
    group.add(ball(l, LABEL.watermelon!, [0, 0, 0]), rod(0.01, WOOD.walnut, [0, l, 0], [0.02, l + 0.03, 0]));
    for (let i = 0; i < 4; i++) {
      const stripe = new THREE.Mesh(new THREE.TorusGeometry(l, 0.02, 3, 16), material(GREENERY.grass));
      stripe.rotation.y = (i * Math.PI) / 4;
      group.add(stripe);
    }
    return group;
  },
  // A wheelbarrow: a tin tray, its wheel ahead of it at +x, two handles and two legs behind.
  wheelbarrow: (s) => {
    const { l, t, h, group } = frameOf(s);
    const m = material(LABEL.wheelbarrow!);
    const [back, front, floor] = [-0.5 * l, 0.45 * l, -0.1 * h];
    group.add(block(front - back, 0.03, 2 * t - 0.1, m, (back + front) / 2, floor));
    for (const z of [-t + 0.02, t - 0.02]) group.add(block(front - back, h - floor, 0.04, m, (back + front) / 2, (floor + h) / 2, z));
    for (const x of [back, front]) group.add(block(0.04, h - floor, 2 * t, m, x, (floor + h) / 2));
    const r = 0.28 * l;
    group.add(rod(r, INK.sole, [l - r, -h + r, -0.05], [l - r, -h + r, 0.05], 10));
    for (const z of [-0.6 * t, 0.6 * t]) group.add(rod(0.025, WOOD.oak, [l - r, -h + r, z / 3], [-l, floor + 0.15, z]), rod(0.02, METAL.iron, [back + 0.05, floor, z], [back, -h, z]));
    return group;
  },
  // A plate: a porcelain face in a cobalt rim.
  plate: (s) => {
    const { l, h, group } = frameOf(s);
    return group.add(drum(l, 0.85 * l, 1.4 * h, PAINT.cobalt, [0, -0.3 * h, 0], 16), drum(0.78 * l, 0.78 * l, 1.6 * h, LABEL.plate!, [0, 0.2 * h, 0], 16));
  },
  // A cup, white inside, its handle at +x.
  cup: (s) => {
    const { l, h, group } = frameOf(s);
    const handle = new THREE.Mesh(new THREE.TorusGeometry(0.3 * l, 0.1 * l, 4, 8), material(LABEL.cup!));
    handle.position.x = 0.6 * l;
    return group.add(drum(0.8 * l, 0.65 * l, 2 * h, LABEL.cup!, [-0.2 * l, 0, 0]), drum(0.7 * l, 0.7 * l, 0.01, PAINT.porcelain, [-0.2 * l, h - 0.004, 0]), handle);
  },
  // A jar of cherry preserves under a linen cloth tied with a red string.
  jar: (s) => {
    const { l, h, group } = frameOf(s);
    const string = new THREE.Mesh(new THREE.TorusGeometry(0.76 * l, 0.06 * l, 3, 10), material(CLOTH.poppy));
    string.rotation.x = Math.PI / 2;
    string.position.y = 0.72 * h;
    group.add(drum(0.95 * l, 0.9 * l, 1.4 * h, PAINT.cherry, [0, -0.3 * h, 0]), drum(0.72 * l, 0.95 * l, 0.3 * h, LABEL.jar!, [0, 0.55 * h, 0]));
    return group.add(drum(0.85 * l, 0.75 * l, 0.3 * h, CLOTH.linen, [0, 0.85 * h, 0]), string);
  },
  // A red apple with its stalk and a leaf.
  apple: (s) => {
    const { l, group } = frameOf(s);
    return group.add(ball(l, LABEL.apple!, [0, -0.05 * l, 0], [1, 0.9, 1]), rod(0.004, WOOD.walnut, [0, 0.7 * l, 0], [0.1 * l, 1.15 * l, 0]), ball(0.3 * l, GREENERY.leaf, [0.35 * l, l, 0], [1, 0.3, 0.6]));
  },
  // A cobalt vase with a porcelain band, three sunflowers in it.
  vase: (s) => {
    const { l, h, group } = frameOf(s);
    const profile = [[0.001, -h], [0.6 * l, -h], [l, -0.5 * h], [0.9 * l, 0.1 * h], [0.45 * l, 0.4 * h], [0.6 * l, 0.5 * h]].map(([r, y]) => new THREE.Vector2(r, y));
    group.add(new THREE.Mesh(new THREE.LatheGeometry(profile, 10), material(LABEL.vase!)), drum(0.98 * l, 0.98 * l, 0.12 * h, PAINT.porcelain, [0, -0.45 * h, 0], 10));
    for (const [dx, dz] of [[0, 0], [0.4 * l, 0.2 * l], [-0.35 * l, -0.3 * l]] as const) {
      const top = h - 0.02 - Math.abs(dx) / 3;
      group.add(rod(0.005, GREENERY.leaf, [0, 0.4 * h, 0], [dx, top, dz]), drum(0.35 * l, 0.35 * l, 0.01, GOLD.star, [dx, top, dz], 8), drum(0.15 * l, 0.15 * l, 0.016, INK.shadow, [dx, top, dz], 8));
    }
    return group;
  },
  // A leather shoe on its sole, the heel at -x, laced.
  shoe: (s) => {
    const { l, t, h, group } = frameOf(s);
    group.add(block(2 * l, 0.02, 2 * t, material(LABEL.shoe!), 0, -h + 0.01), block(1.1 * l, 1.5 * h, 2 * t - 0.01, material(WOOD.mahogany), -0.4 * l, -h + 0.02 + 0.75 * h));
    return group.add(ball(1, WOOD.mahogany, [0.35 * l, -h + 0.02, 0], [0.62 * l, 0.8 * h, t - 0.005]), block(0.5 * l, 0.01, 0.8 * t, material(CLOTH.linen), 0.1 * l, -0.1 * h, 0));
  },
  // A terracotta pot of red geraniums.
  'flower pot': (s) => {
    const { l, h, group } = frameOf(s);
    group.add(drum(0.95 * l, 0.7 * l, 1.1 * h, LABEL['flower pot']!, [0, -0.45 * h, 0]), drum(l, l, 0.2 * h, LABEL['flower pot']!, [0, 0.15 * h, 0]));
    group.add(drum(0.9 * l, 0.9 * l, 0.02, WOOD.stained, [0, 0.25 * h, 0]), ball(0.6 * l, GREENERY.leaf, [0, 0.5 * h, 0], [1, 0.6, 1]));
    for (let i = 0; i < 3; i++) group.add(ball(0.18 * l, PAINT.apple, [0.3 * l * Math.sin(2 * i), 0.8 * h, 0.3 * l * Math.cos(2 * i)]));
    return group;
  },
  // A football: white with twelve black pentagons.
  football: (s) => {
    const { l, group } = frameOf(s);
    group.add(ball(l, LABEL.football!, [0, 0, 0]));
    const phi = (1 + Math.sqrt(5)) / 2;
    for (const [a, b] of [[1, phi], [1, -phi], [-1, phi], [-1, -phi]])
      for (const v of [new THREE.Vector3(a, b, 0), new THREE.Vector3(0, a, b), new THREE.Vector3(b, 0, a)]) {
        const patch = new THREE.Mesh(new THREE.CircleGeometry(0.35 * l, 5), material(INK.black));
        patch.position.copy(v.normalize().multiplyScalar(1.01 * l));
        patch.lookAt(v.multiplyScalar(2));
        group.add(patch);
      }
    return group;
  },
};

// Walls `wall` high under a gable roof up to the box's top, its ridge along the longer side and its
// eaves 0.08 m out; returns the walls' height.
function gabled({ l, t, h, group }: Frame, wall: number, walls: number, roof: number): number {
  group.add(block(2 * l, wall, 2 * t, material(walls), 0, -h + wall / 2));
  const gable = new THREE.Shape([new THREE.Vector2(-t - 0.08, 0), new THREE.Vector2(t + 0.08, 0), new THREE.Vector2(0, 2 * h - wall)]);
  const top = new THREE.Mesh(new THREE.ExtrudeGeometry(gable, { depth: 2 * l + 0.16, bevelEnabled: false }), material(roof));
  top.rotation.y = Math.PI / 2;
  top.position.set(-l - 0.08, -h + wall, 0);
  group.add(top);
  return wall;
}

// A cage wall: bars every 0.2 m between a top and a bottom rail.
function bars(s: Box, colour: number): THREE.Object3D {
  const { l, t, h, group } = frameOf(s);
  const m = material(colour);
  for (const y of [-h + 0.03, h - 0.03]) group.add(block(2 * l, 0.06, 2 * t, m, 0, y));
  const n = Math.max(2, Math.round((2 * l) / 0.2));
  for (let i = 0; i <= n; i++) group.add(block(0.04, 2 * h, 0.04, m, -l + (2 * l * i) / n));
  return group;
}

// Every shape baked to one mesh per material (props.ts).
export default Object.fromEntries(Object.entries(theme).map(([label, build]) => [label, (b: Box) => bake(build(b))])) satisfies Theme;
