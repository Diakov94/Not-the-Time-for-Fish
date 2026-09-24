import * as THREE from 'three';
import type { Volume } from '../content/level.ts';

// ADR 0011: every colour in the game is a named slot here, and a colour literal outside `src/art` is
// rejected at review. GAME.md, Art Direction: warm, homey colours and flat shading; the home range is
// grouped by what a thing is made of, so a new prop picks a material, not a hex.

export const WALLS = {
  plaster: 0xeadcc0, // the house's walls inside
  render: 0xc9b79a, // the neighbours' walls
  floor: 0xb9a78a,
  trim: 0xf6f0e2, // a door's casing
  putty: 0xb8a48c, // anything nobody coloured
} as const;
export const CLAY = {
  tile: 0xb5523b, // the house's roof
  shade: 0x7a2e22, // a small roof, in its own shadow
  terracotta: 0xc46b3c, // a flower pot, the doghouse
} as const;
export const WOOD = {
  pine: 0xc98f5a,
  card: 0xc8a063, // cardboard
  birch: 0xb58a5a,
  honey: 0xb07a45,
  maple: 0xa8744a,
  oak: 0xa0673c,
  weathered: 0x9c7a54,
  planks: 0x8f6b4a,
  walnut: 0x8a5a33,
  mahogany: 0x7b4a2a,
  door: 0x6b4226,
  stained: 0x4a3b2f,
} as const;
export const CLOTH = {
  plum: 0x7d4b8f,
  sage: 0x5f8f6b,
  denim: 0x6d8fb3,
  poppy: 0xc9544b,
  linen: 0xe8e0d0,
} as const;
export const METAL = {
  steel: 0x9aa3a8,
  tin: 0x8d949b,
  zinc: 0x6f7a80,
  iron: 0x5d646b,
  silver: 0xc9ced3,
} as const;
export const GLASS = {
  pane: 0x8fd8ea,
  jar: 0x9fd0d8,
} as const;
export const GREENERY = {
  grass: 0x7ea65a,
  leaf: 0x3f8f3a,
} as const;
export const INK = {
  black: 0x1a1a1a, // eyes, noses, glasses
  soot: 0x111111, // an overlay's rim
  shadow: 0x2a1a14, // an opening's dark inside
  sole: 0x4a3b35,
} as const;
export const GOLD = {
  brass: 0xe0b040, // what a hand works: a knob, the kennel's hatch and latch
  star: 0xffd23a,
  spark: 0xffd640,
} as const;
// Glazed and painted things: crockery, enamel, a car's body, a fruit's skin.
export const PAINT = {
  enamel: 0xf1f4f4,
  porcelain: 0xf4f1ea,
  mustard: 0xe8c35a,
  cobalt: 0x3f6fb5,
  apple: 0xd23b2f,
  cherry: 0xc8453a,
  orange: 0xe8a33c,
} as const;

// The kinds the sim spawns (card 30, card 57), for the props' looks (card 116).
export const KIND = {
  fish: { body: 0x7fb3d5, fin: 0xf08c3a },
  lure: { body: 0xf08aa8, fin: 0xc0507a },
  mine: { stick: 0xd8342a, band: 0xf2c230 },
  trap: { body: 0x2a9d8f, face: 0xf6f3ee },
  bag: { sack: 0x7b4fb0 },
} as const;

// What is drawn over the world rather than in it (cards 32, 33, 57, 58). Overlays are told apart by shape
// and value, not hue (GAME.md, Accessibility): white on a black rim, and a trail fading from near white
// to near black.
export const OVERLAY = {
  white: 0xffffff,
  rim: INK.soot,
  fresh: 0xfff4c0, // a new trail mark
  stale: 0x3a2a10, // a trail mark at the end of the sniff window
  star: GOLD.star,
  smoke: PAINT.porcelain,
  route: 0x23a99a, // the frame of an opening only cats pass: an exit or a cat route
} as const;
// The level's volumes, shown in dev only.
export const VOLUME: Record<Volume['role'], number> = {
  hideout: 0x40c040,
  house: 0xf0d040,
  kennel: 0xe04040,
  doghouse: 0xf08030,
  storage: 0x4080f0,
  exit: 0x40e0e0,
  hidingSpot: 0xa040f0,
  climb: 0xffffff,
};

// GAME.md, Accessibility: the two teams' colours, one pair per colour vision the settings offer (card
// 102). Each pair keeps a luminance contrast of at least 3:1 under its own deficiency, simulated with
// Machado, Oliveira and Fernandes (2009) at severity 1 in linear sRGB, WCAG 2 luminance: normal 3.96
// (and at least 3.17 under all three simulations), deuteranopia 5.04, protanopia 4.18, tritanopia 3.53.
// Team A is the light one in every pair.
export const TEAM = {
  normal: { A: 0xf0a830, B: 0x1f4e9a },
  deuteranopia: { A: 0xf5c342, B: 0x2a4fa8 },
  protanopia: { A: 0xf7c948, B: 0x2c4ca5 },
  tritanopia: { A: 0xff8fa3, B: 0x17555a },
} as const;
export type Vision = keyof typeof TEAM;

// A content label's colour where a theme draws it as a plain box, and every prop's (card 30).
export const DEFAULT = WALLS.putty;
export const LABEL: Record<string, number> = {
  ground: GREENERY.grass,
  floor: WALLS.floor,
  'outer wall': WALLS.render,
  fence: WOOD.walnut,
  wall: WALLS.plaster,
  roof: CLAY.tile,
  table: WOOD.oak,
  fridge: PAINT.enamel,
  aquarium: WOOD.stained,
  counter: WOOD.pine,
  wardrobe: WOOD.mahogany,
  bed: CLOTH.denim,
  kennel: METAL.iron,
  'kennel gate': METAL.tin,
  doghouse: CLAY.terracotta,
  shed: WOOD.weathered,
  woodpile: WOOD.walnut,
  car: PAINT.cherry,
  'cat flap': WALLS.plaster,
  vent: WALLS.plaster,
  sofa: CLOTH.plum,
  curtain: CLOTH.poppy,
  'cardboard box': WOOD.card,
  barricade: WOOD.planks,
  armchair: CLOTH.sage,
  chair: WOOD.maple,
  'coffee table': WOOD.walnut,
  stool: WOOD.birch,
  bin: METAL.zinc,
  'bedside table': WOOD.walnut,
  watermelon: GREENERY.leaf,
  wheelbarrow: METAL.tin,
  'garden chair': CLOTH.linen,
  crate: WOOD.honey,
  plate: PAINT.porcelain,
  cup: PAINT.mustard,
  jar: GLASS.jar,
  apple: PAINT.apple,
  vase: PAINT.cobalt,
  shoe: INK.sole,
  'flower pot': CLAY.terracotta,
  football: PAINT.porcelain,
};

// One flat-shaded material per colour, shared by every part drawn in it.
const materials = new Map<number, THREE.Material>();
export function material(colour: number): THREE.Material {
  let m = materials.get(colour);
  if (!m) materials.set(colour, (m = new THREE.MeshLambertMaterial({ color: colour, flatShading: true })));
  return m;
}
