import * as THREE from 'three';
import type { Box } from '../../content/level.ts';
import { decal, hex } from '../decals.ts';
import { CLAY, CLOTH, GLASS, GOLD, GREENERY, INK, material, METAL, OVERLAY, PAINT, WALLS, WOOD } from '../palette.ts';
import { covered, pattern } from '../patterns.ts';
import { bake, ball, chair, crate, drum, rod, table } from '../props.ts';
import { block, frameOf, type Frame, type Theme } from '../themes.ts';

// The farm's theme (ADR 0011, card 150): every label the farm lists has a shape, built inside its box
// (GAME.md, Art Direction: low-poly, flat shading, the palette's warm range). A Ukrainian farmstead: a
// whitewashed khata with a blue plinth band under a thatch, the barn in boards with the wood grain of
// card 108, a log smokehouse with sausages over its rack, a clipped hedge and the woods beyond it, bales
// tied with red twine, a wire-mesh coop with a hen on its gate, a red tractor; the families of card 116
// (table, chair, crate) where they fit.
const ROUTE = OVERLAY.route; // the frame of an opening only cats pass: an exit or a cat route
const HOLE = 0.6; // m: the height of a cat route's hole in its wall
const HAY = PAINT.mustard;
const STRAW = WOOD.card;
const WHITEWASH = PAINT.porcelain;

// A repeatable random in [0, 1) from a seed, so every client draws the same hedge and meadow.
function random(seed: number): () => number {
  let s = (Math.abs(Math.round(seed)) % 2147483646) + 1;
  return () => (s = (s * 16807) % 2147483647) / 2147483647;
}

// The two posts of an opening, `w` wide, standing just proud of its faces, and a lintel over it if asked.
function posts({ l, t, h, group }: Frame, w: number, colour: number, lintel: boolean): THREE.Group {
  const m = material(colour);
  for (const x of [-l + w / 2, l - w / 2]) group.add(block(w, 2 * h, 2 * t + 0.04, m, x));
  if (lintel) group.add(block(2 * l, w, 2 * t + 0.04, m, 0, h - w / 2));
  return group;
}

// A cat route in the khata's wall: whitewash over a hole HOLE high framed in ROUTE, and `panel` hung
// from the hole's top edge on one face, swung open by `open` radians.
function hole(f: Frame, panel: THREE.Object3D, open: number): THREE.Group {
  const { l, t, h, group } = f;
  group.add(block(2 * l, 2 * h - HOLE, 2 * t, material(WHITEWASH), 0, HOLE / 2));
  const m = material(ROUTE);
  for (const x of [-l + 0.03, l - 0.03]) group.add(block(0.06, HOLE, 2 * t + 0.04, m, x, -h + HOLE / 2));
  group.add(block(2 * l, 0.06, 2 * t + 0.04, m, 0, -h + HOLE));
  const hinge = new THREE.Group();
  hinge.position.set(0, -h + HOLE - 0.03, -t - 0.02);
  hinge.rotation.x = open;
  panel.position.y = -HOLE / 2;
  return group.add(hinge.add(panel));
}

// Walls `wall` high in `walls` under a gable roof up to the box's top, its ridge along the longer side and
// its eaves 0.08 m out; returns the walls' height.
function gabled({ l, t, h, group }: Frame, wall: number, walls: THREE.Material, roof: number): number {
  group.add(new THREE.Mesh(new THREE.BoxGeometry(2 * l, wall, 2 * t), walls).translateY(-h + wall / 2));
  const gable = new THREE.Shape([new THREE.Vector2(-t - 0.08, 0), new THREE.Vector2(t + 0.08, 0), new THREE.Vector2(0, 2 * h - wall)]);
  const top = new THREE.Mesh(new THREE.ExtrudeGeometry(gable, { depth: 2 * l + 0.16, bevelEnabled: false }), material(roof));
  top.rotation.y = Math.PI / 2;
  top.position.set(-l - 0.08, -h + wall, 0);
  group.add(top);
  return wall;
}

