import { prototypeRoom } from '../../../src/content/prototype-room.ts';
import { IDLE, type Intent } from '../../../src/sim/movement.ts';
import { mayHold, sideOf } from '../../../src/sim/ownership.ts';
import type { Step } from '../client.ts';
import type { Run, Sample, Scenario, Verdict } from '../run.ts';

const walk = (x: number, z: number): Intent => ({ move: { x, z }, sprint: false, jump: false });
const face = (x: number, z: number) => walk(x / 100, z / 100); // a touch of the stick: turns, barely moves

// Cat A holds the fish it faces. The dog walks south at it and lunges: the fish drops, the dog carries
// cat A north and tosses it, lunges at it where it lands; cat B, holding a crate west of there, throws it
// into the dog and the hit frees cat A, then walks south out of the crate's way. The dog follows cat B,
// lunges, carries it east and back, and holds it until it wiggles free.
const DOG: Step[] = [
  [0.5, walk(0, -1), null],
  [1.05, IDLE, 'grab'],
  [1.6, walk(0, 1), null],
  [3.1, IDLE, 'throw'],
  [5.0, IDLE, 'grab'],
  [7.0, walk(0, -1), null],
  [7.7, walk(-1, 0), null],
  [8.1, IDLE, 'grab'],
  [9.0, walk(1, 0), null],
  [11.0, walk(-1, 0), null],
  [13.0, IDLE, null],
];
const CAT_A: Step[] = [[0.5, IDLE, 'grab']];
const CAT_B: Step[] = [
  [0, face(1, 0), null],
  [0.3, IDLE, 'grab'],
  [6.0, IDLE, 'throw'],
  [6.3, walk(0, -1), null],
  [7.0, IDLE, null],
];

const WIGGLE = 8; // s: GAME.md's wiggle-free, by the carrier's clock; the card allows 0.15 s either way
const HIT_MS = 150; // the card's: a hit frees the cat on every client within this

// The spans in which client `c`'s table holds `id`: from the first frame it is held to the first it is not.
function holds(samples: Sample[], c: number, id: string): [number, number][] {
  const out: [number, number][] = [];
  let from: number | null = null;
  for (const { t, dumps } of samples) {
    const held = dumps[c]!.entities.find((e) => e.id === id)?.held ?? false;
    if (held && from === null) from = t;
    if (!held && from !== null) out.push([from, t]);
    if (!held) from = null;
  }
  return from === null ? out : [...out, [from, Infinity]];
}

// ADR 0009's signs over every client's table in every frame, and the card's timings.
function judge({ samples, wires, ids }: Run): Verdict {
  const t0 = samples[0]!.t;
  const s = (t: number) => ((t - t0) / 1000).toFixed(2);
  const first = samples[0]!.dumps[0]!.entities;
  const [catA, catB] = [ids[1], ids[2]].map((home) => first.find((e) => e.home === home)!.id);
  const fish = first.find((e) => e.kind === 'fish')!.id;
  const row = (x: Sample, c: number, id: string) => x.dumps[c]!.entities.find((e) => e.id === id)!;
  const clients = ids.map((_, c) => c);

  // A held row whose holder the predicate refuses (a dog holding a fish, a cat a character), or one held
  // by a cat that is itself held (its fish should have dropped at the grab's message).
  let signs = 0;
  for (const { dumps } of samples) {
    for (const { entities } of dumps.map((d) => d!)) {
      const identities = new Map(entities.map((e) => [e.id, e]));
      const grabbed = new Set(entities.filter((e) => e.held && e.kind === 'cat').map((e) => e.home));
      for (const e of entities) if (e.held && (!mayHold(sideOf(identities, e.owner!), e.kind) || grabbed.has(e.owner))) signs++;
    }
  }
  const carriedFish = samples.some((x) => row(x, 0, fish).held && row(x, 0, fish).owner === ids[1]);
  const a = clients.map((c) => holds(samples, c, catA!));
  const b = clients.map((c) => holds(samples, c, catB!));
  const sent = (c: number, type: string) => wires[c]!.sent.filter(({ m }) => m.type === type);
  const toss = sent(0, 'release').find(({ m }) => m.type === 'release' && m.id === catA && Math.hypot(m.v.x, m.v.y, m.v.z) > 0);
  const hit = sent(2, 'hit')[0];
  const twoGrabs = a.every((x) => x.length === 2);
  const fishAtGrab = twoGrabs ? a.map((x, c) => row(samples.find((y) => y.t === x[0]![0])!, c, fish).held) : [];
  const freed = twoGrabs && hit ? a.map((x) => x[1]![1] - hit.at) : [];
  const wiggle = b.every((x) => x.length === 1) ? b.map(([x]) => (x![1] - x![0]) / 1000) : [];
  const lines = [
    `ADR 0009 signs in ${samples.length} frames x ${ids.length} tables: ${signs}`,
    `cat A carried the fish: ${carriedFish}; held ${a.map((x) => x.length).join('/')} times, cat B ${b.map((x) => x.length).join('/')}`,
    `grab 1 at ${twoGrabs ? s(a[0]![0]![0]) : '-'} s: the fish held at the grab's frame: ${fishAtGrab.join(', ') || '-'}`,
    `toss at ${toss ? s(toss.at) : '-'} s; grab 2 at ${twoGrabs ? s(a[0]![1]![0]) : '-'} s`,
    `hit sent at ${hit ? s(hit.at) : '-'} s; cat A free on each client after ${freed.map((x) => x.toFixed(0)).join(', ') || '-'} ms (limit ${HIT_MS})`,
    `grab 3 at ${wiggle.length ? s(b[0]![0]![0]) : '-'} s; wiggle-free after ${wiggle.map((x) => x.toFixed(3)).join(', ') || '-'} s (${WIGGLE} +- 0.15)`,
  ];
  const ok =
    signs === 0 &&
    carriedFish &&
    fishAtGrab.length === ids.length &&
    fishAtGrab.every((held) => !held) &&
    toss !== undefined &&
    freed.length === ids.length &&
    freed.every((ms) => ms >= 0 && ms <= HIT_MS) &&
    wiggle.length === ids.length &&
    wiggle.every((x) => Math.abs(x - WIGGLE) <= 0.15);
  return { lines, ok };
}

// Cards 20-22 in play at three clients: the host is the dog and spawns the fish ahead of cat A and a crate
// east of cat B.
const grabTossWiggleHit: Scenario = {
  about: 'a lunge drops the fish, carry, toss, a thrown crate frees, a wiggle-free',
  level: prototypeRoom,
  things: [
    { kind: 'fish', p: { x: 0, y: 0.1, z: -5 } },
    { kind: 'prop', p: { x: -3, y: 0.5, z: -0.2 } },
  ],
  player: (i) =>
    [
      { side: 'dog' as const, at: { x: 0, y: 1, z: -1 }, script: DOG },
      { side: 'cat' as const, at: { x: 0, y: 1, z: -6 }, script: CAT_A },
      { side: 'cat' as const, at: { x: -4.2, y: 1, z: -0.2 }, script: CAT_B },
    ][i] ?? { side: 'cat', at: { x: 6, y: 1, z: -6 - i }, script: [] },
  judge,
};
export default grabTossWiggleHit;
