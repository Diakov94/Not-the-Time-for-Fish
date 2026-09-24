import type { ClientId, Kind, NetId } from '../sim/entities.ts';
import type { Left, SimMessage } from '../sim/messages.ts';
import type { Ownership } from '../sim/ownership.ts';
import type { Round } from '../sim/round.ts';
import type { Snapshot } from '../sim/snapshot.ts';

// ADR 0006's messages from clients. `from` never travels in the payload: the relay stamps the sender
// on its envelope and `decode` puts it back, so no client can speak for another.
export type Tick = { type: 'tick'; from: ClientId; s: Snapshot[] };
// The host's answer to a joiner: identity, the fold's table and the round table as of `seq`, the last
// message the host folded, and how long the current phase and the heist have run by the host's clock, s
// (ADR 0007); never a pose.
export type State = {
  type: 'state';
  from: ClientId;
  to: ClientId;
  seq: number;
  entities: { id: NetId; kind: Kind; home: ClientId | null; prop?: number }[];
  table: { rows: [NetId, Ownership][]; gone: ClientId[] };
  round: Round;
  elapsed: { phase: number; heist: number };
};
export type GameMessage = SimMessage | Tick | State;

// ADR 0005's messages from the relay as a client reads them; `seq` is the relay's order.
export type Welcome = { type: 'welcome'; you: ClientId; members: ClientId[]; host: ClientId };
export type Joined = { type: 'joined'; id: ClientId };
export type Incoming = (GameMessage | Welcome | Joined | Left) & { seq: number };

// A tick's snapshot on the wire (card 45): one flat array with no keys, every number to 1e-3 (a millimetre
// of position), `rest` as 0 or 1, and the angular velocity only while the body spins.
type Packed = [id: NetId, px: number, py: number, pz: number, qx: number, qy: number, qz: number, qw: number, vx: number, vy: number, vz: number, rest: 0 | 1, ...w: number[]];
const cut = (x: number) => Math.round(x * 1e3) / 1e3;

function pack({ id, p, q, v, w, rest }: Snapshot): Packed {
  const spin = [w.x, w.y, w.z].map(cut);
  return [id, ...[p.x, p.y, p.z, q.x, q.y, q.z, q.w, v.x, v.y, v.z].map(cut), rest ? 1 : 0, ...(spin.some((x) => x !== 0) ? spin : [])] as Packed;
}

function unpack([id, px, py, pz, qx, qy, qz, qw, vx, vy, vz, rest, wx = 0, wy = 0, wz = 0]: Packed): Snapshot {
  return { id, p: { x: px, y: py, z: pz }, q: { x: qx, y: qy, z: qz, w: qw }, v: { x: vx, y: vy, z: vz }, w: { x: wx, y: wy, z: wz }, rest: rest === 1 };
}

export function encode(m: GameMessage): string {
  return JSON.stringify({ ...m, from: undefined, ...(m.type === 'tick' && { s: m.s.map(pack) }) });
}

// The relay forwards a client's text as `{type: 'msg', seq, from, data}` and never parses `data`. A
// state's own `seq` is kept over the envelope's; `from` is always the relay's.
export function decode(text: string): Incoming {
  const m = JSON.parse(text);
  if (m.type !== 'msg') return m;
  const d = JSON.parse(m.data);
  return { seq: m.seq, ...d, ...(d.type === 'tick' && { s: d.s.map(unpack) }), from: m.from };
}
