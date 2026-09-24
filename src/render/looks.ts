import type { Ball, Capsule, Cuboid, Shape } from '@dimforge/rapier3d-compat';
import * as THREE from 'three';
import { KINDS as PROPS } from '../art/props.ts';
import { ofSide } from '../content/characters.ts';
import { isCharacter, type Entity, type Kind } from '../sim/entities.ts';
import { lookOf as rosterLook, playerOf } from '../sim/round.ts';
import type { Sim } from '../sim/world.ts';
import { block, COLOUR, DEFAULT, material, shaped } from './level.ts';

// How every kind is drawn (card 30), sized from the entity's collider, the one owner of every kind's
// size: the kinds' and the props' looks are art's (ADR 0011); a kind with no look is its collider's shape.

// An entity is drawn as its body is shaped.
function geometry(shape: Shape): THREE.BufferGeometry {
  if ('halfExtents' in shape) {
    const h = (shape as Cuboid).halfExtents;
    return new THREE.BoxGeometry(2 * h.x, 2 * h.y, 2 * h.z);
  }
  if ('halfHeight' in shape) return new THREE.CapsuleGeometry((shape as Capsule).radius, 2 * (shape as Capsule).halfHeight, 4, 12);
  return new THREE.IcosahedronGeometry((shape as Ball).radius, 1);
}

// Parts in the entity's frame: its body's centre, +z its facing, +y up.
function ball(r: number, colour: number, x: number, y: number, z: number, s: [number, number, number] = [1, 1, 1]): THREE.Mesh {
  const m = new THREE.Mesh(new THREE.IcosahedronGeometry(r, 1), material(colour));
  m.position.set(x, y, z);
  m.scale.set(...s);
  return m;
}
const up = new THREE.Vector3(0, 1, 0);
function rod(r: number, colour: number, from: [number, number, number], to: [number, number, number]): THREE.Mesh {
  const a = new THREE.Vector3(...from);
  const d = new THREE.Vector3(...to).sub(a);
  const m = new THREE.Mesh(new THREE.CylinderGeometry(r, r, d.length(), 6), material(colour));
  m.position.copy(a).addScaledVector(d, 0.5);
  m.quaternion.setFromUnitVectors(up, d.normalize());
  return m;
}
function cone(r: number, h: number, colour: number, x: number, y: number, z: number, tilt: [number, number, number] = [0, 0, 0]): THREE.Mesh {
  const m = new THREE.Mesh(new THREE.ConeGeometry(r, h, 5), material(colour));
  m.position.set(x, y, z);
  m.rotation.set(...tilt);
  return m;
}
const INK = 0x1a1a1a; // eyes, noses, glasses
const SILVER = 0xc9ced3;
const GOLD = 0xe0b040;

// A character's look is its player's look for its side in the roster (ADR 0007, card 25). A client not
// in the roster (the app says no `hello` yet) gets a hash of its client id, so two tabs mostly show two
// characters.
export function lookOf(sim: Sim, e: Entity): number {
  const p = e.home === null ? undefined : playerOf(sim.round, e.home);
  if (p && (e.kind === 'cat' || e.kind === 'dog')) return rosterLook(sim.round, p, e.kind);
  let h = 2166136261;
  for (const c of e.home ?? '') h = Math.imul(h ^ c.charCodeAt(0), 16777619) >>> 0;
  return h % ofSide(e.kind as 'cat' | 'dog').length;
}

