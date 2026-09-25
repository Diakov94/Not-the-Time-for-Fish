import { countryHouse } from '../../../src/content/maps/country-house.ts';
import type { SimEvent } from '../../../src/sim/events.ts';
import { IDLE, SPEED } from '../../../src/sim/movement.ts';
import { dogCount } from '../../../src/sim/round.ts';
import { sniffed } from '../../../src/sim/scent.ts';
import type { HeadlessClient, Press } from '../client.ts';
import type { Run, Scenario, Verdict } from '../run.ts';
import { go, hold, mineNear, phase, place, plantHere, simOf, tap, until, type P } from './bots.ts';
import { ROUTE, standby, throughGate } from './house.ts';

type Script = Generator<Press, void>;
const p = (x: number, z: number): P => ({ x, z });
const DOORWAY = p(0, -6.6); // on the front door's threshold, clear of its panel
const PICKUP = countryHouse.points.find((q) => q.role === 'trapPickup')!.p; // the one in the yard's south-west
const TRAP = p(-4, -12); // where the second cat plants its first trap, 7 m from the first dog's post
const POSTS = [p(3, -10), p(6, -8)]; // where each dog waits once its mine is in

// The first cat: sneaks up to the gate's mine, feels it and defuses it, then walks for the front door
// straight over the second mine, and on once the stun lets it.
function* sneaker(c: HeadlessClient): Script {
  yield* until(c, () => phase(c) === 'heist');
  yield* throughGate(c);
  const m = mineNear(c, DOORWAY)?.body.translation() ?? DOORWAY;
  yield* go(c, [p(0, -14), p(m.x, m.z)]);
}

// The second cat: out once the gate is clear, its trap planted in the yard; on a trap pickup until it is its
// own again (the first is cleared), that one planted there, and set off from 5 m away.
function* trapper(c: HeadlessClient): Script {
  yield* until(c, () => phase(c) === 'heist');
  yield* throughGate(c);
  yield* go(c, [...ROUTE.east.slice(0, 2), TRAP]);
  yield* tap('plant');
  yield* go(c, [p(PICKUP.x, PICKUP.z)]);
  yield* until(c, () => simOf(c).trap !== null);
  yield* tap('plant');
  yield* go(c, [p(PICKUP.x + 5, PICKUP.z - 1)]);
  yield* tap('plant');
}

// The first dog: its mine at the gate, and the front door's too when it is the only dog (the rotation's
// one at 3 and 4 players), then at its post sniffing until a planted trap is in the air, to it, and cleared.
function* sniffer(c: HeadlessClient): Script {
  yield* go(c, ROUTE.dogToGate, { sprint: true });
  yield* plantHere(c);
  if (simOf(c).round.roster.filter((q) => q.side === 'dog').length === 1) {
    yield* go(c, [p(0, -14), DOORWAY], { sprint: true });
    yield* plantHere(c);
  }
  yield* go(c, [POSTS[0]!]);
  let trap: string | undefined;
  const planted = () => (trap = sniffed(simOf(c)).traps.find((id) => simOf(c).entities.get(id)?.home !== null));
  yield* until(c, () => planted() !== undefined, { ...IDLE, sniff: true });
  const at = simOf(c).entities.get(trap!)!.body.translation();
  yield* go(c, [p(at.x + 1, at.z)]);
  yield* tap('interact');
  yield* until(c, () => !simOf(c).entities.has(trap!));
  yield* go(c, [POSTS[0]!]);
}

// The second dog: after the first has left the spawn, its mine on the front door's threshold, then at its
// post until a sprung trap's ping pulls it across the yard.
function* listener(c: HeadlessClient): Script {
  yield* hold(c, 1.5);
  yield* go(c, [p(8.8, 12.5), p(8.8, -7.5), DOORWAY], { sprint: true });
  yield* plantHere(c);
  yield* go(c, [POSTS[1]!]);
  let at: P | undefined;
  const ping = () => (at = simOf(c).events.find((e): e is Extract<SimEvent, { type: 'noise' }> => e.type === 'noise' && e.cause === 'trap')?.p);
  yield* until(c, () => ping() !== undefined);
  yield* go(c, [p(at!.x + 2, at!.z)], { sprint: true });
}

