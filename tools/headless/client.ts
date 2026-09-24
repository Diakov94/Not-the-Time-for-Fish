import { countryHouse } from '../../src/content/country-house.ts';
import { connect, frame, send, spawn, type Session } from '../../src/net/client.ts';
import { spawnPoint } from '../../src/sim/build.ts';
import { grab, throwCarried } from '../../src/sim/grab.ts';
import { IDLE, type Intent } from '../../src/sim/movement.ts';

const walk = (z: number): Intent => ({ move: { x: 0, z }, sprint: false, jump: false });

// Every headless client's scripted input, in seconds from the start of the run: from its cat spawn in the
// country house's hideout it walks north, grabs, walks back, throws, and walks north to the fence.
const SCRIPT: [at: number, intent: Intent, action: 'grab' | 'throw' | null][] = [
  [0, walk(1), null],
  [0.6, IDLE, 'grab'],
  [0.8, walk(-1), null],
  [2.0, IDLE, 'throw'],
  [2.2, walk(-1), null],
  [3.4, walk(1), null],
  [7.0, IDLE, null],
];

export type HeadlessClient = { session: Session; next: number };

// A player's client minus render and app: sim and net over the global WebSocket, driven by SCRIPT.
// Its character starts at the level's cat spawn of its lane.
export async function joinHeadless(url: string, lane: number): Promise<HeadlessClient> {
  const session = await connect(url, countryHouse);
  spawn(session, 'cat', spawnPoint(countryHouse, 'cat', lane)!);
  return { session, next: 0 };
}

// One frame, `t` seconds into the script (negative: not started, idle).
export function playHeadless(c: HeadlessClient, t: number, dt: number): void {
  for (; c.next < SCRIPT.length && SCRIPT[c.next]![0] <= t; c.next++) {
    const action = SCRIPT[c.next]![2];
    const m = action === 'grab' ? grab(c.session.sim) : action === 'throw' ? throwCarried(c.session.sim) : null;
    if (m) send(c.session, m);
  }
  frame(c.session, dt, c.next > 0 ? SCRIPT[c.next - 1]![1] : IDLE);
}
