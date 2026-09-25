/// <reference types="vite/client" />
import { Vector3 } from 'three';
import { createAudio, hear } from '../audio/audio.ts';
import type { Level } from '../content/level.ts';
import { connect, frame, send } from '../net/client.ts';
import { dump } from '../net/dump.ts';
import { createHud, drawHud } from '../hud/hud.ts';
import { record } from '../meta/progress.ts';
import { RELAY_PATH } from '../relay/address.ts';
import { createView, draw, type Look, type Target } from '../render/view.ts';
import { emote } from '../sim/emotes.ts';
import { isCharacter, type ClientId, type NetId } from '../sim/entities.ts';
import { drainEvents, markAt } from '../sim/events.ts';
import { grab, throwCarried } from '../sim/grab.ts';
import { interact } from '../sim/heist.ts';
import type { Phase, SimMessage } from '../sim/messages.ts';
import { plant } from '../sim/mines.ts';
import { IDLE, yawOf, type Intent } from '../sim/movement.ts';
import { carried } from '../sim/ownership.ts';
import { usePerk } from '../sim/perks.ts';
import { advance, playerOf } from '../sim/round.ts';
import { init } from '../sim/world.ts';
import { intent, listen } from '../input/keyboard.ts';
import { lobbyScreen } from './screens/lobby.ts';
import { resultsScreen } from './screens/results.ts';
import { roomScreen, waiting } from './screens/room.ts';

const MAX_GAP = 60; // s: the longest gap stepped at once, 3600 steps, 45 ms on the dev Mac; a longer one (a sleep) is cut to it
// The maps by name (ADR 0011): a map is src/content/maps/<name>.ts exporting its Level as <name> in
// camelCase, found by this glob; no index lists them. The world starts in the country house; the host may
// pick any of them in the lobby (card 128).
const maps = Object.fromEntries(
  Object.entries(import.meta.glob<Record<string, Level>>(['../content/maps/*.ts', '!../content/maps/*.test.ts'], { eager: true })).map(([path, m]) => {
    const name = path.slice(path.lastIndexOf('/') + 1, -'.ts'.length);
    return [name, m[name.replace(/-(\w)/g, (_, c: string) => c.toUpperCase())]!];
  }),
);
// The phases the canvas is the screen for; the lobby and the results take the rest (card 48).
const PLAY: Phase[] = ['prep', 'heist', 'overtime'];
// Where the camera parks for a name waiting for the next round: this far above the hideout's first cat
// spawn point, looking down this much.
const PARK_EYE = 1; // m
const PARK_PITCH = 0.35; // rad

// The Vite entry: it wires the zones and holds no game fact. The sim owns every pose, the entity table
// and the fold; net carries them; render draws them; this file only moves input in and frames along.
await init();
// The relay on the page's own origin, `wss` on an https page (a tunnel's), `ws` on http.
const relay = `${location.protocol === 'https:' ? 'wss' : 'ws'}://${location.host}${RELAY_PATH}`;
// The room screen's join is the session: the page's first, and a rejoin once the room is gone (`lost`).
const enter = (lost?: { room: string; name: string }) =>
  roomScreen(async (room, name) => ({ session: await connect(`${relay}/${room}`, maps['country-house']!, name, maps), room, name }), lost);
// The audio's gesture listener goes on before the room screen, so its create or join click starts the graph.
const audio = createAudio();
let joined = await enter();
let { session } = joined;
let { sim } = session;
// The host's button, in the lobby and the results: the round table's successor phase.
const next = () => {
  const m = advance(sim, session.host);
  if (m) send(session, m);
};
const lobby = lobbyScreen(joined.room, (m) => send(session, m), next);
const results = resultsScreen(next);
let hint = document.querySelector<HTMLElement>('.hint')!;
// A client's character, whichever the sim spawned this round.
const characterOf = (client: ClientId | null) => [...sim.entities.values()].find((e) => e.home === client && isCharacter(e.kind))?.id;
const own = () => characterOf(sim.me);
// Spectating (card 51): the round table says this client's cat is captured. Whom the camera follows is
// the app's one decision, made from the table every frame: the own character; while spectating, a free
// teammate, the `tabs`-th of them by Tab, or with none free the kennel's centre.
const spectating = () => (playerOf(sim.round, sim.me)?.captured ?? null) !== null;
let tabs = 0;
function target(): Target | undefined {
  const me = playerOf(sim.round, sim.me);
  if (!me || me.captured === null) return own();
  const free = sim.round.roster.filter((p) => p.side === me.side && p.client !== sim.me && p.captured === null).flatMap((p) => characterOf(p.client) ?? []);
  return free.length > 0 ? free[tabs % free.length] : sim.level.volumes.find((v) => v.role === 'kennel')?.p;
}
// Waiting for the next round (room.ts's `waiting`): no character, and no view of the property, which the
// fence and the hiding spots exist to deny. The camera parks at the hideout's spawn point, whatever the
// mouse does, looking the opposite way from the point, away from the fence: toward it, the gate content
// draws open shows the yard and the house.
function parked(): { look: Look; at: Target } | undefined {
  const pt = waiting(sim) ? sim.level.points.find((p) => p.role === 'catSpawn') : undefined;
  return pt && { look: { yaw: pt.yaw + Math.PI, pitch: PARK_PITCH }, at: { x: pt.p.x, y: pt.p.y + PARK_EYE, z: pt.p.z } };
}
// Each new own character (a round's, a rejoin's) turns the look's yaw to its body's facing, where the sim
// spawned it, so the camera starts behind it; the pitch stays the viewer's.
let faced: NetId | undefined;
function face(): void {
  const id = own();
  if (id !== undefined && id !== faced) input.look.yaw = yawOf(sim.entities.get(id)!.body.rotation());
  faced = id;
}
// Play: the canvas is the screen and the own character is not a spectator; only then the keys count.
const acting = () => PLAY.includes(sim.round.phase) && !spectating();

