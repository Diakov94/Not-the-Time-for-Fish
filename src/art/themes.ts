/// <reference types="vite/client" />
import * as THREE from 'three';
import type { Box } from '../content/level.ts';

// ADR 0011: a label's shape in a map is the map's theme, one file under `themes/` named as the map's file
// under `src/content/maps/`, found by this glob, so no index lists them. A theme is a record label → shape
// builder; render draws a label with no shape as its palette box, and a map with no theme file gets the
// empty theme. A builder builds inside the box it is given, with the kit below.
export type Theme = Record<string, (b: Box) => THREE.Object3D>;

const themes = import.meta.glob<Theme>('./themes/*.ts', { eager: true, import: 'default' });
export function themeOf(map: string): Theme {
  return themes[`./themes/${map}.ts`] ?? {};
}

// A box of size w x h x d at (x, y, z) in its part's frame.
export function block(w: number, h: number, d: number, m: THREE.Material, x = 0, y = 0, z = 0): THREE.Mesh {
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), m);
  mesh.position.set(x, y, z);
  return mesh;
}

// A part's frame: its box's centre, turned so that local x runs along the box's longer horizontal side.
// `l` is that side's half length, `t` the half thickness across it, `h` the half height.
export type Frame = { l: number; t: number; h: number; group: THREE.Group };
export function frameOf(b: Box): Frame {
  const group = new THREE.Group();
  group.position.set(b.p.x, b.p.y, b.p.z);
  const alongX = b.half.x >= b.half.z;
  if (!alongX) group.rotation.y = Math.PI / 2;
  return { l: alongX ? b.half.x : b.half.z, t: alongX ? b.half.z : b.half.x, h: b.half.y, group };
}