// A cart's wheel standing in the frame's xy plane at (x, y): an iron-shod rim, six spokes, a hub.
function wheel(group: THREE.Group, r: number, x: number, y: number): void {
  const rim = new THREE.Mesh(new THREE.TorusGeometry(r, 0.05, 4, 14), material(WOOD.walnut));
  rim.position.set(x, y, 0);
  group.add(rim, rod(0.1, WOOD.stained, [x, y, -0.12], [x, y, 0.12], 8));
  for (let i = 0; i < 6; i++) group.add(rod(0.025, WOOD.walnut, [x, y, 0], [x + r * Math.cos((i * Math.PI) / 3), y + r * Math.sin((i * Math.PI) / 3), 0], 4));
}

// A wire-mesh panel of the coop on a frame of weathered posts and rails.
function mesh({ l, t, h, group }: Frame): THREE.Group {
  const wood = material(WOOD.weathered);
  for (const y of [-h + 0.05, h - 0.05]) group.add(block(2 * l, 0.1, 2 * t + 0.04, wood, 0, y));
  const n = Math.max(1, Math.round((2 * l) / 1.2));
  for (let i = 0; i <= n; i++) group.add(block(0.1, 2 * h, 2 * t + 0.06, wood, -l + 0.05 + ((2 * l - 0.1) * i) / n));
  const wire = material(METAL.silver);
  for (let x = -l + 0.15; x < l - 0.1; x += 0.15) group.add(block(0.012, 2 * h - 0.2, 0.012, wire, x));
  for (let y = -h + 0.25; y < h - 0.1; y += 0.15) group.add(block(2 * l, 0.012, 0.012, wire, 0, y));
  return group;
}

// The coop gate's sign: a white hen with a red comb on a honey board.
const HEN = `<svg xmlns="http://www.w3.org/2000/svg" width="128" height="128" viewBox="0 0 128 128"><rect x="4" y="4" width="120" height="120" rx="10" fill="${hex(WOOD.honey)}" stroke="${hex(INK.black)}" stroke-width="6"/><path d="M34 74 L18 38 L50 60 Z" fill="${hex(INK.black)}"/><path d="M84 36 q4 -12 8 -2 q5 -12 9 2 z" fill="${hex(CLOTH.poppy)}"/><ellipse cx="62" cy="76" rx="32" ry="24" fill="${hex(PAINT.porcelain)}" stroke="${hex(INK.black)}" stroke-width="4"/><circle cx="90" cy="50" r="14" fill="${hex(PAINT.porcelain)}" stroke="${hex(INK.black)}" stroke-width="4"/><path d="M103 46 L116 51 L103 56 Z" fill="${hex(GOLD.star)}"/><circle cx="93" cy="47" r="3" fill="${hex(INK.black)}"/><path d="M56 98 v18 M70 98 v18" stroke="${hex(GOLD.star)}" stroke-width="5"/></svg>`;

