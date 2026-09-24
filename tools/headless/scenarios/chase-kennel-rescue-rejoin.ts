import { countryHouse } from '../../../src/content/maps/country-house.ts';
import type { Entity } from '../../../src/sim/entities.ts';
import { IDLE } from '../../../src/sim/movement.ts';
import type { HeadlessClient, Press } from '../client.ts';
import type { Run, Scenario, Turn, Verdict } from '../run.ts';
import { captive, capturedMe, flat, go, heldNow, hold, phase, place, pounce, rescue, simOf, toss, until, type P } from './bots.ts';
import { fridgeTrip, IN_CAGE, ROUTE, tableTrip } from './house.ts';

type Script = Generator<Press, void>;
const p = (x: number, z: number): P => ({ x, z });
const inCage = (q: P) => q.x >= IN_CAGE.x0 && q.x <= IN_CAGE.x1 && q.z >= IN_CAGE.z0 && q.z <= IN_CAGE.z1;
// Where the dog waits for the fish to come out: by the house's east wall, north of the living room's gap.
const LURK = p(8.8, 3);
const inHouse = (q: P) => Math.abs(q.x) < 8.1 && Math.abs(q.z) < 6.1;

// The host's cat: a fish from the table, held there until its teammate is in the kennel and the dog waits
// by the house's east wall, then out to the hideout with the dog after it; once the kennel is open again
// its tab dies.
function* carrier(c: HeadlessClient): Script {
  const lurking = () => [...simOf(c).entities.values()].some((e) => e.kind === 'dog' && flat(e.body.translation(), LURK) < 1);
  yield* until(c, () => phase(c) === 'heist');
  yield* tableTrip(c, ROUTE.east, 0, undefined, () => !captive(c) || !lurking());
  yield* until(c, () => !captive(c));
  yield* hold(c, 1);
  yield { intent: IDLE, action: 'leave' };
}

// The kitchen cat: up the west lane, where the dog carries it to the kennel; once in, its tab dies and it
// opens the game again 2 s later with its name, lands in the kennel and waits there to be let out.
function* captive2(c: HeadlessClient): Script {
  yield* until(c, () => phase(c) === 'heist');
  if (yield* fridgeTrip(c, ROUTE.west, 0)) throw new Error('never grabbed');
  yield* until(c, () => !heldNow(c));
  const end = c.t + 4;
  yield* until(c, () => capturedMe(c) || c.t > end);
  if (!capturedMe(c)) throw new Error('not in the kennel after the toss');
  yield* hold(c, 1);
  yield { intent: IDLE, action: 'leave' };
  yield* hold(c, 2);
  yield { intent: IDLE, action: 'rejoin' };
  yield* until(c, () => !capturedMe(c));
  yield* go(c, ROUTE.outOfCage);
}

// The third cat: in the hideout until a captive teammate is back in the game after its tab died, then up
// the west lane to the latch.
function* rescuer(c: HeadlessClient): Script {
  let gone = false;
  const back = () => {
    const away = simOf(c).round.roster.some((q) => q.captured !== null && q.client === null);
    gone ||= away;
    return gone && !away && captive(c);
  };
  yield* until(c, back);
  yield* go(c, ROUTE.westToRescue, { sprint: true });
  yield* rescue(c);
}

// The dog: to its watch on the west lane in prep; the first cat there carried to the kennel and tossed in;
// round the kennel to the house's east wall, and after the cat carrying a fish once it is out in the yard.
function* dog(c: HeadlessClient): Script {
  yield* go(c, [p(-2.2, 12.5), p(-9.6, 12.5), p(-9.6, 6.5)], { sprint: true });
  yield* until(c, () => phase(c) === 'heist', { ...IDLE, sniff: true });
  if (!(yield* pounce(c, 8, 60))) throw new Error('no cat came up the west lane');
  yield* toss(c, ROUTE.carryToCage);
  yield* go(c, [p(-2.2, 12.5), p(8.8, 12.5), LURK], { sprint: true });
  const sim = simOf(c);
  const withFish = (e: Entity) => [...sim.ownership.rows].some(([id, row]) => row.held && row.owner === e.home && sim.entities.get(id)?.kind === 'fish');
  const out = (e: Entity) => withFish(e) && !inHouse(e.body.translation());
  yield* pounce(c, 40, 30, out);
  yield* until(c, () => false, { ...IDLE, sniff: true });
}

const script = (c: HeadlessClient): Script => {
  const { side, n } = place(c);
  return side === 'dog' ? dog(c) : [carrier, captive2, rescuer][n]!(c);
};