// A cat is built on a 0.5 x 0.9 m frame and a dog on a 0.8 x 1.4 m one, then scaled to the capsule; the
// frame's feet are at its bottom. A cat stands small, with pointed ears and a tall curled tail; a dog
// stands a head taller, broad, with a muzzle forward and a short tail.
function cat(fur: number, belly: number): THREE.Group {
  const g = new THREE.Group();
  for (const x of [-0.09, 0.09]) g.add(rod(0.045, fur, [x, -0.43, 0], [x, -0.25, 0]));
  g.add(ball(0.19, fur, 0, -0.09, 0, [1, 1.15, 0.95]), ball(0.13, belly, 0, -0.11, 0.08));
  for (const x of [-1, 1]) g.add(rod(0.035, fur, [0.17 * x, -0.02, 0.02], [0.2 * x, -0.18, 0.07]));
  g.add(ball(0.16, fur, 0, 0.21, 0.02));
  for (const x of [-1, 1]) g.add(ball(0.025, INK, 0.06 * x, 0.24, 0.15));
  g.add(ball(0.022, 0xe88a9a, 0, 0.2, 0.17));
  g.add(rod(0.035, fur, [0, -0.25, -0.15], [0, -0.05, -0.28]), rod(0.035, fur, [0, -0.05, -0.28], [0, 0.2, -0.3]));
  g.add(rod(0.035, fur, [0, 0.2, -0.3], [0, 0.32, -0.22]));
  return g;
}
function catEars(g: THREE.Group, fur: number, spread = 0.085, y = 0.35, tilt = 0.25): void {
  for (const x of [-1, 1]) g.add(cone(0.055, 0.12, fur, spread * x, y, 0, [0, 0, -tilt * x]));
}
function dog(fur: number, muzzle: number): THREE.Group {
  const g = new THREE.Group();
  for (const x of [-0.14, 0.14]) g.add(rod(0.07, muzzle, [x, -0.68, 0], [x, -0.38, 0]));
  g.add(ball(0.3, fur, 0, -0.18, 0, [1, 1.1, 1]));
  for (const x of [-1, 1]) g.add(rod(0.055, fur, [0.27 * x, 0, 0.04], [0.3 * x, -0.25, 0.1]));
  g.add(ball(0.22, fur, 0, 0.3, 0.04), block(0.2, 0.14, 0.22, material(muzzle), 0, 0.25, 0.26), ball(0.045, INK, 0, 0.29, 0.38));
  for (const x of [-1, 1]) g.add(ball(0.035, INK, 0.09 * x, 0.37, 0.2));
  g.add(rod(0.05, fur, [0, -0.3, -0.26], [0, -0.1, -0.42]));
  return g;
}

