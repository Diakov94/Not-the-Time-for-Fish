import { expect, test } from 'vitest';
import { startRelay } from './node.ts';
import { forward, join, leave, newRoom } from './room.ts';

type Received = { type: string; you?: string; id?: string; host?: string; seq: number; from?: string; data?: string };

async function until(done: () => boolean, ms = 2000): Promise<void> {
  const end = Date.now() + ms;
  while (!done()) {
    if (Date.now() > end) throw new Error('timed out');
    await new Promise((r) => setTimeout(r, 5));
  }
}

// A socket to the room through the global WebSocket, as a client opens it, recording what it receives.
async function member(url: string) {
  const ws = new WebSocket(url);
  const got: Received[] = [];
  ws.onmessage = (e) => got.push(JSON.parse(String(e.data)) as Received);
  await until(() => got.length > 0);
  return { ws, got, id: got[0]!.you! };
}

test('three members receive the same 100 messages in the same order with the same seq, each sender included', async () => {
  const relay = await startRelay();
  try {
    const url = `ws://localhost:${relay.port}/order`;
    const members = [await member(url), await member(url), await member(url)];
    for (let i = 0; i < 100; i++) members[i % 3]!.ws.send(`m${i}`);
    const forwarded = (m: (typeof members)[number]) => m.got.filter((r) => r.type === 'msg');
    await until(() => members.every((m) => forwarded(m).length === 100));
    const [first, ...rest] = members.map(forwarded);
    for (const list of rest) expect(list).toEqual(first);
    for (const m of members) expect(first!.filter((r) => r.from === m.id)).toHaveLength(m === members[0] ? 34 : 33);
    expect(first!.every((r, i) => i === 0 || r.seq > first![i - 1]!.seq)).toBe(true);
  } finally {
    await relay.close();
  }
});

test('when the host leaves, `left` names the next host', async () => {
  const relay = await startRelay();
  try {
    const url = `ws://localhost:${relay.port}/host`;
    const [a, b, c] = [await member(url), await member(url), await member(url)];
    expect(c.got[0]).toMatchObject({ type: 'welcome', members: [a.id, b.id, c.id], host: a.id });
    a.ws.close();
    await until(() => c.got.some((r) => r.type === 'left'));
    expect(c.got.at(-1)).toMatchObject({ type: 'left', id: a.id, host: b.id });
    expect(b.got.at(-1)).toEqual(c.got.at(-1));
  } finally {
    await relay.close();
  }
});

test("the module's whole state is {members, seq}, and a room rebuilt from its JSON goes on as the original", () => {
  const room = newRoom();
  const a = join(room).id;
  const b = join(room).id;
  forward(room, a, 'x');
  leave(room, a);
  join(room);
  expect(Object.keys(room)).toEqual(['members', 'seq']);
  const rebuilt = JSON.parse(JSON.stringify(room)) as typeof room;
  expect(rebuilt).toEqual(room);
  expect(forward(rebuilt, b, 'y')).toEqual(forward(room, b, 'y'));
  expect(join(rebuilt)).toEqual(join(room));
  expect(leave(rebuilt, b)).toEqual(leave(room, b));
});
