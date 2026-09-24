import type { ClientId } from './entities.ts';
import type { Hello, Left, Look, Roster, Side, Team } from './messages.ts';
import type { Sim } from './world.ts';

// ADR 0007's round table: a pure function of the relay's order, written only by `foldRound` on every
// client. A player is a name: its team (null until the host answers its first hello), the client it
// plays from (null while it is away) and the look it picked per side.
export type Player = { name: string; team: Team | null; client: ClientId | null; looks: Partial<Record<Side, number>> };
export type Round = {
  roster: Player[]; // in the order of each name's first hello
  round: number; // 0 in the lobby, 1 or 2 within a match
};

export type RoundMessage = Hello | Roster | Look | Left;

const LOOKS = 3; // per side (GAME.md, Characters)

export function newRound(): Round {
  return { roster: [], round: 0 };
}

export const playerOf = (r: Round, client: ClientId): Player | undefined => r.roster.find((p) => p.client === client);

// Team A plays cats in round 1, and the teams swap sides for round 2.
export const catsTeam = (r: Round): Team => (r.round === 2 ? 'B' : 'A');

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

// Folds one message of the relay's order and says whether it was accepted. `host` is the host the relay
// names as of the message: only its `roster` counts.
export function foldRound(r: Round, m: RoundMessage, host: ClientId): boolean {
  switch (m.type) {
    case 'hello': {
      // A name a connected client holds is refused, and so is a second name for one client; a known
      // name whose client left is a rejoin: it keeps its team and gets the new client.
      const known = r.roster.find((p) => p.name === m.name);
      if (playerOf(r, m.from) || known?.client) return false;
      if (known) known.client = m.from;
      else r.roster.push({ name: m.name, team: null, client: m.from, looks: {} });
      return true;
    }
    case 'roster': {
      const p = r.roster.find((q) => q.name === m.name);
      if (m.from !== host || !p) return false;
      p.team = m.team;
      return true;
    }
    case 'look': {
      const p = playerOf(r, m.from);
      if (!p || !Number.isInteger(m.look) || m.look < 0 || m.look >= LOOKS) return false;
      p.looks[m.side] = m.look;
      return true;
    }
    case 'left':
      for (const p of r.roster) if (p.client === m.id) p.client = null;
      return true;
  }
}

// `receive`'s part for the round. The host's decision is a message like any other: it answers a name
// with no team by the auto-balance, when the hello arrives or when a `left` makes it the host.
export function receiveRound(sim: Sim, m: RoundMessage, host: ClientId): void {
  if (!foldRound(sim.round, m, host) || host !== sim.me || (m.type !== 'hello' && m.type !== 'left')) return;
  for (const p of sim.round.roster) {
    if (p.team !== null || (m.type === 'hello' && p.name !== m.name)) continue;
    sim.outbox.push({ type: 'roster', from: sim.me, name: p.name, team: autoTeam(sim.round, p.name) });
  }
}