// The MVP's six placeholder characters, by the roster's id, each with its one signature detail.
const LOOKS: Record<string, () => THREE.Group> = {
  // Проффесор: a grey tabby under a black mortarboard with a gold tassel.
  proffesor: () => {
    const g = cat(0x8c95a3, 0xe8e2d6);
    catEars(g, 0x8c95a3, 0.11, 0.33, 0.6);
    const board = block(0.34, 0.025, 0.34, material(0x1c1c24), 0, 0.4, 0.02);
    board.rotation.y = Math.PI / 4;
    g.add(rod(0.1, 0x1c1c24, [0, 0.33, 0.02], [0, 0.4, 0.02]), board);
    g.add(rod(0.008, GOLD, [0, 0.415, 0.02], [0.2, 0.4, 0.02]), rod(0.008, GOLD, [0.2, 0.4, 0.02], [0.21, 0.3, 0.02]), ball(0.025, GOLD, 0.21, 0.29, 0.02));
    return g;
  },
  // Золотий Батон: a golden cat shaped like a loaf, crust-scored across its back, its head sunk into it.
  'zolotyi-baton': () => {
    const g = new THREE.Group();
    const fur = 0xe3a93b;
    g.add(ball(0.22, fur, 0, -0.2, 0, [1.25, 1, 1.3]), ball(0.15, fur, 0, 0.06, 0.12));
    for (const z of [-0.22, -0.13, -0.04]) {
      const score = block(0.2, 0.04, 0.05, material(0xa4632b), 0, -0.2 + 0.22 * Math.sqrt(1 - (z / 0.286) ** 2) - 0.01, z);
      score.rotation.y = 0.5;
      g.add(score);
    }
    catEars(g, fur, 0.08, 0.19, 0.2);
    for (const x of [-1, 1]) g.add(ball(0.022, INK, 0.055 * x, 0.09, 0.26));
    g.add(ball(0.02, 0xe88a9a, 0, 0.05, 0.27), rod(0.04, fur, [0, -0.3, -0.26], [0, -0.2, -0.36]));
    return g;
  },
  // Страус з Межигір'я: a black-plumed cat on long thin legs, a long cream neck and an ostrich plume.
  straus: () => {
    const g = new THREE.Group();
    const cream = 0xe8dcc8;
    for (const x of [-0.07, 0.07]) g.add(rod(0.022, 0xd9a6a0, [x, -0.45, 0], [x, -0.15, 0]));
    g.add(ball(0.17, 0x2b2b2e, 0, -0.06, -0.02, [1.1, 0.85, 1.25]));
    for (const x of [-1, 1]) g.add(ball(0.07, 0xf6f3ee, 0.16 * x, -0.06, -0.08, [0.5, 0.7, 1.4]));
    g.add(rod(0.04, cream, [0, 0.02, 0.08], [0, 0.26, 0.12]), ball(0.11, cream, 0, 0.3, 0.12));
    catEars(g, cream, 0.06, 0.4, 0.3);
    for (const x of [-1, 1]) g.add(ball(0.02, INK, 0.045 * x, 0.32, 0.22));
    for (const t of [-0.35, 0, 0.35]) g.add(cone(0.025, 0.2, 0xf6f3ee, 0.12 * Math.sin(t), 0.5, 0.1, [0, 0, -t]));
    for (const t of [-0.4, 0.4]) g.add(cone(0.04, 0.2, 0xf6f3ee, 0.05 * t, 0.0, -0.22, [-1.1, 0, t]));
    return g;
  },
  // ГАВ-БУ: black and tan, two tall pointed ears and dark sunglasses.
  'hav-bu': () => {
    const g = dog(0x2f2a27, 0xb57a42);
    for (const x of [-1, 1]) g.add(cone(0.08, 0.26, 0x2f2a27, 0.12 * x, 0.56, 0, [0, 0, -0.2 * x]));
    g.add(block(0.32, 0.03, 0.03, material(INK), 0, 0.38, 0.23));
    for (const x of [-1, 1]) g.add(block(0.12, 0.08, 0.03, material(INK), 0.075 * x, 0.36, 0.24));
    return g;
  },
  // НАБУ-ГАВ: a white terrier with brown floppy ears, holding a big magnifying glass up beside its head.
  'nabu-hav': () => {
    const g = dog(0xf0ebe0, 0xf0ebe0);
    for (const x of [-1, 1]) {
      const ear = block(0.08, 0.26, 0.14, material(0x8a5a33), 0.21 * x, 0.24, 0.02);
      ear.rotation.z = 0.3 * x;
      g.add(ear);
    }
    g.add(ball(0.06, 0x8a5a33, -0.09, 0.38, 0.19, [1, 1, 0.4]));
    g.add(rod(0.03, 0x5a3a22, [0.32, -0.08, 0.12], [0.42, 0.18, 0.18]));
    const ring = new THREE.Mesh(new THREE.TorusGeometry(0.14, 0.03, 6, 14), material(GOLD));
    ring.position.set(0.46, 0.33, 0.2);
    const lens = new THREE.Mesh(new THREE.CircleGeometry(0.13, 14), new THREE.MeshLambertMaterial({ color: 0xbfe6f5, transparent: true, opacity: 0.45, side: THREE.DoubleSide }));
    lens.position.copy(ring.position);
    g.add(ring, lens);
    return g;
  },
  // ДБР-р-р: a stocky brindle bulldog, a broad earless head with an underbite, in a spiked collar.
  dbr: () => {
    const g = dog(0x8a7563, 0xd8c8b0);
    g.add(ball(0.25, 0x8a7563, 0, 0.27, 0.05, [1.3, 0.9, 1]));
    for (const x of [-1, 1]) g.add(cone(0.02, 0.06, 0xffffff, 0.06 * x, 0.2, 0.37));
    const collar = new THREE.Mesh(new THREE.TorusGeometry(0.22, 0.045, 6, 16), material(0x9a2a2a));
    collar.position.set(0, 0.09, 0.02);
    collar.rotation.x = Math.PI / 2;
    g.add(collar);
    for (let i = 0; i < 8; i++) {
      const out = new THREE.Vector3(Math.sin((i * Math.PI) / 4), 0, Math.cos((i * Math.PI) / 4));
      const spike = cone(0.035, 0.11, SILVER, 0.29 * out.x, 0.09, 0.02 + 0.29 * out.z);
      spike.quaternion.setFromUnitVectors(up, out);
      g.add(spike);
    }
    return g;
  },
};
const FRAME = { cat: { w: 0.5, h: 0.9 }, dog: { w: 0.8, h: 1.4 } };

