import { prototypeRoom } from '../../../src/content/prototype-room.ts';
import type { Intent } from '../../../src/sim/movement.ts';
import type { Step } from '../client.ts';
import type { Run, Scenario, Verdict } from '../run.ts';

const sprint = (z: number): Intent => ({ move: { x: 0, z }, sprint: true, jump: false });

const LANES = Array.from({ length: 8 }, (_, i) => -8.75 + 2.5 * i); // eight lanes 2.5 m apart across the 20 m room
const COLUMN = [-2.2, -1.1, 0, 1.1, 2.2]; // five crates down each lane, 0.1 m apart
const CRATE = prototypeRoom.props[0]!; // the content room's 1 m crate, resting on the floor

// Every cat sprints north 0.8 s and back 0.4 s, over and over: it drives its lane's column to the north
// wall and keeps ramming it, so what it shoved is shoved again before it could sleep (Rapier's 2 s).
const SCRIPT: Step[] = Array.from({ length: 100 }, (_, k) => [Math.floor(k / 2) * 1.2 + (k % 2) * 0.8, sprint(k % 2 === 0 ? 1 : -1), null]);
const RAMP = 5000; // ms: by then every cat has reached its column

// How far from the worst case the measurement is: how many props were awake on their owner, the ones its
// ticks carry, once every column is reached: on average, and in how many frames all of them were.
function judge({ samples, start }: Run): Verdict {
  const props = samples[0]!.dumps[0]!.entities.filter((e) => e.kind === 'prop').length;
  const awake = samples
    .filter(({ t }) => t - start >= RAMP)
    .map(({ dumps }) => dumps.reduce((n, d) => n + d.entities.filter((e) => e.kind === 'prop' && e.owner === d.me && !e.rest).length, 0));
  const mean = awake.reduce((n, x) => n + x, 0) / awake.length;
  const all = (100 * awake.filter((x) => x === props).length) / awake.length;
  return { lines: [`props awake on their owner after ${RAMP / 1000} s: ${mean.toFixed(1)} of ${props} on average, all ${props} in ${all.toFixed(0)} % of frames`], ok: true };
}

// ADR 0005's arithmetic at GAME.md's largest room: eight cats and 40 synced crates, all shoving for the run.
export const eightClients: Scenario = {
  about: 'eight cats ram 40 crates to the north wall, again and again',
  level: { ...prototypeRoom, props: LANES.flatMap((x) => COLUMN.map((z) => ({ ...CRATE, p: { x, y: CRATE.p.y, z } }))) },
  player: (i) => ({ side: 'cat', at: { x: LANES[i % LANES.length]!, y: 1, z: -8 }, script: SCRIPT }),
  judge,
};
