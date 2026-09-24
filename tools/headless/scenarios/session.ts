import { isDeepStrictEqual } from 'node:util';
import { entered, VISIBLE, type Run, type Scenario, type Verdict } from '../run.ts';
import aRound from './round.ts';

const MATCHES = 2;
const ROUNDS = 2 * MATCHES; // a match is two rounds, the sides swapped
const TICKS = [19, 21]; // per s: every client's tick sender, while it has something to send

// GAME.md's MVP success criteria as far as an instrument answers them, one line each: every round's
// `over` folded at one message with one result on every client; each match decided the same on every
// client; at most VISIBLE.max visible desyncs per round; every client ticking at 19-21/s; no script stopped.
function judge(r: Run): Verdict {
  const here = r.ends.flatMap((e, i) => (e ? [i] : []));
  const overs = here.map((i) => entered(r.wires[i]!, 'over'));
  const n = Math.max(...overs.map((o) => o.length));
  const rounds = Array.from({ length: n }, (_, k) => overs.map((o) => o[k]));
  const one = rounds.map((ts) => ts.every((t) => t && t.seq === ts[0]!.seq && isDeepStrictEqual(t.round.results, ts[0]!.round.results)));
  const matches = rounds.filter((ts) => ts[0]?.round.round === 2);
  const decided = (t: (typeof rounds)[number][number]) => t && { match: t.round.match, decided: t.round.decided, score: t.round.score };
  const same = matches.map((ts) => ts.every((t) => isDeepStrictEqual(decided(t), decided(ts[0]))));
  const rates = r.traffic.map((c) => c.rate);
  const ticking = rates.every((x) => x >= TICKS[0]! && x <= TICKS[1]!);
  const lines = [
    `every over at one message: ${rounds.map((ts, k) => `round ${k + 1} ${one[k] ? `seq ${ts[0]!.seq}` : 'DIFFERENT'}`).join(', ')}; ${n} of ${ROUNDS} rounds over on ${here.length} clients`,
    `each match decided the same on every client: ${matches.map((ts, k) => `match ${k + 1} ${ts[0]!.round.match} by ${ts[0]!.round.decided}${same[k] ? '' : ' NOT the same'}`).join(', ')}; ${matches.length} of ${MATCHES} matches; score ${JSON.stringify(matches.at(-1)?.[0]?.round.score)}`,
    `visible desyncs per round: ${r.desyncs.join('/')} (limit ${VISIBLE.max} each)`,
    `ticks: ${Math.min(...rates).toFixed(1)}-${Math.max(...rates).toFixed(1)}/s over ${rates.length} clients (${TICKS.join('-')})`,
    `script errors: ${r.errors.length}`,
  ];
  const ok = n === ROUNDS && one.every(Boolean) && matches.length === MATCHES && same.every(Boolean) && r.desyncs.every((x) => x <= VISIBLE.max) && ticking && r.errors.length === 0;
  return { lines, ok };
}

// Card 131: a session of two matches back to back, card 63's round and its bots, the players sided by the
// auto-balance in the lobby once; the run ends when the fourth round is over on every client.
const session: Scenario = {
  ...aRound,
  about: 'two matches back to back: four rounds of card 63, the sides swapped every round',
  judge,
  seconds: ROUNDS * aRound.seconds!,
  rounds: ROUNDS,
};
export default session;
