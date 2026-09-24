import { parseArgs } from 'node:util';
import { MOVING_MAX, RESTING_MAX, run } from './run.ts';

// `npm run headless -- --clients N --seconds S`: no browser, no jsdom; exit 1 above the thresholds.
const { values } = parseArgs({ options: { clients: { type: 'string', default: '2' }, seconds: { type: 'string', default: '20' } } });
const clients = Number(values.clients);
const seconds = Number(values.seconds);
const t0 = performance.now();
const r = await run(clients, seconds);
const m = (x: number) => x.toFixed(3).padStart(8);
console.log(`headless: ${clients} clients, ${seconds} s (walk, grab, carry, throw, push)`);
console.log('entity    kind       moving m  resting m  exact -100 ms m (not judged)');
for (const d of r.divergence) console.log(`${d.id.padEnd(9)} ${d.kind.padEnd(9)} ${m(d.moving)}  ${m(d.resting)}  ${m(d.exact)}`);
const worst = (k: 'moving' | 'resting') => Math.max(...r.divergence.map((d) => d[k]));
console.log(`max: moving ${worst('moving').toFixed(3)} m (limit ${MOVING_MAX}), resting ${worst('resting').toFixed(3)} m (limit ${RESTING_MAX})`);
console.log(`ticks sent: ${Object.entries(r.ticks).map(([id, n]) => `${id} ${n}`).join(', ')}`);
console.log(`wall time: ${((performance.now() - t0) / 1000).toFixed(1)} s; ${r.code === 0 ? 'PASS' : 'FAIL'}`);
process.exit(r.code);
