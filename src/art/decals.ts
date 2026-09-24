import * as THREE from 'three';

// GAME.md, Art Direction, step 3: an SVG decal is a marking drawn as vector code and rasterized by the
// browser into a texture, for a character or a prop (ADR 0011). Its colours are palette slots written
// with `hex`, never literals. The texture is returned at once and filled when the browser has decoded
// the SVG; each SVG string is decoded once.
export function hex(colour: number): string {
  return `#${colour.toString(16).padStart(6, '0')}`;
}

const cache = new Map<string, THREE.Material>();

// A flat-shaded material showing `svg`, transparent where the SVG draws nothing.
export function decal(svg: string): THREE.Material {
  let m = cache.get(svg);
  if (m) return m;
  const map = new THREE.TextureLoader().load(`data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`);
  map.colorSpace = THREE.SRGBColorSpace;
  cache.set(svg, (m = new THREE.MeshLambertMaterial({ map, transparent: true, alphaTest: 0.5, flatShading: true })));
  return m;
}
