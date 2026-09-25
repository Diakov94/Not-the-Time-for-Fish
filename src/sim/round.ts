import { ofSide } from '../content/characters.ts';
import type { Level } from '../content/level.ts';
import { levelBodies, pointFor, spawnPoint } from './build.ts';
import { characterOf, halfHeight, spawnOf, type ClientId, type NetId } from './entities.ts';
import type { Captured, Despawn, DugOut, Hello, Left, Look, MapPick, OpenDoor, Opened, Phase, PhaseMessage, Rescue, Secured, Side, Worn } from './messages.ts';
import type { Identities, OwnershipTable } from './ownership.ts';
import { follow, type Sim } from './world.ts';

// ADR 0007's round table: a pure function of the relay's order, written only by `foldRound` on every
// client. A player is a name: its side this round (ADR 0014: written at every prep, null for a name not
// seated then), the client it plays from (null while it is away), the look it picked per side and what it
// wears there (ADR 0013), and when it was captured (the sender's `at`), null while free.
export type Player = { name: string; side: Side | null; client: ClientId | null; looks: Partial<Record<Side, number>>; worn: Partial<Record<Side, Worn>>; captured: number | null };
// Why a round ended: three fish secured (cats), every cat captured, the heist timer out with no fish held,
// or overtime with none held or capped (dogs).
export type Why = 'fish' | 'captured' | 'timer' | 'overtime';
// Each name's points (ADR 0014): a fish secured as a cat, a catch as a dog, and the `at` of its last one.
export type Points = Record<string, { n: number; last: number }>;
// An ended round: its dogs (the rotation counts them), what the cats secured, the `at` of the last secure,
// the side that won, each name's points that round.
export type Result = { dogs: string[]; secured: number; last: number | null; why: Why; winner: Side; points: Points };
// Which of GAME.md's match rules decided a match: the top score; on equal scores, the last point sooner
// into its round; neither (nobody scored, or both last points at the same time), a draw.
export type Decider = 'more' | 'sooner' | 'level';
export type Round = {
  roster: Player[]; // in the order of each name's first hello
  phase: Phase;
  round: number; // 0 in the lobby, 1 to `rounds` within a match
  rounds: number; // the match's round count, written at its round 1's prep (ADR 0014)
  secured: { fish: NetId; at: number; by: string }[]; // this round's, in order, each with its sender's name
  caught: { cat: string; by: string | null; at: number }[]; // this round's captures, each with the name of the cat's last holder
  opened: number[]; // this round's door storages worked open, by volume index
  doors: number[]; // this round's house doors open, by door index
  results: Result[]; // this match's ended rounds
  match: string | 'draw' | null; // the outcome of the last match, a name, from the end of its last round
  decided: Decider | null; // and the rule that decided it
  score: Record<string, number>; // the session's matches won per name, for the life of the room
  map: string | null; // the map the host picked, by name (card 128); null until it picks: the level the client was given
};

export type RoundMessage = Hello | Look | PhaseMessage | Secured | Captured | Rescue | DugOut | Opened | OpenDoor | MapPick;
const ROUND = new Set(['hello', 'look', 'phase', 'secured', 'captured', 'rescue', 'dugOut', 'opened', 'door', 'map']);
export const isRound = (m: { type: string }): m is RoundMessage => ROUND.has(m.type);

const TO_WIN = 3; // fish secured
const PREP = 45; // s
const OVERTIME = 60; // s at most
const GATE_OPEN = 5; // s the kennel's gate stays open after a rescue, for the freed cats to walk out
const AWAY = 60; // s a gone player's character stays, frozen, before the host removes it (GAME.md, Disconnects)

// The balance knobs by player count (GAME.md, Multiplayer; card 148), one row per count 3-8: the heist
// timer, s; firecrackers and water bombs per dog (card 129); the dig-out time, s; the trap pickups the level
// spawns at prep, its first so many `trapPickup` points. A number the sweep (card 132) gave no reason to
// move is GAME.md's.
export type Knobs = { heist: number; mines: number; water: number; digOut: number; traps: number };
export const KNOBS: Readonly<Record<number, Knobs>> = {
  3: { heist: 600, mines: 3, water: 1, digOut: 60, traps: 3 },
  4: { heist: 600, mines: 3, water: 1, digOut: 60, traps: 3 },
  5: { heist: 600, mines: 3, water: 1, digOut: 60, traps: 3 },
  6: { heist: 600, mines: 3, water: 1, digOut: 60, traps: 3 },
  7: { heist: 600, mines: 3, water: 1, digOut: 60, traps: 3 },
  8: { heist: 600, mines: 3, water: 1, digOut: 60, traps: 3 },
};
// The round's row: its count is the players the prep sided, so a join or a leave mid-round moves no knob;
// before the first prep, and outside 3-8, the nearest row.
export const knobs = (r: Round): Knobs => KNOBS[Math.min(8, Math.max(3, r.roster.filter((p) => p.side !== null).length))]!;