const canvas = document.querySelector('canvas')!;
// A press's sim call, sent only in play; what it does is the sim's, by kind.
const act = (call: () => SimMessage | null) => () => {
  const m = acting() ? call() : null;
  if (m) send(session, m);
};
const input = listen(canvas, own, {
  grab: act(() => (carried(sim) ? throwCarried(sim) : grab(sim))),
  plant: act(() => plant(sim)),
  interact: act(() => interact(sim)),
  perk: act(() => usePerk(sim)),
  mark: act(() => markAt(sim, view.camera.position, view.camera.getWorldDirection(new Vector3()))),
  emote: (n) => act(() => emote(sim, n))(),
  next: () => {
    if (spectating()) tabs++;
  },
  report: () => {
    // The desync report: the dump the headless runner compares, as a file.
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([JSON.stringify(dump(sim), null, 2)], { type: 'application/json' }));
    a.download = `desync-${sim.me}-${new Date().toISOString().replaceAll(':', '-')}.json`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  },
});
const view = createView(canvas, sim);
const hud = createHud();

// Real time goes to the sim, whose accumulator cuts it into fixed 60 Hz steps (`step`); render draws
// between the last two of them. All of it goes, a gap after a stall too (up to MAX_GAP), so the sim's time
// is the tab's real time again one frame after a stall: the phase's start is sim time and the host's clock
// duty runs inside the step (ADRs 0003, 0007).
let last = performance.now();
function advanceTo(now: number, held: Intent): void {
  const gap = Math.max(now - last, 0);
  last += gap;
  frame(session, Math.min(gap / 1000, MAX_GAP), held);
}
// A hidden tab gets no animation frames, so a 1 s timer, Chrome's throttled rate there, steps it: the
// host's `phase` goes out at most a second late. Its character stands still meanwhile, the stalled client
// of GAME.md's risk row; the meta save still counts the steps' ends, and their events go unheard.
setInterval(() => {
  if (!document.hidden) return;
  advanceTo(performance.now(), IDLE);
  record(sim);
  drainEvents(sim);
}, 1000);
// The screen is the round table's phase, read every frame. The canvas is drawn only while it is the
// screen; the keys move the character only in play, and the mouse is freed for the lobby's and the
// results' buttons.
requestAnimationFrame(function loop(now: number) {
  const playing = PLAY.includes(sim.round.phase);
  face();
  advanceTo(now, acting() ? intent(input, own()) : IDLE);
  const park = parked();
  if (playing) draw(view, sim, park?.look ?? input.look, park?.at ?? target());
  hear(audio, sim, { position: view.orbit, quaternion: view.camera.quaternion });
  drawHud(hud, sim, view, target());
  hint.hidden = !playing;
  if (!playing && document.pointerLockElement) document.exitPointerLock();
  lobby(sim, session.host);
  results(sim, session.host);
  record(sim); // the meta save (ADR 0013) counts this frame's ends and own events
  drainEvents(sim); // every view has read this frame's events
  requestAnimationFrame(loop);
});

// The room gone for this client (net's `closed`, whatever closed the socket): `frame` steps and sends
// nothing from then on, the mouse is freed, and the room screen returns with the reason, the name and the
// code kept. Its join is a rejoin by name, and the loop plays on in the new session.
for (;;) {
  await session.closed;
  document.exitPointerLock();
  joined = await enter(joined);
  ({ session } = joined);
  sim = session.sim;
  hint = document.querySelector<HTMLElement>('.hint')!;
}
