import * as THREE from 'three';
import type { Box } from '../../content/level.ts';
import { decal, hex } from '../decals.ts';
import { CLOTH, GOLD, GREENERY, INK, material, METAL, OVERLAY, PAINT, WOOD } from '../palette.ts';
import { covered } from '../patterns.ts';
import { bake, ball, bin, drum, GLASS_MATERIAL, rod, stool, table, upholstered } from '../props.ts';
import { block, frameOf, type Frame, type Theme } from '../themes.ts';

// The yacht's theme (ADR 0011, card 151): every label the yacht lists has a shape, built inside its box
// (GAME.md, Art Direction: low-poly, flat shading). A white motor yacht moored stern-to: the hull's rails
// white under a teak cap and a chrome handrail, a navy stripe and portholes along them, a pointed bow off
// the deck's forward end; the deck and the quay in planks with the wood grain of card 108; the bridge
// with its wrap of dark windows and an anchor over its door, a mast and a radar on the superstructure's
// roof, an orange lifeboat on its chocks, ropes, fenders and a lifebuoy; the fish hold's cage a cargo net
// on steel. The marina's water is one flat plane in a palette slot (WATER). The families of card 116
// (table, stool, bin, the upholstered armchair) where they fit.
const ROUTE = OVERLAY.route; // the frame of an opening only cats pass: an exit or a cat route
const HOLE = 0.6; // m: the height of a cat route's hole in its wall
const HULL = PAINT.enamel;
const STRIPE = PAINT.cobalt;
const TEAK = WOOD.honey;
const CHROME = METAL.silver;
const WATER = CLOTH.denim; // the marina, a softer blue than the hull's navy stripe
const TINT = INK.black; // tinted glass
const WATERLINE = -0.35; // m: the water's plane, under the deck's and the quay's edge
const BOW = 7; // m: how far the bow runs on past the deck's forward end

// The two posts of an opening, `w` wide, standing just proud of its faces, and a lintel over it if asked.
function posts({ l, t, h, group }: Frame, w: number, colour: number, lintel: boolean): THREE.Group {
  const m = material(colour);
  for (const x of [-l + w / 2, l - w / 2]) group.add(block(w, 2 * h, 2 * t + 0.04, m, x));
  if (lintel) group.add(block(2 * l, w, 2 * t + 0.04, m, 0, h - w / 2));
  return group;
}

// The rail's dressing over a part `f` of the hull: the navy stripe where it is tall enough, the teak cap
// and, over it, the chrome handrail on a stanchion every 1.5 m.
function dress({ l, t, h, group }: Frame): THREE.Group {
  if (h > 1.5) group.add(block(2 * l, 0.3, 2 * t + 0.02, material(STRIPE), 0, -h + 2.75));
  group.add(block(2 * l, 0.08, 2 * t + 0.2, material(TEAK), 0, h - 0.04), rod(0.03, CHROME, [-l, h + 0.35, 0], [l, h + 0.35, 0]));
  const n = Math.max(1, Math.round((2 * l) / 1.5));
  for (let i = 0; i <= n; i++) group.add(rod(0.02, CHROME, [-l + 0.05 + ((2 * l - 0.1) * i) / n, h, 0], [-l + 0.05 + ((2 * l - 0.1) * i) / n, h + 0.35, 0]));
  return group;
}

// A round window through a part `f` at (x, y): tinted glass in a ring on each face.
function porthole(group: THREE.Group, t: number, x: number, y: number, r: number, ring: number): void {
  group.add(rod(r, TINT, [x, y, -t - 0.01], [x, y, t + 0.01], 12));
  for (const z of [-t - 0.02, t + 0.02]) {
    const rim = new THREE.Mesh(new THREE.TorusGeometry(r + 0.02, 0.04, 4, 14), material(ring));
    rim.position.set(x, y, z);
    group.add(rim);
  }
}

