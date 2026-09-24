import * as THREE from 'three';
import { CLOTH, GOLD, GREENERY, INK, material, PAINT, WOOD } from './palette.ts';
import { ball, block, cone, rod, type Anchor, type Rig, type V3 } from './rig.ts';

// ADR 0013's catalogue: which cosmetics exist and how each looks. The ids are what the round table's
// `worn` carries and what meta's unlock rules name; the catalogue encodes no rule. A cosmetic is built in
// its anchor's frame, in units of the anchor's `userData.r`: a hat on the top of the head (y up, the
// head's radius), a collar piece round the neck (the radius a ring round it must clear), a back piece on
// the back (-z out of it, the body's half width). GAME.md, Meta Loop: hats and meme accessories.
export type Cosmetic = { id: string; kind: 'hat' | 'accessory'; anchor: Anchor; build: () => THREE.Object3D };
// What a player wears on a side: catalogue ids, any string (the fold accepts it; an unknown id is bare).
export type Worn = { hat?: string; accessory?: string };

const group = (...parts: THREE.Object3D[]) => new THREE.Group().add(...parts);
// A hat's crown: a tube open at the bottom from a quarter of the head's radius below its top, where the
// head is 0.66 of its radius wide, so a crown at least 0.7 wide covers the head's cap without cutting it.
const crown = (r: number, h: number, colour: number, top = r) => {
  const m = new THREE.Mesh(new THREE.CylinderGeometry(top, r, h, 10, 1, true), material(colour));
  m.position.y = -0.25 + h / 2;
  return group(m, disc(top, 0.02, colour, h - 0.25));
};
// A flat ring from `inner` to `outer`, `h` thick: a brim or a band round a crown.
const annulus = (inner: number, outer: number, h: number, colour: number, y: number) => {
  const profile = [new THREE.Vector2(inner, -h / 2), new THREE.Vector2(outer, -h / 2), new THREE.Vector2(outer, h / 2), new THREE.Vector2(inner, h / 2), new THREE.Vector2(inner, -h / 2)];
  const m = new THREE.Mesh(new THREE.LatheGeometry(profile, 16), material(colour));
  m.position.y = y;
  return m;
};
const disc = (r: number, h: number, colour: number, y: number) => {
  const m = new THREE.Mesh(new THREE.CylinderGeometry(r, r, h, 12), material(colour));
  m.position.y = y;
  return m;
};
const ring = (r: number, tube: number, colour: number, at: V3) => {
  const m = new THREE.Mesh(new THREE.TorusGeometry(r, tube, 6, 16), material(colour));
  m.position.set(...at);
  m.rotation.x = Math.PI / 2;
  return m;
};
const CHEST = 1.35; // a collar piece hangs this far forward of the neck, clear of the chest
const around = (n: number, f: (a: number, i: number) => THREE.Object3D) => Array.from({ length: n }, (_, i) => f((2 * Math.PI * i) / n, i));

