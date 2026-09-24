import { parseArgs } from 'node:util';
import { MOVING_MAX, RESTING_MAX, run, type Scenario } from './run.ts';
import { defaultGame } from './scenarios/default.ts';
import { eightClients } from './scenarios/eight-clients.ts';
import { grabTossWiggleHit } from './scenarios/grab-toss-wiggle-hit.ts';
import { aRound } from './scenarios/round.ts';

const scenarios: Record<string, Scenario> = { default: defaultGame, 'grab-toss-wiggle-hit': grabTossWiggleHit, 'eight-clients': eightClients, round: aRound };

// `npm run headless -- --scenario <name> --clients N --seconds S`: no browser, no jsdom; exit 1 when a
// judge fails, 2 for a scenario it does not know. A round scenario takes `--heist S` (the heist's length)
// and `--rounds N`.
const { values } = parseArgs({
  options: {
    scenario: { type: 'string', default: 'default' },
    clients: { type: 'string', default: '2' },
    seconds: { type: 'string' },
    heist: { type: 'string' },
    rounds: { type: 'string', default: '1' },
  },
});
const scenario = scenarios[values.scenario];
if (!scenario) {
  console.log(`headless: no scenario "${values.scenario}"; the scenarios: ${Object.keys(scenarios).join(', ')}`);
  process.exit(2);
}
const clients = Number(values.clients);
const seconds = Number(values.seconds ?? scenario.seconds ?? 20);
const heist = values.heist === undefined ? undefined : Number(values.heist);
const knobs = { rounds: Number(values.rounds), ...(heist !== undefined && { heist }) };
const t0 = performance.now();
const r = await run(scenario, clients, seconds, true, knobs);
const m = (x: number) => x.toFixed(3).padStart(8);
const f = (x: number, w = 8) => x.toFixed(1).padStart(w);
const turned = Object.entries(knobs).filter(([k, v]) => v !== (k === 'heist' ? undefined : 1));
console.log(`headless: ${values.scenario}, ${clients} clients, ${seconds} s (${scenario.about})${turned.map(([k, v]) => `, ${k} ${v}`).join('')}`);
console.log(`sides: ${r.clients.map((c) => `${c.id} ${c.side}`).join(', ')}; ${r.sidesAgree ? 'the same' : 'NOT the same'} on every client`);
console.log('entity    kind       moving m  resting m  exact -100 ms m (not judged)');
for (const d of r.divergence) console.log(`${d.id.padEnd(9)} ${d.kind.padEnd(9)} ${m(d.moving)}  ${m(d.resting)}  ${m(d.exact)}`);
const worst = (k: 'moving' | 'resting') => Math.max(...r.divergence.map((d) => d[k]));
console.log(`max: moving ${worst('moving').toFixed(3)} m (limit ${MOVING_MAX}), resting ${worst('resting').toFixed(3)} m (limit ${RESTING_MAX})`);
console.log(`tables at the end: ${r.tablesAgree ? 'deep-equal' : 'NOT equal'} on ${clients} clients, round tables ${r.roundsAgree ? 'deep-equal' : 'NOT equal'}; doomed claims ${r.doomed} of ${r.claims}`);
console.log('client   side   ticks/s  min in 1 s  ticking/s  up kB/s  down kB/s  events');
for (const c of r.clients) {
  console.log(`${c.id.padEnd(8)} ${String(c.side).padEnd(4)} ${f(c.ticks)} ${String(c.minTicks).padStart(11)} ${f(c.rate, 10)} ${f(c.up)} ${f(c.down, 10)} ${String(c.events).padStart(7)}`);
}
console.log(`relay: ${r.relayIn.toFixed(1)} messages/s in, ${r.relayOut.toFixed(1)} out; CPU ${(r.cpu * 100).toFixed(0)} % of one core`);
for (const line of r.verdict.lines) console.log(line);
console.log(`wall time: ${((performance.now() - t0) / 1000).toFixed(1)} s; ${r.code === 0 ? 'PASS' : 'FAIL'}`);
process.exit(r.code);
