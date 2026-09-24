import type { Rotation, Vector } from '@dimforge/rapier3d-compat';
import type { ClientId, Kind, NetId } from './entities.ts';

// The sim's messages (ADR 0006, 0007, 0008): the contract net carries and folds nothing of. `from` is
// the sender the relay stamped on the envelope; `left` comes from the relay itself.
// A content prop names its index in the level's props; a body on a content point may carry its facing.
export type Spawn = { type: 'spawn'; from: ClientId; id: NetId; kind: Kind; home: ClientId | null; p: Vector; q?: Rotation; prop?: number };
export type Claim = { type: 'claim'; from: ClientId; id: NetId; hold: boolean };
export type Release = { type: 'release'; from: ClientId; id: NetId; p: Vector; q: Rotation; v: Vector };
export type Left = { type: 'left'; id: ClientId; host: ClientId };
// A prop the sender threw met `dog` (ADR 0009).
export type Hit = { type: 'hit'; from: ClientId; dog: NetId };
// Events, not folded (ADR 0010): a noise ping born at the sender, and a team marker for the sender's side.
// A noise names its cause, set where it is born: a character's step, an impact, a mine's blast, a sprung trap,
// a door storage opened.
export type NoiseCause = 'step' | 'impact' | 'blast' | 'trap' | 'door';
export type Noise = { type: 'noise'; from: ClientId; p: Vector; loud: number; cause: NoiseCause };
export type Mark = { type: 'mark'; from: ClientId; p: Vector };
// The round's (ADR 0007): a joining client's name, the host's team for a name, a player's look for a side.
export type Team = 'A' | 'B';
export type Side = Extract<Kind, 'cat' | 'dog'>;
export type Hello = { type: 'hello'; from: ClientId; name: string };
export type Roster = { type: 'roster'; from: ClientId; name: string; team: Team };
export type Look = { type: 'look'; from: ClientId; side: Side; look: number };
// The host's clock: the phase whose time is up gives way to `to`, in round `round` of the match.
export type Phase = 'lobby' | 'prep' | 'heist' | 'overtime' | 'over';
export type PhaseMessage = { type: 'phase'; from: ClientId; to: Phase; round: number };
// Born at the fact's owner (ADR 0007). `at` is the sender's time since the heist began, stored as sent.
export type Secured = { type: 'secured'; from: ClientId; fish: NetId; at: number };
export type Captured = { type: 'captured'; from: ClientId; at: number };
export type Rescue = { type: 'rescue'; from: ClientId };
export type DugOut = { type: 'dugOut'; from: ClientId };
// A door storage (the level's volume index) a cat worked open.
export type Opened = { type: 'opened'; from: ClientId; storage: number };

// Every message a client sends for the sim.
export type SimMessage = Spawn | Claim | Release | Hit | Noise | Mark | Hello | Roster | Look | PhaseMessage | Secured | Captured | Rescue | DugOut | Opened;