export const COSMETICS: Cosmetic[] = [
  // Шапка-вушанка: a fur crown with its flaps tied up along the sides and the front folded up.
  {
    id: 'ushanka',
    kind: 'hat',
    anchor: 'head',
    build: () =>
      group(
        crown(0.8, 0.55, WOOD.mahogany),
        ball(0.78, WOOD.mahogany, [0, 0.3, 0], [1, 0.35, 1]),
        ...[-1, 1].map((x) => block([0.14, 0.5, 0.7], WOOD.door, [0.92 * x, 0.02, 0])),
        block([1.2, 0.35, 0.12], WOOD.door, [0, -0.05, 0.84]),
      ),
  },
  // Вінок: a wreath of red, yellow and blue flowers on leaves, resting where the head is 0.68 wide, its
  // ribbons down the back of the head.
  {
    id: 'wreath',
    kind: 'hat',
    anchor: 'head',
    build: () =>
      group(
        ring(0.8, 0.1, GREENERY.leaf, [0, -0.26, 0]),
        ...around(9, (a, i) => ball(0.17, [PAINT.apple, PAINT.mustard, PAINT.cobalt][i % 3]!, [0.82 * Math.sin(a), -0.18, 0.82 * Math.cos(a)])),
        ...[-0.3, 0, 0.3].map((x, i) => block([0.12, 0.7, 0.03], [PAINT.apple, PAINT.mustard, PAINT.cobalt][i]!, [x, -0.6, -0.98])),
      ),
  },
  // Кепка: a flat tweed cap, its peak forward.
  {
    id: 'flat-cap',
    kind: 'hat',
    anchor: 'head',
    build: () => {
      const peak = block([1.1, 0.06, 0.55], WOOD.weathered, [0, -0.2, 0.9]);
      peak.rotation.x = 0.15;
      return group(crown(0.8, 0.3, WOOD.weathered, 0.85), ball(0.86, WOOD.weathered, [0, 0.22, 0.1], [1, 0.22, 1.05]), peak);
    },
  },
  // Безкозирка: a white sailor's cap with a black band and two ribbons down the back.
  {
    id: 'sailor-cap',
    kind: 'hat',
    anchor: 'head',
    build: () =>
      group(
        crown(0.78, 0.35, PAINT.enamel),
        disc(0.95, 0.12, PAINT.enamel, 0.16),
        annulus(0.78, 0.82, 0.14, INK.black, -0.17),
        ...[-0.15, 0.15].map((x) => block([0.1, 0.6, 0.03], INK.black, [x, -0.5, -0.95])),
      ),
  },
  // Бриль: a wide straw hat with a red band.
  {
    id: 'straw-hat',
    kind: 'hat',
    anchor: 'head',
    build: () => group(annulus(0.74, 1.6, 0.06, WOOD.card, -0.22), crown(0.75, 0.6, WOOD.card, 0.55), annulus(0.74, 0.8, 0.12, CLOTH.poppy, -0.12)),
  },
  // A paper crown: a yellow band with eight points.
  {
    id: 'paper-crown',
    kind: 'hat',
    anchor: 'head',
    build: () => {
      const band = new THREE.Mesh(new THREE.CylinderGeometry(0.8, 0.78, 0.35, 16, 1, true), material(PAINT.mustard));
      band.position.y = -0.08;
      return group(band, ...around(8, (a) => cone(0.14, 0.3, PAINT.mustard, [0.79 * Math.sin(a), 0.24, 0.79 * Math.cos(a)])));
    },
  },
  // A sunflower pinned on the chest, its stem down.
  {
    id: 'sunflower',
    kind: 'accessory',
    anchor: 'collar',
    build: () => {
      const face = group(
        ...around(10, (a) => cone(0.14, 0.35, PAINT.mustard, [0.33 * Math.sin(a), 0.33 * Math.cos(a), 0], [0, 0, -a])),
        disc(0.22, 0.08, WOOD.stained, 0),
      );
      face.children.at(-1)!.rotation.x = Math.PI / 2;
      face.position.set(0.35, -0.5, CHEST + 0.05);
      return group(face, rod(0.03, GREENERY.leaf, [0.35, -0.5, CHEST], [0.3, -1.1, CHEST]));
    },
  },
  // A briefcase strapped to the back, its handle up.
  {
    id: 'briefcase',
    kind: 'accessory',
    anchor: 'back',
    build: () => {
      const handle = new THREE.Mesh(new THREE.TorusGeometry(0.15, 0.04, 5, 10, Math.PI), material(INK.black));
      handle.position.set(0, 0.35, -0.2);
      return group(block([1, 0.7, 0.3], WOOD.mahogany, [0, 0, -0.2]), block([0.14, 0.1, 0.04], GOLD.brass, [0, 0.2, -0.37]), handle);
    },
  },
  // A fish skeleton across the back: a spine, five ribs, the head and the tail fin.
  {
    id: 'fish-skeleton',
    kind: 'accessory',
    anchor: 'back',
    build: () => {
      const bone = PAINT.porcelain;
      const fish = group(
        rod(0.04, bone, [-0.7, 0, 0], [0.6, 0, 0]),
        ...[-0.45, -0.22, 0, 0.22, 0.45].map((x) => rod(0.025, bone, [x, -0.25, 0], [x, 0.25, 0])),
        cone(0.2, 0.35, bone, [0.78, 0, 0], [0, 0, -Math.PI / 2]),
        cone(0.2, 0.25, bone, [-0.8, 0, 0], [0, 0, Math.PI / 2]),
      );
      fish.position.z = -0.1;
      fish.rotation.z = 0.5;
      return fish;
    },
  },
  // A medal on a blue and yellow ribbon, on the chest.
  {
    id: 'medal',
    kind: 'accessory',
    anchor: 'collar',
    build: () => {
      const coin = disc(0.25, 0.06, GOLD.brass, 0);
      coin.rotation.x = Math.PI / 2;
      coin.position.set(0, -0.9, CHEST);
      return group(rod(0.05, PAINT.cobalt, [-0.5, 0, 0.9], [0, -0.75, CHEST]), rod(0.05, PAINT.mustard, [0.5, 0, 0.9], [0, -0.75, CHEST]), coin);
    },
  },
  // A red scarf round the neck, one end down the front.
  {
    id: 'scarf',
    kind: 'accessory',
    anchor: 'collar',
    build: () => group(ring(1.25, 0.25, CLOTH.poppy, [0, 0, 0]), block([0.35, 0.8, 0.12], CLOTH.poppy, [0.45, -0.55, CHEST])),
  },
  // A loaf on a string round the neck.
  {
    id: 'loaf',
    kind: 'accessory',
    anchor: 'collar',
    build: () =>
      group(
        ring(1.05, 0.03, INK.black, [0, 0, 0]),
        rod(0.03, INK.black, [0, 0, 1.05], [0, -0.55, CHEST]),
        ball(0.3, WOOD.pine, [0, -0.8, CHEST + 0.05], [1.4, 0.8, 0.8]),
        ...[-0.2, 0, 0.2].map((x) => block([0.06, 0.05, 0.12], WOOD.oak, [x, -0.6, CHEST + 0.12])),
      ),
  },
];
const BY_ID = new Map(COSMETICS.map((c) => [c.id, c]));

// Puts what a player wears on its rig, at its anchors and scaled to them; a worn hat hides the ears group
// (what tops the head). The same `worn` twice is a no-op, so a hat changed in the round table is rebuilt
// on the next frame and kept otherwise.
export function wear(rig: Rig, worn: Worn | undefined): void {
  const key = `${worn?.hat ?? ''}/${worn?.accessory ?? ''}`;
  if (rig.root.userData.worn === key) return;
  rig.root.userData.worn = key;
  for (const a of Object.values(rig.anchors)) a.remove(...a.children.filter((o) => o.userData.cosmetic));
  const hat = BY_ID.get(worn?.hat ?? '');
  const accessory = BY_ID.get(worn?.accessory ?? '');
  rig.parts.ears.visible = hat?.kind !== 'hat';
  for (const [c, kind] of [[hat, 'hat'], [accessory, 'accessory']] as const) {
    if (c?.kind !== kind) continue;
    const anchor = rig.anchors[c.anchor];
    const o = c.build();
    o.userData.cosmetic = true;
    o.scale.multiplyScalar(anchor.userData.r as number);
    anchor.add(o);
  }
}
