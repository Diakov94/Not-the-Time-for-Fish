import type { Vector } from '@dimforge/rapier3d-compat';
import { TEAM } from '../art/palette.ts';
import '../input/remap.ts';
import { livePings } from '../render/senses.ts';
import { project, type Target, type View } from '../render/view.ts';
import { isCharacter } from '../sim/entities.ts';
import { pinging } from '../sim/heist.ts';
import { minesLeft, nextMine, progress, stunned, wet, whisker } from '../sim/mines.ts';
import type { Side } from '../sim/messages.ts';
import { sideOf } from '../sim/ownership.ts';
import { perkOf } from '../sim/perks.ts';
import { inPlay, playerOf, playsAs, remaining, type Player } from '../sim/round.ts';
import type { Sim } from '../sim/world.ts';
import { offerView } from '../settings/screen.ts';
import { settings } from '../settings/store.ts';
import { due, see, type Hint } from './hints.ts';
import { CSS } from './style.ts';
import { EFFECT, FISH, HIDE, HINT, ITEMS, MATE, MINE, OVERTIME, OWN, PERK, PHASE, WORK } from './words.ts';

// GAME.md, UI / HUD: the in-round overlay (ADR 0008), a view of the sim as render and audio are. Once per
// frame it reads the round, entity and ownership tables, this client's own character state and render's
// pings and projection, and writes what they say into the DOM. It keeps no timer, count or state of its
// own; all it stores is a per-viewer setting, the first-round hints this browser has seen, and the age of
// each sound cue it shows. Shown while the round is in play.
export type Hud = {
  root: HTMLElement;
  phase: HTMLElement;
  timer: HTMLElement;
  secured: HTMLElement;
  left: HTMLElement;
  own: HTMLElement;
  items: HTMLElement;
  mines: HTMLElement;
  trap: HTMLElement;
  perk: HTMLElement;
  effect: HTMLElement;
  overtime: HTMLElement;
  work: HTMLElement;
  what: HTMLElement;
  fill: HTMLElement;
  whisker: HTMLElement;
  team: HTMLElement;
  arrows: HTMLElement;
  cues: { p: Vector; born: number }[];
};

// The settings overlay (ADR 0012) mounts itself on import, before any room; it learns the team pairs and
// whether a round is in play (the HUD is shown) from the HUD, and the bindings from the input zone's
// remap.ts, loaded here with it.
offerView({ pairs: TEAM, playing: () => document.querySelector('.hud:not([hidden])') !== null });

export function createHud(): Hud {
  document.head.append(Object.assign(document.createElement('style'), { textContent: CSS }));
  const root = document.createElement('div');
  root.className = 'hud';
  root.hidden = true;
  root.innerHTML = `
    <div class="top">
      <div class="clock panel"><span class="phase"></span><span class="timer"></span></div>
      <div class="overtime panel"></div>
      <div class="own panel"></div>
    </div>
    <div class="fish panel">
      <span class="title">${FISH.title}</span>
      <b class="secured"></b><span class="of">/</span><b class="left"></b>
      <small>${FISH.secured}</small><span></span><small>${FISH.left}</small>
    </div>
    <div class="items"><span class="mines panel"></span><span class="trap panel"></span><span class="perk panel"></span><span class="effect panel"></span></div>
    <div class="work panel"><span class="what"></span><div class="bar"><div class="fill"></div></div></div>
    <div class="whisker"><i><b></b><b></b><b></b></i><i><b></b><b></b><b></b></i></div>
    <div class="team"></div>
    <div class="arrows"></div>`;
  document.body.append(root);
  // H hides the first-round hint on screen and every one after it on that hint's side, for this browser.
  addEventListener('keydown', (e) => {
    const tip = root.querySelector<HTMLElement>('.tip');
    if (e.code !== 'KeyH' || e.repeat || e.target instanceof HTMLInputElement || !tip) return;
    see(tip.dataset.side as Side, ...(Object.keys(HINT) as Hint[]));
    tip.remove();
  });
  const $ = (selector: string) => root.querySelector<HTMLElement>(selector)!;
  return {
    root,
    phase: $('.phase'),
    timer: $('.timer'),
    secured: $('.secured'),
    left: $('.left'),
    own: $('.own'),
    items: $('.items'),
    mines: $('.mines'),
    trap: $('.trap'),
    perk: $('.perk'),
    effect: $('.effect'),
    overtime: $('.overtime'),
    work: $('.work'),
    what: $('.what'),
    fill: $('.fill'),
    whisker: $('.whisker'),
    team: $('.team'),
    arrows: $('.arrows'),
    cues: [],
  };
}