export function newRound(): Round {
  return { roster: [], phase: 'lobby', round: 0, rounds: 0, secured: [], caught: [], opened: [], doors: [], results: [], match: null, decided: null, score: {}, map: null };
}

export const playerOf = (r: Round, client: ClientId): Player | undefined => r.roster.find((p) => p.client === client);

// The side a client plays this round: the one answer to it (ADR 0009 spawns the kind from it).
export const playsAs = (r: Round, client: ClientId): Side | undefined => playerOf(r, client)?.side ?? undefined;

// A player's position on its side, in roster order: its default look and its spawn point.
export function positionOf(r: Round, p: Player): number {
  return r.roster.filter((q) => q.side === p.side).indexOf(p);
}

export function lookOf(r: Round, p: Player, side: Side): number {
  return p.looks[side] ?? positionOf(r, p) % ofSide(side).length;
}

// GAME.md's dogs per seated count, about one per two cats: 3 → 1, 4 → 1, 5 → 2, 6 → 2, 7 → 2, 8 → 3.
export const dogCount = (n: number) => Math.round(n / 3);
// The match's rounds for n seated (ADR 0014): the fewest in which every player is a dog at least once with
// the dog counts at most one apart: 3 → 3, 4 → 4, 5 → 3, 6 → 3, 7 → 4, 8 → 3 (one round for a lone cat).
export const roundsOf = (n: number) => Math.ceil(n / Math.max(1, dogCount(n)));
const seated = (r: Round) => r.roster.filter((p) => p.client !== null);

// ADR 0014's rotation: the dogs of the next prep, by name. The seated players (a client connected) with the
// fewest dog rounds in this match's results first, then roster order; the first `dogCount` of them. The
// fold applies it at prep, the lobby shows it as a preview: in the lobby the next prep starts a new match,
// so no result counts.
export function rotation(r: Round): string[] {
  const past = r.phase === 'lobby' ? [] : r.results;
  const dogRounds = (p: Player) => past.filter((x) => x.dogs.includes(p.name)).length;
  const order = seated(r).sort((a, b) => dogRounds(a) - dogRounds(b)); // stable: roster order among equals
  return order.slice(0, dogCount(order.length)).map((p) => p.name);
}

// The phase that follows the current one, and its round: the only `phase` the fold accepts.
export function successor(r: Round): Pick<PhaseMessage, 'to' | 'round'> {
  switch (r.phase) {
    case 'lobby':
      return { to: 'prep', round: 1 };
    case 'prep':
      return { to: 'heist', round: r.round };
    case 'heist':
      return { to: 'overtime', round: r.round };
    case 'overtime':
      return { to: 'over', round: r.round };
    case 'over':
      return r.round < r.rounds ? { to: 'prep', round: r.round + 1 } : { to: 'lobby', round: 0 };
  }
}

// How long the current phase lasts, s; null for the phases the host's button ends (the lobby, over).
export function duration(r: Round): number | null {
  return r.phase === 'prep' ? PREP : r.phase === 'heist' ? knobs(r).heist : r.phase === 'overtime' ? OVERTIME : null;
}

// The cats this round, their client here or away (ADR 0007: the roster owns who plays): a cat whose tab died
// keeps its state, free or captured, its character frozen where it stood, so a `left` never ends a round.
const cats = (r: Round) => r.roster.filter((p) => p.side === 'cat');
// The captured cats: every one a rescue frees, and what a free cat's interact at the latch answers.
export const captives = (r: Round) => cats(r).filter((p) => p.captured !== null);
export const inPlay = (r: Round) => r.phase === 'prep' || r.phase === 'heist' || r.phase === 'overtime';
const stealing = (r: Round) => r.phase === 'heist' || r.phase === 'overtime';

// Whether a cat holds a fish: the ownership table's word, read through the identities.
function fishHeld(t: OwnershipTable, entities: Identities): boolean {
  for (const [id, row] of t.rows) if (row.held && entities.get(id)?.kind === 'fish') return true;
  return false;
}

