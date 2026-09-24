import { countryHouse } from '../../../src/content/maps/country-house.ts';
import { IDLE } from '../../../src/sim/movement.ts';
import type { Round } from '../../../src/sim/round.ts';
import type { HeadlessClient, Press } from '../client.ts';
import type { Run, Scenario, Verdict } from '../run.ts';
import { captive, capturedMe, fishIn, go, heldNow, hold, phase, place, plantHere, pounce, rescue, toss, until, type P } from './bots.ts';
import { fridgeTrip, park, ROUTE, TABLE, tableTrip, throughGate } from './house.ts';

type Script = Generator<Press, void>;
const sniffing = { ...IDLE, sniff: true };

// A runner (a cat at an even place on its team): through the gate, the table's fish out to the hideout
// one at a time, and the kennel opened whenever a teammate is in it. A runner with no fish left for it
// (as many runners before it as fish on the table) stands by the kennel for a captive instead.
function* runner(c: HeadlessClient): Script {
  yield* until(c, () => phase(c) === 'heist');
  yield* throughGate(c);
  const k = place(c).n >> 1;
  if (fishIn(c, TABLE) <= k) {
    yield* go(c, ROUTE.toStandby, { sprint: true });
    yield* until(c, () => captive(c));
    yield* go(c, ROUTE.standbyToRescue);
    yield* rescue(c);
    yield* tableTrip(c, ROUTE.rescueToEast, k);
  }
  let from: P[] | null = ROUTE.east; // its way to the living room's queue; null: it waits there
  for (;;) {
    if (captive(c)) {
      yield* go(c, from ? ROUTE.toRescue : ROUTE.queueToRescue, { sprint: true });
      yield* rescue(c);
      from = ROUTE.rescueToEast;
    } else if (from === ROUTE.east && !fishIn(c, TABLE)) break;
    from = (yield* tableTrip(c, from ?? [], k, () => captive(c))) === 'called' ? null : ROUTE.east;
  }
  yield* go(c, [park(place(c).n)]);
}

// A cat a dog carried: tossed into the kennel, in until a teammate opens it, then out through its gate.
function* captivity(c: HeadlessClient): Generator<Press, void> {
  yield* until(c, () => !heldNow(c));
  const end = c.t + 4;
  yield* until(c, () => capturedMe(c) || c.t > end);
  if (!capturedMe(c)) throw new Error('not in the kennel after the toss');
  yield* until(c, () => !capturedMe(c));
}

// A kitchen cat (an odd place): through the gate and up the west lane for the fridge's fish, once, after
// the kennel if a dog carries it there on the way.
function* kitchen(c: HeadlessClient): Script {
  yield* until(c, () => phase(c) === 'heist');
  yield* throughGate(c);
  const k = place(c).n >> 1;
  if (!(yield* fridgeTrip(c, ROUTE.west, k))) {
    yield* captivity(c);
    yield* fridgeTrip(c, ROUTE.cageToWest, k);
  }
  yield* go(c, [park(place(c).n)]);
}

// The hunter (a dog, first on its team): mines at the gate and the west gap in prep, then the watch on
// the west lane, sniffing; a cat that comes within 8 m is chased, lunged at, carried to the kennel and
// tossed in. Then it sniffs by the doghouse.
function* hunter(c: HeadlessClient): Script {
  yield* go(c, ROUTE.dogToGate, { sprint: true });
  yield* plantHere(c);
  yield* go(c, ROUTE.gateToWestGap, { sprint: true });
  yield* plantHere(c);
  yield* go(c, ROUTE.westGapToAmbush, { sniff: true });
  yield* until(c, () => phase(c) === 'heist', sniffing);
  if (yield* pounce(c, 8, 90)) yield* toss(c, ROUTE.carryToCage);
  yield* go(c, ROUTE.cageToKennel);
  yield* until(c, () => false, sniffing);
}

// A guard (every other dog): after the others have left the spawn, a mine at the east hole (the second
// dog) or the west fence's exit (the third), then it sniffs a step back from it.
function* guard(c: HeadlessClient): Script {
  const { n } = place(c);
  const route = [undefined, ROUTE.dogToEastHole, ROUTE.dogToWestFence][n];
  yield* hold(c, 1.2 * n);
  if (route) {
    yield* go(c, route, { sprint: true });
    yield* plantHere(c);
    const at = route.at(-1)!;
    yield* go(c, [{ x: at.x - Math.sign(at.x) * 1.5, z: at.z }]);
  }
  yield* until(c, () => false, sniffing);
}

