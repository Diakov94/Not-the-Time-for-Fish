import { ofSide } from '../content/characters.ts';
import type { Emote } from './messages.ts';
import { myCharacter } from './movement.ts';
import { inPlay, lookOf, playerOf } from './round.ts';
import type { Sim } from './world.ts';

export const EMOTE_LASTS = 3; // s an emote plays: its sender sends no second one sooner

// Keys 1-4 or the d-pad (GAME.md, Controls), answered by this client's own kind: emote `n` of the character
// its player's look gives it on that side, in play only and only one the roster names; none while its last
// one still plays, by this client's own clock. An emote is an event (ADR 0013): every client, this one
// included, appends it from the echo, and nothing stores it.
export function emote(sim: Sim, n: number): Emote | null {
  const c = myCharacter(sim);
  const p = playerOf(sim.round, sim.me);
  if (!c || !p || (c.kind !== 'cat' && c.kind !== 'dog') || !inPlay(sim.round) || sim.time < sim.emoteUntil - 1e-9) return null;
  if (n >= ofSide(c.kind)[lookOf(sim.round, p, c.kind)]!.emotes.length) return null;
  sim.emoteUntil = sim.time + EMOTE_LASTS;
  return { type: 'emote', from: sim.me, n };
}
