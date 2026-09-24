import type { ClientId, Kind, NetId } from '../sim/entities.ts';
import type { Left, SimMessage } from '../sim/messages.ts';
import type { Ownership } from '../sim/ownership.ts';
import type { Snapshot } from '../sim/snapshot.ts';

// ADR 0006's messages from clients. `from` never travels in the payload: the relay stamps the sender
// on its envelope and `decode` puts it back, so no client can speak for another.
export type Tick = { type: 'tick'; from: ClientId; s: Snapshot[] };
// The host's answer to a joiner: identity and the fold's table as of `seq`, the last message the host
// folded; never a pose.
export type State = {
  type: 'state';
  from: ClientId;
  to: ClientId;
  seq: number;
  entities: { id: NetId; kind: Kind; home: ClientId | null; prop?: number }[];
  table: { rows: [NetId, Ownership][]; gone: ClientId[] };
};
export type GameMessage = SimMessage | Tick | State;

// ADR 0005's messages from the relay as a client reads them; `seq` is the relay's order.
export type Welcome = { type: 'welcome'; you: ClientId; members: ClientId[]; host: ClientId };
export type Joined = { type: 'joined'; id: ClientId };
export type Incoming = (GameMessage | Welcome | Joined | Left) & { seq: number };

export function encode(m: GameMessage): string {
  return JSON.stringify({ ...m, from: undefined });
}

// The relay forwards a client's text as `{type: 'msg', seq, from, data}` and never parses `data`. A
// state's own `seq` is kept over the envelope's; `from` is always the relay's.
export function decode(text: string): Incoming {
  const m = JSON.parse(text);
  return m.type === 'msg' ? { seq: m.seq, ...JSON.parse(m.data), from: m.from } : m;
}
