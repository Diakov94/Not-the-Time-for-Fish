import { isCharacter, type ClientId, type Kind, type NetId } from '../sim/entities.ts';
import type { Level } from '../sim/level.ts';
import type { Intent } from '../sim/movement.ts';
import { adopt, receive } from '../sim/ownership.ts';
import { createWorld, step, type Sim } from '../sim/world.ts';
import { decode, encode, type GameMessage, type Incoming } from './protocol.ts';
import { interpolate, receiveTick, tick, TICK_MS, type Receiver, type Rested } from './ticks.ts';

export type Session = {
  sim: Sim;
  ws: WebSocket;
  host: ClientId; // the relay's fact, as its `welcome` and `left` state it
  owed: Set<ClientId>; // joiners whose `joined` this client saw and whose `state` it has not
  rested: Rested;
  receiver: Receiver;
  spawned: number; // this client's net id counter: ids are `<client>:<n>`
  lastTick: number;
  ticks: number; // tick messages sent, for the headless runner's count
};

// Where a joiner puts an entity until its owner's pose arrives: the host's state carries no pose.
const NOWHERE = { x: 0, y: -100, z: 0 };

// The client over the global WebSocket: one code path for Node and the browser. The relay's `welcome`
// names this client, so the sim is created then. The host spawns the level and resolves at once; a
// joiner holds every message until the host's `state`, then replays them (ADR 0006, Join).
export function connect(url: string, level: Level): Promise<Session> {
  const ws = new WebSocket(url);
  return new Promise((resolve, reject) => {
    ws.onerror = () => reject(new Error(`no relay at ${url}`));
    let s: Session;
    let held: [Incoming, number][] | null = [];
    ws.onmessage = (e) => {
      const m = decode(String(e.data));
      const at = performance.now();
      if (m.type === 'welcome') {
        const sim = createWorld(level, m.you);
        s = { sim, ws, host: m.host, owed: new Set(), rested: new Set(), receiver: new Map(), spawned: 0, lastTick: 0, ticks: 0 };
        if (m.host !== m.you) return;
        held = null;
        for (const p of level.crates) spawn(s, 'prop', p);
        resolve(s);
      } else if (!held) handle(s, m, at);
      else if (m.type === 'left' && m.host === s.sim.me) {
        // Named host while still owed a state: anyone holding one joined earlier and would have been named
        // first, so nobody holds the world. It starts empty as of this `left`: the held messages replay as
        // after a state at its `seq`, which answers every joiner still owed, and then the level spawns.
        for (const [h, hAt] of [...held, [m, at] as const]) handle(s, h, hAt, m.seq);
        held = null;
        for (const p of level.crates) spawn(s, 'prop', p);
        resolve(s);
      } else if (m.type !== 'state' || m.to !== s.sim.me) held.push([m, at]);
      else {
        const entities = m.entities.map((e) => ({ type: 'spawn' as const, from: m.from, ...e, p: NOWHERE }));
        adopt(s.sim, entities, { rows: new Map(m.table.rows), gone: new Set(m.table.gone) });
        for (const [h, hAt] of held) handle(s, h, hAt, m.seq);
        held = null;
        resolve(s);
      }
    };
  });
}

// Every message in the relay's order; this client's own come back here too, and only then count. A
// joiner's replay passes the state's `seq` as `after`: fold messages the state already holds are
// skipped, ticks apply as they are.
function handle(s: Session, m: Incoming, at: number, after = 0): void {
  switch (m.type) {
    case 'welcome':
      return;
    case 'state':
      s.owed.delete(m.to);
      return;
    case 'joined':
      s.rested.clear(); // every owner resends its resting entities once
      s.owed.add(m.id);
      if (s.host === s.sim.me) answer(s, m.id, m.seq);
      return;
    case 'tick':
      receiveTick(s.sim, s.receiver, m, at);
      return;
    case 'left': {
      const hostLeft = m.id === s.host;
      s.host = m.host; // from here on this client answers joiners if it is the one named
      s.owed.delete(m.id);
      if (m.seq > after) receive(s.sim, m, s.host);
      // A host's states precede its `left` in the relay's order, so the joiners still owed one were never
      // answered: the next host owes them the state as it stands after this `left` (ADR 0006, Join).
      if (hostLeft && s.host === s.sim.me) for (const id of s.owed) answer(s, id, m.seq);
      return;
    }
  }
  if (m.seq > after) receive(s.sim, m, s.host);
}

// The host's duty on `joined`: the entities and the table as they stand after that message.
function answer(s: Session, to: ClientId, seq: number): void {
  const { entities, ownership } = s.sim;
  send(s, {
    type: 'state',
    from: s.sim.me,
    to,
    seq,
    entities: [...entities.values()].map(({ id, kind, home }) => ({ id, kind, home })),
    table: { rows: [...ownership.rows], gone: [...ownership.gone] },
  });
}

export function send(s: Session, m: GameMessage): void {
  s.ws.send(encode(m));
}

export function spawn(s: Session, kind: Kind, p: { x: number; y: number; z: number }): NetId {
  const id = `${s.sim.me}:${s.spawned++}`;
  send(s, { type: 'spawn', from: s.sim.me, id, kind, home: isCharacter(kind) ? s.sim.me : null, p });
  return id;
}

// One frame of the caller's loop, in real time: copies move toward their owners' poses, the sim
// steps and its touch claims go out, and every TICK_MS a tick goes out.
export function frame(s: Session, dt: number, intent: Intent): void {
  const now = performance.now();
  interpolate(s.sim, s.receiver, now);
  for (const claim of step(s.sim, dt, intent)) send(s, claim);
  if (now - s.lastTick < TICK_MS) return;
  s.lastTick = now;
  const t = tick(s.sim, s.rested);
  if (!t) return;
  send(s, t);
  s.ticks++;
}
