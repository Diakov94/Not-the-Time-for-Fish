import * as THREE from 'three';
import { CLAY, CLOTH, GREENERY, INK, PAINT, WALLS, WOOD } from './palette.ts';

// GAME.md, Art Direction, step 3: detail by code. A pattern is a tileable texture painted pixel by pixel
// from palette slots when a part first asks for it, then cached, so no raster lives in git and the
// headless tests paint it too (no DOM canvas needed). Each pattern covers `metres` of a surface per tile;
// the rug is one whole rug. Stitches, tiles and planks are whole pixel cells, crisp up close
// (nearest) and mipmapped far off.
type Painter = (x: number, y: number) => number;
const PATTERNS = {
  // A band of cross-stitched diamonds, red with black hearts, on linen across plum upholstery.
  embroidery: { size: 64, metres: 0.5, paint: embroidery },
  // A kilim for a wall: a dark fringe, a chequered border and a stepped medallion on a red field; not
  // tiled (`metres` 0): one whole rug per face.
  rug: { size: 128, metres: 0, paint: rug },
  // Kitchen tiles, white with a blue diamond, two by two in a tile's texture.
  tiles: { size: 64, metres: 0.3, paint: tiles },
  // Four oak planks with a wavy grain.
  wood: { size: 64, metres: 0.8, paint: wood },
} satisfies Record<string, { size: number; metres: number; paint: Painter }>;
export type Pattern = keyof typeof PATTERNS;

// A stitch is a 4 x 4 px cell; the band is six stitches tall, black-edged, a diamond every four across.
function embroidery(x: number, y: number): number {
  if (y < 20 || y >= 44) return CLOTH.plum;
  const [cx, cy] = [x >> 2, (y - 20) >> 2];
  if (cy === 0 || cy === 5) return INK.black;
  const d = Math.abs((cx % 4) - 1.5) + Math.abs(cy - 2.5);
  return d === 1 ? INK.black : d === 2 ? CLOTH.poppy : CLOTH.linen;
}

function rug(x: number, y: number): number {
  const [cx, cy] = [x >> 2, y >> 2];
  const edge = Math.min(cx, cy, 31 - cx, 31 - cy);
  if (edge === 0) return WOOD.mahogany;
  if (edge === 1 || edge === 5) return PAINT.mustard;
  if (edge < 5) return edge === 3 && (cx + cy) % 4 < 2 ? CLOTH.linen : CLAY.shade;
  const d = Math.abs(cx - 15.5) + Math.abs(cy - 15.5);
  if (d < 3) return INK.black;
  if (d < 6) return CLOTH.linen;
  if (d < 9) return GREENERY.leaf;
  if (d < 11) return PAINT.mustard;
  return d % 6 === 0 ? CLOTH.linen : CLOTH.poppy;
}

function tiles(x: number, y: number): number {
  const [u, v] = [x & 31, y & 31];
  if (u < 2 || v < 2) return WALLS.floor;
  const d = Math.abs(u - 16.5) + Math.abs(v - 16.5);
  return d < 3 ? PAINT.porcelain : d < 8 ? PAINT.cobalt : PAINT.porcelain;
}

function wood(x: number, y: number): number {
  const plank = y >> 4;
  if ((y & 15) === 0) return WOOD.stained;
  const grain = (y & 15) + 1.5 * Math.sin(((x + 17 * plank) / 64) * 2 * Math.PI * (1 + (plank % 2)));
  return Math.floor(grain) % 5 === 0 ? WOOD.walnut : plank % 2 ? WOOD.maple : WOOD.oak;
}

const cache = new Map<Pattern, THREE.Material>();

// The flat-shaded material of a pattern, painted on first use.
export function pattern(name: Pattern): THREE.Material {
  let m = cache.get(name);
  if (m) return m;
  const { size, paint } = PATTERNS[name];
  const data = new Uint8Array(size * size * 4);
  for (let y = 0; y < size; y++)
    for (let x = 0; x < size; x++) {
      const c = paint(x, y);
      data.set([c >> 16, (c >> 8) & 255, c & 255, 255], 4 * (y * size + x));
    }
  const map = new THREE.DataTexture(data, size, size);
  map.colorSpace = THREE.SRGBColorSpace;
  map.wrapS = map.wrapT = THREE.RepeatWrapping;
  map.minFilter = THREE.LinearMipmapLinearFilter;
  map.generateMipmaps = true;
  map.needsUpdate = true;
  cache.set(name, (m = new THREE.MeshLambertMaterial({ map, flatShading: true })));
  return m;
}

// A box of w x h x d at (x, y, z) covered in a pattern at its real size: every face repeats the tile
// once per the pattern's `metres`, so a long sofa and a short one show stitches of one size. A pattern
// of 0 metres is stretched once over every face.
export function covered(w: number, h: number, d: number, name: Pattern, x = 0, y = 0, z = 0): THREE.Mesh {
  const geometry = new THREE.BoxGeometry(w, h, d);
  const uv = geometry.getAttribute('uv');
  const { metres } = PATTERNS[name];
  // The faces in BoxGeometry's order (+x, -x, +y, -y, +z, -z), four vertices each, and their sides in u, v.
  const sides = [[d, h], [d, h], [w, d], [w, d], [w, h], [w, h]] as const;
  if (metres)
    for (let i = 0; i < uv.count; i++) {
      const [su, sv] = sides[i >> 2]!;
      uv.setXY(i, (uv.getX(i) * su) / metres, (uv.getY(i) * sv) / metres);
    }
  const mesh = new THREE.Mesh(geometry, pattern(name));
  mesh.position.set(x, y, z);
  return mesh;
}
