import * as THREE from 'three';
import type { Box } from '../../content/level.ts';
import { decal, hex } from '../decals.ts';
import { CLAY, CLOTH, GLASS, GOLD, GREENERY, INK, KIND, LABEL, material, METAL, OVERLAY, PAINT, WALLS, WOOD } from '../palette.ts';
import { covered } from '../patterns.ts';
import { bake, ball, crate, drum, rod, table } from '../props.ts';
import { block, frameOf, type Frame, type Theme } from '../themes.ts';
import house from './country-house.ts';

// The fish market's theme (ADR 0011, card 149): every label its map lists drawn inside its box. What the
// market shares with the country house (the neighbours' wall, the gate, a cat route's frame, the drainpipe,
// a vent, the tank, the kennel's gate, a crate, a stool, a cup) is the house theme's own builder, reused by
// label; the rest is the market's: wet asphalt, a plank pier and the fishmonger's van, stall backs under
// striped tarpaulins, a hall tiled to the shoulder (card 108's tiles) under a tin roof, the ice counter,
// the cold shelf, stalls with fish on ice, crates, buckets, scales and the guard's booth.
const ROUTE = OVERLAY.route; // the frame of an opening only cats pass: an exit or a cat route
const HOLE = 0.6; // m: the height of a cat route's hole in its wall
const TARP = [CLOTH.denim, PAINT.porcelain]; // a tarpaulin's stripes
const STRIPE = 0.5; // m
// The house's builders the market draws its labels with: label → the house's label.
const REUSED: Record<string, string> = { 'outer wall': 'outer wall', gate: 'gate', 'gap under a stall': 'gap', drainpipe: 'drainpipe', vent: 'vent', tank: 'aquarium', 'kennel gate': 'kennel gate', crate: 'crate', stool: 'stool', cup: 'cup' };

// The van's side: a big fish.
const FISH = `<svg xmlns="http://www.w3.org/2000/svg" width="200" height="100" viewBox="0 0 200 100"><ellipse cx="90" cy="50" rx="62" ry="30" fill="${hex(KIND.fish.body)}" stroke="${hex(INK.black)}" stroke-width="5"/><path d="M148 50 L190 20 L190 80 Z" fill="${hex(KIND.fish.fin)}" stroke="${hex(INK.black)}" stroke-width="5"/><circle cx="58" cy="42" r="9" fill="${hex(PAINT.porcelain)}"/><circle cx="56" cy="42" r="4" fill="${hex(INK.black)}"/></svg>`;

// A fish lying on its side along x, its tail at -x.
function fish(len: number, [x, y, z]: [number, number, number], turn = 0): THREE.Group {
  const g = new THREE.Group();
  g.position.set(x, y, z);
  g.rotation.y = turn;
  g.add(ball(1, KIND.fish.body, [0, 0.12 * len, 0], [0.4 * len, 0.12 * len, 0.16 * len]));
  g.add(ball(1, KIND.fish.fin, [-0.48 * len, 0.1 * len, 0], [0.12 * len, 0.05 * len, 0.14 * len]), ball(0.035 * len, INK.black, [0.3 * len, 0.2 * len, 0.06 * len]));
  return g;
}

// Stripes STRIPE wide across a panel 2l long and `tall` high at y, `d` thick.
function tarp(group: THREE.Group, l: number, tall: number, d: number, y: number, z = 0): void {
  const n = Math.max(1, Math.round((2 * l) / STRIPE));
  const w = (2 * l) / n;
  for (let i = 0; i < n; i++) group.add(block(w, tall, d, material(TARP[i % 2]!), -l + w * (i + 0.5), y, z));
}

// A cat route's hole HOLE high under the wall of `fill`, framed in ROUTE.
function hole({ l, t, h, group }: Frame, fill: number): void {
  group.add(block(2 * l, 2 * h - HOLE, 2 * t, material(fill), 0, HOLE / 2), block(2 * l, 0.06, 2 * t + 0.04, material(ROUTE), 0, -h + HOLE));
  for (const x of [-l + 0.03, l - 0.03]) group.add(block(0.06, HOLE, 2 * t + 0.04, material(ROUTE), x, -h + HOLE / 2));
}