// Once per frame, after the sim stepped and before the loop drains the event list; `watched` is whom the
// app's camera follows, the app's decision.
export function drawHud(hud: Hud, sim: Sim, view: View, watched?: Target): void {
  // The viewer's text scale, on the root so the app's screens follow it too (cards 118-120).
  const { textScale, soundCues } = settings();
  const root = document.documentElement.style;
  if (root.getPropertyValue('--scale') !== String(textScale)) root.setProperty('--scale', String(textScale));
  const r = sim.round;
  hud.root.hidden = !inPlay(r);
  if (hud.root.hidden) {
    hud.root.querySelector('.tip')?.remove(); // a hint cut short by the round's end is not shown again at the next
    return;
  }
  // The phase and its remaining time, the sim's derivation (ADR 0007), in whole seconds counted down.
  write(hud.phase, PHASE[r.phase] ?? '');
  write(hud.timer, clock(remaining(sim) ?? 0));
  // Secured is the round table's; a secured fish leaves the entity table, so the rest are still in play.
  write(hud.secured, String(r.secured.length));
  write(hud.left, String([...sim.entities.values()].filter((e) => e.kind === 'fish').length));
  // The own state under the clock, as the mates' is read: held by the ownership table, captured by the round
  // table with the dig-out's end on this client's clock (ADR 0007), 0:00 once it dug out until the fold
  // frees it, and the teammate the camera follows. The items wait while captured.
  const me = playerOf(r, sim.me);
  const own = me ? stateOf(sim, me) : 'free';
  const home = typeof watched === 'string' ? sim.entities.get(watched)?.home : undefined;
  const mate = home && home !== sim.me ? playerOf(r, home)?.name : undefined;
  const kennel = `${OWN.kennel} · ${OWN.digOut} ${clock(sim.digOut === null ? 0 : sim.digOut - sim.time)}${mate ? ` · ${OWN.watching}: ${mate}` : ''}`;
  hud.own.hidden = own === 'free';
  write(hud.own, own === 'grabbed' ? OWN.grabbed : own === 'captured' ? kennel : '');
  hud.items.hidden = own === 'captured';
  // The carried items, this client's own facts: a dog's mines and which comes next, a cat's trap in hand,
  // the perk slot; and what a mine or a trap did to the own character: a wet cat's time left, a slipped dog.
  const side = playsAs(r, sim.me);
  hud.mines.hidden = side !== 'dog';
  hud.trap.hidden = side !== 'cat';
  hud.perk.hidden = side === undefined;
  const mines = minesLeft(sim);
  write(hud.mines, `${ITEMS.mines}: ${mines}${mines > 0 ? ` · ${ITEMS.next} ${MINE[nextMine(sim)]}` : ''}`);
  write(hud.trap, `${ITEMS.trap}: ${sim.trap ? ITEMS.inHand : ITEMS.none}`);
  hud.trap.classList.toggle('off', !sim.trap);
  const perk = perkOf(sim);
  const until = sim.perk?.until ?? null;
  write(hud.perk, `${ITEMS.perk}: ${perk ? PERK[perk] + (until === null ? '' : ` ${clock(until - sim.time)}`) : ITEMS.none}`);
  hud.perk.classList.toggle('off', !perk);
  const effect = side === 'cat' && wet(sim) > 0 ? `${EFFECT.wet} ${clock(wet(sim))}` : side === 'dog' && stunned(sim) ? EFFECT.slipped : '';
  hud.effect.hidden = !effect;
  write(hud.effect, effect);
  // The contextual ones, each with the sim's fact it shows: the whisker cue (card 39's query), the plant or
  // defuse in progress, overtime and, for the cat that carries a fish then, that it is heard.
  hud.whisker.hidden = !whisker(sim);
  const work = progress(sim);
  hud.work.hidden = !work;
  if (work) write(hud.what, WORK[work.what]);
  hud.fill.style.width = `${Math.min(1, work?.done ?? 0) * 100}%`;
  hud.overtime.hidden = r.phase !== 'overtime';
  write(hud.overtime, pinging(sim) ? OVERTIME.carrier : OVERTIME.all);
  // The teammates, in roster order: the player's own side, the player left out.
  const mates = r.roster.filter((p) => p !== me && me?.side && p.side === me.side);
  pool(hud.team, mates.length, 'mate panel', '<span class="name"></span> <span class="state"></span>');
  mates.forEach((p, i) => {
    const row = hud.team.children[i] as HTMLElement;
    const state = stateOf(sim, p);
    write(row.firstElementChild as HTMLElement, p.name);
    write(row.lastElementChild as HTMLElement, MATE[state]);
    row.dataset.state = state;
  });
  // A dog's arrows: every ping render shows whose source is off screen, at the screen's edge toward it,
  // fading with its ring. The ring marks the ones on screen.
  const w = innerWidth;
  const h = innerHeight;
  const off = livePings(view.senses, sim)
    .map((ping) => ({ ...project(view, ping.p), age: ping.age }))
    .filter(({ x, y, behind }) => behind || x < 0 || x > w || y < 0 || y > h)
    .concat(cues(hud, sim, side, soundCues).map((cue) => ({ ...project(view, cue.p), age: cue.age })));
  pool(hud.arrows, off.length, 'arrow', '');
  off.forEach(({ x, y, behind, age }, i) => {
    // From the centre toward the point, turned back when it lies behind the camera, to the edge.
    const [dx, dy] = behind ? [w / 2 - x, h / 2 - y] : [x - w / 2, y - h / 2];
    const k = Math.min((w / 2 - EDGE) / Math.abs(dx), (h / 2 - EDGE) / Math.abs(dy));
    const arrow = hud.arrows.children[i] as HTMLElement;
    arrow.style.transform = `translate(${w / 2 + dx * k}px, ${h / 2 + dy * k}px) rotate(${Math.atan2(dy, dx)}rad)`;
    arrow.style.opacity = String(1 - age);
  });
  // One first-round hint at a time, from the fact that calls for it; it leaves at its animation's end.
  const hint = side && !hud.root.querySelector('.tip') ? due(sim, side) : null;
  if (!side || !hint) return;
  see(side, hint);
  const tip = Object.assign(document.createElement('div'), { className: 'tip panel', innerHTML: '<span></span><small></small>' });
  tip.dataset.side = side;
  tip.firstElementChild!.textContent = HINT[hint][side];
  tip.lastElementChild!.textContent = HIDE;
  tip.onanimationend = () => tip.remove();
  hud.root.querySelector('.top')!.append(tip); // under the clock and overtime, never over them
}

