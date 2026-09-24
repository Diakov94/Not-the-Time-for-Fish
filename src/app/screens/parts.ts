import { hex } from '../../art/decals.ts';
import { CLOTH, GOLD, INK, PAINT, TEAM as PAIR, WOOD } from '../../art/palette.ts';
import { settings } from '../../settings/store.ts';
import type { Round } from '../../sim/round.ts';

// A DOM element with its properties and children. The screens build what they show with it, never as
// HTML, so a player's name is only ever text.
export function tag<K extends keyof HTMLElementTagNameMap>(name: K, props: Partial<HTMLElementTagNameMap[K]> = {}, ...children: (Node | string)[]) {
  const e = Object.assign(document.createElement(name), props);
  e.append(...children);
  return e;
}

// The session's matches won per name, the round table's count.
export const score = (r: Round) => `Рахунок сесії: ${Object.entries(r.score).map(([name, n]) => `${name} ${n}`).join(', ') || 'перемог ще немає'}`;

// GAME.md, Menus: the voice-channel reminder, on the menu and in the lobby; a side is per round (ADR 0014).
export const VOICE = 'Два голосові канали: коти в одному, пси в іншому. Змінили бік — змініть канал.';

// The settings overlay (card 121) opens on a click on any `[data-settings]` element; no screen imports it.
export function settingsButton(): HTMLButtonElement {
  const b = tag('button', { type: 'button', className: 'quiet', textContent: 'Налаштування' });
  b.dataset.settings = '';
  return b;
}

// Leaving the room (card 120) reloads the page: the browser closes the socket, the relay tells the others
// `left` (their roster keeps the name, out of the room), and the page starts again at the room screen.
export const leaveButton = () => tag('button', { type: 'button', className: 'leave', textContent: 'Вийти з кімнати', onclick: () => location.reload() });

// The screens' colours as CSS variables on the root, which index.html's styles read: palette slots
// (ADR 0011), the pair that marks the sides in this viewer's variant (ADR 0012; cats the light one, ADR
// 0014), and a band of cross-stitched diamonds, the embroidered cloth of GAME.md's art direction. Painted again when the variant changes.
let painted = '';
export function paint(): void {
  const variant = settings().palette;
  if (variant === painted) return;
  painted = variant;
  const slots = { night: INK.shadow, wood: WOOD.stained, paper: PAINT.porcelain, linen: CLOTH.linen, ink: INK.black, brass: GOLD.brass, star: GOLD.star, poppy: CLOTH.poppy, cherry: PAINT.cherry, cat: PAIR[variant].A, dog: PAIR[variant].B };
  const root = document.documentElement.style;
  for (const [name, colour] of Object.entries(slots)) root.setProperty(`--${name}`, hex(colour));
  // A stitch is a unit square; the band is six stitches between two black rows, a red diamond with a
  // black edge every twelve.
  const [linen, ink, poppy] = [CLOTH.linen, INK.black, CLOTH.poppy].map(hex);
  let stitches = '';
  for (let y = 1; y < 7; y++)
    for (let x = 0; x < 12; x++) {
      const d = Math.abs(x - 5.5) + Math.abs(y - 3.5);
      if (d <= 3) stitches += `<rect x="${x}" y="${y}" width="1" height="1" fill="${d < 3 ? poppy : ink}"/>`;
    }
  const band = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 12 8" shape-rendering="crispEdges"><rect width="12" height="8" fill="${linen}"/><rect width="12" height="1" fill="${ink}"/><rect y="7" width="12" height="1" fill="${ink}"/>${stitches}</svg>`;
  root.setProperty('--band', `url("data:image/svg+xml,${encodeURIComponent(band)}")`);
}
