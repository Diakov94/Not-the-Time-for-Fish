import type { Phase } from '../sim/messages.ts';
import type { Perk } from '../sim/perks.ts';

// Every player-facing word of the HUD, in Ukrainian (GAME.md, Localization): the HUD's text lives here.
export const PHASE: Partial<Record<Phase, string>> = { prep: 'Підготовка', heist: 'Пограбування', overtime: 'Овертайм' };
export const FISH = { title: 'Рибка', secured: 'вкрадено', left: 'лишилось' };
export const ITEMS = { mines: 'Міни', trap: 'Пастка', perk: 'Перк', none: 'немає', inHand: 'є' };
export const PERK: Record<Perk, string> = {
  sapper: 'Сапер',
  bloodhound: 'Нюхач',
  bulldog: 'Бульдог',
  bark: 'Гавкіт',
  ninja: 'Ніндзя',
  acrobat: 'Акробат',
  decoy: 'Приманка',
  safecracker: 'Ведмежатник',
};