// Card 65's judge. The chase: the fish secured on every client at one message, or the carrier held on every
// client within HELD ms of the dog's claim. The rejoin: on every client the cat back in the kennel, captured,
// within LANDED ms of its new tab's connect. The rescue: one message frees it on every client. The host's
// leaving: the next phase on every client within LATE s of when its clock said.
const HELD = 150;
const LANDED = 500;
const LATE = 0.25;
function judge(r: Run): Verdict {
  const host = r.ids[0]!;
  const carrierCat = r.samples.flatMap((x) => x.dumps[0]?.entities ?? []).find((e) => e.kind === 'cat' && e.home === host)?.id;
  const [rejoin] = r.seats.flatMap((seat, i) => (i >= r.seats.indexOf(seat) + 1 ? [i] : []));
  const name = rejoin === undefined ? undefined : `p${r.seats[rejoin]}`;
  const turns = (i: number, by: string) => r.wires[i]!.turns.filter((t) => t.by === by);
  const inGame = (i: number, at: number) => r.samples.find((x) => x.t >= at)?.dumps[i] != null; // sampled from `at` on
  const ms = (x: number) => x.toFixed(0);
  // The chase.
  const first = (by: string, and: (t: Turn) => boolean = () => true) =>
    r.wires.flatMap((_, i) => {
      const t = turns(i, by).find(and);
      return t && inGame(i, t.at) ? [t] : [];
    });
  const secured = first('secured');
  const claim = r.wires.flatMap((w) => w.sent).find((x) => x.m.type === 'claim' && x.m.hold && x.m.id === carrierCat);
  const heldAfter = claim
    ? r.ids.flatMap((_, i) => {
        if (!inGame(i, claim.at)) return [];
        const x = r.samples.find((y) => y.t >= claim.at && y.dumps[i]?.entities.find((e) => e.id === carrierCat)?.held);
        return [x ? x.t - claim.at : Infinity];
      })
    : [];
  const chase =
    secured.length > 0
      ? { what: `secured at seq ${secured.map((t) => t.seq).join('/')}`, ok: secured.every((t) => t.seq === secured[0]!.seq) }
      : { what: `held after ${heldAfter.map(ms).join(', ')} ms (limit ${HELD})`, ok: heldAfter.length > 0 && heldAfter.every((d) => d <= HELD) };
  // The rejoin, from the new tab's connect: on every client in the game then, the first frame its cat is in
  // the kennel there; on the new tab's own, its spawn of that cat in the kennel going out.
  const from = r.opened[rejoin ?? 0]!;
  const own = rejoin === undefined ? undefined : r.wires[rejoin]!.sent.find(({ m }) => m.type === 'spawn' && m.kind === 'cat' && inCage(m.p));
  const landed =
    rejoin === undefined
      ? []
      : [
          ...r.ids.flatMap((_, i) => {
            if (!inGame(i, from)) return [];
            const x = r.samples.find((y) => y.t >= from && y.dumps[i]?.entities.some((e) => e.home === r.ids[rejoin] && e.kind === 'cat' && inCage(e.p)));
            return [x ? x.t - from : Infinity];
          }),
          own ? own.at - from : Infinity,
        ];
  const capturedBack = r.wires.every(
    (w, i) => i === rejoin || !inGame(i, from) || w.turns.some((t) => t.round.roster.some((q) => q.name === name && q.client === r.ids[rejoin!] && q.captured !== null)),
  );
  // The rescue: one message, every client's roster lets the name out.
  const rescues = first('rescue', (t) => t.round.roster.some((q) => q.name === name));
  const freed = rescues.length > 0 && rescues.every((t) => t.seq === rescues[0]!.seq && t.round.roster.find((q) => q.name === name)?.captured === null);
  // The host's leaving: the next clock phase on every client left.
  const left = r.samples.find((x) => !x.dumps[0])?.t ?? Infinity;
  const next = r.wires.flatMap((w, i) => (r.ends[i] ? [w.turns.find((t) => t.by === 'phase' && t.at > left)] : []));
  const late = next.map((t) => (t ? t.late : Infinity));
  const lines = [
    `the chase: ${chase.what}`,
    `the rejoin (${name}): in the kennel on every client ${landed.map(ms).join(', ')} ms after its connect (limit ${LANDED}); captured in every table: ${capturedBack}`,
    `the rescue: ${rescues.length} clients free it at ${freed ? `one message, seq ${rescues[0]!.seq}` : 'NOT one message'}`,
    `the host left at ${((left - r.start) / 1000).toFixed(1)} s; the next phase (${next.map((t) => t?.round.phase ?? 'none').join(', ')}) late by ${late.map((x) => (x * 1000).toFixed(0)).join(', ')} ms (limit ${LATE * 1000})`,
  ];
  const ok =
    chase.ok &&
    landed.length > 0 &&
    landed.every((d) => d <= LANDED) &&
    capturedBack &&
    freed &&
    left < Infinity &&
    late.length > 0 &&
    late.every((x) => x <= LATE);
  return { lines, ok };
}

// Card 65 at four clients (one dog, three cats by the auto-balance): a fish carried out under chase; a grab,
// the kennel, a closed tab and a rejoin by name; a rescue; the host's tab closed and the clock with the
// next host. The heist is shortened so the round ends by its timer.
const chaseKennelRescueRejoin: Scenario = {
  about: 'a fish out under chase; a grab, the kennel, a rejoin, a rescue; the host leaves',
  level: countryHouse,
  player: (i) => ({ side: i === 1 ? 'dog' : 'cat', script }),
  judge,
  round: true,
  seconds: 150,
  heist: 45,
};
export default chaseKennelRescueRejoin;
