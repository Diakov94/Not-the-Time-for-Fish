import { beforeAll, expect, test } from 'vitest';
import RAPIER, { type Vector } from '@dimforge/rapier3d-compat';
import { prototypeRoom } from '../content/prototype-room.ts';
import { isCharacter, type Kind } from './entities.ts';
import { IDLE, SPEED, type Intent } from './movement.ts';
import { receive } from './ownership.ts';
import { createWorld, init, step, STEP } from './world.ts';

beforeAll(init);

function room() {
  const sim = createWorld(prototypeRoom, 'A');
  let n = 0;
  const add = (kind: Kind, p: Vector) => {
    const id = `A:${n++}`;
    receive(sim, { type: 'spawn', from: 'A', id, kind, home: isCharacter(kind) ? 'A' : null, p }, 'A');
    return sim.entities.get(id)!.body;
  };
  return { sim, add };
}

function run(sim: ReturnType<typeof room>['sim'], intent: Intent, steps: number) {
  for (let i = 0; i < steps; i++) step(sim, STEP, intent);
}

test.each([
  { gait: 'walk', sprint: false, speed: SPEED.cat.walk },
  { gait: 'sprint', sprint: true, speed: SPEED.cat.sprint },
])('a scripted 2 s $gait covers speed × 2 s ± 5 %', ({ sprint, speed }) => {
  const { sim, add } = room();
  const c = add('cat', { x: -8, y: 1, z: -5 });
  run(sim, IDLE, 30); // land on the floor
  const x0 = c.translation().x;
  run(sim, { move: { x: 1, z: 0 }, sprint, jump: false }, 120);
  expect(Math.abs(c.translation().x - x0 - speed * 2)).toBeLessThanOrEqual(0.05 * speed * 2);
});

test('running into a crate moves it more than 0.2 m', () => {
  const { sim, add } = room();
  const c = add('cat', { x: 0, y: 1, z: 0 });
  const crate = add('prop', { x: 2, y: 0.5, z: 0 });
  run(sim, IDLE, 30);
  const x0 = crate.translation().x;
  run(sim, { move: { x: 1, z: 0 }, sprint: false, jump: false }, 120);
  expect(c.translation().x).toBeGreaterThan(1); // the character reached the crate
  expect(crate.translation().x - x0).toBeGreaterThan(0.2);
});

test('a cat standing against a 1.0 m ledge jumps onto it', () => {
  const { sim, add } = room();
  sim.world.createCollider(RAPIER.ColliderDesc.cuboid(3, 0.5, 3).setTranslation(5, 0.5, -5)); // its face at x = 2
  const c = add('cat', { x: 1.5, y: 1, z: -5 });
  const ahead = { move: { x: 1, z: 0 }, sprint: false, jump: false };
  run(sim, IDLE, 30);
  run(sim, ahead, 20); // up against the face
  run(sim, { ...ahead, jump: true }, 1);
  run(sim, ahead, 60);
  expect(c.translation().y).toBeGreaterThan(1.4); // standing on top: 1.0 m plus the cat's half-height 0.45
});
