import type { ClientId } from '../../sim/entities.ts';
import { scoreOf, successor, type Decider, type Result, type Round, type Why } from '../../sim/round.ts';
import type { Sim } from '../../sim/world.ts';
import { leaveButton, paint, tag } from './parts.ts';

// Why a round ended, as the fold's `Result.why` says it.
const WHY: Record<Why, string> = {
  fish: 'коти винесли досить риби',
  captured: 'усі коти у вольєрі',
  timer: 'сплив час пограбування',
  overtime: 'скінчився овертайм',
};

// The rule that decided the match, as the table's `decided` names it (ADR 0014: the top score, then the
// sooner last point).
const DECIDED: Record<Decider, string> = {
  more: 'Вирішили очки: у переможця їх найбільше.',
  sooner: 'Очок порівну: вирішило останнє очко — переможець здобув його раніше у своєму раунді.',
  level: 'Очок порівну, і жоден гравець не здобув останнє очко раніше: нічия.',
};

// Seconds as m:ss.
const clock = (s: number) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`;

// An ended round of the match, the table's `results` in order: who won and why, and what the cats secured.
function ended(x: Result, i: number): HTMLElement {
  const last = x.last === null ? '' : `, остання на ${clock(x.last)} пограбування`;
  return tag(
    'section',
    { className: `panel side-${x.winner}` },
    tag('p', { className: 'label', textContent: `Раунд ${i + 1}` }),
    tag('h2', { textContent: `Перемогли ${x.winner === 'cat' ? 'коти' : 'пси'}` }),
    tag('p', { textContent: `Чому: ${WHY[x.why]}.` }),
    tag('p', { textContent: `Коти винесли риби: ${x.secured}${last}.` }),
  );
}

// A row per name in join order (ADR 0014): its side this round, its points this round (the round's
// `Result.points`: a fish as a cat, a catch as a dog), in the match (`scoreOf`) and its matches won this
// session.
function players(r: Round, x: Result): HTMLElement {
  const cell = (name: 'th' | 'td', text: string | number) => tag(name, { textContent: String(text) });
  const head = ['Гравець', 'Бік', 'Очки за раунд', 'Очки за матч', 'Перемог у сесії'].map((t) => cell('th', t));
  const rows = r.roster.map(({ name, side }) =>
    tag(
      'tr',
      {},
      cell('th', name),
      cell('td', side === null ? '—' : side === 'cat' ? 'кіт' : 'пес'),
      cell('td', Object.hasOwn(x.points, name) ? x.points[name]!.n : 0),
      cell('td', scoreOf(r, name)),
      cell('td', Object.hasOwn(r.score, name) ? r.score[name]! : 0),
    ),
  );
  return tag('section', { className: 'panel' }, tag('table', {}, tag('thead', {}, tag('tr', {}, ...head)), tag('tbody', {}, ...rows)));
}

// The results (card 48), shown while the round table says `over`: the round's outcome as a side, every
// player's points and, once the table holds the match's, the match's winner by name and the rule that
// decided it, in the menu's style, and a way out of the room. The winner, the points, the reasons and the
// deciding rule are the table's; the screen shows the counts and times it was decided on beside the rule.
// The host's button sends `next`, the table's successor phase.
export function resultsScreen(next: () => void): (sim: Sim, host: ClientId) => void {
  const screen = tag('div', { className: 'screen results' });
  document.body.append(screen);
  let drawn = '';
  return (sim, host) => {
    const r = sim.round;
    screen.hidden = r.phase !== 'over';
    if (screen.hidden) return;
    paint();
    const key = JSON.stringify([r.round, r.roster, r.results, r.match, r.decided, r.score, host]);
    if (key === drawn) return;
    drawn = key;
    const match =
      r.match === null
        ? []
        : [
            tag(
              'section',
              { className: 'panel match' },
              tag('h2', { textContent: r.match === 'draw' ? 'Матч: нічия' : `Матч виграв гравець ${r.match}` }),
              tag('p', { textContent: DECIDED[r.decided!] }),
            ),
          ];
    const button = successor(r).to === 'lobby' ? 'До лобі' : 'Наступний раунд';
    screen.replaceChildren(
      tag('h1', { textContent: r.match === null ? `Раунд ${r.round} завершено` : 'Матч завершено' }),
      tag('div', { className: 'band' }),
      tag('div', { className: 'rounds' }, ...r.results.map(ended)),
      ...(r.results.length > 0 ? [players(r, r.results.at(-1)!)] : []),
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
