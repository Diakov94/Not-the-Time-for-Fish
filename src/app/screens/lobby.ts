import { ofSide } from '../../content/characters.ts';
import type { ClientId } from '../../sim/entities.ts';
import type { Look, Roster, Side, Team } from '../../sim/messages.ts';
import { catsTeam, lookOf, playerOf, type Player } from '../../sim/round.ts';
import type { Sim } from '../../sim/world.ts';
import { score, tag, TEAM } from './parts.ts';

const SIDE: Record<Side, string> = { cat: 'Коти', dog: 'Пси' };
const MAP = 'Дача'; // the MVP's one map, the country house: shown as picked

// The lobby (card 47), the room's screen between matches, shown while the round table says lobby. It
// draws the table's roster as two columns, the team that plays cats in the first round and the one that
// plays dogs, each name with its character for that side, and turns clicks into the sim's messages: the
// player's own look per side, and for the host a name moved to the other team and the start. It keeps no
// roster and decides no team; it is redrawn when what it shows changes. The characters are the roster's
// (content), a look indexing its side's list; which look a player has is the round table's (`lookOf`).
export function lobbyScreen(room: string, send: (m: Roster | Look) => void, start: () => void): (sim: Sim, host: ClientId) => void {
  const screen = tag('div', { className: 'screen lobby' });
  document.body.append(screen);
  let drawn = '';
  return (sim, host) => {
    const r = sim.round;
    screen.hidden = r.phase !== 'lobby';
    const key = JSON.stringify([r.roster, host, r.score]);
    if (screen.hidden || key === drawn) return;
    drawn = key;
    const hosting = host === sim.me;
    const me = playerOf(r, sim.me);
    const row = (p: Player, team: Team, side: Side) => {
      const notes = [p === me && 'ви', p.client === host && 'хост', p.client === null && 'поза кімнатою'].filter(Boolean);
      const other: Team = team === 'A' ? 'B' : 'A';
      const moves = () => send({ type: 'roster', from: sim.me, name: p.name, team: other });
      const e = hosting ? tag('button', { type: 'button', title: 'Перевести в іншу команду', onclick: moves }) : tag('p');
      e.append(tag('b', { textContent: p.name }), ` ${ofSide(side)[lookOf(r, p, side)]!.name}`);
      if (notes.length) e.append(tag('small', { textContent: ` (${notes.join(', ')})` }));
      return e;
    };
    const column = (team: Team, side: Side) =>
      tag('section', {}, tag('h2', { textContent: `${SIDE[side]} · ${TEAM[team]}` }), ...r.roster.filter((p) => p.team === team).map((p) => row(p, team, side)));
    const picker = (side: Side) =>
      tag(
        'p',
        { className: 'looks' },
        side === 'cat' ? 'Ваш кіт: ' : 'Ваш пес: ',
        ...ofSide(side).map(({ name }, look) =>
          tag('button', { type: 'button', textContent: name, ariaPressed: String(me !== undefined && lookOf(r, me, side) === look), onclick: () => send({ type: 'look', from: sim.me, side, look }) }),
        ),
      );
    const cats = catsTeam(r);
    screen.replaceChildren(
      tag('h1', { textContent: `Кімната ${room}` }),
      ...(r.match === null ? [] : [tag('p', { textContent: score(r) })]),
      tag('div', { className: 'teams' }, column(cats, 'cat'), column(cats === 'A' ? 'B' : 'A', 'dog')),
      ...(me ? [picker('cat'), picker('dog')] : []),
      hosting
        ? tag(
            'section',
            { className: 'host' },
            tag('h2', { textContent: 'Керування хоста' }),
            tag('p', { textContent: 'Клацніть ім’я, щоб перевести гравця в іншу команду.' }),
            tag('p', {}, 'Мапа: ', tag('button', { type: 'button', textContent: MAP, ariaPressed: 'true' })),
            tag('button', { type: 'button', className: 'start', textContent: 'Почати матч', onclick: start }),
          )
        : tag('p', { textContent: `Мапа: ${MAP}. Чекаємо, поки хост почне матч.` }),
      tag('p', { className: 'voice', textContent: 'Розійдіться по двох голосових каналах: кожна команда у своєму.' }),
    );
  };
}
