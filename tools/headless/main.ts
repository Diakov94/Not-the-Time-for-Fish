import { readdirSync, readFileSync } from 'node:fs';
import { parseArgs } from 'node:util';
import type { Level } from '../../src/content/level.ts';
import type { Dump } from '../../src/net/dump.ts';
import { compareDumps, MOVING_MAX, RESTING_MAX, run, STALL_MS, VISIBLE, type Result, type Scenario } from './run.ts';

// Found by file name, no record lists them (ADR 0011): a scenario is `scenarios/<name>.ts` with its
// Scenario as the default export (the bots' helpers there have none); a map is
// `src/content/maps/<name>.ts` exporting its Level as <name> in camelCase.
const SCENARIOS = new URL('./scenarios/', import.meta.url);
const MAPS = new URL('../../src/content/maps/', import.meta.url);
const files = (dir: URL) => readdirSync(dir).filter((f) => f.endsWith('.ts') && !f.endsWith('.test.ts')).map((f) => f.slice(0, -'.ts'.length));
const load = async (dir: URL, name: string) => (files(dir).includes(name) ? await import(new URL(`${name}.ts`, dir).href) : {});
const scenarioOf = async (name: string): Promise<Scenario | undefined> => (await load(SCENARIOS, name)).default;
const mapOf = async (name: string): Promise<Level | undefined> => (await load(MAPS, name))[name.replace(/-(\w)/g, (_, c: string) => c.toUpperCase())];