const EDGE = 28; // px from the screen's edge to an arrow's centre
const CUE_TIME = 2; // s a sound cue's arrow fades over, as a ping's ring does
const HEARD = 15; // m within which a dog's steps and panting are cues
const PANT_AGE = 0.5; // a panting dog's arrow stands half faded, under a fresh step's

// The sound cues (GAME.md, Accessibility; card 122): with the viewer's toggle on, a player who is not a dog
// (a dog has its pings) sees an edge arrow toward every noise of the event list, a dog's steps only within
// HEARD, and toward every dog within HEARD, which pants. Each arrow is kept with its
// birth only, off the event list; the panting ones are read from the entity table every frame.
function cues(hud: Hud, sim: Sim, side: Side | undefined, on: boolean): { p: Vector; age: number }[] {
  if (!on || !side || side === 'dog') {
    hud.cues.length = 0;
    return [];
  }
  const me = [...sim.entities.values()].find((e) => e.home === sim.me && isCharacter(e.kind))?.body.translation();
  const near = (p: Vector) => me !== undefined && Math.hypot(p.x - me.x, p.y - me.y, p.z - me.z) <= HEARD;
  for (const e of sim.events) {
    if (e.type !== 'noise' || (e.cause === 'step' && !(sideOf(sim.entities, e.from) === 'dog' && near(e.p)))) continue;
    hud.cues.push({ p: { ...e.p }, born: sim.time });
  }
  hud.cues = hud.cues.filter((c) => sim.time - c.born < CUE_TIME);
  const panting = [...sim.entities.values()].filter((e) => e.kind === 'dog' && near(e.body.translation()));
  return [...hud.cues.map((c) => ({ p: c.p, age: (sim.time - c.born) / CUE_TIME })), ...panting.map((e) => ({ p: e.body.translation(), age: PANT_AGE }))];
}

// A teammate is captured by the round table, grabbed by the ownership table (its character held), else free.
function stateOf(sim: Sim, p: Player): keyof typeof MATE {
  if (p.captured !== null) return 'captured';
  const body = [...sim.entities.values()].find((e) => e.home === p.client && isCharacter(e.kind));
  return body && sim.ownership.rows.get(body.id)?.held ? 'grabbed' : 'free';
}

// `n` children of `parent`, made or dropped to fit: the rows the frame shows, never a list of its own.
function pool(parent: HTMLElement, n: number, className: string, html: string): void {
  while (parent.children.length < n) parent.append(Object.assign(document.createElement('div'), { className, innerHTML: html }));
  while (parent.children.length > n) parent.lastElementChild!.remove();
}

// Seconds as m:ss, rounded up: 0:00 only once the time is out.
function clock(s: number): string {
  const n = Math.max(0, Math.ceil(s - 1e-9));
  return `${Math.floor(n / 60)}:${String(n % 60).padStart(2, '0')}`;
}

// The DOM is written only when the text changes.
function write(el: HTMLElement, text: string): void {
  if (el.textContent !== text) el.textContent = text;
}
