import { expect, test } from 'vitest';
import WebSocket from 'ws';
import { startRelay } from './node.ts';

// A socket whose reader stops (a laptop lid: no close frame, TCP still up) answers no ping; the other
// member, which reads on, hears its `left` from the relay.
test('a paused socket is announced left to the others within 20 s', { timeout: 30000 }, async () => {
  const relay = await startRelay();
  const url = `ws://localhost:${relay.port}/dead`;
  const open = () =>
    new Promise<WebSocket>((done) => {
      const ws = new WebSocket(url);
      ws.on('open', () => done(ws));
    });
  const until = async (ok: () => boolean, ms: number) => {
    for (const end = performance.now() + ms; !ok() && performance.now() < end; ) await new Promise((r) => setTimeout(r, 50));
  };
  const seen: { type: string; id?: string }[] = [];
  const other = await open();
  other.on('message', (d) => seen.push(JSON.parse(String(d))));
  const lid = await open();
  await until(() => seen.some((m) => m.type === 'joined'), 1000);
  const id = seen.find((m) => m.type === 'joined')!.id;
  lid.pause();
  const t0 = performance.now();
  await until(() => seen.some((m) => m.type === 'left' && m.id === id), 25000);
  const ms = performance.now() - t0;
  console.log(`paused socket announced left after ${(ms / 1000).toFixed(1)} s`);
  other.close();
  lid.terminate();
  await relay.close();
  expect(ms).toBeLessThanOrEqual(20000);
});
