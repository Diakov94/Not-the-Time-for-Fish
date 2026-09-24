import type { AddressInfo } from 'node:net';
import { WebSocketServer, type WebSocket } from 'ws';
import { forward, join, leave, newRoom, type Out, type Room } from './room.ts';

export type Relay = { port: number; close: () => Promise<void> };

const PING_MS = 5000; // every socket is pinged this often
const DEAD_MS = 15000; // and one that has not answered for this long is terminated

// ADR 0005's development host: a thin adapter from `ws` sockets to the room module's ids, one room
// per code in the URL path, dropped with its last member. Port 0 picks an ephemeral port; `pingMs` and
// `deadMs` are the ping's two constants unless a test shortens them.
export function startRelay(port = 0, { pingMs = PING_MS, deadMs = DEAD_MS } = {}): Promise<Relay> {
  const rooms = new Map<string, { room: Room; sockets: Map<string, WebSocket> }>();
  const wss = new WebSocketServer({ port });
  wss.on('connection', (ws, req) => {
    const code = req.url ?? '/';
    const r = rooms.get(code) ?? { room: newRoom(), sockets: new Map<string, WebSocket>() };
    rooms.set(code, r);
    const send = (out: Out[]) => {
      for (const o of out) r.sockets.get(o.to)?.send(o.text);
    };
    const { id, out } = join(r.room);
    r.sockets.set(id, ws);
    send(out);
    ws.on('message', (data) => send(forward(r.room, id, String(data))));
    // A connection that drops without a close (a laptop lid, a lost Wi-Fi) stops answering pings: it is
    // terminated, so its `close` announces the `left` that TCP would only give minutes later.
    let answered = performance.now();
    ws.on('pong', () => (answered = performance.now()));
    const alive = setInterval(() => (performance.now() - answered > deadMs ? ws.terminate() : ws.ping()), pingMs);
    ws.on('close', () => {
      clearInterval(alive);
      r.sockets.delete(id);
      send(leave(r.room, id));
      if (r.room.members.length === 0) rooms.delete(code);
    });
  });
  return new Promise((resolve) =>
    wss.on('listening', () =>
      resolve({
        port: (wss.address() as AddressInfo).port,
        close: () =>
          new Promise((done) => {
            for (const c of wss.clients) c.terminate();
            wss.close(() => done());
          }),
      }),
    ),
  );
}