// The current round's points from its lists: a fish for the cat that secured it, a catch for the dog that
// held the cat last; a catch naming no dog of this round scores nothing.
function pointsOf(r: Round): Points {
  const out = new Map<string, { n: number; last: number }>();
  const credit = (name: string, at: number) => out.set(name, { n: (out.get(name)?.n ?? 0) + 1, last: Math.max(out.get(name)?.last ?? at, at) });
  for (const s of r.secured) credit(s.by, s.at);
  for (const c of r.caught) if (c.by !== null && r.roster.some((p) => p.name === c.by && p.side === 'dog')) credit(c.by, c.at);
  return Object.fromEntries(out); // a name is the player's own text: every key an own one, `__proto__` too
}

// The match's points per name, derived, never stored (ADR 0014): the ended rounds' and, while a round is
// in play, its own; `last` from the latest round the name scored in.
function tally(r: Round): Map<string, { n: number; last: number }> {
  const out = new Map<string, { n: number; last: number }>();
  for (const points of [...r.results.map((x) => x.points), ...(inPlay(r) ? [pointsOf(r)] : [])]) {
    for (const [name, { n, last }] of Object.entries(points)) out.set(name, { n: (out.get(name)?.n ?? 0) + n, last });
  }
  return out;
}
export const scoreOf = (r: Round, name: string): number => tally(r).get(name)?.n ?? 0;

// The winner of a match and the rule that decided it: the top score; on equal scores, the name whose last
// point came sooner into its round; nobody scored, or the same `at`, a draw.
function matchOutcome(r: Round): [string | 'draw', Decider] {
  const [a, b] = [...tally(r)].sort(([, x], [, y]) => y.n - x.n || x.last - y.last);
  if (!a) return ['draw', 'level'];
  if (!b || a[1].n > b[1].n) return [a[0], 'more'];
  return a[1].last < b[1].last ? [a[0], 'sooner'] : ['draw', 'level'];
}

function end(r: Round, why: Why): void {
  const dogs = r.roster.filter((p) => p.side === 'dog').map((p) => p.name);
  r.phase = 'over';
  r.results.push({ dogs, secured: r.secured.length, last: r.secured.at(-1)?.at ?? null, why, winner: why === 'fish' ? 'cat' : 'dog', points: pointsOf(r) });
  if (r.round < r.rounds) return;
  [r.match, r.decided] = matchOutcome(r);
  const won = r.match;
  if (won !== 'draw') r.score = { ...r.score, [won]: (Object.hasOwn(r.score, won) ? r.score[won]! : 0) + 1 };
}

// The ends the table itself says (ADR 0007), checked after every message: three fish secured, every cat
// captured, no fish held during overtime.
export function settle(r: Round, t: OwnershipTable, entities: Identities): void {
  if (!stealing(r)) return;
  const free = cats(r).filter((p) => p.captured === null);
  if (r.secured.length >= TO_WIN) end(r, 'fish');
  else if (cats(r).length > 0 && free.length === 0) end(r, 'captured');
  else if (r.phase === 'overtime' && !fishHeld(t, entities)) end(r, 'overtime');
}

// Why the fold refuses a hello (card 68): its name is held by a connected client, or its client already
// has a name. A known name whose client left is no refusal: that is a rejoin.
export type Refusal = 'taken' | 'named';
export function refusal(r: Round, m: Hello): Refusal | null {
  if (playerOf(r, m.from)) return 'named';
  return r.roster.some((q) => q.name === m.name && q.client) ? 'taken' : null;
}

// Why the fold refuses a map (card 128): not from the host, not in the lobby, or a name this client has
// no level for.
export type MapRefusal = 'host' | 'lobby' | 'unknown';
export function mapRefusal(r: Round, m: MapPick, host: ClientId, levels: Readonly<Record<string, Level>>): MapRefusal | null {
  if (m.from !== host) return 'host';
  if (r.phase !== 'lobby') return 'lobby';
  return Object.hasOwn(levels, m.name) ? null : 'unknown';
}

