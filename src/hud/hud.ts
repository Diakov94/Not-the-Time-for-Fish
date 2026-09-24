import { minesLeft } from '../sim/mines.ts';
import { perkOf } from '../sim/perks.ts';
import { inPlay, playsAs, remaining } from '../sim/round.ts';
import type { Sim } from '../sim/world.ts';
import { CSS } from './style.ts';
import { FISH, ITEMS, PERK, PHASE } from './words.ts';

// GAME.md, UI / HUD: the in-round overlay (ADR 0008), a view of the sim as render and audio are. Once per
// frame it reads the round table, the entity table and this client's own character state and writes what
// they say into the DOM; it keeps no timer, count or state of its own. Shown while the round is in play.
export type Hud = {
  root: HTMLElement;
  phase: HTMLElement;
  timer: HTMLElement;
  secured: HTMLElement;
  left: HTMLElement;
  mines: HTMLElement;
  trap: HTMLElement;
  perk: HTMLElement;
};

export function createHud(): Hud {
  document.head.append(Object.assign(document.createElement('style'), { textContent: CSS }));
  const root = document.createElement('div');
  root.className = 'hud';
  root.hidden = true;
  root.innerHTML = `
    <div class="clock panel"><span class="phase"></span><span class="timer"></span></div>
    <div class="fish panel">
      <span class="title">${FISH.title}</span>
      <b class="secured"></b><span class="of">/</span><b class="left"></b>
      <small>${FISH.secured}</small><span></span><small>${FISH.left}</small>
    </div>
    <div class="items"><span class="mines panel"></span><span class="trap panel"></span><span class="perk panel"></span></div>`;
  document.body.append(root);
  const $ = (selector: string) => root.querySelector<HTMLElement>(selector)!;
  return { root, phase: $('.phase'), timer: $('.timer'), secured: $('.secured'), left: $('.left'), mines: $('.mines'), trap: $('.trap'), perk: $('.perk') };
}

// Once per frame, after the sim stepped and before the loop drains the event list.
export function drawHud(hud: Hud, sim: Sim): void {
  const r = sim.round;
  hud.root.hidden = !inPlay(r);
  if (hud.root.hidden) return;
  // The phase and its remaining time, the sim's derivation (ADR 0007), in whole seconds counted down.
  write(hud.phase, PHASE[r.phase] ?? '');
  write(hud.timer, clock(remaining(sim) ?? 0));
  // Secured is the round table's; a secured fish leaves the entity table, so the rest are still in play.
  write(hud.secured, String(r.secured.length));
  write(hud.left, String([...sim.entities.values()].filter((e) => e.kind === 'fish').length));
  // The carried items, this client's own facts: a dog's mines, a cat's trap in hand, the perk slot.
  const side = playsAs(r, sim.me);
  hud.mines.hidden = side !== 'dog';
  hud.trap.hidden = side !== 'cat';
  hud.perk.hidden = side === undefined;
  write(hud.mines, `${ITEMS.mines}: ${minesLeft(sim)}`);
  write(hud.trap, `${ITEMS.trap}: ${sim.trap ? ITEMS.inHand : ITEMS.none}`);
  hud.trap.classList.toggle('off', !sim.trap);
  const perk = perkOf(sim);
  const until = sim.perk?.until ?? null;
  write(hud.perk, `${ITEMS.perk}: ${perk ? PERK[perk] + (until === null ? '' : ` ${clock(until - sim.time)}`) : ITEMS.none}`);
  hud.perk.classList.toggle('off', !perk);
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
