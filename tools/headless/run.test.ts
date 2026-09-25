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

// Card bug-headless-moving-judge-fails-on-the-runners-own-stalls: one frame of the runner's own loop runs
// 400 ms (a busy loop, as a long GC or the round's end at six clients), every client and the relay frozen
// with it; no client showed another a desync, so no judge fails, and the run names the gap and its moment.
test("a 400 ms stall of the runner's own loop is no divergence, and the run names it", { timeout: 20000 }, async () => {
  const later = globalThis.setTimeout;
  const from = performance.now() + 3000;
  let busy = true;
  globalThis.setTimeout = ((f: () => void, ms?: number) => {
    if (busy && performance.now() > from) {
      busy = false;
      for (const end = performance.now() + 400; performance.now() < end; );
    }
    return later(f, ms);
  }) as typeof setTimeout;
  try {
    const r = await run(defaultGame, 2, 6);
    const worst = Math.max(...r.divergence.map((d) => Math.max(d.moving, d.stalled)));
    console.log(`the runner's longest stall ${r.stalls.longest.toFixed(0)} ms at ${r.stalls.at.toFixed(1)} s: worst divergence ${worst.toFixed(3)} m, exit code ${r.code}`);
    expect(r.stalls.longest).toBeGreaterThanOrEqual(400);
    expect(r.stalls.at).toBeGreaterThan(0);
    expect(worst).toBeLessThanOrEqual(MOVING_MAX);
    expect(r.code).toBe(0);
  } finally {
    globalThis.setTimeout = later;
  }
});

test('a scenario the runner does not know exits 2 with the list of names', () => {
  const r = spawnSync(process.execPath, ['tools/headless/main.ts', '--scenario', 'no-such'], { encoding: 'utf8' });
  console.log(r.stdout.trim());
  expect(r.status).toBe(2);
  expect(r.stdout).toContain('default');
});