// Folds one message of the relay's order and says whether it was accepted. `host` is the host the relay
// names as of the message: only its `phase` and `map` count. The fold reads the ownership table,
// the entities' identities and the maps this client can build; it writes only the round table.
export function foldRound(r: Round, m: RoundMessage | Left, host: ClientId, t: OwnershipTable, entities: Identities, levels: Readonly<Record<string, Level>> = {}): boolean {
  const p = m.type === 'left' ? undefined : playerOf(r, m.from);
  switch (m.type) {
    case 'hello': {
      // A known name whose client left is a rejoin: it keeps its side for the round and gets the new client.
      if (refusal(r, m)) return false;
      const known = r.roster.find((q) => q.name === m.name);
      if (known) known.client = m.from;
      else r.roster.push({ name: m.name, side: null, client: m.from, looks: {}, worn: {}, captured: null });
      return true;
    }
    case 'look':
      // What it wears is any catalogue id: the sim checks no unlock (ADR 0013).
      if (!p || !Number.isInteger(m.look) || m.look < 0 || m.look >= ofSide(m.side).length) return false;
      p.looks[m.side] = m.look;
      p.worn[m.side] = m.worn;
      return true;
    case 'left':
      for (const q of r.roster) if (q.client === m.id) q.client = null;
      return true;
    case 'phase': {
      const next = successor(r);
      if (m.from !== host || m.to !== next.to || m.round !== next.round) return false;
      if (m.to === 'over') {
        end(r, 'overtime'); // the host's cap on overtime
        return true;
      }
      r.phase = m.to;
      r.round = m.round;
      if (m.to === 'overtime' && !fishHeld(t, entities)) end(r, 'timer');
      if (m.to !== 'prep') return true;
      [r.secured, r.caught, r.opened, r.doors] = [[], [], [], []];
      for (const q of r.roster) q.captured = null;
      if (m.round === 1) [r.results, r.match, r.decided] = [[], null, null];
      // The rotation sides every seated player; a name not seated waits for the next prep (ADR 0014).
      const dogs = rotation(r);
      for (const q of r.roster) q.side = q.client === null ? null : dogs.includes(q.name) ? 'dog' : 'cat';
      if (m.round === 1) r.rounds = roundsOf(seated(r).length);
      return true;
    }
    case 'secured': {
      // Only from a named client the ownership table says holds that fish, once per fish; the fold names it.
      const row = t.rows.get(m.fish);
      if (!stealing(r) || !p || entities.get(m.fish)?.kind !== 'fish' || row?.owner !== m.from || !row.held) return false;
      if (r.secured.some((s) => s.fish === m.fish)) return false;
      r.secured.push({ fish: m.fish, at: m.at, by: p.name });
      return true;
    }
    case 'captured':
      // The cat's client names the client that held it last (ADR 0014); the fold keeps that client's name.
      if (!inPlay(r) || !p || playsAs(r, m.from) !== 'cat' || p.captured !== null) return false;
      p.captured = m.at;
      r.caught.push({ cat: p.name, by: m.by === null ? null : (playerOf(r, m.by)?.name ?? null), at: m.at });
      return true;
    case 'rescue': {
      // A free cat opens the kennel: every captured cat is free at once, one whose tab died too.
      const inside = captives(r);
      if (!inPlay(r) || !p || playsAs(r, m.from) !== 'cat' || p.captured !== null || inside.length === 0) return false;
      for (const q of inside) q.captured = null;
      return true;
    }
    case 'dugOut':
      if (!inPlay(r) || !p || p.captured === null) return false;
      p.captured = null;
      return true;
    case 'opened':
      if (!stealing(r) || !p || playsAs(r, m.from) !== 'cat' || r.opened.includes(m.storage)) return false;
      r.opened.push(m.storage);
      return true;
    case 'door':
      // A house door stays open for the rest of the round, whoever opened it.
      if (!inPlay(r) || !p || r.doors.includes(m.door)) return false;
      r.doors.push(m.door);
      return true;
    case 'map':
      if (mapRefusal(r, m, host, levels)) return false;
      r.map = m.name;
      return true;
  }
}

// `receive`'s part for the round. Every client notes each `left` by its own clock, with the leaver's name, for the host's removal duty. A
// rescue opens the kennel's gate for GATE_OPEN by this client's clock. This client's own cat, once
// captured, starts its dig-out timer, drops it when freed, and after its own `dugOut` stands at the
// tunnel exit. This client's own hello with a known name mid-round is a rejoin: its character enters,
// and its own refused hello leaves the fold's reason for its client to show. Its own refused `secured`
// is forgotten, so its cat secures that fish on its next carry.
export function receiveRound(sim: Sim, m: RoundMessage | Left, host: ClientId): boolean {
  const leaver = m.type === 'left' ? playerOf(sim.round, m.id) : undefined;
  if (m.type === 'hello' && m.from === sim.me) sim.refused = refusal(sim.round, m);
  if (!foldRound(sim.round, m, host, sim.ownership, sim.entities, sim.levels)) {
    if (m.type === 'secured' && m.from === sim.me) sim.securing.delete(m.fish);
    return false;
  }
  if (m.type === 'left') sim.away.set(m.id, { name: leaver?.name ?? null, at: sim.time });
  if (m.type === 'rescue') sim.gateUntil = sim.time + GATE_OPEN;
  if (m.type === 'captured' && m.from === sim.me) sim.digOut = sim.time + knobs(sim.round).digOut;
  if (playerOf(sim.round, sim.me)?.captured === null) sim.digOut = null;
  if (m.type === 'dugOut' && m.from === sim.me) {
    const me = characterOf(sim.entities, sim.me);
    const exit = pointFor(sim.level, 'tunnelExit', 'cat');
    if (me && exit) me.body.setTranslation(exit, true);
    sim.leap = null;
  }
  if (m.type === 'hello' && m.from === sim.me && inPlay(sim.round)) enter(sim);
  return true;
}

