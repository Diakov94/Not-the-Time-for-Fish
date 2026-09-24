import { keyOf } from '../input/bindings.ts';
import type { Variant } from '../sim/entities.ts';
import type { Phase } from '../sim/messages.ts';
import type { Perk } from '../sim/perks.ts';

// Every player-facing word of the HUD, in Ukrainian (GAME.md, Localization): the HUD's text lives here.
export const PHASE: Partial<Record<Phase, string>> = { prep: 'Підготовка', heist: 'Пограбування', overtime: 'Овертайм' };
export const FISH = { title: 'Рибка', secured: 'вкрадено', left: 'лишилось' };
export const ITEMS = { mines: 'Міни', trap: 'Пастка', perk: 'Перк', none: 'немає', inHand: 'є', next: 'далі' };
export const MINE: Partial<Record<Variant, string>> = { firecracker: 'петарда', water: 'водяна' };
export const EFFECT = { wet: 'Мокрий', slipped: 'Послизнувся' };
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
// space (\u00a0) keeps a key with its action when a line wraps. A key is named by the input zone when the
// hint is shown (a getter), so the hint names the key the action has.
const k = keyOf;
export const HINT = {
  controls: {
    get cat() {
      return `${k('sneak')}\u00a0—\u00a0крастися, ${k('jump')}\u00a0—\u00a0стрибок, ${k('grab')}\u00a0—\u00a0схопити, ${k('interact')}\u00a0—\u00a0знешкодити, ${k('plant')}\u00a0—\u00a0пастка`;
    },
    get dog() {
      return `${k('grab')}\u00a0—\u00a0схопити кота, ${k('plant')}\u00a0—\u00a0міна, ${k('interact')}\u00a0—\u00a0нюхати слід, ${k('perk')}\u00a0—\u00a0перк`;
    },
  },
  objective: { cat: 'Винеси рибу з дому в схованку за парканом', dog: 'Не дай котам винести рибу: хапай і неси у вольєр' },
  mines: {
    get cat() {
      return `Крадучись, вусами відчуєш міну. Затисни\u00a0${k('interact')}, щоб знешкодити`;
    },
    dog: 'Міни оглушують котів. Постій у будці, щоб поповнити запас',
  },
  kennel: {
    get cat() {
      return `Спійманих звільняє засув вольєра (${k('interact')}) ззовні, або підкоп з часом`;
    },
    dog: 'Кидай схоплених котів у вольєр і стережи засув',
  },
};
export const HIDE = 'H\u00a0—\u00a0сховати';