const script = (c: HeadlessClient): Script => {
  const { side, n } = place(c);
  return side === 'cat' ? ([sneaker, trapper][n] ?? standby)(c) : n === 0 ? sniffer(c) : listener(c);
};

// Card 64's judge, every number from the samples: each client's count of blasts, defuses, sprung and cleared
// traps; how long the stunned cat's intent did not move it (from the blast to the first frame its body
// goes the way its player pushes at half a walk or more); when its whisker cue came against its defuse; the
// ping count on every client, the same on each, the dogs' clients among them.
function judge(r: Run): Verdict {
  const here = r.ends.flatMap((e, i) => (e ? [i] : []));
  const count = (i: number, type: string) => r.samples.reduce((n, x) => n + x.events[i]!.filter((e) => e.type === type).length, 0);
  const ends = ['blast', 'defused', 'sprung', 'cleared'] as const;
  const counts = here.map((i) => ends.map((type) => count(i, type)));
  const once = counts.every((c) => c.every((n) => n === 1));
  // The cat that set a mine off, on its own connection.
  const cat = here.find((i) => r.samples.some((x) => x.events[i]!.some((e) => e.type === 'blast' && e.from === r.ids[i])));
  const at = (i: number, type: string) => r.samples.findIndex((x) => x.events[i]!.some((e) => e.type === type));
  let stun = NaN;
  let cue = NaN;
  if (cat !== undefined) {
    const own = (j: number) => r.samples[j]!.dumps[cat]?.entities.find((e) => e.home === r.ids[cat] && e.kind === 'cat')?.p;
    const blast = at(cat, 'blast');
    for (let j = blast + 1; j < r.samples.length && Number.isNaN(stun); j++) {
      const [a, b, move] = [own(j - 1), own(j), r.samples[j]!.intents[cat]!.move];
      const len = Math.hypot(move.x, move.z);
      const dt = (r.samples[j]!.t - r.samples[j - 1]!.t) / 1000;
      if (a && b && len > 0.5 && ((b.x - a.x) * move.x + (b.z - a.z) * move.z) / len / dt >= SPEED.cat.walk / 2) stun = (r.samples[j]!.t - r.samples[blast]!.t) / 1000;
    }
    const first = r.samples.findIndex((x) => x.cues[cat]);
    const defused = at(cat, 'defused');
    if (first >= 0 && defused >= 0) cue = (r.samples[defused]!.t - r.samples[first]!.t) / 1000;
  }
  const pings = here.map((i) => r.samples.reduce((n, x) => n + x.events[i]!.filter((e) => e.type === 'noise').length, 0));
  const dogs = here.filter((i) => r.ends[i]!.roster.find((q) => q.client === r.ids[i])?.side === 'dog'); // the fold's sides (ADR 0014)
  const lines = [
    `per client blasts/defused/sprung/cleared: ${counts.map((c) => c.join('/')).join(', ')}`,
    `the stunned cat's intent ignored for ${stun.toFixed(3)} s (3.0 +- 0.1); its whisker cue ${cue.toFixed(2)} s before its defuse`,
    `pings per client: ${pings.join(', ')}; on the dogs' clients ${dogs.map((i) => pings[i]).join(' and ')}`,
  ];
  const ok = once && Math.abs(stun - 3) <= 0.1 && cue > 0 && dogs.length === dogCount(new Set(r.seats).size) && pings.every((n) => n === pings[0]);
  return { lines, ok };
}

// Card 64 with the rotation's dogs: one at 3 and 4 players plants both mines, two at 5 to 7 one each
// (every further cat stands by): mines armed, felt, defused and set off; a trap planted, sniffed out and
// cleared; a second one sprung across the yard.
const minesAndTraps: Scenario = {
  about: 'a mine defused after the whisker cue, one stepped on; a trap cleared, one sprung',
  level: countryHouse,
  player: () => ({ script }),
  judge,
  round: true,
  seconds: 80,
};
export default minesAndTraps;