// The round table turned to a new phase on this client (the entity table is already cleared for prep):
// the phase starts now by this client's clock, and at prep the world follows the table's map, its debris
// stands again where content puts it, still, the host spawns the level anew and every player its
// character, of the side the roster gives it this round, at its side's spawn point.
export function turned(sim: Sim, host: ClientId, from: ClientId): void {
  const r = sim.round;
  sim.phaseAt = sim.time;
  if (r.phase === 'heist') sim.heistAt = sim.time;
  sim.called = false;
  sim.events.push({ type: 'phase', to: r.phase, round: r.round, from });
  if (r.phase !== 'prep') return;
  [sim.opening, sim.capturing, sim.gateUntil, sim.holder] = [null, false, 0, null];
  [sim.stunUntil, sim.wetUntil, sim.used, sim.planting, sim.defusing, sim.resupplyAt, sim.trap, sim.doorWork, sim.perk] = [0, 0, 0, null, null, null, 'noise', null, null];
  sim.securing.clear();
  sim.ending.clear();
  sim.barged.clear();
  follow(sim);
  for (const { prop, body } of sim.debris) {
    body.setTranslation(sim.level.props[prop]!.p, true);
    body.setRotation({ x: 0, y: 0, z: 0, w: 1 }, true);
    body.setLinvel({ x: 0, y: 0, z: 0 }, true);
    body.setAngvel({ x: 0, y: 0, z: 0 }, true);
  }
  if (host === sim.me) for (const b of levelBodies(sim.level, knobs(r).traps)) sim.outbox.push(spawnOf(sim, b));
  enter(sim);
}

// This client's character enters the round, of the side the roster gives it: at its side's spawn point,
// or on the kennel's floor if the roster holds it captured (a rejoin), digging out on a timer of its own
// from now. A name with no side yet waits for the next prep.
function enter(sim: Sim): void {
  const r = sim.round;
  const p = playerOf(r, sim.me);
  const side = playsAs(r, sim.me);
  if (!p || !side) return;
  const kennel = sim.level.volumes.find((v) => v.role === 'kennel');
  const floor = kennel && { x: kennel.p.x, y: kennel.p.y - kennel.half.y + halfHeight(side), z: kennel.p.z };
  const at = p.captured !== null ? floor : spawnPoint(sim.level, side, positionOf(r, p));
  if (at) sim.outbox.push(spawnOf(sim, { kind: side, p: at }));
  if (p.captured !== null) sim.digOut = sim.time + knobs(r).digOut;
}

// The host's removal duty, every step: the character of a player that left goes AWAY s after the `left`
// by this client's clock, or at once when its name is back from a new client, whose own character
// replaces it. Every client notes the `left`s, so the duty moves with the host.
export function removals(sim: Sim, host: ClientId | undefined): Despawn[] {
  if (host !== sim.me) return [];
  const out: Despawn[] = [];
  for (const [client, { name, at }] of sim.away) {
    const back = sim.round.roster.some((p) => p.name === name && p.client !== null);
    if (!back && sim.time - at < AWAY - 1e-9) continue;
    sim.away.delete(client);
    const gone = characterOf(sim.entities, client);
    if (gone) out.push({ type: 'despawn', from: sim.me, id: gone.id });
  }
  return out;
}

// The host's clock duty, every step: the phase whose time is up gives way to its successor, once.
export function clock(sim: Sim, host: ClientId | undefined): PhaseMessage[] {
  const due = duration(sim.round);
  if (host !== sim.me || sim.called || due === null || sim.time - sim.phaseAt < due - 1e-9) return [];
  sim.called = true;
  return [{ type: 'phase', from: sim.me, ...successor(sim.round) }];
}

// The host's button in the lobby and at `over`: the next round, or back to the lobby.
export function advance(sim: Sim, host: ClientId): PhaseMessage | null {
  const { phase } = sim.round;
  return host === sim.me && (phase === 'lobby' || phase === 'over') ? { type: 'phase', from: sim.me, ...successor(sim.round) } : null;
}

// The phase's remaining time by this client's own clock; never sent (ADR 0007).
export function remaining(sim: Sim): number | null {
  const due = duration(sim.round);
  return due === null ? null : Math.max(0, due - (sim.time - sim.phaseAt));
}
