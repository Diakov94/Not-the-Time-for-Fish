import type { Phase } from '../sim/messages.ts';
import type { Perk } from '../sim/perks.ts';

// Every player-facing word of the HUD, in Ukrainian (GAME.md, Localization): the HUD's text lives here.
export const PHASE: Partial<Record<Phase, string>> = { prep: 'Підготовка', heist: 'Пограбування', overtime: 'Овертайм' };
export const FISH = { title: 'Рибка', secured: 'вкрадено', left: 'лишилось' };
export const ITEMS = { mines: 'Міни', trap: 'Пастка', perk: 'Перк', none: 'немає', inHand: 'є' };
export const WORK = { plant: 'Мінування', defuse: 'Знешкодження' };
export const OVERTIME = { all: 'Час вийшов: раунд триває, поки несуть рибку', carrier: 'Ти несеш рибку: собаки чують, де ти' };
export const MATE = { free: 'вільний', grabbed: 'схоплений', captured: 'у вольєрі' };
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
// First-round hints (card 62), per side: at most 10 words each, and HIDE's 2 under every one. A no-break
// space (\u00a0) keeps a key with its action when a line wraps.
export const HINT = {
  controls: {
    cat: 'Ctrl\u00a0—\u00a0крастися, Пробіл\u00a0—\u00a0стрибок, ЛКМ\u00a0—\u00a0схопити, E\u00a0—\u00a0знешкодити, Q\u00a0—\u00a0пастка',
    dog: 'ЛКМ\u00a0—\u00a0схопити кота, Q\u00a0—\u00a0міна, E\u00a0—\u00a0нюхати слід, F\u00a0—\u00a0перк',
  },
  objective: { cat: 'Винеси рибу з дому в схованку за парканом', dog: 'Не дай котам винести рибу: хапай і неси у вольєр' },
  mines: { cat: 'Крадучись, вусами відчуєш міну. Затисни\u00a0E, щоб знешкодити', dog: 'Міни оглушують котів. Постій у будці, щоб поповнити запас' },
  kennel: { cat: 'Спійманих звільняє засув вольєра (E) ззовні, або підкоп з часом', dog: 'Кидай схоплених котів у вольєр і стережи засув' },
};
export const HIDE = 'H\u00a0—\u00a0сховати';
