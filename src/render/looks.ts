import type { Ball, Capsule, Cuboid, Shape } from '@dimforge/rapier3d-compat';
import * as THREE from 'three';
import type { Worn } from '../art/cosmetics.ts';
import { lookFor, rigFor, type Side } from '../art/rig.ts';
import { ofSide } from '../content/characters.ts';
import { isCharacter, type Entity, type Kind } from '../sim/entities.ts';
import { lookOf as rosterLook, playerOf } from '../sim/round.ts';
import type { Sim } from '../sim/world.ts';
import { block, COLOUR, DEFAULT, material, shaped } from './level.ts';

// How every kind is drawn (card 30): placeholder low-poly geometry, sized from the entity's collider,
// the one owner of every kind's size. A kind render has no look for is its collider's shape.

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
const INK = 0x1a1a1a; // eyes, a fuse, a clock's hand
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

// What a character's player wears on its side, the round table's (ADR 0013); art draws it.
export function wornOf(sim: Sim, e: Entity): Worn | undefined {
  return e.home === null ? undefined : playerOf(sim.round, e.home)?.worn[e.kind as Side];
}

// A character is its roster entry's look in art (ADR 0011), posed by the view every frame. A look index
// whose character has no file yet draws the side's placeholder of the same index modulo three.
function character(kind: Side, look: number, c: Capsule): THREE.Object3D {
  const side = ofSide(kind);
  const entry = side[look] ?? side[0]!;
  const rig = rigFor(entry, lookFor(entry.id) ?? lookFor(side[look % 3]!.id)!, c.radius, c.halfHeight);
  rig.root.userData.look = look;
  return rig.root;
}

// A fish: a long body, a tail fin spread flat behind it, a dorsal fin and eyes.
function fish(half: { x: number; y: number; z: number }, body: number, fin: number): THREE.Object3D {
  const g = new THREE.Group();
  g.add(ball(1, body, 0, 0, 0.05 * half.z, [0.9 * half.x, 0.9 * half.y, 0.72 * half.z]));
  const tail = cone(1, 1, fin, 0, 0, -0.8 * half.z, [Math.PI / 2, 0, 0]);
  tail.scale.set(1.1 * half.x, 0.35 * half.z, 0.25 * half.y);
  const dorsal = cone(0.35 * half.z, 0.25 * half.z, fin, 0, 0.8 * half.y, 0);
  dorsal.scale.x = 0.3;
  g.add(tail, dorsal);
  for (const x of [-1, 1]) g.add(ball(0.18 * half.x, INK, 0.7 * half.x * x, 0.2 * half.y, 0.55 * half.z));
  return g;
}

// A cartoon firecracker bundle: three red sticks bound with a yellow band, sunk to half their thickness
// into the floor under the body (card 57: concealed, never hidden), and a fuse standing clear of them
// with an unlit spark that shows from any side.
function mine(half: { x: number; y: number; z: number }): THREE.Object3D {
  const g = new THREE.Group();
  const r = half.y * 0.95;
  const y = -half.y; // the floor the body lies on
  for (const z of [-2.1 * r, 0, 2.1 * r]) g.add(rod(r, 0xd8342a, [-0.8 * half.x, y, z], [0.8 * half.x, y, z]));
  g.add(block(0.25 * half.x, 2.1 * r, 6.6 * r, material(0xf2c230), 0, y));
  g.add(rod(0.008, INK, [0.8 * half.x, y, 0], [0.95 * half.x, y + 3 * r, 0]));
  const spark = new THREE.Mesh(new THREE.IcosahedronGeometry(0.04, 0), new THREE.MeshBasicMaterial({ color: 0xffd640 }));
  spark.position.set(0.95 * half.x, y + 3 * r + 0.03, 0);
  return g.add(spark);
}

// A trap is a noise maker: a teal alarm clock with two brass bells, standing on its feet.
function trap(half: { x: number; y: number; z: number }): THREE.Object3D {
  const g = new THREE.Group();
  const r = Math.min(half.x, half.y);
  const body = rod(0.9 * r, 0x2a9d8f, [0, 0, -0.5 * half.z], [0, 0, 0.5 * half.z]);
  const face = new THREE.Mesh(new THREE.CircleGeometry(0.75 * r, 12), material(0xf6f3ee));
  face.position.z = 0.51 * half.z;
  g.add(body, face, block(0.05 * r, 0.6 * r, 0.02, material(INK), 0, 0.25 * r, 0.52 * half.z));
  for (const x of [-1, 1]) g.add(ball(0.4 * r, GOLD, 0.55 * r * x, 0.95 * r, 0, [1, 0.7, 1]), ball(0.15 * r, INK, 0.6 * r * x, -0.95 * r, 0));
  return g;
}

// A mystery bag: a purple sack tied with a gold cord, its neck tufted.
function bag(r: number): THREE.Object3D {
  const g = new THREE.Group();
  g.add(ball(0.92 * r, 0x7b4fb0, 0, -0.12 * r, 0, [1, 0.85, 1]));
  const tie = new THREE.Mesh(new THREE.TorusGeometry(0.28 * r, 0.08 * r, 5, 10), material(GOLD));
  tie.position.y = 0.66 * r;
  tie.rotation.x = Math.PI / 2;
  g.add(tie, cone(0.4 * r, 0.4 * r, 0x7b4fb0, 0, 0.9 * r, 0, [Math.PI, 0, 0]));
  return g;
}

// A prop looks like its content label when render knows it, else it is its collider's shape, coloured by
// its label or in DEFAULT; a prop content does not describe (a test's crate) has no label. A label's shape
// is its frame, turned to the box's longer side, so it hangs in a group the view poses with the body.
function prop(shape: Shape, label: string | undefined): THREE.Object3D {
  const half = 'halfExtents' in shape ? (shape as Cuboid).halfExtents : undefined;
  const look = label && half ? shaped(label, { p: { x: 0, y: 0, z: 0 }, half }) : undefined;
  return look ? new THREE.Group().add(look) : new THREE.Mesh(geometry(shape), material((label && COLOUR[label]) || DEFAULT));
}

const KINDS: Partial<Record<Kind, (shape: Shape) => THREE.Object3D>> = {
  fish: (s) => fish((s as Cuboid).halfExtents, 0x7fb3d5, 0xf08c3a),
  mine: (s) => mine((s as Cuboid).halfExtents),
  trap: (s) => trap((s as Cuboid).halfExtents),
  bag: (s) => bag((s as Ball).radius),
  // Card 57: the lure is a fish-shaped decoy, pink, at its collider's size (half a fish's length).
  lure: (s) => fish((s as Cuboid).halfExtents, 0xf08aa8, 0xc0507a),
};

export function buildLook(sim: Sim, e: Entity): THREE.Object3D {
  const shape = e.body.collider(0).shape;
  if (isCharacter(e.kind)) return character(e.kind as Side, lookOf(sim, e), shape as Capsule);
  if (e.kind === 'prop') return prop(shape, e.prop === undefined ? undefined : sim.level.props[e.prop]?.label);
  return KINDS[e.kind]?.(shape) ?? new THREE.Mesh(geometry(shape), material(DEFAULT));
}

// Debris is a content prop the sim keeps as a local body, never an entity (card 26).
export function debrisLook(sim: Sim, d: Sim['debris'][number]): THREE.Object3D {
  return prop(d.body.collider(0).shape, sim.level.props[d.prop]?.label);
}
