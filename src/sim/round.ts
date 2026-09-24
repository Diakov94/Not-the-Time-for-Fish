import { levelBodies, spawnPoint } from './build.ts';
import { spawnOf, type ClientId, type NetId } from './entities.ts';
import type { Captured, DugOut, Hello, Left, Look, Opened, Phase, PhaseMessage, Rescue, Roster, Secured, Side, Team } from './messages.ts';
import type { Identities, OwnershipTable } from './ownership.ts';
import type { Sim } from './world.ts';

// ADR 0007's round table: a pure function of the relay's order, written only by `foldRound` on every
// client. A player is a name: its team (null until the host answers its first hello), the client it
// plays from (null while it is away), the look it picked per side, and when it was captured (the
// sender's `at`), null while free.
export type Player = { name: string; team: Team | null; client: ClientId | null; looks: Partial<Record<Side, number>>; captured: number | null };
// Why a round ended: three fish secured (cats), every cat captured, the heist timer out with no fish held,
// or overtime with none held or capped (dogs).
export type Why = 'fish' | 'captured' | 'timer' | 'overtime';
// An ended round: which team played cats, what it secured, the `at` of its last secure, the winner.
export type Result = { cats: Team; secured: number; last: number | null; why: Why; winner: Team };
export type Round = {
  roster: Player[]; // in the order of each name's first hello
  phase: Phase;
  round: number; // 0 in the lobby, 1 or 2 within a match
  secured: { fish: NetId; at: number }[]; // this round's, in order
  opened: number[]; // this round's door storages worked open, by volume index
  results: Result[]; // this match's ended rounds
  match: Team | 'draw' | null; // the outcome of the last match, from the end of its round 2
  score: Record<Team, number>; // the session's matches won, for the life of the room
};

export type RoundMessage = Hello | Roster | Look | PhaseMessage | Secured | Captured | Rescue | DugOut | Opened;
const ROUND = new Set(['hello', 'roster', 'look', 'phase', 'secured', 'captured', 'rescue', 'dugOut', 'opened']);
export const isRound = (m: { type: string }): m is RoundMessage => ROUND.has(m.type);

const LOOKS = 3; // per side (GAME.md, Characters)
const TO_WIN = 3; // fish secured
const PREP = 45; // s
const OVERTIME = 60; // s at most

// The balance knobs by player count (GAME.md, Multiplayer): the heist timer, mines per dog, the dig-out
// time, one row per 3-4, 5-6 and 7-8 players (names in the roster).
const KNOBS = [
  { players: 4, heist: 480, mines: 4, digOut: 60 },
  { players: 6, heist: 600, mines: 3, digOut: 60 },
  { players: 8, heist: 720, mines: 2, digOut: 75 },
];
export const knobs = (r: Round) => KNOBS.find((k) => r.roster.length <= k.players) ?? KNOBS.at(-1)!;

export function newRound(): Round {
  return { roster: [], phase: 'lobby', round: 0, secured: [], opened: [], results: [], match: null, score: { A: 0, B: 0 } };
}

export const playerOf = (r: Round, client: ClientId): Player | undefined => r.roster.find((p) => p.client === client);

// Team A plays cats in round 1, and the teams swap sides for round 2.
export const catsTeam = (r: Round): Team => (r.round === 2 ? 'B' : 'A');
const other = (t: Team): Team => (t === 'A' ? 'B' : 'A');

// The side a client plays this round: the one answer to it (ADR 0009 spawns the kind from it).
export function playsAs(r: Round, client: ClientId): Side | undefined {
  const team = playerOf(r, client)?.team;
  return team ? (team === catsTeam(r) ? 'cat' : 'dog') : undefined;
}

// A player's position on its team, in roster order: its default look and its spawn point.
export function positionOf(r: Round, p: Player): number {
  return r.roster.filter((q) => q.team === p.team).indexOf(p);
}

export function lookOf(r: Round, p: Player, side: Side): number {
  return p.looks[side] ?? positionOf(r, p) % LOOKS;
}

// GAME.md's auto-balance, about one dog per two cats: 3 → 1 vs 2, 4 → 1 vs 3, 5 → 2 vs 3, 6 → 2 vs 4,
// 7 → 2 vs 5, 8 → 3 vs 5 (team B plays dogs in round 1). Every name before `name` counts with its team,
// or with the team this rule gives it if the host's answer is still on its way.
export function autoTeam(r: Round, name: string): Team {
  let dogs = 0;
  for (const [i, p] of r.roster.entries()) {
    const team = p.team ?? (dogs < Math.round((i + 1) / 3) ? 'B' : 'A');
    if (p.name === name) return team;
    if (team === 'B') dogs++;
  }
  return 'A';
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
      return r.round < 2 ? { to: 'prep', round: r.round + 1 } : { to: 'lobby', round: 0 };
  }
}

// How long the current phase lasts, s; null for the phases the host's button ends (the lobby, over).
export function duration(r: Round): number | null {
  return r.phase === 'prep' ? PREP : r.phase === 'heist' ? knobs(r).heist : r.phase === 'overtime' ? OVERTIME : null;
}

