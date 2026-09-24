import { whisker } from '../sim/mines.ts';
import type { Side } from '../sim/messages.ts';
import type { Sim } from '../sim/world.ts';
import { HINT } from './words.ts';

// GAME.md, Onboarding: during a player's first round on a side, one short phrase at the moment it is
// needed: the controls of the player's side in prep, the objective as the heist starts, the mines at the
// first whisker cue or blast, the kennel at the first capture. Each is called for by a sim fact and shown
// once per side per browser, as its text is per side; the browser keeps only which hints it has seen, a
// per-viewer memory, read from storage once and written through.
export type Hint = keyof typeof HINT;
const KEY = 'hud.hints.seen';
let seen: Set<string> | undefined;

// The first hint this frame's facts call for that this browser has not seen on `side`.
export function due(sim: Sim, side: Side): Hint | null {
  const r = sim.round;
  const calls: [Hint, boolean][] = [
    ['controls', r.phase === 'prep'],
    ['objective', r.phase === 'heist'],
    ['mines', whisker(sim) || sim.events.some((e) => e.type === 'blast')],
    ['kennel', r.roster.some((p) => p.captured !== null)],
  ];
  const s = read();
  return calls.find(([hint, now]) => now && !s.has(`${hint}:${side}`))?.[0] ?? null;
}

// Storage may be off (a private window, blocked site data): then every hint is new to this tab again.
function read(): Set<string> {
  try {
    seen ??= new Set(JSON.parse(localStorage.getItem(KEY) ?? '[]'));
  } catch {
    seen = new Set();
  }
  return seen;
}

export function see(side: Side, ...hints: Hint[]): void {
  const s = read();
  hints.forEach((hint) => s.add(`${hint}:${side}`));
  try {
    localStorage.setItem(KEY, JSON.stringify([...s]));
  } catch {
    // nothing kept: nothing to do
  }
}
