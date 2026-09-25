import * as THREE from 'three';
import { COSMETICS } from '../../art/cosmetics.ts';
import { INK, OVERLAY } from '../../art/palette.ts';
import { FRAME, lookFor, rigFor } from '../../art/rig.ts';
import { CHARACTERS, ofSide } from '../../content/characters.ts';
import { progress } from '../../meta/progress.ts';
import { ruled, unlocked } from '../../meta/unlocks.ts';
import type { ClientId } from '../../sim/entities.ts';
import type { Look, MapPick, Side, Worn } from '../../sim/messages.ts';
import { lookOf, playerOf, rotation, roundsOf, type Player } from '../../sim/round.ts';
import type { Sim } from '../../sim/world.ts';
import { cosmeticName, leaveButton, paint, settingsButton, tag, VOICE } from './parts.ts';

// The maps as players name them, by the map's file name (ADR 0011); a map not named here shows that.
const MAPS: Record<string, string> = { 'country-house': 'Дача', 'high-rise': 'Багатоповерхівка', 'fish-market': 'Рибний ринок', farm: 'Ферма', yacht: 'Яхта' };

// The map the next match is played on: the host's pick in the round table, or the level the world was
// built from, among the maps the app found (card 101).
const mapOf = (sim: Sim) => sim.round.map ?? Object.keys(sim.levels).find((name) => sim.levels[name] === sim.level) ?? '';

// Hat or accessory, the catalogue's word per id (ADR 0013).
const KIND = new Map(COSMETICS.map((c) => [c.id, c.kind]));
// With nothing unlocked, the nearest rule is meta's first (unlocks.ts lists the one-event rules first);
// its words are this screen's, for that id only: another first rule shows no hint rather than a wrong one.
const HINT: Record<string, string> = { 'paper-crown': 'відкривається за перший матч, зіграний до кінця' };

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
// draws the table's roster as one list in join order, each name with the side the fold's rotation will
// give it at the next prep (ADR 0014: `rotation` is the preview, the fold's write at prep the fact), its
// character for that side and its session wins; the rounds the match will have for the players seated
// now (`roundsOf`); the player's own pickers, a character per side, each tile with its portrait and name,
// the picked one's signature detail beneath; and a way out of the room. It turns clicks into the sim's
// messages: the player's own look and what it wears per side, from what this browser has unlocked (card
// 145, ADR 0013), and for the host the map among the maps the app found and the start. It keeps no roster
// and decides no side or map; it is redrawn when what it shows changes. Which look a player has and wears
// and the map are the round table's (`lookOf`, `worn`, `map`).
export function lobbyScreen(room: string, send: (m: Look | MapPick) => void, start: () => void): (sim: Sim, host: ClientId) => void {
  const screen = tag('div', { className: 'screen lobby' });
  document.body.append(screen);
  let drawn = '';
  return (sim, host) => {
    const r = sim.round;
    screen.hidden = r.phase !== 'lobby';
    if (screen.hidden) return;
    paint();
    const mine = unlocked(progress());
    const key = JSON.stringify([r.roster, r.results, host, r.score, r.map, mine]);
    if (key === drawn) return;
    drawn = key;
    const hosting = host === sim.me;
    const me = playerOf(r, sim.me);
    const dogs = rotation(r);
    const row = (p: Player) => {
      const side: Side = dogs.includes(p.name) ? 'dog' : 'cat';
      const wins = Object.hasOwn(r.score, p.name) ? r.score[p.name]! : 0;
      const notes = [side === 'dog' && 'пес наступного раунду', p === me && 'ви', p.client === host && 'хост', p.client === null && 'поза кімнатою', wins > 0 && `перемог у сесії: ${wins}`].filter(Boolean);
      const character = ofSide(side)[lookOf(r, p, side)]!;
      const e = tag('p', { className: 'player' });
      e.append(...portrait(character.id), tag('b', { textContent: p.name }), tag('span', { textContent: character.name }));
      if (notes.length) e.append(tag('small', { textContent: notes.join(', ') }));
      return e;
    };
    const picker = (me: Player, side: Side) => {
      const own = lookOf(r, me, side);
      const worn = me.worn[side] ?? {};
      const tiles = ofSide(side).map((c, look) =>
        tag(
          'button',
          { type: 'button', className: 'character', title: c.signature, ariaPressed: String(own === look), onclick: () => send({ type: 'look', from: sim.me, side, look, worn }) },
          ...portrait(c.id),
          tag('span', { textContent: c.name }),
        ),
      );
      // A tile puts an unlocked hat or accessory on, or takes it off when it is on.
      const wear = mine.flatMap((id) => {
        const kind = KIND.get(id);
        if (!kind) return [];
        const on = worn[kind] === id;
        const next: Worn = { ...worn };
        if (on) delete next[kind];
        else next[kind] = id;
        const title = kind === 'hat' ? 'шапка' : 'аксесуар';
        return [tag('button', { type: 'button', className: 'character', title, ariaPressed: String(on), onclick: () => send({ type: 'look', from: sim.me, side, look: own, worn: next }) }, tag('span', { textContent: cosmeticName(id) }))];
      });
      const picked = ofSide(side)[own];
      return tag(
        'div',
        { className: 'pick' },
        tag('h3', { textContent: side === 'cat' ? 'Ваш кіт' : 'Ваш пес' }),
        tag('div', { className: 'row' }, ...tiles),
        tag('p', { className: 'signature', textContent: picked ? `${picked.name}: ${picked.signature}` : '' }),
        ...(wear.length ? [tag('h3', { textContent: 'Шапка й аксесуар' }), tag('div', { className: 'row' }, ...wear)] : []),
      );
    };
    const first = ruled()[0];
    const none = `Нічого ще не відкрито.${first && Object.hasOwn(HINT, first) ? ` ${cosmeticName(first)} ${HINT[first]}.` : ''}`;
    // The match's rounds for the names seated now, the ones the rotation picks from (ADR 0014).
    const rounds = roundsOf(r.roster.filter((p) => p.client !== null).length);
    const map = `Мапа: ${MAPS[mapOf(sim)] ?? mapOf(sim)}`;
    screen.replaceChildren(
      tag('header', {}, tag('h1', { textContent: `Кімната ${room}` }), tag('p', { textContent: `Матч на ${rounds} ${rounds === 1 ? 'раунд' : rounds < 5 ? 'раунди' : 'раундів'}` }), settingsButton(), leaveButton()),
      tag(
        'div',
        { className: 'sides' },
        tag('section', { className: 'side' }, tag('h2', { textContent: 'Гравці' }), tag('div', { className: 'players' }, ...r.roster.map(row))),
        tag('section', { className: 'side' }, tag('h2', { textContent: 'Ваш вибір' }), ...(me ? [picker(me, 'cat'), picker(me, 'dog')] : []), ...(mine.length ? [] : [tag('p', { className: 'signature', textContent: none })])),
      ),
      hosting
        ? tag(
            'footer',
            {},
            tag('p', { className: 'tip', textContent: map }),
            ...Object.keys(sim.levels).map((name) =>
              tag('button', { type: 'button', className: name === mapOf(sim) ? '' : 'quiet', textContent: MAPS[name] ?? name, ariaPressed: String(name === mapOf(sim)), onclick: () => send({ type: 'map', from: sim.me, name }) }),
            ),
            tag('button', { type: 'button', className: 'start', textContent: 'Почати матч', onclick: start }),
          )
        : tag('footer', {}, tag('p', { textContent: `${map}. Чекаємо, поки хост почне матч.` })),
      tag('p', { className: 'voice', textContent: VOICE }),
    );
  };
}