// `npm run headless -- --scenario <name> --clients N --seconds S`: no browser, no jsdom; exit 1 when a
// judge fails, 2 for a scenario or a map it does not know. `--map <name>` plays the scenario on that map
// instead of its own. A round scenario takes `--heist S` (the heist's length) and `--rounds N`;
// `--tick-rate` and `--delay` scale the tick sender's rate and the interpolation delay; `--stall MS`
// stalls one client at a time that long every 2 s; `--counts` and `--compare` below.
const { values, positionals } = parseArgs({
  options: {
    scenario: { type: 'string', default: 'default' },
    map: { type: 'string' },
    clients: { type: 'string', default: '2' },
    seconds: { type: 'string' },
    heist: { type: 'string' },
    rounds: { type: 'string' },
    'tick-rate': { type: 'string', default: '1' },
    delay: { type: 'string', default: '1' },
    stall: { type: 'string', default: '0' },
    counts: { type: 'string' },
    compare: { type: 'boolean' },
  },
  allowPositionals: true,
});
// `--compare a.json b.json`: two desync dumps by the visible bar, no game; exit 1 when an entity is over it.
if (values.compare) {
  const [a, b] = positionals.map((f) => JSON.parse(readFileSync(f, 'utf8')) as Dump);
  const rows = compareDumps(a!, b!);
  const over = rows.filter((r) => r.d > VISIBLE.off);
  console.log(`headless: compare ${positionals[0]} (${a!.me}) and ${positionals[1]} (${b!.me}), ${rows.length} entities`);
  console.log('entity    kind      distance m');
  for (const r of rows) console.log(`${r.id.padEnd(9)} ${r.kind.padEnd(9)} ${r.d.toFixed(3).padStart(10)}`);
  console.log(`over ${VISIBLE.off} m: ${over.length}${over.map((r) => `; ${r.id} ${r.kind} ${r.d.toFixed(3)} m`).join('')}; ${over.length ? 'FAIL' : 'PASS'}`);
  process.exit(over.length ? 1 : 0);
}
const own = await scenarioOf(values.scenario);
if (!own) {
  const scenarios = [];
  for (const name of files(SCENARIOS)) if (await scenarioOf(name)) scenarios.push(name);
  console.log(`headless: no scenario "${values.scenario}"; the scenarios: ${scenarios.join(', ')}`);
  process.exit(2);
}
const level = values.map === undefined ? own.level : await mapOf(values.map);
if (!level) {
  console.log(`headless: no map "${values.map}"; the maps: ${files(MAPS).join(', ')}`);
  process.exit(2);
}
const scenario = { ...own, level };
const clients = Number(values.clients);
const seconds = Number(values.seconds ?? scenario.seconds ?? 20);
const heist = values.heist === undefined ? scenario.heist : Number(values.heist);
const knobsAt = (n: number) => ({ ticks: Number(values['tick-rate']), delay: Number(values.delay), rounds: Number(values.rounds ?? scenario.rounds?.(n) ?? 1), stall: Number(values.stall), ...(heist !== undefined && { heist }) });
const worst = (r: Result, k: 'moving' | 'stalled' | 'resting') => Math.max(...r.divergence.map((d) => d[k]));
// `--counts 3,4,5,6,7,8`: the scenario once per player count, one run after another, and one table: a line
// per count of its sides, the shared judges' worst moving copy and visible desyncs, the scenario judge's
// row, its wall time and verdict (card 132's numbers for the balance knobs).
if (values.counts) {
  const t0 = performance.now();
  const rows: Record<string, string>[] = [];
  let code = 0;
  for (const n of values.counts.split(',').map(Number)) {
    const t = performance.now();
    const r = await run(scenario, n, seconds, knobsAt(n));
    const dogs = r.clients.filter((c) => c.side === 'dog').length;
    const verdict = r.code === 0 ? 'PASS' : 'FAIL';
    const wall = `${((performance.now() - t) / 1000).toFixed(1)} s`;
    rows.push({ players: String(n), sides: `${dogs} vs ${r.clients.length - dogs}`, 'moving m': worst(r, 'moving').toFixed(3), desyncs: r.desyncs.join('/'), ...r.verdict.row, wall, verdict });
    code = Math.max(code, r.code);
  }
  const keys = [...new Set(rows.flatMap((x) => Object.keys(x)))];
  const width = keys.map((k) => Math.max(k.length, ...rows.map((x) => (x[k] ?? '').length)));
  console.log(`headless: ${values.scenario}${values.map ? ` on ${values.map}` : ''} at ${values.counts} clients, ${seconds} s each (${scenario.about}); sides dogs vs cats`);
  for (const x of [Object.fromEntries(keys.map((k) => [k, k])), ...rows]) console.log(keys.map((k, i) => (x[k] ?? '').padEnd(width[i]!)).join('  '));
  console.log(`wall time: ${((performance.now() - t0) / 1000).toFixed(1)} s for ${rows.length} runs; ${code === 0 ? 'PASS' : 'FAIL'}`);
  process.exit(code);
}
const t0 = performance.now();
const knobs = knobsAt(clients);
const r = await run(scenario, clients, seconds, knobs);
const m = (x: number) => x.toFixed(3).padStart(8);
const f = (x: number, w = 8) => x.toFixed(1).padStart(w);
const turned = Object.entries(knobs).filter(([k, v]) => v !== (k === 'heist' ? undefined : k === 'stall' ? 0 : 1));
console.log(`headless: ${values.scenario}${values.map ? ` on ${values.map}` : ''}, ${clients} clients, ${seconds} s (${scenario.about})${turned.map(([k, v]) => `, ${k} ${v}`).join('')}`);
console.log(`sides at the start: ${r.sides.map((x) => `${x.name} ${x.side}`).join(', ')}; ${r.sidesAgree ? 'the same' : 'NOT the same'} on every client at the end`);
console.log('entity    kind       moving m  stalls m  resting m  exact -100 ms m (not judged)');
for (const d of r.divergence) console.log(`${d.id.padEnd(9)} ${d.kind.padEnd(9)} ${m(d.moving)}  ${m(d.stalled)}  ${m(d.resting)}  ${m(d.exact)}`);
console.log(`max: moving ${worst(r, 'moving').toFixed(3)} m (limit ${MOVING_MAX}), resting ${worst(r, 'resting').toFixed(3)} m (limit ${RESTING_MAX})`);
console.log(
  `the runner's own stalls (frames over ${STALL_MS} ms apart): ${r.stalls.n}, the longest ${r.stalls.longest.toFixed(0)} ms; through them, a copy against its owner's path since the stall began: ${worst(r, 'stalled').toFixed(3)} m (limit ${MOVING_MAX})`,
);
const visible = r.visible.reduce((n, v) => n + v.n, 0);
if (knobs.stall > 0) console.log(`injected stalls: ${r.injected}, one client at a time for ${knobs.stall} ms (no frames, its messages held)`);
console.log(
  `visible desyncs (a copy > ${VISIBLE.off} m off its owner's path for > ${VISIBLE.for / 1000} s): ${visible} (limit ${VISIBLE.max} per round)${r.desyncs.length > 1 ? `, by round ${r.desyncs.join('/')}` : ''}${r.visible.map((v) => `; ${v.id} ${v.kind} ${v.n}`).join('')}`,
);
console.log(`tables at the end: ${r.tablesAgree ? 'deep-equal' : 'NOT equal'} on ${clients} clients, round tables ${r.roundsAgree ? 'deep-equal' : 'NOT equal'}; doomed claims ${r.doomed} of ${r.claims}`);
console.log('client   side   ticks/s  min in 1 s  ticking/s  up kB/s  down kB/s  events');
for (const c of r.clients) {
  console.log(`${c.id.padEnd(8)} ${String(c.side).padEnd(4)} ${f(c.ticks)} ${String(c.minTicks).padStart(11)} ${f(c.rate, 10)} ${f(c.up)} ${f(c.down, 10)} ${String(c.events).padStart(7)}`);
}
console.log(`relay: ${r.relayIn.toFixed(1)} messages/s in, ${r.relayOut.toFixed(1)} out; CPU ${(r.cpu * 100).toFixed(0)} % of one core`);
for (const line of r.verdict.lines) console.log(line);
console.log(`wall time: ${((performance.now() - t0) / 1000).toFixed(1)} s; ${r.code === 0 ? 'PASS' : 'FAIL'}`);
process.exit(r.code);