// A cat route in the superstructure's wall: white over a hole HOLE high framed in ROUTE, and a chrome
// grille hung from its top edge, swung open.
function vent(f: Frame): THREE.Group {
  const { l, t, h, group } = f;
  group.add(block(2 * l, 2 * h - HOLE, 2 * t, material(HULL), 0, HOLE / 2));
  const m = material(ROUTE);
  for (const x of [-l + 0.03, l - 0.03]) group.add(block(0.06, HOLE, 2 * t + 0.04, m, x, -h + HOLE / 2));
  group.add(block(2 * l, 0.06, 2 * t + 0.04, m, 0, -h + HOLE));
  const hinge = new THREE.Group();
  hinge.position.set(0, -h + HOLE - 0.03, -t - 0.02);
  hinge.rotation.x = 1.3;
  for (const y of [-0.45, -0.3, -0.15]) hinge.add(block(2 * l - 0.1, 0.05, 0.02, material(CHROME), 0, y));
  return group.add(hinge);
}

// The fish hold's cage: a steel frame, and a cargo net of rope squares across it.
function net({ l, t, h, group }: Frame): THREE.Group {
  const steel = material(METAL.steel);
  for (const y of [-h + 0.04, h - 0.04]) group.add(block(2 * l, 0.08, 2 * t + 0.02, steel, 0, y));
  for (const x of [-l + 0.04, l - 0.04]) group.add(block(0.08, 2 * h, 2 * t + 0.02, steel, x));
  const rope = material(WOOD.card);
  for (let x = -l + 0.3; x < l - 0.1; x += 0.25) group.add(block(0.03, 2 * h - 0.1, 0.03, rope, x));
  for (let y = -h + 0.25; y < h - 0.1; y += 0.25) group.add(block(2 * l, 0.03, 0.03, rope, 0, y));
  return group;
}

// The bridge's sign: a cobalt anchor on a white plaque in a brass ring.
const ANCHOR = `<svg xmlns="http://www.w3.org/2000/svg" width="128" height="128" viewBox="0 0 128 128"><circle cx="64" cy="64" r="58" fill="${hex(PAINT.porcelain)}" stroke="${hex(GOLD.brass)}" stroke-width="8"/><g fill="none" stroke="${hex(STRIPE)}" stroke-width="9" stroke-linecap="round"><circle cx="64" cy="28" r="9"/><path d="M64 37 V104 M44 50 H84 M30 78 Q36 104 64 104 Q92 104 98 78"/></g><path d="M22 84 L30 70 L40 84 Z M88 84 L98 70 L106 84 Z" fill="${hex(STRIPE)}"/></svg>`;

