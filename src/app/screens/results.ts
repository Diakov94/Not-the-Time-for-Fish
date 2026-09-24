import type { ClientId } from '../../sim/entities.ts';
import { successor, type Result, type Why } from '../../sim/round.ts';
import type { Sim } from '../../sim/world.ts';
import { score, tag, TEAM } from './parts.ts';

// Why a round ended, as the fold's `Result.why` says it.
const WHY: Record<Why, string> = {
  fish: 'коти винесли досить риби',
  captured: 'усі коти у вольєрі',
  timer: 'сплив час пограбування',
  overtime: 'скінчився овертайм',
};

// Seconds as m:ss.
const clock = (s: number) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`;

// An ended round of the match, the table's `results` in order: who won and why, and what the cats secured.
function ended(x: Result, i: number): HTMLElement {
  const last = x.last === null ? '' : `, остання на ${clock(x.last)} пограбування`;
  const text = `Раунд ${i + 1}: перемогли ${x.winner === x.cats ? 'коти' : 'пси'} (${TEAM[x.winner]}) — ${WHY[x.why]}. Коти (${TEAM[x.cats]}) винесли риби: ${x.secured}${last}.`;
  return tag('p', { textContent: text });
}

// The results (card 48), shown while the round table says `over`: the round's outcome and, once the
// table holds the match's, the match and the session score. The winner, the counts and the reasons are
// the table's; the match's deciding rule is not in the table, so the screen shows the counts and times
// it was decided on beside the rule. The host's button sends `next`, the table's successor phase.
export function resultsScreen(next: () => void): (sim: Sim, host: ClientId) => void {
  const screen = tag('div', { className: 'screen results' });
  document.body.append(screen);
  let drawn = '';
  return (sim, host) => {
    const r = sim.round;
    screen.hidden = r.phase !== 'over';
    const key = JSON.stringify([r.round, r.results, r.match, r.score, host]);
    if (screen.hidden || key === drawn) return;
    drawn = key;
    const match =
      r.match === null
        ? []
        : [
            tag('h2', { textContent: r.match === 'draw' ? 'Матч: нічия' : `Матч виграла ${TEAM[r.match]}` }),
            tag('p', { textContent: 'Перемагає більше винесеної риби; порівну — команда, що винесла останню рибу раніше у своєму раунді; 0 : 0 — нічия.' }),
            tag('p', { textContent: score(r) }),
          ];
    const button = successor(r).to === 'lobby' ? 'До лобі' : 'Наступний раунд';
    screen.replaceChildren(
      tag('h1', { textContent: r.match === null ? `Раунд ${r.round} завершено` : 'Матч завершено' }),
      ...r.results.map(ended),
      ...match,
      host === sim.me
        ? tag('section', { className: 'host' }, tag('h2', { textContent: 'Керування хоста' }), tag('button', { type: 'button', textContent: button, onclick: next }))
        : tag('p', { textContent: 'Чекаємо на хоста.' }),
    );
  };
}
