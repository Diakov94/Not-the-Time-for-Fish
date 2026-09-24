import { spawnSync } from 'node:child_process';
import { expect, test } from 'vitest';
import { MOVING_MAX, run } from './run.ts';
import defaultGame from './scenarios/default.ts';

test('with the tick sender disabled, divergence exceeds 1 m, two or more visible desyncs are counted and the exit code is 1', { timeout: 15000 }, async () => {
  const r = await run(defaultGame, 2, 3, { ticks: 0 });
  const worst = Math.max(...r.divergence.map((d) => Math.max(d.moving, d.resting)));
  const visible = r.visible.reduce((n, v) => n + v.n, 0);
  console.log(`without ticks: worst divergence ${worst.toFixed(2)} m, visible desyncs ${visible}, exit code ${r.code}`);
  expect(worst).toBeGreaterThan(1);
  expect(visible).toBeGreaterThanOrEqual(2);
  expect(r.code).toBe(1);
});

// Card bug-net-divergence-under-frame-stalls: a client stalled 250 ms gets every tick of the stall at once
// on its return; the copies it shows must stand on their owners' paths from its first frame back, and the
// stalled client's own bodies, standing still meanwhile, must be where the others show them.
test("through a 250 ms stall of either client, its frames and messages held, every copy stays on its owner's path", { timeout: 20000 }, async () => {
  const r = await run(defaultGame, 2, 6, { stall: 250 });
  const worst = Math.max(...r.divergence.map((d) => d.moving));
  console.log(`${r.injected} stalls of 250 ms: worst moving divergence ${worst.toFixed(3)} m, exit code ${r.code}`);
  expect(r.injected).toBeGreaterThanOrEqual(2);
  expect(worst).toBeLessThanOrEqual(MOVING_MAX);
  expect(r.code).toBe(0);
});

test('a scenario the runner does not know exits 2 with the list of names', () => {
  const r = spawnSync(process.execPath, ['tools/headless/main.ts', '--scenario', 'no-such'], { encoding: 'utf8' });
  console.log(r.stdout.trim());
  expect(r.status).toBe(2);
  expect(r.stdout).toContain('default');
});
