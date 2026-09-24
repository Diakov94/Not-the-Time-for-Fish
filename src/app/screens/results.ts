import type { ClientId } from '../../sim/entities.ts';
import { successor, type Decider, type Result, type Why } from '../../sim/round.ts';
import type { Sim } from '../../sim/world.ts';
import { leaveButton, paint, score, tag, TEAM } from './parts.ts';

// Why a round ended, as the fold's `Result.why` says it.
const WHY: Record<Why, string> = {
  fish: 'коти винесли досить риби',
  captured: 'усі коти у вольєрі',
  timer: 'сплив час пограбування',
  overtime: 'скінчився овертайм',
};

// The rule that decided the match, as the table's `decided` names it.
const DECIDED: Record<Decider, string> = {
  more: 'Вирішила кількість: команда винесла більше риби.',
  sooner: 'Риби порівну: вирішила швидша остання риба — її винесли раніше у своєму раунді.',
  level: 'Риби порівну, і жодна команда не винесла останню рибу раніше: нічия.',
};

// Seconds as m:ss.
const clock = (s: number) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`;

// An ended round of the match, the table's `results` in order: who won and why, and what the cats secured.
function ended(x: Result, i: number): HTMLElement {
  const last = x.last === null ? '' : `, остання на ${clock(x.last)} пограбування`;
  return tag(
    'section',
    { className: `panel team-${x.winner.toLowerCase()}` },
    tag('p', { className: 'label', textContent: `Раунд ${i + 1}` }),
    tag('h2', { textContent: `Перемогли ${x.winner === x.cats ? 'коти' : 'пси'} (${TEAM[x.winner]})` }),
    tag('p', { textContent: `Чому: ${WHY[x.why]}.` }),
    tag('p', { textContent: `Коти (${TEAM[x.cats]}) винесли риби: ${x.secured}${last}.` }),
  );
}

// The results (card 48), shown while the round table says `over`: the round's outcome and, once the
// table holds the match's, the match, the rule that decided it and the session score, in the menu's
// style, and a way out of the room. The winner, the counts, the reasons and the deciding rule are the
// table's; the screen shows the counts and times it was decided on beside the rule. The host's button
// sends `next`, the table's successor phase.
export function resultsScreen(next: () => void): (sim: Sim, host: ClientId) => void {
  const screen = tag('div', { className: 'screen results' });
  document.body.append(screen);
  let drawn = '';
  return (sim, host) => {
    const r = sim.round;
    screen.hidden = r.phase !== 'over';
    if (screen.hidden) return;
    paint();
    const key = JSON.stringify([r.round, r.results, r.match, r.decided, r.score, host]);
    if (key === drawn) return;
    drawn = key;
    const match =
      r.match === null
        ? []
        : [
            tag(
              'section',
              { className: `panel match${r.match === 'draw' ? '' : ` team-${r.match.toLowerCase()}`}` },
              tag('h2', { textContent: r.match === 'draw' ? 'Матч: нічия' : `Матч виграла ${TEAM[r.match]}` }),
              tag('p', { textContent: DECIDED[r.decided!] }),
              tag('p', { className: 'score', textContent: score(r) }),
            ),
          ];
    const button = successor(r).to === 'lobby' ? 'До лобі' : 'Наступний раунд';
    screen.replaceChildren(
      tag('h1', { textContent: r.match === null ? `Раунд ${r.round} завершено` : 'Матч завершено' }),
      tag('div', { className: 'band' }),
      tag('div', { className: 'rounds' }, ...r.results.map(ended)),
      ...match,
      tag(
        'footer',
        {},
        host === sim.me ? tag('button', { type: 'button', className: 'start', textContent: button, onclick: next }) : tag('p', { textContent: 'Чекаємо на хоста.' }),
        leaveButton(),
      ),
    );
  };
}
