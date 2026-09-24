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
