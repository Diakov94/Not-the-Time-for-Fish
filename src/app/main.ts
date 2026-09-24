import { Vector3 } from 'three';
import { createAudio, hear } from '../audio/audio.ts';
import { countryHouse } from '../content/country-house.ts';
import { connect, frame, send } from '../net/client.ts';
import { dump } from '../net/dump.ts';
import { RELAY_PATH } from '../relay/address.ts';
import { createView, draw } from '../render/view.ts';
import { isCharacter } from '../sim/entities.ts';
import { drainEvents, markAt } from '../sim/events.ts';
import { grab, throwCarried } from '../sim/grab.ts';
import { interact } from '../sim/heist.ts';
import type { Phase, SimMessage } from '../sim/messages.ts';
import { plant } from '../sim/mines.ts';
import { IDLE } from '../sim/movement.ts';
import { carried } from '../sim/ownership.ts';
import { usePerk } from '../sim/perks.ts';
import { advance } from '../sim/round.ts';
import { init } from '../sim/world.ts';
import { intent, listen } from './input.ts';
import { lobbyScreen } from './screens/lobby.ts';
import { resultsScreen } from './screens/results.ts';
import { roomScreen } from './screens/room.ts';

const MAX_FRAME = 0.25; // s: a longer frame (a tab back from the background) is stepped as this much
// The phases the canvas is the screen for; the lobby and the results take the rest (card 48).
const PLAY: Phase[] = ['prep', 'heist', 'overtime'];

// The Vite entry: it wires the zones and holds no game fact. The sim owns every pose, the entity table
// and the fold; net carries them; render draws them; this file only moves input in and frames along.
await init();
// The relay on the page's own origin, `wss` on an https page (a tunnel's), `ws` on http.
const relay = `${location.protocol === 'https:' ? 'wss' : 'ws'}://${location.host}${RELAY_PATH}`;
const { session, room } = await roomScreen(async (room, name) => ({ session: await connect(`${relay}/${room}`, countryHouse, name), room }));
const { sim } = session;
// The host's button, in the lobby and the results: the round table's successor phase.
const next = () => {
  const m = advance(sim, session.host);
  if (m) send(session, m);
};
const lobby = lobbyScreen(room, (m) => send(session, m), next);
const results = resultsScreen(next);
const hint = document.querySelector<HTMLElement>('.hint')!;
// The camera's target: this client's own character, whichever the sim spawned it this round.
const own = () => [...sim.entities.values()].find((e) => e.home === sim.me && isCharacter(e.kind))?.id;

const canvas = document.querySelector('canvas')!;
// A press's sim call, sent only while the canvas is the screen; what it does is the sim's, by kind.
const act = (call: () => SimMessage | null) => () => {
  const m = PLAY.includes(sim.round.phase) ? call() : null;
  if (m) send(session, m);
};
const input = listen(canvas, own, {
  grab: act(() => (carried(sim) ? throwCarried(sim) : grab(sim))),
  plant: act(() => plant(sim)),
  interact: act(() => interact(sim)),
  perk: act(() => usePerk(sim)),
  mark: act(() => markAt(sim, view.camera.position, view.camera.getWorldDirection(new Vector3()))),
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
const audio = createAudio();

// Real time goes to the sim, whose accumulator cuts it into fixed 60 Hz steps (`step`); render draws
// between the last two of them.
let last = performance.now();
// The screen is the round table's phase, read every frame; the keys move the character only while the
// canvas is the screen, and the mouse is freed for the lobby's and the results' buttons.
requestAnimationFrame(function loop(now: number) {
  const playing = PLAY.includes(sim.round.phase);
  frame(session, Math.min((now - last) / 1000, MAX_FRAME), playing ? intent(input, own()) : IDLE);
  last = now;
  draw(view, sim, input.look, own());
  hear(audio, sim, view.camera);
  hint.hidden = !playing;
  if (!playing && document.pointerLockElement) document.exitPointerLock();
  lobby(sim, session.host);
  results(sim, session.host);
  drainEvents(sim); // every view has read this frame's events
  requestAnimationFrame(loop);
});
