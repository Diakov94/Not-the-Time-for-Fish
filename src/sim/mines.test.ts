import { beforeAll, expect, test } from 'vitest';
import { prototypeRoom } from '../content/prototype-room.ts';
import { halfHeight, spawnOf } from './entities.ts';
import type { SimMessage } from './messages.ts';
import { stunned, wet } from './mines.ts';
import type { Intent } from './movement.ts';
import { receive } from './ownership.ts';
import { createWorld, init, step, STEP } from './world.ts';

beforeAll(init);

// A soaked cat cannot be quiet (card 129): a water bomb's splash stuns nothing and leaves the cat wet for
// 20 s, and while wet every 2 m stride of its sneaking pings at a dog's loudness; dry, it is silent again.
test('a cat a water bomb splashed pings at every sneaking stride for 20 s, unstunned, and is silent after', () => {
  // One client folding what it sends as the relay echoes it; a dog's water bomb 3 m east of the cat.
  const sim = createWorld(prototypeRoom, 'C');
  const deliver = (ms: SimMessage[]) => ms.forEach((m) => receive(sim, m, 'C'));
  deliver([spawnOf(sim, { kind: 'cat', p: { x: -6, y: halfHeight('cat'), z: 0 } })]);
  deliver([{ type: 'spawn', from: 'D', id: 'D:0', kind: 'mine', home: null, p: { x: -3, y: halfHeight('mine'), z: 0 }, variant: 'water' }]);
  const sneak = (x: number): Intent => ({ move: { x, z: 0 }, sprint: false, jump: false, sneak: true });
  const pings: { t: number; loud: number }[] = [];
  let splash: number | null = null;
  let stun = false;
  const run = (seconds: number, x: number) => {
    for (let i = 0; i < Math.round(seconds / STEP); i++) {
      const out = step(sim, STEP, sneak(x), 'C');
      for (const m of out) if (m.type === 'noise' && m.cause === 'step') pings.push({ t: sim.time, loud: m.loud });
      deliver(out);
      if (splash === null && wet(sim) > 0) splash = sim.time;
      stun ||= stunned(sim);
    }
  };
  while (splash === null && sim.time < 3) run(STEP, 1);
  const before = pings.length;
  // 8 m east at the sneak's 1.6 m/s, then back and forth inside the room until 5 s past the 20.
  for (const x of [1, -1, 1, -1, 1]) run(5, x);
  const since = (t: number) => t - splash!;
  const wetPings = pings.filter((p) => since(p.t) < 20);
  const first8m = wetPings.filter((p) => since(p.t) <= 5).length;
  const dry = pings.filter((p) => since(p.t) >= 20).length;
  console.log(
    `sneaking dry: ${before} pings before the splash; wet: ${first8m} in the first 8 m, ${wetPings.length} in 20 s at loud ${[...new Set(wetPings.map((p) => p.loud))].join()}; ` +
      `after 20 s: ${dry}; stunned ${stun}`,
  );
  expect(splash).not.toBeNull();
  expect(before).toBe(0);
  expect(first8m).toBe(4);
  expect(wetPings.length).toBeGreaterThanOrEqual(15);
  expect(wetPings.every((p) => p.loud === 0.3)).toBe(true);
  expect(dry).toBe(0);
  expect(stun).toBe(false);
});
