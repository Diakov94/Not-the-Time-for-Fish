import type { Vector } from '@dimforge/rapier3d-compat';
import type { Level } from '../../src/content/level.ts';
import { connect, frame, send, spawn, type Session } from '../../src/net/client.ts';
import type { Kind } from '../../src/sim/entities.ts';
import { grab, throwCarried } from '../../src/sim/grab.ts';
import { IDLE, type Intent } from '../../src/sim/movement.ts';

// A line of a player's script, in seconds from the start of the run: from `at` on the intent is held,
// and the action is pressed once.
export type Step = [at: number, intent: Intent, action: 'grab' | 'throw' | null];
// A player: its side (the scenario's until card 25's roster answers it), where its character enters,
// its script.
export type Player = { side: 'cat' | 'dog'; at: Vector; script: Step[] };
// What a scenario's host spawns beside the level's crates.
export type Thing = { kind: Kind; p: Vector };

export type HeadlessClient = { session: Session; player: Player; next: number };

// A player's client minus render and app: sim and net over the global WebSocket, driven by its script.
// The host spawns the scenario's things before its character, so a client that holds every character
// holds them too.
export async function joinHeadless(url: string, level: Level, name: string, player: Player, things: Thing[] = []): Promise<HeadlessClient> {
  const session = await connect(url, level, name);
  for (const t of things) spawn(session, t.kind, t.p);
  spawn(session, player.side, player.at);
  return { session, player, next: 0 };
}

// One frame, `t` seconds into the script (negative: not started, idle).
export function playHeadless(c: HeadlessClient, t: number, dt: number): void {
  const script = c.player.script;
  for (; c.next < script.length && script[c.next]![0] <= t; c.next++) {
    const action = script[c.next]![2];
    const m = action === 'grab' ? grab(c.session.sim) : action === 'throw' ? throwCarried(c.session.sim) : null;
    if (m) send(c.session, m);
  }
  frame(c.session, dt, c.next > 0 ? script[c.next - 1]![1] : IDLE);
}
