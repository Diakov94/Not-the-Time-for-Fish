import { expect, test } from 'vitest';
import { run } from './run.ts';

test('with the tick sender disabled, divergence exceeds 1 m and the exit code is 1', { timeout: 15000 }, async () => {
  const r = await run(2, 3, false);
  const worst = Math.max(...r.divergence.map((d) => Math.max(d.moving, d.resting)));
  console.log(`without ticks: worst divergence ${worst.toFixed(2)} m, exit code ${r.code}`);
  expect(worst).toBeGreaterThan(1);
  expect(r.code).toBe(1);
});