const cats = (r: Round) => r.roster.filter((p) => p.team === catsTeam(r) && p.client !== null);
const inPlay = (r: Round) => r.phase === 'prep' || r.phase === 'heist' || r.phase === 'overtime';
const stealing = (r: Round) => r.phase === 'heist' || r.phase === 'overtime';

// Whether a cat holds a fish: the ownership table's word, read through the identities.
function fishHeld(t: OwnershipTable, entities: Identities): boolean {
  for (const [id, row] of t.rows) if (row.held && entities.get(id)?.kind === 'fish') return true;
  return false;
}

// The winner of a match: more fish secured; on equal counts, the team whose last fish was secured sooner
// in its round; 0-0 (or the same second) a draw.
function matchOutcome(results: Result[]): Team | 'draw' {
  const [a, b] = (['A', 'B'] as const).map((t) => results.find((x) => x.cats === t)!);
  if (a!.secured !== b!.secured) return a!.secured > b!.secured ? 'A' : 'B';
  if (a!.last === null || b!.last === null || a!.last === b!.last) return 'draw';
  return a!.last < b!.last ? 'A' : 'B';
}

function end(r: Round, why: Why): void {
  const cats = catsTeam(r);
  const winner = why === 'fish' ? cats : other(cats);
  r.phase = 'over';
  r.results.push({ cats, secured: r.secured.length, last: r.secured.at(-1)?.at ?? null, why, winner });
  if (r.round < 2) return;
  r.match = matchOutcome(r.results);
  if (r.match !== 'draw') r.score[r.match]++;
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

// Folds one message of the relay's order and says whether it was accepted. `host` is the host the relay
// names as of the message: only its `roster` and `phase` count. The fold reads the ownership table and
// the entities' identities; it writes only the round table.
export function foldRound(r: Round, m: RoundMessage | Left, host: ClientId, t: OwnershipTable, entities: Identities): boolean {
  const p = m.type === 'left' ? undefined : playerOf(r, m.from);
  switch (m.type) {
    case 'hello': {
      // A name a connected client holds is refused, and so is a second name for one client; a known
      // name whose client left is a rejoin: it keeps its team and gets the new client.
      const known = r.roster.find((q) => q.name === m.name);
      if (p || known?.client) return false;
      if (known) known.client = m.from;
      else r.roster.push({ name: m.name, team: null, client: m.from, looks: {}, captured: null });
      return true;
    }
    case 'roster': {
      const named = r.roster.find((q) => q.name === m.name);
      if (m.from !== host || !named) return false;
      named.team = m.team;
      return true;
    }
    case 'look':
      if (!p || !Number.isInteger(m.look) || m.look < 0 || m.look >= LOOKS) return false;
      p.looks[m.side] = m.look;
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
      [r.secured, r.opened] = [[], []];
      for (const q of r.roster) q.captured = null;
      if (m.round === 1) [r.results, r.match] = [[], null];
      return true;
    }
    case 'secured': {
      // Only from the client the ownership table says holds that fish, once per fish.
      const row = t.rows.get(m.fish);
      if (!stealing(r) || entities.get(m.fish)?.kind !== 'fish' || row?.owner !== m.from || !row.held) return false;
      if (r.secured.some((s) => s.fish === m.fish)) return false;
      r.secured.push({ fish: m.fish, at: m.at });
      return true;
    }
    case 'captured':
      if (!inPlay(r) || !p || playsAs(r, m.from) !== 'cat' || p.captured !== null) return false;
      p.captured = m.at;
      return true;
    case 'rescue': {
      // A free cat opens the kennel: every captured cat is free at once.
      const inside = cats(r).filter((q) => q.captured !== null);
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
  }
}

// `receive`'s part for the round. The host's decision is a message like any other: it answers a name
// with no team by the auto-balance, when the hello arrives or when a `left` makes it the host.
export function receiveRound(sim: Sim, m: RoundMessage | Left, host: ClientId): boolean {
  if (!foldRound(sim.round, m, host, sim.ownership, sim.entities)) return false;
  if (host === sim.me && (m.type === 'hello' || m.type === 'left')) {
    for (const p of sim.round.roster) {
      if (p.team !== null || (m.type === 'hello' && p.name !== m.name)) continue;
      sim.outbox.push({ type: 'roster', from: sim.me, name: p.name, team: autoTeam(sim.round, p.name) });
    }
  }
  return true;
}

// The round table turned to a new phase on this client (the entity table is already cleared for prep):
// the phase starts now by this client's clock, and at prep the host spawns the level anew and every
// player its character, of the side the roster gives it this round, at its side's spawn point.
export function turned(sim: Sim, host: ClientId, from: ClientId): void {
  const r = sim.round;
  sim.phaseAt = sim.time;
  if (r.phase === 'heist') sim.heistAt = sim.time;
  sim.called = false;
  sim.events.push({ type: 'phase', to: r.phase, round: r.round, from });
  if (r.phase !== 'prep') return;
  if (host === sim.me) for (const b of levelBodies(sim.level)) sim.outbox.push(spawnOf(sim, b));
  const p = playerOf(r, sim.me);
  const side = playsAs(r, sim.me);
  const at = p && side && spawnPoint(sim.level, side, positionOf(r, p));
  if (side && at) sim.outbox.push(spawnOf(sim, { kind: side, p: at }));
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