const theme: Theme = {
  // Wet asphalt, puddles here and there.
  ground: (s) => {
    const { l, t, h, group } = frameOf(s);
    group.add(block(2 * l, 2 * h, 2 * t, material(METAL.zinc)));
    let seed = 11;
    const random = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
    for (let i = 0; i < 40; i++) group.add(drum(0.4 + random(), 0.4 + random(), 0.01, GLASS.jar, [(2 * random() - 1) * (l - 2), h + 0.005, (2 * random() - 1) * (t - 2)], 7));
    return group;
  },
  // Weathered planks across the pier, iron bollards along its water edge (-z).
  pier: (s) => {
    const { l, t, h, group } = frameOf(s);
    group.add(block(2 * l, 2 * h - 0.04, 2 * t, material(WOOD.stained), 0, -0.02));
    const n = Math.max(1, Math.round((2 * l) / 0.25));
    for (let i = 0; i < n; i++) group.add(block((2 * l) / n - 0.02, 0.04, 2 * t, material(i % 3 ? WOOD.weathered : WOOD.planks), -l + ((2 * l) / n) * (i + 0.5), h - 0.02));
    for (let x = -l + 1; x < l; x += 6) group.add(drum(0.12, 0.15, 0.3, METAL.iron, [x, h + 0.15, -t + 0.2], 8), drum(0.16, 0.16, 0.04, METAL.iron, [x, h + 0.3, -t + 0.2], 8));
    return group;
  },
  // The fishmonger's van, its cab at +x: a white cargo box with a blue stripe and a fish on each side, a
  // glazed cab, four wheels, bumpers and lamps.
  van: (s) => {
    const { l, t, h, group } = frameOf(s);
    const [wheel, cab] = [0.35, 0.35 * l];
    const floor = -h + wheel;
    group.add(block(l + cab, 2 * h - wheel, 2 * t, material(PAINT.enamel), (cab - l) / 2, wheel / 2), block(l - cab, 1.1 * h - wheel, 2 * t, material(PAINT.enamel), (l + cab) / 2, floor + (1.1 * h - wheel) / 2));
    group.add(block(l - cab - 0.1, 0.6 * h, 2 * t - 0.1, material(GLASS.pane), (l + cab) / 2 - 0.05, floor + 1.1 * h - wheel + 0.3 * h), block(l + cab, 0.15, 2 * t + 0.02, material(PAINT.cobalt), (cab - l) / 2, floor + 0.3));
    for (const z of [-t - 0.006, t + 0.006]) group.add(block(1.4 * l, 0.7 * h, 0.01, decal(FISH), -0.4 * l, 0.15 * h, z));
    for (const x of [-0.65 * l, 0.65 * l]) for (const z of [-1, 1]) group.add(rod(wheel, INK.sole, [x, -h + wheel, z * (t - 0.25)], [x, -h + wheel, z * t], 10), rod(0.14, METAL.silver, [x, -h + wheel, z * t], [x, -h + wheel, z * (t + 0.01)], 8));
    for (const x of [-l + 0.05, l - 0.05]) group.add(block(0.1, 0.14, 2 * t, material(METAL.steel), x, floor + 0.07));
    for (const z of [-0.7 * t, 0.7 * t]) group.add(block(0.04, 0.14, 0.3, material(GOLD.star), l - 0.02, floor + 0.35, z), block(0.04, 0.14, 0.2, material(PAINT.apple), -l + 0.02, floor + 0.35, z));
    return group;
  },
  // The market's fence: the outer stalls' plank backs to a stall's height, striped tarpaulins over them to
  // the top, iron poles every 2 m and a rope along the top.
  fence: (s) => {
    const { l, t, h, group } = frameOf(s);
    const low = Math.min(1, 2 * h);
    group.add(block(2 * l, low, 2 * t, material(WOOD.weathered), 0, -h + low / 2));
    for (let x = -l + 0.15; x < l; x += 0.3) group.add(block(0.02, low, 2 * t + 0.02, material(WOOD.planks), x, -h + low / 2));
    if (2 * h > low) tarp(group, l, 2 * h - low, 2 * t - 0.04, h - (2 * h - low) / 2);
    for (let x = -l + 0.05; x < l; x += 2) group.add(block(0.08, 2 * h, 2 * t + 0.04, material(METAL.iron), x));
    return group.add(rod(0.02, WOOD.card, [-l, h - 0.03, 0], [l, h - 0.03, 0]));
  },
  // A tarpaulin flap in the fence, rolled up to a cat's height, its opening framed in ROUTE.
  'tarpaulin flap': (s) => {
    const { l, t, h, group } = frameOf(s);
    tarp(group, l, 2 * h - 1.2, 2 * t - 0.04, 0.6);
    group.add(rod(0.09, TARP[0]!, [-l, -h + 1.2, 0], [l, -h + 1.2, 0], 8), block(2 * l, 0.06, 2 * t + 0.04, material(ROUTE), 0, -h + 1.1));
    for (const x of [-l + 0.03, l - 0.03]) group.add(block(0.06, 2 * h, 2 * t + 0.04, material(ROUTE), x));
    return group;
  },
  // The hall's walls: plaster over kitchen tiles to the shoulder on both faces, a zinc skirting.
  wall: (s) => {
    const { l, t, h, group } = frameOf(s);
    const tiled = Math.min(1.5, 2 * h);
    group.add(block(2 * l, 2 * h, 2 * t, material(LABEL.wall!)), covered(2 * l, tiled, 2 * t + 0.02, 'tiles', 0, -h + tiled / 2));
    return group.add(block(2 * l, 0.1, 2 * t + 0.04, material(METAL.zinc), 0, -h + 0.05));
  },
  // A drain grate under the wall: its hole framed in ROUTE, the grate lifted out and lying beside it.
  'drain grate': (s) => {
    const f = frameOf(s);
    hole(f, LABEL.wall!);
    const { l, t, h, group } = f;
    const grate = new THREE.Group();
    grate.position.set(0, -h + 0.02, -t - 0.4);
    for (let i = 0; i < 6; i++) grate.add(block(0.03, 0.03, 0.6, material(METAL.iron), -l + 0.1 + ((2 * l - 0.2) * i) / 5));
    for (const z of [-0.28, 0, 0.28]) grate.add(block(2 * l - 0.1, 0.03, 0.03, material(METAL.iron), 0, 0, z));
    return group.add(grate);
  },
  // The back door's roller shutter, let down to a cat's height over a hole framed in ROUTE: tin slats
  // under the shutter's box.
  'gap under the shutter': (s) => {
    const { l, t, h, group } = frameOf(s);
    const top = 2 * h - HOLE;
    for (let y = -h + HOLE + 0.05; y < h - 0.35; y += 0.1) group.add(block(2 * l, 0.08, 2 * t - 0.06, material(METAL.tin), 0, y));
    group.add(block(2 * l, 0.35, 2 * t, material(METAL.zinc), 0, h - 0.175), block(2 * l, top, 2 * t - 0.1, material(METAL.iron), 0, HOLE / 2));
    group.add(block(2 * l, 0.06, 2 * t + 0.04, material(ROUTE), 0, -h + HOLE));
    for (const x of [-l + 0.03, l - 0.03]) group.add(block(0.06, HOLE, 2 * t + 0.04, material(ROUTE), x, -h + HOLE / 2));
    return group;
  },
  // Corrugated tin: ribs every 0.3 m over a whitewashed ceiling, a zinc edge round it.
  roof: (s) => {
    const { l, t, h, group } = frameOf(s);
    group.add(block(2 * l, h, 2 * t, material(METAL.tin), 0, h / 2), block(2 * l, h, 2 * t, material(WALLS.trim), 0, -h / 2));
    for (let x = -l + 0.15; x < l; x += 0.3) group.add(block(0.08, 0.05, 2 * t, material(METAL.steel), x, h + 0.025));
    for (const z of [-t - 0.02, t + 0.02]) group.add(block(2 * l + 0.04, 2 * h, 0.04, material(METAL.zinc), 0, 0, z));
    return group;
  },
  // The ice counter: tiled all round under a steel rim, a bed of crushed ice on top, lumps of it here and
  // there between the fish.
  'ice counter': (s) => {
    const { l, t, h, group } = frameOf(s);
    group.add(covered(2 * l, 2 * h - 0.08, 2 * t, 'tiles', 0, -0.04), block(2 * l, 0.06, 2 * t, material(METAL.steel), 0, h - 0.07));
    group.add(block(2 * l - 0.1, 0.04, 2 * t - 0.1, material(GLASS.jar), 0, h - 0.02));
    for (let i = 0; i < 14; i++) group.add(ball(0.05, PAINT.enamel, [-l + 0.15 + ((2 * l - 0.3) * i) / 13, h - 0.01, (i % 3) * 0.3 * t - 0.3 * t], [1, 0.4, 1]));
    return group;
  },
  // The cold room's steel shelf: the cabinet below with a frosted top and its louvres, the shelf above
  // with icicles along its front edge (+z in its frame).
  'cold shelf': (s) => {
    const { l, t, h, group } = frameOf(s);
    group.add(block(2 * l, 2 * h, 2 * t, material(METAL.silver)), block(2 * l - 0.04, 0.02, 2 * t - 0.04, material(PAINT.enamel), 0, h + 0.005));
    if (h < 0.1) {
      for (let x = -l + 0.08; x < l; x += 0.12) group.add(drum(0.015, 0.002, 0.08, GLASS.jar, [x, -h - 0.04, t - 0.02], 5));
      return group;
    }
    for (let i = 0; i < 4; i++) group.add(block(2 * l - 0.3, 0.03, 0.02, material(METAL.iron), 0, -h + 0.1 + 0.06 * i, t + 0.01));
    return group.add(block(0.02, 2 * h - 0.1, 0.02, material(METAL.steel), 0, 0, t + 0.01));
  },
  // Wooden fish crates stacked two along and three high, fish on the top ones.
  'crate stack': (s) => {
    const { l, t, h, group } = frameOf(s);
    for (let i = 0; i < 2; i++)
      for (let j = 0; j < 3; j++) group.add(crate({ p: { x: -l / 2 + l * i, y: -h + (h / 3) * (2 * j + 1), z: 0 }, half: { x: l / 2 - 0.01, y: h / 3 - 0.01, z: t } }, LABEL.crate!));
    for (const x of [-0.6, -0.2, 0.3, 0.7]) group.add(fish(0.35, [x * l, h, (x > 0 ? 0.3 : -0.3) * t], 0.3 * x));
    return group;
  },
  // A stall: a side panel of weathered planks, a counter top with fish on a zinc tray, or (a box of its
  // own) a planked stall under the same counter.
  stall: (s) => {
    const { l, t, h, group } = frameOf(s);
    if (h > 0.06 && Math.min(l, t) < 0.06) {
      group.add(block(2 * l, 2 * h, 2 * t, material(WOOD.weathered)));
      for (let x = -l + 0.15; x < l; x += 0.3) group.add(block(0.02, 2 * h, 2 * t + 0.02, material(WOOD.planks), x));
      return group;
    }
    const top = Math.min(0.1, 2 * h);
    if (2 * h > top) {
      group.add(block(2 * l, 2 * h - top, 2 * t, material(WOOD.weathered), 0, -top / 2));
      for (let x = -l + 0.15; x < l; x += 0.3) group.add(block(0.02, 2 * h - top, 2 * t + 0.02, material(WOOD.planks), x, -top / 2));
    }
    group.add(block(2 * l, top, 2 * t, material(WOOD.planks), 0, h - top / 2), block(2 * l - 0.1, 0.02, 2 * t - 0.1, material(METAL.zinc), 0, h + 0.01));
    for (let i = 0; i < Math.max(2, Math.round(2 * l / 0.35)); i++) group.add(fish(0.3, [-l + 0.2 + 0.33 * i, h + 0.02, (i % 2 ? 0.25 : -0.25) * t], i % 2 ? Math.PI : 0));
    return group;
  },
  // The office desk: an oak table with a drawer pedestal, a ledger and a telephone on it.
  desk: (s) => {
    const g = table(s, WOOD.oak);
    const { l, t, h } = frameOf(s);
    g.add(block(0.45, 2 * h - 0.14, 2 * t - 0.12, material(WOOD.walnut), l - 0.3, -0.07), block(0.35, 0.03, 0.25, material(CLOTH.sage), -0.3 * l, h + 0.015));
    return g.add(block(0.2, 0.08, 0.15, material(INK.black), 0.3 * l, h + 0.04), rod(0.02, INK.black, [0.3 * l - 0.08, h + 0.1, 0], [0.3 * l + 0.08, h + 0.1, 0]));
  },
  // The kennel: a cage of fish crates stacked open side out, slats with gaps a cat sees through.
  kennel: (s) => {
    const { l, t, h, group } = frameOf(s);
    const n = Math.max(1, Math.round((2 * h) / 0.3));
    for (let j = 0; j < n; j++) for (const y of [0.05, 0.2]) group.add(block(2 * l, 0.06, 2 * t, material(PAINT.orange), 0, -h + (2 * h * j) / n + y));
    const m = Math.max(1, Math.round((2 * l) / 0.5));
    for (let i = 0; i <= m; i++) group.add(block(0.05, 2 * h, 2 * t + 0.02, material(CLAY.terracotta), -l + (2 * l * i) / m));
    return group;
  },
  // The guard's booth: sage walls, a band of windows round it, a door on -z (in the market, toward the
  // kennel) and a zinc roof reaching out over it.
  'guard booth': (s) => {
    const { l, t, h, group } = frameOf(s);
    const [sill, lintel] = [-h + 1, h - 0.35];
    group.add(block(2 * l, sill + h, 2 * t, material(CLOTH.sage), 0, (sill - h) / 2), block(2 * l, h - 0.1 - lintel, 2 * t, material(CLOTH.sage), 0, (lintel + h - 0.1) / 2));
    group.add(block(2 * l - 0.1, lintel - sill, 2 * t - 0.1, material(GLASS.pane), 0, (sill + lintel) / 2));
    for (const x of [-l + 0.04, l - 0.04]) for (const z of [-t + 0.04, t - 0.04]) group.add(block(0.08, lintel - sill, 0.08, material(CLOTH.sage), x, (sill + lintel) / 2, z));
    group.add(block(2 * l, 0.1, 2 * t, material(METAL.zinc), 0, h - 0.05), block(0.7, 1.9, 0.04, material(WOOD.door), 0.2 * l, -h + 0.95, -t - 0.02));
    return group.add(ball(0.04, GOLD.brass, [0.2 * l + 0.25, -h + 1, -t - 0.05]));
  },
  // A striped tarpaulin hung on a rope by its eyelets, falling in wide folds.
  tarpaulin: (s) => {
    const { l, t, h, group } = frameOf(s);
    const n = Math.max(2, Math.round((2 * l) / 0.4));
    const w = (2 * l) / n;
    for (let i = 0; i < n; i++) group.add(block(w, 2 * h - 0.06, t, material(TARP[i % 2]!), -l + w * (i + 0.5), -0.03, (i % 2 ? 0.5 : -0.5) * t));
    group.add(rod(0.012, WOOD.card, [-l, h - 0.02, 0], [l, h - 0.02, 0]));
    for (let i = 0; i <= n; i++) group.add(ball(0.02, METAL.silver, [-l + w * i, h - 0.05, 0]));
    return group;
  },
  // A cool box: white, its blue lid on top, a handle at each end.
  'ice chest': (s) => {
    const { l, t, h, group } = frameOf(s);
    group.add(block(2 * l, 2 * h - 0.14, 2 * t, material(PAINT.enamel), 0, -0.07), block(2 * l + 0.02, 0.14, 2 * t + 0.02, material(PAINT.cobalt), 0, h - 0.07));
    for (const x of [-l - 0.02, l + 0.02]) group.add(block(0.04, 0.05, 0.3, material(PAINT.cobalt), x, h - 0.25));
    return group;
  },
  // A stack of pallets, each a deck of boards on three runners, turned a little one on another.
  pallet: (s) => {
    const { l, t, h, group } = frameOf(s);
    const n = Math.max(1, Math.round((2 * h) / 0.14));
    const k = (2 * h) / n;
    for (let j = 0; j < n; j++) {
      const y = -h + k * j;
      const m = material(j % 2 ? WOOD.pine : WOOD.honey);
      for (const z of [-t + 0.05, 0, t - 0.05]) group.add(block(2 * l - 0.02, 0.6 * k, 0.1, m, 0, y + 0.3 * k, z));
      for (let x = -l + 0.08; x < l; x += 0.2) group.add(block(0.14, 0.4 * k, 2 * t, m, x, y + 0.8 * k));
    }
    return group;
  },
  // A zinc bucket of water, its handle up.
  bucket: (s) => {
    const { l, h, group } = frameOf(s);
    group.add(drum(0.95 * l, 0.75 * l, 2 * h - 0.1, METAL.steel, [0, -0.05, 0], 12), drum(0.9 * l, 0.9 * l, 0.01, GLASS.pane, [0, h - 0.15, 0], 12));
    const handle = new THREE.Mesh(new THREE.TorusGeometry(0.9 * l, 0.01, 3, 12, Math.PI), material(METAL.iron));
    handle.position.y = h - 0.1;
    return group.add(handle);
  },
  // Market scales: a steel body with a white dial and its needle on the front (+z), a pan on top.
  scales: (s) => {
    const { l, t, h, group } = frameOf(s);
    group.add(block(2 * l, 1.4 * h, 2 * t, material(METAL.silver), 0, -0.3 * h), drum(0.9 * l, 0.8 * l, 0.03, METAL.steel, [0, h - 0.015, 0], 12));
    group.add(drum(0.1, 0.1, 0.01, PAINT.porcelain, [0, -0.25 * h, t + 0.005], 12).rotateX(Math.PI / 2), block(0.01, 0.08, 0.005, material(PAINT.apple), 0.02, -0.2 * h, t + 0.012));
    return group.add(rod(0.03, METAL.steel, [0, 0.4 * h, 0], [0, h - 0.03, 0]));
  },
  // A blue bin of fish, their tails up out of it.
  'fish bin': (s) => {
    const { l, h, group } = frameOf(s);
    group.add(drum(l, 0.85 * l, 2 * h - 0.1, PAINT.cobalt, [0, -0.05, 0], 12));
    for (let i = 0; i < 4; i++) group.add(ball(1, KIND.fish.fin, [0.45 * l * Math.sin(2 * i), h - 0.04, 0.45 * l * Math.cos(2 * i)], [0.07, 0.1, 0.03]));
    return group;
  },
  // A flat hand trolley along x: a steel deck on four wheels, its handle at -x, a crate on it.
  trolley: (s) => {
    const { l, t, h, group } = frameOf(s);
    const deck = -h + 0.2;
    group.add(block(2 * l, 0.04, 2 * t, material(METAL.steel), 0, deck));
    for (const x of [-l + 0.15, l - 0.15]) for (const z of [-t + 0.08, t - 0.08]) group.add(rod(0.08, INK.sole, [x, -h + 0.08, z - 0.03], [x, -h + 0.08, z + 0.03], 8));
    for (const z of [-t + 0.03, t - 0.03]) group.add(rod(0.02, METAL.iron, [-l + 0.03, deck, z], [-l + 0.03, h - 0.02, z]));
    group.add(rod(0.02, METAL.iron, [-l + 0.03, h - 0.02, -t + 0.03], [-l + 0.03, h - 0.02, t - 0.03]));
    return group.add(crate({ p: { x: 0.2 * l, y: (deck + h) / 2 - 0.05, z: 0 }, half: { x: 0.35, y: (h - deck) / 2 - 0.08, z: Math.min(0.35, t - 0.05) } }, LABEL.crate!));
  },
  // An oak barrel, bellied, three iron hoops round it.
  barrel: (s) => {
    const { l, h, group } = frameOf(s);
    const profile = [[0.001, -h], [0.8 * l, -h], [l, 0], [0.8 * l, h], [0.001, h]].map(([r, y]) => new THREE.Vector2(r, y));
    group.add(new THREE.Mesh(new THREE.LatheGeometry(profile, 10), material(WOOD.oak)));
    for (const y of [-0.7, 0, 0.7]) {
      const hoop = new THREE.Mesh(new THREE.TorusGeometry((1 - 0.2 * Math.abs(y)) * l + 0.01, 0.015, 3, 12), material(METAL.iron));
      hoop.rotation.x = Math.PI / 2;
      hoop.position.y = y * h;
      group.add(hoop);
    }
    return group;
  },
  // A fish's head, its cut end red, its eye on.
  'fish head': (s) => {
    const { l, group } = frameOf(s);
    return group.add(ball(1, KIND.fish.body, [0.2 * l, 0, 0], [0.8 * l, 0.7 * l, 0.6 * l]), drum(0.6 * l, 0.6 * l, 0.02, CLAY.shade, [-0.5 * l, 0, 0]).rotateZ(Math.PI / 2), ball(0.2 * l, INK.black, [0.4 * l, 0.25 * l, 0.5 * l]));
  },
  // A broom along x: a honey stick, straw bristles at +x.
  broom: (s) => {
    const { l, t, group } = frameOf(s);
    return group.add(rod(0.012, WOOD.honey, [-l, 0, 0], [0.7 * l, 0, 0]), block(0.3 * l, 2 * t, 0.2, material(WOOD.card), 0.85 * l, 0, 0), block(0.04, 2 * t, 0.22, material(CLOTH.poppy), 0.7 * l, 0, 0));
  },
  // A tin can with its red label.
  'tin can': (s) => {
    const { l, h, group } = frameOf(s);
    return group.add(drum(l, l, 2 * h, METAL.silver, [0, 0, 0], 10), drum(1.02 * l, 1.02 * l, 1.2 * h, PAINT.cherry, [0, 0, 0], 10));
  },
  // A green glass bottle, a brass cap on its neck.
  bottle: (s) => {
    const { l, h, group } = frameOf(s);
    return group.add(drum(l, l, 1.2 * h, GREENERY.leaf, [0, -0.4 * h, 0], 8), drum(0.4 * l, l, 0.4 * h, GREENERY.leaf, [0, 0.4 * h, 0], 8), drum(0.4 * l, 0.4 * l, 0.4 * h, GOLD.brass, [0, 0.8 * h, 0], 8));
  },
  // A lemon, pointed at both ends.
  lemon: (s) => {
    const { l, group } = frameOf(s);
    return group.add(ball(l, GOLD.star, [0, 0, 0], [1, 0.8, 0.8]), ball(0.25 * l, GOLD.star, [0.9 * l, 0, 0]), ball(0.25 * l, GOLD.star, [-0.9 * l, 0, 0]));
  },
};

// The house's builders come baked; the market's own are baked here, one mesh per material (props.ts).
export default {
  ...Object.fromEntries(Object.entries(REUSED).map(([label, from]) => [label, house[from]!])),
  ...Object.fromEntries(Object.entries(theme).map(([label, build]) => [label, (b: Box) => bake(build(b))])),
} satisfies Theme;
