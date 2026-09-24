import * as THREE from 'three';
import { beforeAll, expect, test } from 'vitest';
import { countryHouse } from '../content/country-house.ts';
import { spawnEntity, type Kind } from '../sim/entities.ts';
import { createWorld, init } from '../sim/world.ts';
import { buildLook } from './looks.ts';

beforeAll(init);

// A found bug (card 57): the lure's collider became a box while its look still read a ball's radius, so
// the decoy was drawn at NaN size, invisible to every dog. Every kind's look must have a real size.
test('every kind is drawn at a finite, non-empty size', () => {
  const sim = createWorld(countryHouse, 'A');
  const kinds: Kind[] = ['cat', 'dog', 'fish', 'mine', 'trap', 'bag', 'lure', 'prop'];
  for (const [i, kind] of kinds.entries()) {
    const e = spawnEntity(sim, { type: 'spawn', from: 'A', id: `A:${i}`, kind, home: null, p: { x: 0, y: 1, z: 0 } });
    const size = new THREE.Box3().setFromObject(buildLook(sim, e)).getSize(new THREE.Vector3());
    expect(Number.isFinite(size.x * size.y * size.z) && size.x * size.y * size.z > 0, kind).toBe(true);
  }
});
