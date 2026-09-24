import type { Team } from '../../sim/messages.ts';

// A DOM element with its properties and children. The screens build what they show with it, never as
// HTML, so a player's name is only ever text.
export function tag<K extends keyof HTMLElementTagNameMap>(name: K, props: Partial<HTMLElementTagNameMap[K]> = {}, ...children: (Node | string)[]) {
  const e = Object.assign(document.createElement(name), props);
  e.append(...children);
  return e;
}

// A team as the screens name it.
export const TEAM: Record<Team, string> = { A: 'команда А', B: 'команда Б' };
