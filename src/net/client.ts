import type { ClientId, Kind, NetId } from '../sim/entities.ts';
import type { Level } from '../sim/level.ts';
import type { Intent } from '../sim/movement.ts';
import { receive } from '../sim/ownership.ts';
import { createWorld, step, type Sim } from '../sim/world.ts';
import { decode, encode, type GameMessage, type Incoming } from './protocol.ts';
import { interpolate, receiveTick, tick, TICK_MS, type Receiver, type Rested } from './ticks.ts';

export type Session = {
  sim: Sim;
  ws: WebSocket;
  host: ClientId; // the relay's fact, as its `welcome` and `left` state it
  rested: Rested;
  receiver: Receiver;
  spawned: number; // this client's net id counter: ids are `<client>:<n>`
  lastTick: number;
  ticks: number; // tick messages sent, for the headless runner's count
};

// The client over the global WebSocket: one code path for Node and the browser. It resolves on the
// relay's `welcome`, which names this client, so the sim is created then.
export function connect(url: string, level: Level): Promise<Session> {
  const ws = new WebSocket(url);
  return new Promise((resolve, reject) => {
    ws.onerror = () => reject(new Error(`no relay at ${url}`));
    ws.onmessage = (e) => {
      const w = decode(String(e.data));
      if (w.type !== 'welcome') return;
      const s: Session = {
        sim: createWorld(level, w.you),
        ws,
        host: w.host,
        rested: new Set(),
        receiver: new Map(),
        spawned: 0,
        lastTick: 0,
        ticks: 0,
      };
      ws.onmessage = (e) => handle(s, decode(String(e.data)));
      resolve(s);
    };
  });
}

// Every message in the relay's order; this client's own come back here too, and only then count.
function handle(s: Session, m: Incoming): void {
  switch (m.type) {
    case 'welcome':
      return;
    case 'joined':
      s.rested.clear();
      return;
    case 'left':
      s.host = m.host;
      receive(s.sim, m);
      return;
    case 'tick':
      receiveTick(s.sim, s.receiver, m, performance.now());
      return;
    default:
      receive(s.sim, m);
  }
}

export function send(s: Session, m: GameMessage): void {
  s.ws.send(encode(m));
}

export function spawn(s: Session, kind: Kind, p: { x: number; y: number; z: number }): NetId {
  const id = `${s.sim.me}:${s.spawned++}`;
  send(s, { type: 'spawn', from: s.sim.me, id, kind, home: kind === 'character' ? s.sim.me : null, p });
  return id;
}

// One frame of the caller's loop, in real time: copies move toward their owners' poses, the sim
// steps, and every TICK_MS a tick goes out.
export function frame(s: Session, dt: number, intent: Intent): void {
  const now = performance.now();
  interpolate(s.sim, s.receiver, now);
  step(s.sim, dt, intent);
  if (now - s.lastTick < TICK_MS) return;
  s.lastTick = now;
  const t = tick(s.sim, s.rested);
  if (!t) return;
  send(s, t);
  s.ticks++;
}
