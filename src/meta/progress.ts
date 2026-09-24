import type { SimEvent } from '../sim/events.ts';
import type { Side } from '../sim/messages.ts';
import { playerOf, playsAs } from '../sim/round.ts';
import type { Sim } from '../sim/world.ts';

// ADR 0013: what this viewer has earned, this browser's own (GAME.md: localStorage, no accounts). Counted
// from the round table's ends and this client's own events, under one versioned key; a cleared storage is
// a fresh start. A capture is born at the captured cat's client and the table keeps no captor, so
// `captured` counts every cat caught while this player plays a dog: the dogs catch as a team.
export type Progress = {
  matches: number; // matches played to their end
  wins: Record<Side, number>; // rounds won, by the side this player played
  fish: number; // fish this player secured
  captured: number; // cats captured while this player was a dog
  rescues: number;
  defuses: number;
  mines: number; // mines planted
  dugOut: number; // dig-outs
};
const KEY = 'meta.progress.v1';

const fresh = (): Progress => ({ matches: 0, wins: { cat: 0, dog: 0 }, fish: 0, captured: 0, rescues: 0, defuses: 0, mines: 0, dugOut: 0 });
let cached: Progress | null = null;
// The events already counted: `record` may meet the same list twice before the loop drains it.
const seen = new WeakSet<SimEvent>();

// Storage may be off (a private window, blocked site data): then the defaults, and nothing is kept.
export function progress(): Readonly<Progress> {
  if (cached) return cached;
  try {
    const saved = JSON.parse(localStorage.getItem(KEY) ?? '{}') as Partial<Progress>;
    cached = { ...fresh(), ...saved, wins: { ...fresh().wins, ...saved.wins } };
  } catch {
    cached = fresh();
  }
  return cached;
}

// Once a frame, before the loop drains the events: an `over` the table turned to counts the round's
// result for this player's team, and a match once its second round is over; this client's own events
// count once each.
export function record(sim: Pick<Sim, 'me' | 'round' | 'events'>): void {
  const p = progress() as Progress;
  const r = sim.round;
  let changed = false;
  for (const ev of sim.events) {
    if (seen.has(ev)) continue;
    seen.add(ev);
    const mine = ev.from === sim.me;
    if (ev.type === 'phase' && ev.to === 'over') {
      const team = playerOf(r, sim.me)?.team;
      const result = r.results[ev.round - 1];
      if (!team || !result) continue;
      if (result.winner === team) p.wins[result.cats === team ? 'cat' : 'dog']++;
      if (ev.round === 2) p.matches++;
    } else if (ev.type === 'captured' && playsAs(r, sim.me) === 'dog') p.captured++;
    else if (mine && ev.type === 'secured') p.fish++;
    else if (mine && ev.type === 'rescue') p.rescues++;
    else if (mine && ev.type === 'defused') p.defuses++;
    else if (mine && ev.type === 'planted' && ev.kind === 'mine') p.mines++;
    else if (mine && ev.type === 'dugOut') p.dugOut++;
    else continue;
    changed = true;
  }
  if (!changed) return;
  try {
    localStorage.setItem(KEY, JSON.stringify(p));
  } catch {
    // nothing kept: nothing to do
  }
}
