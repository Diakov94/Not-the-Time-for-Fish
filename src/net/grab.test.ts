import { expect, test } from 'vitest';
import { grab, throwCarried } from '../sim/grab.ts';
import { IDLE } from '../sim/movement.ts';
import { send, spawn, type Session } from './client.ts';
import { play, room, sessions, west } from './clients.test.ts';

// Grab and hit: a carried cat goes free by the carrier's clock, or at once when a thrown crate hits the dog.

// When each session's fold first shows the cat held, and then free again.
function holdTimes(cat: string) {
  const heldAt = new Map<Session, number>();
  const freeAt = new Map<Session, number>();
  const each = (now: number) => {
    for (const s of sessions) {
      const held = s.sim.ownership.rows.get(cat)?.held;
      if (held && !heldAt.has(s)) heldAt.set(s, now);
      if (!held && heldAt.has(s) && !freeAt.has(s)) freeAt.set(s, now);
    }
  };
  return { heldAt, freeAt, each };
}

test("a grabbed cat is free on both clients 8 s after the grab's message, by the carrier's clock", { timeout: 15000 }, async () => {
  const [a, b] = await room(2);
  const cat = spawn(a!, 'cat', { x: 0, y: 1, z: 0 });
  spawn(b!, 'dog', { x: 0, y: 1, z: -1.2 });
  await play(2000, () => a!.sim.entities.size === 2 && b!.sim.entities.size === 2);
  send(b!, { type: 'claim', from: b!.sim.me, id: cat, hold: true });
  const { heldAt, freeAt, each } = holdTimes(cat);
  await play(9000, () => freeAt.size === 2, each);
  const after = [a!, b!].map((s) => (freeAt.get(s)! - heldAt.get(s)!) / 1000);
  console.log(`cat free ${after.map((t) => t.toFixed(3)).join(' / ')} s after the grab's message`);
  expect(freeAt.size).toBe(2);
  for (const t of after) expect(Math.abs(t - 8)).toBeLessThanOrEqual(0.15);
});

test('a crate thrown at the carrying dog frees the cat on all three clients within 150 ms of the hit', async () => {
  const [a, b, c] = await room(3);
  const cat = spawn(a!, 'cat', { x: 0, y: 1, z: 0 });
  spawn(b!, 'dog', { x: 0, y: 1, z: -1.2 });
  spawn(c!, 'cat', { x: 3.5, y: 1, z: -1.2 });
  spawn(c!, 'prop', { x: 3.5, y: 0.5, z: -0.2 }); // ahead of C's cat, which faces +z
  await play(2000, () => sessions.every((s) => s.sim.entities.size === 4));
  send(b!, { type: 'claim', from: b!.sim.me, id: cat, hold: true });
  await play(500, () => sessions.every((s) => s.sim.ownership.rows.get(cat)?.held));
  send(c!, grab(c!.sim)!);
  await play(400);
  await play(250, undefined, undefined, (s) => (s === c ? west : IDLE)); // C turns toward the dog
  let hitAt = Infinity;
  const send0 = c!.ws.send.bind(c!.ws);
  c!.ws.send = (d) => {
    if (JSON.parse(String(d)).type === 'hit') hitAt = performance.now();
    send0(d);
  };
  send(c!, throwCarried(c!.sim)!);
  const { freeAt, each } = holdTimes(cat);
  await play(1500, () => freeAt.size === 3, each);
  const ms = Math.max(...freeAt.values()) - hitAt;
  console.log(`cat free on all three ${ms.toFixed(0)} ms after the hit left the thrower`);
  expect(freeAt.size).toBe(3);
  expect(ms).toBeLessThanOrEqual(150);
});