// A look is an index into its side's roster. A character with no geometry here yet (the fourth to the
// sixth of a side) draws its side's placeholder of the same index modulo three, until cards 112-115.
function character(kind: 'cat' | 'dog', look: number, c: Capsule): THREE.Object3D {
  const side = ofSide(kind);
  const g = (LOOKS[side[look]!.id] ?? LOOKS[side[look % 3]!.id]!)();
  g.userData.look = look;
  const f = FRAME[kind];
  const w = 2 * c.radius;
  g.scale.set(w / f.w, (w + 2 * c.halfHeight) / f.h, w / f.w);
  return g;
}

// A prop looks like its content label when the map's theme has a shape for it, built in its collider's
// box (a ball's is its radius each way), else it is its collider's shape, coloured by its label or in
// DEFAULT; a prop content does not describe (a test's crate) has no label. A label's shape is its frame,
// turned to the box's longer side, so it hangs in a group the view poses with the body.
function prop(shape: Shape, label: string | undefined): THREE.Object3D {
  const r = 'radius' in shape && !('halfHeight' in shape) ? (shape as Ball).radius : undefined;
  const half = 'halfExtents' in shape ? (shape as Cuboid).halfExtents : r === undefined ? undefined : { x: r, y: r, z: r };
  const look = label && half ? shaped(label, { p: { x: 0, y: 0, z: 0 }, half }) : undefined;
  return look ? new THREE.Group().add(look) : new THREE.Mesh(geometry(shape), material((label && COLOUR[label]) || DEFAULT));
}

// The kinds' looks are art's (ADR 0011), sized from the collider here.
const KINDS: Partial<Record<Kind, (shape: Shape) => THREE.Object3D>> = {
  fish: (s) => PROPS.fish((s as Cuboid).halfExtents),
  mine: (s) => PROPS.mine((s as Cuboid).halfExtents),
  trap: (s) => PROPS.trap((s as Cuboid).halfExtents),
  bag: (s) => PROPS.bag((s as Ball).radius),
  // Card 57: the lure is a fish-shaped decoy at its collider's size (half a fish's length).
  lure: (s) => PROPS.lure((s as Cuboid).halfExtents),
};

export function buildLook(sim: Sim, e: Entity): THREE.Object3D {
  const shape = e.body.collider(0).shape;
  if (isCharacter(e.kind)) return character(e.kind as 'cat' | 'dog', lookOf(sim, e), shape as Capsule);
  if (e.kind === 'prop') return prop(shape, e.prop === undefined ? undefined : sim.level.props[e.prop]?.label);
  return KINDS[e.kind]?.(shape) ?? new THREE.Mesh(geometry(shape), material(DEFAULT));
}

// Debris is a content prop the sim keeps as a local body, never an entity (card 26).
export function debrisLook(sim: Sim, d: Sim['debris'][number]): THREE.Object3D {
  return prop(d.body.collider(0).shape, sim.level.props[d.prop]?.label);
}
