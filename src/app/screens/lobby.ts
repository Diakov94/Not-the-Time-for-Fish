import * as THREE from 'three';
import { INK, OVERLAY } from '../../art/palette.ts';
import { FRAME, lookFor, rigFor } from '../../art/rig.ts';
import { CHARACTERS, ofSide } from '../../content/characters.ts';
import type { ClientId } from '../../sim/entities.ts';
import type { Look, Roster, Side, Team } from '../../sim/messages.ts';
import { catsTeam, lookOf, playerOf, type Player } from '../../sim/round.ts';
import type { Sim } from '../../sim/world.ts';
import { leaveButton, paint, score, settingsButton, tag, TEAM, VOICE } from './parts.ts';

const SIDE: Record<Side, string> = { cat: 'Коти', dog: 'Пси' };
// The maps as players name them, by the map's file name (ADR 0011); a map not named here shows that.
const MAPS: Record<string, string> = { 'country-house': 'Дача', 'high-rise': 'Багатоповерхівка', 'fish-market': 'Рибний ринок', farm: 'Ферма', yacht: 'Яхта' };

// The map the next match is played on: the host's pick in the round table, or the level the world was
// built from, among the maps the app found (card 101).
const mapOf = (sim: Sim) => sim.round.map ?? Object.keys(sim.levels).find((name) => sim.levels[name] === sim.level) ?? '';

// Every character's portrait, its look in art (ADR 0011) at rest, three-quarter front, drawn once into
// an image on the lobby's first draw by one renderer that is then let go. A character art has no file
// for yet has no portrait.
const PORTRAIT = 160; // px square
const FRONT = new THREE.Vector3(0.55, 0.3, 1).normalize();
let portraits: Map<string, string> | undefined;
function portraitsOnce(): Map<string, string> {
  if (portraits) return portraits;
  portraits = new Map();
  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, preserveDrawingBuffer: true });
  renderer.setSize(PORTRAIT, PORTRAIT, false);
  const scene = new THREE.Scene();
  const sun = new THREE.DirectionalLight(OVERLAY.white, 2);
  sun.position.set(2, 4, 3);
  scene.add(new THREE.HemisphereLight(OVERLAY.white, INK.shadow, 1.5), sun);
  const camera = new THREE.PerspectiveCamera(30, 1, 0.05, 20);
  const box = new THREE.Box3();
  const centre = new THREE.Vector3();
  const size = new THREE.Vector3();
  for (const c of CHARACTERS) {
    const look = lookFor(c.id);
    if (!look) continue;
    const f = FRAME[c.side];
    const { root } = rigFor(c, look, f.w / 2, (f.h - f.w) / 2);
    box.setFromObject(root).getCenter(centre);
    const reach = box.getSize(size).length() / 2;
    camera.position.copy(centre).addScaledVector(FRONT, (0.8 * reach) / Math.sin(THREE.MathUtils.degToRad(15)));
    camera.lookAt(centre);
    scene.add(root);
    renderer.render(scene, camera);
    scene.remove(root);
    portraits.set(c.id, renderer.domElement.toDataURL());
  }
  renderer.dispose();
  renderer.forceContextLoss();
  return portraits;
}
const portrait = (id: string) => {
  const src = portraitsOnce().get(id);
  return src ? [tag('img', { src, alt: '' })] : [];
};

// The lobby (card 47), the room's screen between matches, shown while the round table says lobby. It
// draws the table's roster as two columns, the team that plays cats in the first round and the one that
// plays dogs, each name with its character for that side, and under each column the side's six
// characters, the roster's (content), one row to pick from, each with its portrait and name, the picked
// one's signature detail beneath, and a way out of the room. It turns clicks into the sim's messages:
// the player's own look per side, and for the host a name moved to the other team and the start. It
// keeps no roster and decides no team; it is redrawn when what it shows changes. Which look a player has
// is the round table's (`lookOf`).
export function lobbyScreen(room: string, send: (m: Roster | Look) => void, start: () => void): (sim: Sim, host: ClientId) => void {
  const screen = tag('div', { className: 'screen lobby' });
  document.body.append(screen);
  let drawn = '';
  return (sim, host) => {
    const r = sim.round;
    screen.hidden = r.phase !== 'lobby';
    if (screen.hidden) return;
    paint();
    const key = JSON.stringify([r.roster, host, r.score, r.map]);
    if (key === drawn) return;
    drawn = key;
    const hosting = host === sim.me;
    const me = playerOf(r, sim.me);
    const row = (p: Player, team: Team, side: Side) => {
      const notes = [p === me && 'ви', p.client === host && 'хост', p.client === null && 'поза кімнатою'].filter(Boolean);
      const other: Team = team === 'A' ? 'B' : 'A';
      const moves = () => send({ type: 'roster', from: sim.me, name: p.name, team: other });
      const character = ofSide(side)[lookOf(r, p, side)]!;
      const e = hosting ? tag('button', { type: 'button', className: 'player', title: 'Перевести в іншу команду', onclick: moves }) : tag('p', { className: 'player' });
      e.append(...portrait(character.id), tag('b', { textContent: p.name }), tag('span', { textContent: character.name }));
      if (notes.length) e.append(tag('small', { textContent: notes.join(', ') }));
      return e;
    };
    const picker = (side: Side) => {
      const mine = me === undefined ? undefined : lookOf(r, me, side);
      const tiles = ofSide(side).map((c, look) =>
        tag(
          'button',
          { type: 'button', className: 'character', title: c.signature, ariaPressed: String(mine === look), onclick: () => send({ type: 'look', from: sim.me, side, look, worn: me?.worn[side] ?? {} }) },
          ...portrait(c.id),
          tag('span', { textContent: c.name }),
        ),
      );
      const picked = mine === undefined ? undefined : ofSide(side)[mine];
      return tag(
        'div',
        { className: 'pick' },
        tag('h3', { textContent: side === 'cat' ? 'Ваш кіт' : 'Ваш пес' }),
        tag('div', { className: 'row' }, ...tiles),
        tag('p', { className: 'signature', textContent: picked ? `${picked.name}: ${picked.signature}` : '' }),
      );
    };
    const column = (team: Team, side: Side) =>
      tag(
        'section',
        { className: `side team-${team.toLowerCase()}` },
        tag('h2', { textContent: `${SIDE[side]} · ${TEAM[team]}` }),
        tag('div', { className: 'players' }, ...r.roster.filter((p) => p.team === team).map((p) => row(p, team, side))),
        ...(me ? [picker(side)] : []),
      );
    const cats = catsTeam(r);
    const map = `Мапа: ${MAPS[mapOf(sim)] ?? mapOf(sim)}`;
    screen.replaceChildren(
      tag('header', {}, tag('h1', { textContent: `Кімната ${room}` }), ...(r.match === null ? [] : [tag('p', { className: 'score', textContent: score(r) })]), settingsButton(), leaveButton()),
      tag('div', { className: 'teams' }, column(cats, 'cat'), column(cats === 'A' ? 'B' : 'A', 'dog')),
      hosting
        ? tag(
            'footer',
            {},
            tag('p', { textContent: map }),
            tag('p', { className: 'tip', textContent: 'Клацніть ім’я, щоб перевести гравця в іншу команду.' }),
            tag('button', { type: 'button', className: 'start', textContent: 'Почати матч', onclick: start }),
          )
        : tag('footer', {}, tag('p', { textContent: `${map}. Чекаємо, поки хост почне матч.` })),
      tag('p', { className: 'voice', textContent: VOICE }),
    );
  };
}