const script = (c: HeadlessClient): Script => {
  const { side, n } = place(c);
  return side === 'cat' ? (n % 2 === 0 ? runner(c) : kitchen(c)) : n === 0 ? hunter(c) : guard(c);
};

const LIMIT = (players: number) => (players <= 3 ? 240 : 360); // s of sim time a round ends in: 4 min at 3, 6 min above
const s = (x: number) => x.toFixed(1);

// Card 63's judge: every client folds the end at one message with one result, the winner as scripted (cats by
// three fish; with a shortened heist, dogs by its timer), the round's length on the host's clock, and the QA
// numbers: fish delivered, the first grab after the heist began, mines armed and defused, captures and
// rescues.
function judge(r: Run): Verdict {
  const here = r.ends.flatMap((e, i) => (e ? [i] : []));
  const turnTo = (i: number, to: Round['phase']) => r.wires[i]!.turns.find((t) => t.round.phase === to);
  const overs = here.map((i) => turnTo(i, 'over'));
  const oneMessage = overs.every((t) => t && t.seq === overs[0]!.seq && JSON.stringify(t.round.results) === JSON.stringify(overs[0]!.round.results));
  const h = here[0]!;
  const result = r.ends[h]!.results[0];
  const scripted = result && (r.heist === undefined ? result.why === 'fish' && result.winner === 'cat' : result.why !== 'fish' && result.winner === 'dog');
  const prep = turnTo(h, 'prep');
  const heist = turnTo(h, 'heist');
  const took = overs[0] && prep ? overs[0].time - prep.time : Infinity;
  const players = new Set(r.seats).size;
  const kinds = new Map(r.samples.flatMap((x) => x.dumps[h]?.entities.map((e) => [e.id, e.kind] as const) ?? []));
  const grab = r.samples.find((x) => x.events[h]!.some((e) => e.type === 'grab' && kinds.get(e.id) === 'cat'));
  const count = (type: string) => r.samples.reduce((n, x) => n + x.events[h]!.filter((e) => e.type === type).length, 0);
  const mines = [...kinds.values()].filter((k) => k === 'mine').length;
  const by = (type: string) => r.wires[h]!.turns.filter((t) => t.by === type).length;
  const row = {
    round: `${s(took)} s`,
    fish: String(result?.secured ?? 0),
    grab: grab && heist ? `${s((grab.t - heist.at) / 1000)} s` : 'none',
    mines: String(mines),
    defused: String(count('defused')),
    blasts: String(count('blast')),
    captured: String(by('captured')),
    rescues: String(by('rescue')),
    winner: result ? `${result.winner}s` : 'none',
    why: result?.why ?? 'none',
  };
  const lines = [
    `the end: ${result ? `${result.why}, ${result.secured} fish, winner ${result.winner}s` : 'none'} on ${here.length} clients at ${oneMessage ? `one message, seq ${overs[0]!.seq}` : 'DIFFERENT messages'}; as scripted: ${scripted ?? false}`,
    `round: ${row.round} of sim time from prep to the end (limit ${LIMIT(players)})${r.heist === undefined ? '' : `, heist ${r.heist} s`}`,
    `fish delivered ${row.fish}; first grab ${row.grab === 'none' ? 'none' : `${row.grab} into the heist`}; mines armed ${row.mines}, defused ${row.defused}, blasts ${row.blasts}; captured ${row.captured}, rescues ${row.rescues}`,
  ];
  return { lines, ok: oneMessage && scripted === true && took <= LIMIT(players), row };
}

// Card 63: a round to the end at any roster size, the same scripts. The fold sides the players at prep
// (ADR 0014) and the scripts read their side there: `side` is only the runner's label for a seat with no
// character, the first seat being a dog at every roster size of two or more.
const aRound: Scenario = {
  about: 'a round to the end: mines at the exits, a defuse, fish out, a grab, the kennel, a rescue',
  level: countryHouse,
  player: (i) => ({ side: i === 0 ? 'dog' : 'cat', script }),
  judge,
  round: true,
  seconds: 420,
};
export default aRound;
