import { spawnSync } from 'node:child_process';
import { expect, test } from 'vitest';
import { run } from './run.ts';
import { defaultGame } from './scenarios/default.ts';

test('with the tick sender disabled, divergence exceeds 1 m and the exit code is 1', { timeout: 15000 }, async () => {
  const r = await run(defaultGame, 2, 3, false);
  const worst = Math.max(...r.divergence.map((d) => Math.max(d.moving, d.resting)));
  console.log(`without ticks: worst divergence ${worst.toFixed(2)} m, exit code ${r.code}`);
  expect(worst).toBeGreaterThan(1);
  expect(r.code).toBe(1);
});

test('a scenario the runner does not know exits 2 with the list of names', () => {
  const r = spawnSync(process.execPath, ['tools/headless/main.ts', '--scenario', 'no-such'], { encoding: 'utf8' });
  console.log(r.stdout.trim());
  expect(r.status).toBe(2);
  expect(r.stdout).toContain('default');
});
