import type { Rotation, Vector } from '@dimforge/rapier3d-compat';
import type { ClientId, Kind, NetId } from './entities.ts';

// The sim's messages (ADR 0006, 0007, 0008): the contract net carries and folds nothing of. `from` is
// the sender the relay stamped on the envelope; `left` comes from the relay itself.
export type Spawn = { type: 'spawn'; from: ClientId; id: NetId; kind: Kind; home: ClientId | null; p: Vector };
export type Claim = { type: 'claim'; from: ClientId; id: NetId; hold: boolean };
export type Release = { type: 'release'; from: ClientId; id: NetId; p: Vector; q: Rotation; v: Vector };
export type Left = { type: 'left'; id: ClientId; host: ClientId };
// A prop the sender threw met `dog` (ADR 0009).
export type Hit = { type: 'hit'; from: ClientId; dog: NetId };
// Events, not folded (ADR 0010): a noise ping born at the sender, and a team marker for the sender's side.
export type Noise = { type: 'noise'; from: ClientId; p: Vector; loud: number };
export type Mark = { type: 'mark'; from: ClientId; p: Vector };
// The round's (ADR 0007): a joining client's name, the host's team for a name, a player's look for a side.
export type Team = 'A' | 'B';
export type Side = Extract<Kind, 'cat' | 'dog'>;
export type Hello = { type: 'hello'; from: ClientId; name: string };
export type Roster = { type: 'roster'; from: ClientId; name: string; team: Team };
export type Look = { type: 'look'; from: ClientId; side: Side; look: number };

// Every message a client sends for the sim.
export type SimMessage = Spawn | Claim | Release | Hit | Noise | Mark | Hello | Roster | Look;