const theme: Theme = {
  // The teak deck, and the white bow running on past its forward end (+z, the map's bow) from the deck's
  // underside up to the rails' cap.
  deck: (s) => {
    const { l, t, h, group } = frameOf(s);
    group.add(covered(2 * l, 2 * h, 2 * t, 'wood'));
    const end = s.half.z >= s.half.x ? -l : l; // the frame's x at world +z
    const wedge = new THREE.Shape([new THREE.Vector2(0, -t), new THREE.Vector2(0, t), new THREE.Vector2(Math.sign(end) * BOW, 0)]);
    const bow = new THREE.Mesh(new THREE.ExtrudeGeometry(wedge, { depth: 4 + 2 * h, bevelEnabled: false }), material(HULL));
    bow.rotation.x = -Math.PI / 2;
    bow.position.set(end, -h, 0);
    return group.add(bow);
  },
  // The quay: planks with the grain, iron bollards along both long edges.
  pier: (s) => {
    const { l, t, h, group } = frameOf(s);
    group.add(covered(2 * l, 2 * h, 2 * t, 'wood'));
    for (let x = -l + 2; x < l - 1; x += 6)
      for (const z of [-t + 0.3, t - 0.3]) group.add(drum(0.12, 0.15, 0.35, METAL.iron, [x, h + 0.17, z], 8), ball(0.15, METAL.iron, [x, h + 0.35, z], [1, 0.5, 1]));
    return group;
  },
  // The water: the world's edge is its colliders; drawn as the plane of the marina at WATERLINE, far past
  // the camera's reach, and the piles of the quay's edge along each.
  water: (s) => {
    const { l, h, group } = frameOf(s);
    const plane = new THREE.Mesh(new THREE.PlaneGeometry(400, 400), material(WATER));
    plane.rotation.x = -Math.PI / 2;
    plane.position.y = WATERLINE - s.p.y;
    group.add(plane);
    for (let x = -l + 0.2; x < l; x += 3) group.add(drum(0.14, 0.14, 1.1, WOOD.stained, [x, -h + 0.2, 0], 8));
    return group;
  },
  // The hull's rails: white under the dressing, a porthole every 3.5 m on both faces.
  rail: (s) => {
    const f = frameOf(s);
    const { l, t, h, group } = f;
    group.add(block(2 * l, 2 * h, 2 * t, material(HULL)));
    if (h > 1.5) for (let x = -l + 1.75; x < l - 0.5; x += 3.5) porthole(group, t, x, -h + 1.8, 0.18, CHROME);
    return dress(f);
  },
  // The gangway: a teak plank across the opening, chrome stanchions and a rope rail each side of it.
  gangway: (s) => {
    const f = frameOf(s);
    const { l, h, group } = f;
    group.add(block(2 * l - 0.2, 0.05, 2.2, material(TEAK), 0, -h + 0.025));
    for (const x of [-l + 0.15, l - 0.15]) {
      for (const z of [-1, 1]) group.add(rod(0.025, CHROME, [x, -h, z], [x, -h + 0.9, z]));
      group.add(rod(0.02, WOOD.card, [x, -h + 0.9, -1], [x, -h + 0.9, 1]));
    }
    return posts(f, 0.06, ROUTE, false);
  },
  // The stern ladder: a chrome ladder up both faces of the transom over the opening, clear of it below.
  'stern ladder': (s) => {
    const f = frameOf(s);
    const { l, t, h, group } = f;
    for (const z of [-t - 0.1, t + 0.1]) {
      for (const x of [-l + 0.12, l - 0.12]) group.add(rod(0.025, CHROME, [x, -h + 1.2, z], [x, h + 0.4, z]));
      for (let y = -h + 1.3; y < h + 0.3; y += 0.3) group.add(rod(0.02, CHROME, [-l + 0.12, y, z], [l - 0.12, y, z]));
    }
    return posts(f, 0.06, ROUTE, true);
  },
  // A porthole a cat passes: the rail's white (or the superstructure's) round a hole at the foot, framed
  // in ROUTE inside a brass ring on each face.
  porthole: (s) => {
    const f = frameOf(s);
    const { l, t, h, group } = f;
    const r = Math.min(0.33, l - 0.05);
    const y = -h + r + 0.05;
    const wall = new THREE.Shape([new THREE.Vector2(-l, -h), new THREE.Vector2(l, -h), new THREE.Vector2(l, h), new THREE.Vector2(-l, h)]);
    wall.holes.push(new THREE.Path().absarc(0, y, r, 0, 2 * Math.PI, false));
    group.add(new THREE.Mesh(new THREE.ExtrudeGeometry(wall, { depth: 2 * t, bevelEnabled: false, curveSegments: 14 }), material(HULL)).translateZ(-t));
    for (const z of [-t - 0.02, t + 0.02])
      for (const [radius, tube, colour] of [[r, 0.03, ROUTE], [r + 0.06, 0.04, GOLD.brass]] as const) {
        const ring = new THREE.Mesh(new THREE.TorusGeometry(radius, tube, 4, 16), material(colour));
        ring.position.set(0, y, z);
        group.add(ring);
      }
    return h > 1.5 ? dress(f) : group;
  },
  // The hawse a cat reaches by the anchor chain: ROUTE posts and lintel, a chrome hawse ring on each face
  // and the chain hanging from it to the deck and the quay.
  'anchor chain': (s) => {
    const f = frameOf(s);
    const { t, h, group } = f;
    for (const z of [-t - 0.1, t + 0.1]) {
      const hawse = new THREE.Mesh(new THREE.TorusGeometry(0.2, 0.05, 4, 12), material(CHROME));
      hawse.position.set(0, -h + 0.25, z);
      group.add(hawse);
      for (let y = -h + 0.1, i = 0; y > -s.p.y; y -= 0.12, i++) {
        const link = new THREE.Mesh(new THREE.TorusGeometry(0.06, 0.018, 4, 8), material(METAL.iron));
        link.position.set(0, y, z);
        link.rotation.y = i % 2 ? Math.PI / 2 : 0;
        link.scale.set(1, 1.5, 1);
        group.add(link);
      }
    }
    return posts(f, 0.06, ROUTE, true);
  },
  // An orange inflatable: two tubes meeting at the bow (+x), a floor, a thwart, an outboard at the transom.
  dinghy: (s) => {
    const { l, t, h, group } = frameOf(s);
    const [r, stern, bow] = [h, -l + 0.3, 0.35 * l];
    for (const z of [-t + r, t - r]) group.add(rod(r, PAINT.orange, [stern, 0, z], [bow, 0, z], 10), rod(r, PAINT.orange, [bow, 0, z], [l - r, 0, 0], 10));
    group.add(ball(r, PAINT.orange, [l - r, 0, 0]), block(l + bow - 0.3, 0.06, 2 * t - 2 * r, material(METAL.zinc), (stern + bow) / 2, -h + 0.05));
    group.add(block(0.3, 0.06, 2 * t - 2 * r, material(TEAK), 0, 0.1), block(0.08, 2 * h, 2 * t - 2 * r, material(TEAK), stern - 0.04, 0));
    return group.add(block(0.3, 0.4, 0.3, material(INK.black), -l + 0.15, h, 0), rod(0.05, METAL.iron, [-l + 0.15, h - 0.2, 0], [-l + 0.15, -h, 0]));
  },
  // The superstructure's walls: white over a teak skirting, a navy line under the ceiling.
  wall: (s) => {
    const { l, t, h, group } = frameOf(s);
    group.add(block(2 * l, 2 * h, 2 * t, material(HULL)));
    return group.add(block(2 * l, 0.15, 2 * t + 0.02, material(TEAK), 0, -h + 0.075), block(2 * l, 0.08, 2 * t + 0.02, material(STRIPE), 0, h - 0.2));
  },
  vent: (s) => vent(frameOf(s)),
  // The superstructure's roof: white with a navy fascia, its long sides' windows hung under the eaves,
  // and a mast in its middle carrying a radar and two whips.
  roof: (s) => {
    const { l, t, h, group } = frameOf(s);
    group.add(block(2 * l + 0.2, 2 * h, 2 * t + 0.2, material(HULL)), block(2 * l + 0.24, 0.1, 2 * t + 0.24, material(STRIPE), 0, -h + 0.05));
    const [top, bottom] = [-h - 0.5, -h - 1.2];
    for (let x = -l + 0.5; x < l - 1.5; x += 1.9) for (const z of [-t - 0.01, t + 0.01]) group.add(block(1.4, top - bottom, 0.02, material(TINT), x + 0.7, (top + bottom) / 2, z));
    group.add(rod(0.08, CHROME, [0, h, 0], [0, h + 2.2, 0]), rod(0.04, CHROME, [0, h + 1.6, -0.8], [0, h + 1.6, 0.8]), ball(0.35, PAINT.porcelain, [0, h + 2.35, 0], [1.4, 0.4, 1.4]));
    return group.add(rod(0.015, INK.black, [0.3, h, 0.5], [0.3, h + 2.8, 0.5]), rod(0.015, INK.black, [-0.3, h, -0.5], [-0.3, h + 2.4, -0.5]));
  },
  'galley table': (s) => table(s, TEAK, 'wood'),
  // Stainless steel, a chrome trim at the top, a dark handle on the body.
  fridge: (s) => {
    const { l, t, h, group } = frameOf(s);
    group.add(block(2 * l, 2 * h, 2 * t, material(METAL.steel)), block(2 * l, 0.02, 2 * t + 0.01, material(CHROME), 0, h - 0.01));
    if (h > 0.3) for (const z of [-t - 0.02, t + 0.02]) group.add(block(0.04, 0.4, 0.03, material(INK.black), l - 0.1, 0.2 * h, z));
    return group;
  },
  // Teak cupboards under a white worktop with a steel sink let into it.
  counter: (s) => {
    const { l, t, h, group } = frameOf(s);
    group.add(block(2 * l, 2 * h - 0.05, 2 * t, material(TEAK), 0, -0.025), block(2 * l + 0.03, 0.05, 2 * t + 0.03, material(PAINT.porcelain), 0, h - 0.025));
    group.add(block(0.5, 0.02, 0.4, material(CHROME), 0.3 * l, h + 0.005), rod(0.015, CHROME, [0.3 * l, h, -0.25], [0.3 * l, h + 0.25, -0.25]));
    for (let x = -l + 0.55; x < l - 0.2; x += 0.55) group.add(block(0.02, 2 * h - 0.2, 2 * t + 0.01, material(WOOD.stained), x, -0.05));
    return group;
  },
  // A tank's panes are thin, its teak stand is not.
  aquarium: (s) => {
    const { l, t, h, group } = frameOf(s);
    return group.add(Math.min(l, t, h) < 0.05 ? block(2 * l, 2 * h, 2 * t, GLASS_MATERIAL) : block(2 * l, 2 * h, 2 * t, material(TEAK)));
  },
  // The saloon's bar: panelled mahogany, a teak top, a brass foot rail along its front (+z).
  bar: (s) => {
    const { l, t, h, group } = frameOf(s);
    group.add(block(2 * l, 2 * h - 0.06, 2 * t, material(WOOD.mahogany), 0, -0.03), block(2 * l + 0.06, 0.06, 2 * t + 0.06, material(TEAK), 0, h - 0.03));
    for (let x = -l + 0.5; x < l - 0.2; x += 0.5) group.add(block(0.05, 2 * h - 0.2, 0.02, material(WOOD.stained), x, -0.05, t + 0.01));
    return group.add(rod(0.025, GOLD.brass, [-l, -h + 0.2, t + 0.12], [l, -h + 0.2, t + 0.12]));
  },
  // Two berths on teak posts, linen mattresses under navy blankets, a ladder at the head end.
  bunk: (s) => {
    const { l, t, h, group } = frameOf(s);
    const m = material(TEAK);
    for (const x of [-l + 0.04, l - 0.04]) for (const z of [-t + 0.04, t - 0.04]) group.add(block(0.08, 2 * h, 0.08, m, x, 0, z));
    for (const y of [-h + 0.3, 0.1]) {
      group.add(block(2 * l, 0.1, 2 * t, m, 0, y), block(2 * l - 0.1, 0.12, 2 * t - 0.1, material(CLOTH.linen), 0, y + 0.11));
      group.add(block(1.3 * l, 0.06, 2 * t - 0.06, material(CLOTH.denim), -0.3 * l, y + 0.18), ball(1, PAINT.porcelain, [0.75 * l, y + 0.2, 0], [0.18, 0.06, 0.6 * t]));
    }
    for (let y = -h + 0.5; y < 0.3; y += 0.3) group.add(rod(0.02, CHROME, [l - 0.02, y, -0.2], [l - 0.02, y, 0.2]));
    return group;
  },
  kennel: (s) => net(frameOf(s)),
  'kennel gate': (s) => net(frameOf(s)),
  // The bridge: white under a navy roof, a wrap of dark windows between white corner posts, its door and
  // the anchor on its aft face (+x of its frame).
  bridge: (s) => {
    const { l, t, h, group } = frameOf(s);
    const aft = s.half.z >= s.half.x ? l : -l; // the frame's x at world -z
    group.add(block(2 * l, 2 * h - 0.15, 2 * t, material(HULL), 0, -0.075), block(2 * l + 0.3, 0.15, 2 * t + 0.3, material(STRIPE), 0, h - 0.075));
    group.add(block(2 * l + 0.02, 0.6, 2 * t + 0.02, material(TINT), 0, 0.35 * h));
    for (const x of [-l, l]) for (const z of [-t, t]) group.add(block(0.14, 0.62, 0.14, material(HULL), x, 0.35 * h, z));
    group.add(block(0.02, 1.4, 0.8, material(WOOD.mahogany), aft + Math.sign(aft) * 0.01, -h + 0.7, 0.3 * t));
    group.add(block(0.01, 0.5, 0.5, decal(ANCHOR), aft + Math.sign(aft) * 0.02, -h + 1.1, -0.45 * t));
    return group.add(rod(0.015, INK.black, [0, h, 0], [0, h + 1.5, 0]), drum(0.12, 0.12, 0.1, GOLD.brass, [0.3, h + 0.05, 0.4], 8));
  },
  // An orange lifeboat under a white canopy, a lifeline looped along its gunwale.
  lifeboat: (s) => {
    const { l, t, h, group } = frameOf(s);
    group.add(ball(1, PAINT.orange, [0, -0.1 * h, 0], [l, 0.9 * h, t]), ball(1, PAINT.porcelain, [0, 0.5 * h, 0], [0.75 * l, 0.6 * h, 0.8 * t]));
    for (const z of [-0.93 * t, 0.93 * t]) group.add(rod(0.025, CLOTH.linen, [-0.8 * l, 0, z], [0.8 * l, 0, z]));
    return group;
  },
  // A chock: a teak cradle block under a black rubber pad.
  chock: (s) => {
    const { l, t, h, group } = frameOf(s);
    return group.add(block(2 * l, 2 * h - 0.06, 2 * t, material(WOOD.stained), 0, -0.03), block(2 * l, 0.06, 2 * t, material(INK.sole), 0, h - 0.03));
  },
  // Props. A blue tarpaulin draped over deck gear, its skirt flared, lashed twice round with rope.
  tarpaulin: (s) => {
    const { l, t, h, group } = frameOf(s);
    const blue = CLOTH.denim;
    group.add(block(2 * l - 0.1, 2 * h - 0.1, 2 * t - 0.1, material(blue), 0, 0.05), block(2 * l, 0.2, 2 * t, material(blue), 0, -h + 0.1));
    group.add(ball(1, blue, [-0.3 * l, h - 0.1, 0], [0.6 * l, 0.15, 0.8 * t]), ball(1, blue, [0.4 * l, h - 0.1, 0.1], [0.5 * l, 0.1, 0.7 * t]));
    for (const x of [-0.5 * l, 0.5 * l]) group.add(block(0.04, 2 * h - 0.08, 2 * t - 0.08, material(WOOD.card), x, 0.04));
    return group;
  },
  // Two suitcases stacked, each with a handle on top, a strap round the lower one.
  luggage: (s) => {
    const { l, t, h, group } = frameOf(s);
    const low = 1.2 * h;
    group.add(block(2 * l, low, 2 * t, material(CLOTH.plum), 0, -h + low / 2), block(1.4 * l, 2 * h - low, 1.6 * t, material(PAINT.mustard), 0.1 * l, h - (2 * h - low) / 2));
    group.add(block(0.08, 0.02 + low, 2 * t + 0.01, material(INK.sole), -0.4 * l, -h + low / 2), rod(0.02, INK.black, [-0.15, h + 0.03, 0], [0.25, h + 0.03, 0]));
    return group.add(rod(0.02, INK.black, [-0.2 * l, -h + low + 0.03, -0.5 * t], [0.3 * l, -h + low + 0.03, -0.5 * t]));
  },
  // A folding deck chair: a teak frame and a sling of navy and white stripes.
  'deck chair': (s) => {
    const { l, t, h, group } = frameOf(s);
    for (const x of [-l + 0.03, l - 0.03]) group.add(rod(0.025, TEAK, [x, -h, -t], [x, h, t - 0.05]), rod(0.025, TEAK, [x, -h, t], [x, 0, -t + 0.05]));
    const sling = new THREE.Group();
    sling.rotation.x = Math.atan2(2 * t - 0.1, 2 * h);
    for (let i = 0; i < 5; i++) sling.add(block(2 * l - 0.08, (2 * h) / 5, 0.02, material(i % 2 ? PAINT.porcelain : STRIPE), 0, -h + ((2 * h) / 5) * (i + 0.5)));
    return group.add(sling);
  },
  // A coil of hemp rope, two layers of turns.
  'coil of rope': (s) => {
    const { l, h, group } = frameOf(s);
    for (const [r, y] of [[0.85, -0.5], [0.6, -0.5], [0.35, -0.5], [0.75, 0.5], [0.5, 0.5]] as const) {
      const turn = new THREE.Mesh(new THREE.TorusGeometry(r * l, 0.12 * l, 4, 14), material(WOOD.card));
      turn.rotation.x = Math.PI / 2;
      turn.position.y = y * h;
      group.add(turn);
    }
    return group;
  },
  // A navy fender, rounded at both ends, a rope's eye on top.
  fender: (s) => {
    const { l, h, group } = frameOf(s);
    group.add(drum(l, l, 2 * h - 2 * l, STRIPE, [0, 0, 0], 10), ball(l, STRIPE, [0, h - l, 0]), ball(l, STRIPE, [0, -h + l, 0]));
    const eye = new THREE.Mesh(new THREE.TorusGeometry(0.4 * l, 0.1 * l, 3, 8), material(WOOD.card));
    eye.position.y = h;
    return group.add(eye);
  },
  // A white cool box, a navy lid, a handle at each end.
  cooler: (s) => {
    const { l, t, h, group } = frameOf(s);
    group.add(block(2 * l, 1.5 * h, 2 * t, material(PAINT.porcelain), 0, -0.25 * h), block(2 * l, 0.5 * h, 2 * t, material(STRIPE), 0, 0.75 * h));
    for (const x of [-l + 0.02, l - 0.02]) group.add(block(0.04, 0.06, 0.25, material(INK.sole), x, 0.2 * h));
    return group;
  },
  armchair: (s) => upholstered(s, CLOTH.denim),
  'coffee table': (s) => table(s, TEAK, 'wood'),
  stool: (s) => stool(s, TEAK),
  bin: (s) => bin(s, CHROME),
  // Debris. A tumbler with a lemon slice on its rim; a bottle of green glass under gold foil, a white label.
  glass: (s) => {
    const { l, h, group } = frameOf(s);
    return group.add(new THREE.Mesh(new THREE.CylinderGeometry(l, 0.8 * l, 2 * h, 10), GLASS_MATERIAL), drum(0.6 * l, 0.6 * l, 0.01, PAINT.mustard, [0.5 * l, h, 0], 8));
  },
  bottle: (s) => {
    const { l, h, group } = frameOf(s);
    group.add(drum(l, l, 1.1 * h, GREENERY.leaf, [0, -0.45 * h, 0], 10), drum(0.35 * l, l, 0.4 * h, GREENERY.leaf, [0, 0.3 * h, 0], 10));
    return group.add(drum(0.35 * l, 0.35 * l, 0.5 * h, GOLD.brass, [0, 0.75 * h, 0], 8), drum(1.02 * l, 1.02 * l, 0.4 * h, PAINT.porcelain, [0, -0.4 * h, 0], 10));
  },
  // A plate: a porcelain face in a navy rim.
  plate: (s) => {
    const { l, h, group } = frameOf(s);
    return group.add(drum(l, 0.85 * l, 1.4 * h, STRIPE, [0, -0.3 * h, 0], 16), drum(0.78 * l, 0.78 * l, 1.6 * h, PAINT.porcelain, [0, 0.2 * h, 0], 16));
  },
  // A lifebuoy lying flat: white and red in quarters.
  lifebuoy: (s) => {
    const { l, h, group } = frameOf(s);
    for (let i = 0; i < 8; i++) {
      const arc = new THREE.Mesh(new THREE.TorusGeometry(l - h, h, 5, 4, Math.PI / 4), material(i % 2 ? PAINT.apple : PAINT.porcelain));
      arc.rotation.set(Math.PI / 2, 0, (i * Math.PI) / 4);
      group.add(arc);
    }
    return group;
  },
};

// Every shape baked to one mesh per material (props.ts).
export default Object.fromEntries(Object.entries(theme).map(([label, build]) => [label, (b: Box) => bake(build(b))])) satisfies Theme;
