import type { Rotation, Vector } from '@dimforge/rapier3d-compat';
import type { ClientId, Kind, NetId, Variant } from './entities.ts';

// The sim's messages (ADR 0006, 0007, 0008): the contract net carries and folds nothing of. `from` is
// the sender the relay stamped on the envelope; `left` comes from the relay itself.
// A content prop names its index in the level's props; a body on a content point may carry its facing; a
// thrown one (a lure) leaves its spawner at `v`; a mine or a trap names its variant.
export type Spawn = { type: 'spawn'; from: ClientId; id: NetId; kind: Kind; home: ClientId | null; p: Vector; q?: Rotation; prop?: number; v?: Vector; variant?: Variant };
export type Claim = { type: 'claim'; from: ClientId; id: NetId; hold: boolean };
export type Release = { type: 'release'; from: ClientId; id: NetId; p: Vector; q: Rotation; v: Vector };
export type Left = { type: 'left'; id: ClientId; host: ClientId };
// A prop the sender threw met `dog` (ADR 0009).
export type Hit = { type: 'hit'; from: ClientId; dog: NetId };
// The host removes a gone player's character (ADR 0007): 60 s after its `left`, or when its name rejoins.
export type Despawn = { type: 'despawn'; from: ClientId; id: NetId };
// A mine's end, born at a cat's client (ADR 0007): the cat stepped on mine `id`, or defused it.
export type Blast = { type: 'blast'; from: ClientId; id: NetId };
export type Defused = { type: 'defused'; from: ClientId; id: NetId };
// A trap's end (ADR 0007): its cat's client set it off, or a dog's cleared it. A pickup's: the sender's
// character touched it.
export type Sprung = { type: 'sprung'; from: ClientId; id: NetId };
export type Cleared = { type: 'cleared'; from: ClientId; id: NetId };
export type Pickup = { type: 'pickup'; from: ClientId; id: NetId };
// Events, not folded (ADR 0010): a noise ping born at the sender, and a team marker for the sender's side.
// A noise names its cause, set where it is born: a character's step, an impact, a mine's blast, a sprung trap,
// a door opened, a cat a bark flushed out of its hiding spot, a cat carrying a fish in overtime.
export type NoiseCause = 'step' | 'impact' | 'blast' | 'trap' | 'door' | 'flush' | 'carrier';
export type Noise = { type: 'noise'; from: ClientId; p: Vector; loud: number; cause: NoiseCause };
export type Mark = { type: 'mark'; from: ClientId; p: Vector };
// A dog's Bark (card 42) where it stands: an event every cat's client answers for its own cat.
export type Bark = { type: 'bark'; from: ClientId; p: Vector };
// An emote (ADR 0013): an event, never stored; `n` indexes the emotes the roster names for the sender's
// character.
export type Emote = { type: 'emote'; from: ClientId; n: number };
// The round's (ADR 0007): a joining client's name, a player's look for a side and what it wears there,
// cosmetics by their catalogue ids (ADR 0013). No message sides a player: the rotation does (ADR 0014).
export type Side = Extract<Kind, 'cat' | 'dog'>;
export type Hello = { type: 'hello'; from: ClientId; name: string };
export type Worn = { hat?: string; accessory?: string };
export type Look = { type: 'look'; from: ClientId; side: Side; look: number; worn: Worn };
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
// A house door (the level's door index) a cat worked open or a dog barged.
export type OpenDoor = { type: 'door'; from: ClientId; door: number };
// The host's pick in the lobby: the map the next prep builds, by its name (card 128).
export type MapPick = { type: 'map'; from: ClientId; name: string };

// Every message a client sends for the sim.
export type SimMessage = Spawn | Claim | Release | Hit | Despawn | Blast | Defused | Sprung | Cleared | Pickup | Noise | Mark | Bark | Emote | Hello | Look | PhaseMessage | Secured | Captured | Rescue | DugOut | Opened | OpenDoor | MapPick;
