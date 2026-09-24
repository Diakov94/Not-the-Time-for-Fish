import { connect, frame, send, spawn } from '../net/client.ts';
import { dump } from '../net/dump.ts';
import { createView, draw } from '../render/view.ts';
import { grab, throwCarried, THROW_SPEED } from '../sim/grab.ts';
import { prototypeRoom } from '../sim/level.ts';
import { carried } from '../sim/ownership.ts';
import { init } from '../sim/world.ts';
import { intent, listen } from './input.ts';
import { roomScreen } from './screens/room.ts';

const RELAY_PORT = 8787; // `npm run relay` (src/relay/serve.ts)
const MAX_FRAME = 0.25; // s: a longer frame (a tab back from the background) is stepped as this much

// The Vite entry: it wires the zones and holds no game fact. The sim owns every pose, the entity table
// and the fold; net carries them; render draws them; this file only moves input in and frames along.
await init();
const session = await roomScreen((code) => connect(`ws://${location.hostname}:${RELAY_PORT}/${code}`, prototypeRoom));
const { sim } = session;
// The Prototype room names no spawn point (the headless clients keep lanes): a random spot south of the
// crates keeps two players who enter at once apart.
spawn(session, 'character', { x: (Math.random() - 0.5) * 8, y: 1, z: 0 });

const canvas = document.querySelector('canvas')!;
const input = listen(
  canvas,
  () => {
    const m = carried(sim) ? throwCarried(sim, THROW_SPEED) : grab(sim);
    if (m) send(session, m);
  },
  () => {
    // The desync report: the dump the headless runner compares, as a file.
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([JSON.stringify(dump(sim), null, 2)], { type: 'application/json' }));
    a.download = `desync-${sim.me}-${new Date().toISOString().replaceAll(':', '-')}.json`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  },
);
const view = createView(canvas, sim);

// Real time goes to the sim, whose accumulator cuts it into fixed 60 Hz steps (`step`); render draws
// between the last two of them.
let last = performance.now();
requestAnimationFrame(function loop(now: number) {
  frame(session, Math.min((now - last) / 1000, MAX_FRAME), intent(input));
  last = now;
  draw(view, sim, input.look);
  requestAnimationFrame(loop);
});
