import type { Ball, Capsule, Cuboid, Shape } from '@dimforge/rapier3d-compat';
import * as THREE from 'three';
import type { Worn } from '../art/cosmetics.ts';
import { KINDS as PROPS } from '../art/props.ts';
import { lookFor, rigFor, type Side } from '../art/rig.ts';
import { ofSide } from '../content/characters.ts';
import { isCharacter, type Entity, type Kind } from '../sim/entities.ts';
import { lookOf as rosterLook, playerOf } from '../sim/round.ts';
import type { Sim } from '../sim/world.ts';
import { COLOUR, DEFAULT, material, shaped } from './level.ts';

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
  if (isCharacter(e.kind)) return character(e.kind as Side, lookOf(sim, e), shape as Capsule);
  if (e.kind === 'prop') return prop(shape, e.prop === undefined ? undefined : sim.level.props[e.prop]?.label);
  return KINDS[e.kind]?.(shape) ?? new THREE.Mesh(geometry(shape), material(DEFAULT));
}

// Debris is a content prop the sim keeps as a local body, never an entity (card 26).
export function debrisLook(sim: Sim, d: Sim['debris'][number]): THREE.Object3D {
  return prop(d.body.collider(0).shape, sim.level.props[d.prop]?.label);
}

// Takes looks out of the scene and frees what they uploaded (the card on gone looks): every geometry of
// theirs that nothing left in the scene draws. A geometry art shares (the band's ring) stays while another
// look shows it. Every material is art's, shared from its caches (the palette's `material`, the patterns,
// the decals, a module's constant), so a look owns none and none is freed.
export function freeLooks(scene: THREE.Scene, looks: THREE.Object3D[]): void {
  if (looks.length === 0) return;
  const owned = new Set<THREE.BufferGeometry>();
  for (const o of looks) {
    scene.remove(o);
    o.traverse((m) => (m as THREE.Mesh).geometry && owned.add((m as THREE.Mesh).geometry));
  }
  scene.traverse((m) => (m as THREE.Mesh).geometry && owned.delete((m as THREE.Mesh).geometry));
  for (const g of owned) g.dispose();
}
