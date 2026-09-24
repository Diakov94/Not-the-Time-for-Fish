import type { Level } from '../content/level.ts';
import { levelBodies } from '../sim/build.ts';
import { spawnOf, type ClientId, type Kind, type NetId } from '../sim/entities.ts';
import { drainEvents } from '../sim/events.ts';
import type { Intent } from '../sim/movement.ts';
import { adopt, receive } from '../sim/ownership.ts';
import { playerOf, type Refusal } from '../sim/round.ts';
import { createWorld, follow, step, type Sim } from '../sim/world.ts';
import { decode, encode, type GameMessage, type Incoming } from './protocol.ts';
import { interpolate, receiveTick, tick, TICK_MS, type Receiver, type Rested } from './ticks.ts';

export type Session = {
  sim: Sim;
  ws: WebSocket;
  host: ClientId; // the relay's fact, as its `welcome` and `left` state it
  owed: Set<ClientId>; // joiners whose `joined` this client saw and whose `state` it has not
  rested: Rested;
  receiver: Receiver;
  lastTick: number; // when the last tick was due
  ticks: number; // tick messages sent, for the headless runner's count
};

// Where a joiner puts an entity until its owner's pose arrives: the host's state carries no pose.
const NOWHERE = { x: 0, y: -100, z: 0 };

// A join the round's fold refused (card 44): the fixed code, the name, and the fold's reason (card 68).
export type Refused = Error & { code: 'refused'; player: string; reason: Refusal | null };

// The client over the global WebSocket: one code path for Node and the browser, the one entry for the app
// and the headless client. The relay's `welcome` names this client, so the sim is created then, and its
// `hello {name}` goes out at once. The host spawns the level; a joiner holds every message until the host's
// `state`, then replays them (ADR 0006, Join). It resolves once its own hello is folded on top of its world
// and the roster names it; if the round's fold refused the name, it rejects and nothing of the join stays.
// `levels` are the maps by name the host may pick (card 128); the world starts from `level`.
export function connect(url: string, level: Level, name: string, levels: Record<string, Level> = {}): Promise<Session> {
  const ws = new WebSocket(url);
  return new Promise((resolve, reject) => {
    ws.onerror = () => reject(new Error(`no relay at ${url}`));
    let s: Session;
    let held: [Incoming, number][] | null = [];
    let since = 0; // the seq this client's world starts after: its state's, or the `left`'s that left it none
    let mine: number | null = null; // the seq of this client's own hello, back and not yet settled
    const hello = () => send(s, { type: 'hello', from: s.sim.me, name });
    ws.onmessage = (e) => {
      const m = decode(String(e.data));
      const at = performance.now();
      if (m.type === 'hello' && m.from === s.sim.me) mine = m.seq;
      if (m.type === 'welcome') {
        const sim = createWorld(level, m.you, levels);
        s = { sim, ws, host: m.host, owed: new Set(), rested: new Set(), receiver: new Map(), lastTick: 0, ticks: 0 };
        hello();
        if (m.host !== m.you) return;
        held = null;
        for (const b of levelBodies(level)) send(s, spawnOf(sim, b));
      } else if (!held) handle(s, m, at);
      else if (m.type === 'left' && m.host === s.sim.me) {
        // Named host while still owed a state: anyone holding one joined earlier and would have been named
        // first, so nobody holds the world. It starts empty as of this `left`: the held messages replay as
        // after a state at its `seq`, which answers every joiner still owed, and then the level spawns.
        since = m.seq;
        for (const [h, hAt] of [...held, [m, at] as const]) handle(s, h, hAt, m.seq);
        held = null;
        for (const b of levelBodies(s.sim.level)) send(s, spawnOf(s.sim, b));
      } else if (m.type !== 'state' || m.to !== s.sim.me) held.push([m, at]);
      else {
        since = m.seq;
        // The round table whole, and the phase's and the heist's start by this client's clock, a hop late;
        // the world is built from the table's map before the entities enter it.
        Object.assign(s.sim, { round: m.round, phaseAt: s.sim.time - m.elapsed.phase, heistAt: s.sim.time - m.elapsed.heist });
        follow(s.sim);
        const entities = m.entities.map((e) => ({ type: 'spawn' as const, from: m.from, ...e, p: NOWHERE }));
        adopt(s.sim, entities, { rows: new Map(m.table.rows), gone: new Set(m.table.gone) });
        for (const [h, hAt] of held) handle(s, h, hAt, m.seq);
        held = null;
        drainEvents(s.sim); // ADR 0010: the facts the held messages carried are folded, their events are stale
      }
      // Its own hello folded on top of its world: the roster names this client, or the fold refused the name.
      // A hello from before the world's start the roster does not show went into a world nobody holds: again.
      if (held || mine === null) return;
      if (playerOf(s.sim.round, s.sim.me)) resolve(s);
      else if (mine <= since) hello();
      else {
        ws.onmessage = null;
        ws.close();
        s.sim.world.free();
        reject(Object.assign(new Error(`name refused: ${name}`), { code: 'refused', player: name, reason: s.sim.refused }));
      }
      mine = null;
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

// The host's duty on `joined`: the entities, the table and the round as they stand after that message.
function answer(s: Session, to: ClientId, seq: number): void {
  const { entities, ownership, round, time, phaseAt, heistAt } = s.sim;
  send(s, {
    type: 'state',
    from: s.sim.me,
    to,
    seq,
    entities: [...entities.values()].map(({ id, kind, home, prop, variant }) => ({ id, kind, home, prop, variant })),
    table: { rows: [...ownership.rows], gone: [...ownership.gone] },
    round,
    elapsed: { phase: time - phaseAt, heist: time - heistAt },
  });
}

export function send(s: Session, m: GameMessage): void {
  s.ws.send(encode(m));
}

export function spawn(s: Session, kind: Kind, p: { x: number; y: number; z: number }): NetId {
  const m = spawnOf(s.sim, { kind, p });
  send(s, m);
  return m.id;
}

// One frame of the caller's loop, in real time: copies move toward their owners' poses, the sim
// steps and its touch claims go out, and every TICK_MS a tick goes out. The next tick is due TICK_MS
// after the last one was due, not after the frame that sent it, so the mean interval is TICK_MS at any
// frame rate; after a stall of more than a tick the schedule starts again from now. A tick waits for a
// frame the sim stepped in: before its first step, a body the fold just gave this client (a grabbed
// cat) still stands at its copy's pose, which is not this client's.
export function frame(s: Session, dt: number, intent: Intent): void {
  const now = performance.now();
  interpolate(s.sim, s.receiver, now);
  const time = s.sim.time;
  for (const claim of step(s.sim, dt, intent, s.host)) send(s, claim);
  if (s.sim.time === time || now - s.lastTick < TICK_MS) return;
  s.lastTick = now - s.lastTick < 2 * TICK_MS ? s.lastTick + TICK_MS : now;
  const t = tick(s.sim, s.rested);
  if (!t) return;
  send(s, t);
  s.ticks++;
}