const theme: Theme = {
  // Grass, and tufts with wild flowers along its edges under the woods, where no scythe reaches.
  ground: (s) => {
    const { l, t, h, group } = frameOf(s);
    group.add(block(2 * l, 2 * h, 2 * t, material(GREENERY.grass)));
    const r = random(11);
    const flowers = [GOLD.star, PAINT.porcelain, CLOTH.poppy];
    for (let i = 0; i < 360; i++) {
      const [along, into] = [2 * r() - 1, 0.3 + 3.5 * r()];
      const x = i % 4 < 2 ? along * l : (i % 2 ? 1 : -1) * (l - into);
      const z = i % 4 < 2 ? (i % 2 ? 1 : -1) * (t - into) : along * t;
      group.add(drum(0, 0.08, 0.26, GREENERY.leaf, [x, h + 0.13, z], 5));
      if (i % 3 === 0) group.add(ball(0.04, flowers[i % flowers.length]!, [x + 0.05, h + 0.24, z]));
    }
    return group;
  },
  // The woods round the fields: an undergrowth, and a tree every 2.2 m, a trunk under two crowns.
  treeline: (s) => {
    const { l, t, h, group } = frameOf(s);
    const r = random(s.p.x * 7 + s.p.z * 13);
    group.add(block(2 * l, 1.6, 2 * t + 0.6, material(CLOTH.sage), 0, -h + 0.8));
    for (let x = -l + 1; x < l; x += 2.2) {
      const z = 0.6 * (r() - 0.5);
      const crown = r() < 0.5 ? GREENERY.leaf : CLOTH.sage;
      group.add(rod(0.16, WOOD.walnut, [x, -h, z], [x, -h + 2.6, z]));
      group.add(ball(1.3, crown, [x, -h + 3 + 0.5 * r(), z], [1, 1.25, 1]), ball(0.8, crown, [x + 0.2, -h + 4.5, z], [1, 1.2, 1]));
    }
    return group;
  },
  // The hedge: clipped leaf, rounded along its top, lighter clumps on both faces.
  fence: (s) => {
    const { l, t, h, group } = frameOf(s);
    const r = random(s.p.x * 31 + s.p.z * 17 + s.p.y);
    group.add(block(2 * l, 2 * h, 2 * t + 0.2, material(GREENERY.leaf)));
    const n = Math.max(1, Math.round((2 * l) / 0.9));
    for (let i = 0; i < n; i++) {
      const x = -l + (2 * l * (i + 0.5)) / n;
      group.add(ball(0.4, GREENERY.leaf, [x, h - 0.1, 0], [Math.min(1.2, l / 0.4), 0.7, 0.8]));
      for (const z of [-1, 1]) group.add(ball(0.28, GREENERY.grass, [x + 0.3 * (r() - 0.5), -h + 2 * h * (0.15 + 0.7 * r()), z * (t + 0.1)], [1, 1, 0.5]));
    }
    return group;
  },
  // A field gate swung open against the hedge, its posts, the hedge arched over it, and the lane worn
  // through it into both sides.
  gate: (s) => {
    const { l, t, h, group } = frameOf(s);
    const post = material(WOOD.weathered);
    for (const x of [-l + 0.1, l - 0.1]) group.add(block(0.2, 1.8, 0.2, post, x, -h + 0.9));
    group.add(block(2 * l, 2 * h - 2.4, 2 * t + 0.2, material(GREENERY.leaf), 0, h - (2 * h - 2.4) / 2), ball(0.5, GREENERY.leaf, [0, -h + 2.4, 0], [2 * l, 0.5, 0.5]));
    const leaf = new THREE.Group();
    leaf.position.set(-l + 0.2, -h, -t);
    leaf.rotation.y = 1.6;
    for (let y = 0.3; y < 1.5; y += 0.28) leaf.add(block(2 * l - 0.3, 0.08, 0.05, post, l - 0.15, y));
    const brace = block(Math.hypot(2 * l - 0.3, 1.1), 0.08, 0.05, post, l - 0.15, 0.85);
    brace.rotation.z = Math.atan2(1.1, 2 * l - 0.3);
    group.add(leaf.add(brace));
    return group.add(block(2 * l + 0.6, 0.02, 6, material(WOOD.planks), 0, 0.01 - s.p.y));
  },
  gap: (s) => posts(frameOf(s), 0.06, ROUTE, false),
  // A corrugated pipe through the hedge's foot, dark inside, a ROUTE ring round both mouths.
  culvert: (s) => {
    const { t, h, group } = frameOf(s);
    const y = -h + 0.5;
    group.add(rod(0.5, METAL.zinc, [0, y, -t - 0.3], [0, y, t + 0.3], 12), rod(0.42, INK.shadow, [0, y, -t - 0.31], [0, y, t + 0.31], 12));
    for (const z of [-t - 0.3, t + 0.3]) {
      const ring = new THREE.Mesh(new THREE.TorusGeometry(0.47, 0.04, 4, 12), material(ROUTE));
      ring.position.set(0, y, z);
      group.add(ring);
    }
    return group;
  },
  // The hole the drainpipe leads to, and the pipe up both faces from the ground under a gutter.
  drainpipe: (s) => {
    const f = frameOf(s);
    const tall = s.p.y + f.h;
    for (const z of [-f.t - 0.12, f.t + 0.12]) {
      f.group.add(rod(0.07, METAL.zinc, [0, -s.p.y, z], [0, f.h, z], 8), rod(0.06, METAL.zinc, [-f.l - 0.3, f.h - 0.06, z], [f.l + 0.3, f.h - 0.06, z], 6));
      f.group.add(block(0.2, 0.04, 0.2, material(METAL.iron), 0, tall / 2 - s.p.y, z));
    }
    return posts(f, 0.06, ROUTE, true);
  },
  // The khata's walls: whitewash over a blue plinth band, a dark beam under the eaves.
  wall: (s) => {
    const { l, t, h, group } = frameOf(s);
    group.add(block(2 * l, 2 * h, 2 * t, material(WHITEWASH)));
    return group.add(block(2 * l, 0.35, 2 * t + 0.02, material(PAINT.cobalt), 0, -h + 0.175), block(2 * l, 0.12, 2 * t + 0.03, material(WOOD.stained), 0, h - 0.06));
  },
  // Thatch in courses of straw over a whitewashed ceiling, a straw ridge and a fringe at the eaves; the
  // boards of the floor under it, down on the ground (the farm's houses stand on the grass).
  roof: (s) => {
    const { l, t, h, group } = frameOf(s);
    group.add(block(2 * l + 0.3, h, 2 * t + 0.3, material(HAY), 0, h / 2), block(2 * l, h, 2 * t, material(WALLS.trim), 0, -h / 2));
    for (let z = -t; z <= t; z += 0.35) group.add(block(2 * l + 0.32, 0.07, 0.12, material(STRAW), 0, h + 0.03, z));
    group.add(rod(0.2, STRAW, [-l - 0.15, h + 0.08, 0], [l + 0.15, h + 0.08, 0], 8));
    for (const z of [-t - 0.17, t + 0.17]) group.add(block(2 * l + 0.34, 2 * h + 0.14, 0.06, material(STRAW), 0, -0.07, z));
    return group.add(covered(2 * l, 0.02, 2 * t, 'wood', 0, 0.01 - s.p.y));
  },
  'cat flap': (s) => {
    const f = frameOf(s);
    return hole(f, block(2 * f.l - 0.14, HOLE - 0.08, 0.03, material(WOOD.door)), 0.9);
  },
  // A louvre of pine slats over the hole.
  vent: (s) => {
    const f = frameOf(s);
    const louvre = new THREE.Group();
    for (const y of [-0.2, -0.07, 0.06, 0.19]) louvre.add(block(2 * f.l - 0.1, 0.1, 0.02, material(WOOD.pine), 0, y).rotateX(0.5));
    return hole(f, louvre, 1.3);
  },
  // The barn: boards with the wood grain between dark corner posts, battens and a top plate.
  barn: (s) => {
    const { l, t, h, group } = frameOf(s);
    const dark = material(WOOD.stained);
    group.add(covered(2 * l, 2 * h - 0.2, 2 * t, 'wood', 0, -0.1), block(2 * l + 0.04, 0.2, 2 * t + 0.08, dark, 0, h - 0.1));
    const n = Math.max(1, Math.round((2 * l) / 1.5));
    for (let i = 0; i <= n; i++) group.add(block(i % n ? 0.12 : 0.2, 2 * h - 0.2, 2 * t + 0.05, dark, -l + 0.1 + ((2 * l - 0.2) * i) / n, -0.1));
    return group;
  },
  // The smokehouse: logs laid along its walls, dark and sooty in turn, their ends past the corners.
  smokehouse: (s) => {
    const { l, h, group } = frameOf(s);
    const rows = Math.max(1, Math.round(h / 0.11));
    const r = h / rows;
    for (let j = 0; j < rows; j++) group.add(rod(1.05 * r, j % 2 ? WOOD.walnut : WOOD.stained, [-l - 0.1, -h + r * (2 * j + 1), 0], [l + 0.1, -h + r * (2 * j + 1), 0], 6));
    return group;
  },
  // The rack: a dark cupboard under an iron grill, and a pole over its back with sausages and two hams.
  'smoking rack': (s) => {
    const { l, t, h, group } = frameOf(s);
    group.add(block(2 * l, 2 * h - 0.04, 2 * t, material(WOOD.stained), 0, -0.02));
    for (let x = -l + 0.1; x < l; x += 0.2) group.add(block(0.03, 0.04, 2 * t, material(METAL.iron), x, h - 0.02));
    const [back, top] = [t - 0.08, h + 1];
    for (const x of [-l + 0.04, l - 0.04]) group.add(block(0.06, top + h, 0.06, material(WOOD.stained), x, (top - h) / 2, back));
    group.add(rod(0.03, WOOD.stained, [-l, top, back], [l, top, back]));
    for (let x = -l + 0.25, i = 0; x < l - 0.1; x += 0.3, i++)
      group.add(i % 3 === 1 ? ball(0.1, WOOD.mahogany, [x, top - 0.2, back], [1, 1.6, 0.9]) : rod(0.035, i % 2 ? CLAY.shade : WOOD.mahogany, [x, top, back], [x + 0.03, top - 0.35, back]));
    return group;
  },
  table: (s) => table(s, WOOD.oak, 'wood'),
  // Pine cupboards under a worktop with the wood grain, dark gaps between their doors.
  counter: (s) => {
    const { l, t, h, group } = frameOf(s);
    group.add(block(2 * l, 2 * h - 0.05, 2 * t, material(WOOD.pine), 0, -0.025), covered(2 * l + 0.04, 0.05, 2 * t + 0.04, 'wood', 0, h - 0.025));
    for (let x = -l + 0.5; x < l - 0.2; x += 0.5) group.add(block(0.02, 2 * h - 0.2, 2 * t + 0.01, material(INK.shadow), x, -0.05));
    return group;
  },
  // Open shelves of honey pine between two sides, jars of preserves on the lower one.
  shelf: (s) => {
    const { l, t, h, group } = frameOf(s);
    const m = material(WOOD.honey);
    for (const x of [-l + 0.02, l - 0.02]) group.add(block(0.04, 2 * h, 2 * t, m, x));
    for (const y of [-h + 0.05, 0, h - 0.02]) group.add(block(2 * l, 0.04, 2 * t, m, 0, y));
    for (let x = -l + 0.15; x < l - 0.1; x += 0.2) group.add(drum(0.06, 0.06, 0.16, x < 0 ? PAINT.cherry : PAINT.orange, [x, -h + 0.15, 0]), drum(0.065, 0.065, 0.03, CLOTH.linen, [x, -h + 0.245, 0]));
    return group;
  },
  // A tub of oak staves under two iron hoops; the bottom is dark wood.
  'water tub': (s) => {
    const { l, t, h, group } = frameOf(s);
    if (t > 0.1) return group.add(block(2 * l, 2 * h, 2 * t, material(WOOD.stained)));
    const n = Math.max(1, Math.round((2 * l) / 0.12));
    for (let i = 0; i < n; i++) group.add(block((2 * l) / n, 2 * h, 2 * t, material(i % 2 ? WOOD.oak : WOOD.honey), -l + ((2 * l) / n) * (i + 0.5)));
    for (const y of [-0.55 * h, 0.55 * h]) group.add(block(2 * l + 0.01, 0.05, 2 * t + 0.02, material(METAL.iron), 0, y));
    return group;
  },
  coop: (s) => mesh(frameOf(s)),
  // The coop's gate: its mesh, a brace from corner to corner and the hen on its outer face.
  'coop gate': (s) => {
    const f = frameOf(s);
    const { l, t, h, group } = f;
    mesh(f);
    const brace = block(Math.hypot(2 * l, 2 * h) - 0.3, 0.08, 0.04, material(WOOD.weathered), 0, 0, -t - 0.02);
    brace.rotation.z = Math.atan2(2 * h, 2 * l);
    return group.add(brace, block(0.5, 0.5, 0.01, decal(HEN), 0, 0.2, -t - 0.05));
  },
  // A doghouse of boards under a tin roof, its door in one gable end, a tin bowl before it.
  doghouse: (s) => {
    const f = frameOf(s);
    const wall = gabled(f, 1.3 * f.h, pattern('wood'), METAL.zinc);
    f.group.add(block(0.02, 0.6 * wall, 0.9 * f.t, material(INK.shadow), f.l + 0.01, -f.h + 0.3 * wall));
    return f.group.add(drum(0.12, 0.1, 0.06, METAL.tin, [f.l - 0.15, -f.h + 0.03, 0.6 * f.t], 10));
  },
  // A feed bin of battened boards under a dark lid, an iron hasp on its front and back.
  'feed bin': (s) => {
    const { l, t, h, group } = frameOf(s);
    group.add(block(2 * l, 2 * h - 0.1, 2 * t, material(WOOD.honey), 0, -0.05), block(2 * l + 0.06, 0.1, 2 * t + 0.06, material(WOOD.stained), 0, h - 0.05));
    for (let x = -l + 0.3; x < l; x += 0.6) group.add(block(0.08, 2 * h - 0.1, 2 * t + 0.02, material(WOOD.oak), x, -0.05));
    for (const z of [-t - 0.01, t + 0.01]) group.add(block(0.06, 0.18, 0.02, material(METAL.iron), 0, h - 0.18, z));
    return group;
  },
  // The hay cart: its bed of planks heaped with hay, shafts ahead of it; each side a board on two wheels.
  cart: (s) => {
    const { l, t, h, group } = frameOf(s);
    if (h < 0.15) {
      group.add(block(2 * l, 2 * h, 2 * t, material(WOOD.weathered)), ball(1, HAY, [0, h, 0], [0.9 * l, 0.45, 0.85 * t]));
      for (const z of [-0.6 * t, 0.6 * t]) group.add(rod(0.04, WOOD.oak, [l, 0, z], [l + 1.3, -0.5, 0.7 * z]));
      return group;
    }
    group.add(block(2 * l, 0.25, 2 * t, material(WOOD.weathered), 0, h - 0.125));
    for (const x of [-0.55 * l, 0.55 * l]) wheel(group, 0.5, x, -h + 0.5);
    return group;
  },
  // Split logs stacked across the pile, their cut ends pale, each row set half a log along.
  woodpile: (s) => {
    const { l, t, h, group } = frameOf(s);
    const rows = Math.max(1, Math.round(h / 0.1));
    const r = h / rows;
    for (let j = 0; j < rows; j++)
      for (let x = -l + r * (1 + (j % 2)); x <= l - r + 1e-6; x += 2 * r) {
        const y = -h + r * (2 * j + 1);
        group.add(rod(r, WOOD.walnut, [x, y, -t], [x, y, t]));
        for (const z of [-t, t]) group.add(rod(0.8 * r, WOOD.birch, [x, y, z - 0.01], [x, y, z + 0.01]));
      }
    return group;
  },
  // A red tractor, its bonnet at +x: big rear wheels under the glazed cab, small front ones, an exhaust.
  tractor: (s) => {
    const { l, t, h, group } = frameOf(s);
    const paint = material(PAINT.cherry);
    const [rear, front, cab] = [0.8, 0.45, -0.75];
    const [bonnet, floor, roof] = [cab + 0.7, -h + 1.1, h - 0.1]; // the bonnet's back, the cab's floor and roof
    group.add(block(l - 0.05 - bonnet, 0.7, 1.1, paint, (l - 0.05 + bonnet) / 2, -h + 0.95), block(1.4, 0.35, 1.3, paint, cab, -h + 0.95));
    for (const x of [cab - 0.65, cab + 0.65]) for (const z of [-0.6, 0.6]) group.add(block(0.08, roof - floor, 0.08, paint, x, (floor + roof) / 2, z));
    group.add(block(1.3, roof - floor, 1.2, material(GLASS.pane), cab, (floor + roof) / 2), block(1.6, 0.1, 1.5, material(PAINT.porcelain), cab, h - 0.05));
    for (const z of [-1, 1]) {
      group.add(rod(rear, INK.sole, [-l + rear + 0.1, -h + rear, z * (t - 0.32)], [-l + rear + 0.1, -h + rear, z * t], 12), rod(0.35, PAINT.mustard, [-l + rear + 0.1, -h + rear, z * t], [-l + rear + 0.1, -h + rear, z * (t + 0.01)], 8));
      group.add(rod(front, INK.sole, [l - front - 0.15, -h + front, z * 0.52], [l - front - 0.15, -h + front, z * 0.78], 10), rod(0.2, PAINT.mustard, [l - front - 0.15, -h + front, z * 0.78], [l - front - 0.15, -h + front, z * 0.79], 8));
      group.add(ball(0.08, PAINT.enamel, [l - 0.05, -h + 1.1, z * 0.4]));
    }
    return group.add(block(0.04, 0.5, 0.9, material(METAL.zinc), l - 0.03, -h + 0.95), rod(0.05, METAL.iron, [0.7, -h + 1.3, 0.3], [0.7, h, 0.3]));
  },
  // Props. A bale: hay banded with straw courses, tied twice round with red twine.
  'hay bale': (s) => {
    const { l, t, h, group } = frameOf(s);
    group.add(block(2 * l - 0.02, 2 * h, 2 * t - 0.02, material(HAY)));
    for (let y = -h + 0.12; y < h - 0.05; y += 0.18) group.add(block(2 * l, 0.05, 2 * t, material(STRAW), 0, y));
    for (const x of [-0.5 * l, 0.5 * l]) group.add(block(0.03, 2 * h + 0.01, 2 * t + 0.01, material(CLOTH.poppy), x));
    return group;
  },
  // A zinc bucket with a rolled rim and a wire handle.
  bucket: (s) => {
    const { l, h, group } = frameOf(s);
    const handle = new THREE.Mesh(new THREE.TorusGeometry(0.85 * l, 0.012, 3, 10, Math.PI), material(METAL.iron));
    handle.position.y = h - 0.03;
    const rim = new THREE.Mesh(new THREE.TorusGeometry(0.97 * l, 0.02, 4, 12), material(METAL.silver));
    rim.rotation.x = Math.PI / 2;
    rim.position.y = h - 0.03;
    return group.add(drum(0.97 * l, 0.75 * l, 2 * h - 0.04, METAL.zinc, [0, -0.02, 0], 12), rim, handle);
  },
  // A barrow of boards, its wheel ahead of it at +x, two handles and two legs behind.
  wheelbarrow: (s) => {
    const { l, t, h, group } = frameOf(s);
    const m = material(WOOD.weathered);
    const [back, front, floor] = [-0.5 * l, 0.4 * l, -0.1 * h];
    group.add(block(front - back, 0.04, 2 * t - 0.1, m, (back + front) / 2, floor));
    for (const z of [-t + 0.03, t - 0.03]) group.add(block(front - back, h - floor, 0.04, m, (back + front) / 2, (floor + h) / 2, z));
    for (const x of [back, front]) group.add(block(0.04, h - floor, 2 * t - 0.06, m, x, (floor + h) / 2));
    const r = 0.28 * l;
    const tyre = new THREE.Mesh(new THREE.TorusGeometry(r - 0.02, 0.03, 4, 12), material(METAL.iron));
    tyre.position.set(l - r, -h + r, 0);
    group.add(tyre, rod(r - 0.03, WOOD.walnut, [l - r, -h + r, -0.03], [l - r, -h + r, 0.03], 10));
    for (const z of [-0.6 * t, 0.6 * t]) group.add(rod(0.025, WOOD.oak, [l - r, -h + r, z / 3], [-l, floor + 0.15, z]), rod(0.025, WOOD.oak, [back + 0.05, floor, z], [back, -h, z]));
    return group;
  },
  // A churn: a steel body, shoulder and neck, a lid, two handles at the shoulder, a band at the foot.
  'milk can': (s) => {
    const { l, h, group } = frameOf(s);
    group.add(drum(l, l, 1.2 * h, METAL.silver, [0, -0.4 * h, 0], 12), drum(0.5 * l, l, 0.3 * h, METAL.silver, [0, 0.35 * h, 0], 12));
    group.add(drum(0.5 * l, 0.5 * l, 0.4 * h, METAL.silver, [0, 0.7 * h, 0], 10), drum(0.62 * l, 0.62 * l, 0.1 * h, METAL.steel, [0, 0.95 * h, 0], 10), drum(l, l, 0.08 * h, METAL.zinc, [0, -0.92 * h, 0], 12));
    for (const x of [-0.8 * l, 0.8 * l]) {
      const handle = new THREE.Mesh(new THREE.TorusGeometry(0.2 * l, 0.04 * l, 3, 8), material(METAL.steel));
      handle.position.set(x, 0.3 * h, 0);
      group.add(handle);
    }
    return group;
  },
  chair: (s) => chair(s, WOOD.maple),
  // A bench: a plank seat with the grain on two plank legs, a stretcher between them.
  bench: (s) => {
    const { l, t, h, group } = frameOf(s);
    const m = material(WOOD.oak);
    group.add(covered(2 * l, 0.06, 2 * t, 'wood', 0, h - 0.03), block(2 * l - 0.4, 0.06, 0.05, m, 0, -0.3 * h));
    for (const x of [-l + 0.2, l - 0.2]) group.add(block(0.06, 2 * h - 0.06, 2 * t - 0.06, m, x, -0.03));
    return group;
  },
  // A chair on two rockers.
  'rocking chair': (s) => {
    const { l, t, h } = frameOf(s);
    const group = chair(s, WOOD.walnut);
    const arc = 2 * Math.asin(Math.min(1, t / 1.2));
    for (const x of [-l + 0.05, l - 0.05]) {
      const rocker = new THREE.Mesh(new THREE.TorusGeometry(1.2, 0.025, 3, 12, arc), material(WOOD.walnut));
      rocker.rotation.set(0, Math.PI / 2, -Math.PI / 2 - arc / 2);
      rocker.position.set(x, -h + 1.2, 0);
      group.add(rocker);
    }
    return group;
  },
  // A sack of feed: sackcloth rounded at the top, its corners tied into ears, a red stencilled band.
  'feed sack': (s) => {
    const { l, t, h, group } = frameOf(s);
    group.add(block(2 * l - 0.06, 1.4 * h, 2 * t - 0.06, material(STRAW), 0, -0.3 * h), ball(1, STRAW, [0, 0.4 * h, 0], [l - 0.03, 0.6 * h, t - 0.03]));
    group.add(block(2 * l - 0.05, 0.25 * h, 2 * t - 0.05, material(CLOTH.poppy), 0, -0.3 * h));
    for (const x of [-l + 0.08, l - 0.08]) group.add(ball(0.06, STRAW, [x, 0.85 * h, 0], [1, 1.5, 1]));
    return group;
  },
  crate: (s) => crate(s, WOOD.honey),
  // Debris. An egg, a red apple with its stalk and a leaf, a clay pot with a cream band round its belly.
  egg: (s) => {
    const { l, group } = frameOf(s);
    return group.add(ball(l, CLOTH.linen, [0, 0, 0], [0.85, 1.15, 0.85]));
  },
  apple: (s) => {
    const { l, group } = frameOf(s);
    return group.add(ball(l, PAINT.apple, [0, -0.05 * l, 0], [1, 0.9, 1]), rod(0.004, WOOD.walnut, [0, 0.7 * l, 0], [0.1 * l, 1.15 * l, 0]), ball(0.3 * l, GREENERY.leaf, [0.35 * l, l, 0], [1, 0.3, 0.6]));
  },
  pot: (s) => {
    const { l, h, group } = frameOf(s);
    const profile = [[0.001, -h], [0.6 * l, -h], [l, -0.3 * h], [0.85 * l, 0.4 * h], [0.55 * l, 0.7 * h], [0.7 * l, h]].map(([r, y]) => new THREE.Vector2(r, y));
    return group.add(new THREE.Mesh(new THREE.LatheGeometry(profile, 10), material(CLAY.terracotta)), drum(0.97 * l, 0.99 * l, 0.12 * h, CLOTH.linen, [0, -0.25 * h, 0], 10));
  },
};

// Every shape baked to one mesh per material (props.ts).
export default Object.fromEntries(Object.entries(theme).map(([label, build]) => [label, (b: Box) => bake(build(b))])) satisfies Theme;
