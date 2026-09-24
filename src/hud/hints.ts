import { whisker } from '../sim/mines.ts';
import type { Sim } from '../sim/world.ts';
import { HINT } from './words.ts';

// GAME.md, Onboarding: during a player's first round, one short phrase at the moment it is needed: the
// controls of the player's side in prep, the objective as the heist starts, the mines at the first whisker
// cue or blast, the kennel at the first capture. Each is called for by a sim fact and shown once per
// browser; the browser keeps only which hints it has seen, a per-viewer setting.
export type Hint = keyof typeof HINT;
const KEY = 'hud.hints.seen';

// The first hint this frame's facts call for that this browser has not seen.
export function due(sim: Sim): Hint | null {
  const r = sim.round;
  const calls: [Hint, boolean][] = [
    ['controls', r.phase === 'prep'],
    ['objective', r.phase === 'heist'],
    ['mines', whisker(sim) || sim.events.some((e) => e.type === 'blast')],
    ['kennel', r.roster.some((p) => p.captured !== null)],
  ];
  const s = seen();
  return calls.find(([hint, now]) => now && !s.has(hint))?.[0] ?? null;
}

// Storage may be off (a private window, blocked site data): then every hint is new to it again.
function seen(): Set<string> {
  try {
    return new Set(JSON.parse(localStorage.getItem(KEY) ?? '[]'));
  } catch {
    return new Set();
  }
}

export function see(...hints: Hint[]): void {
  try {
    localStorage.setItem(KEY, JSON.stringify([...new Set([...seen(), ...hints])]));
  } catch {
    // nothing kept: nothing to do
  }
}
