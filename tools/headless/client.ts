import type { Vector } from '@dimforge/rapier3d-compat';
import type { Level } from '../../src/content/level.ts';
import { connect, frame, send, spawn, type Session } from '../../src/net/client.ts';
import type { Kind } from '../../src/sim/entities.ts';
import { grab, throwCarried } from '../../src/sim/grab.ts';
import { interact } from '../../src/sim/heist.ts';
import type { Side } from '../../src/sim/messages.ts';
import { plant } from '../../src/sim/mines.ts';
import { IDLE, type Intent } from '../../src/sim/movement.ts';

// A key a player taps: LMB (grab or throw), E (interact), Q (plant a mine or a trap, set a trap off).
export type Action = 'grab' | 'throw' | 'interact' | 'plant';
const ACTIONS = { grab, throw: throwCarried, interact, plant };
// A line of a player's script, in seconds from the start of the run: from `at` on the intent is held,
// and the action is pressed once.
export type Step = [at: number, intent: Intent, action: Action | null];
// A bot's frame: the intent held, a key tapped, or its tab closed (`leave`) and opened again with its
// name (`rejoin`), which the runner does.
export type Press = { intent: Intent; action?: Action | 'leave' | 'rejoin' };
export type Script = Generator<Press, void, void>;
// A bot reads its own client's sim, as its player reads the screen, and is started anew at every prep
// for the side the roster gives it that round.
export type Bot = (me: HeadlessClient) => Script;
// A player: its side, where its character enters (a lobby scenario spawns it there; a round scenario's
// sim spawns it at its side's point at prep), its script.
export type Player = { side: Side; at?: Vector; script: Step[] | Bot };
// What a scenario's host spawns beside the level's crates.
export type Thing = { kind: Kind; p: Vector };

// `t`: seconds into the run, the bot's clock, which runs on while its tab is closed; `round`: the round
// whose prep started the bot's script; `left`: its tab is closed; `intent`: what its player held this
// frame; `error`: why its script stopped.
export type HeadlessClient = {
  session: Session;
  name: string;
  player: Player;
  next: number;
  bot: Script | null;
  t: number;
  round: number;
  left: boolean;
  intent: Intent;
  error?: string;
};

// A player's client minus render and app: sim and net over the global WebSocket, driven by its script.
// In a lobby scenario the host spawns the scenario's things before its character, so a client that holds
// every character holds them too; in a round scenario nothing is spawned until prep.
export async function joinHeadless(url: string, level: Level, name: string, player: Player, things: Thing[] = [], lobby = true): Promise<HeadlessClient> {
  const session = await connect(url, level, name);
  for (const t of lobby ? things : []) spawn(session, t.kind, t.p);
  if (lobby) spawn(session, player.side, player.at!);
  return { session, name, player, next: 0, bot: null, t: 0, round: 0, left: false, intent: IDLE };
}

// One frame, `t` seconds into the run (negative: not started, idle); a closed tab's bot runs on without
// a frame. Returns what only the runner can do.
export function playHeadless(c: HeadlessClient, t: number, dt: number): 'leave' | 'rejoin' | undefined {
  const { sim } = c.session;
  const script = c.player.script;
  let action: Press['action'];
  c.t = t;
  c.intent = IDLE;
  if (Array.isArray(script)) {
    for (; c.next < script.length && script[c.next]![0] <= t; c.next++) press(c, script[c.next]![2]);
    if (c.next > 0) c.intent = script[c.next - 1]![1];
  } else {
    if (!c.left && sim.round.phase === 'prep' && c.round !== sim.round.round) [c.bot, c.round] = [script(c), sim.round.round];
    try {
      const r = c.bot?.next();
      if (r && !r.done) ({ intent: c.intent, action } = r.value);
    } catch (e) {
      [c.error, c.bot] = [(e as Error).message, null];
    }
    if (action === 'leave' || action === 'rejoin') return action;
    if (c.left) return undefined;
    press(c, action ?? null);
  }
  frame(c.session, dt, c.intent);
  return undefined;
}

function press(c: HeadlessClient, action: Action | null): void {
  const m = action && ACTIONS[action](c.session.sim);
  if (m) send(c.session, m);
}
