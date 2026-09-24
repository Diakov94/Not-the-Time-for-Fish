import { keyOf } from '../../input/bindings.ts';
import type { Late, Refused } from '../../net/client.ts';
import type { Refusal } from '../../sim/round.ts';

// Why the round's fold refused the name (card 68), as the player reads it.
const REFUSAL: Record<Refusal, string> = {
  taken: 'Це ім’я вже зайняте в цій кімнаті. Оберіть інше.',
  named: 'Ви вже в цій кімнаті під іншим ім’ям.',
};
// A join net gave up on with no answer (`late`), and the room gone under a player who was in it (`lost`).
const LATE = 'Кімната не відповідає. Спробуйте ще раз.';
const LOST = 'З’єднання втрачено. Приєднайтеся знову.';

// What the room screen keeps in localStorage (card 50), the only save GAME.md allows: the player's
// name and the last room it entered, so a reload rejoins in one click.
const NAME = 'name';
const ROOM = 'room';

// The room screen: a name, then create a room or join one by its code. `enter` connects to the room
// with the name; while it fails the screen stays and says why: the fold's reason for a refused name, no
// answer within net's JOIN_MS, or no relay, and the name can be changed. The name lives in its input and
// localStorage only; once in, the round's roster is the fact. Once in, the screen leaves a one-line hint
// that shows the room's code, so the other players can join it, and the controls, each key named by the
// input zone; a rejoin's hint replaces the last one. After a lost connection it opens saying so, with the
// room and the name the player was in (`lost`, this tab's own, not the storage's another tab may have
// written), so one click rejoins. The app's player-facing text lives in its screens.
export function roomScreen<T>(enter: (code: string, name: string) => Promise<T>, lost?: { room: string; name: string }): Promise<T> {
  const screen = document.createElement('form');
  screen.className = 'room';
  screen.innerHTML = `
    <h1>Не час для рибки</h1>
    <input name="player" placeholder="Ваше ім’я" maxlength="20" autocomplete="off" />
    <button type="button" name="create">Створити кімнату</button>
    <p>або</p>
    <input name="code" placeholder="Код кімнати" inputmode="numeric" maxlength="4" autocomplete="off" />
    <button name="join">Приєднатися</button>
    <p class="status"></p>`;
  document.body.append(screen);
  const status = screen.querySelector('.status')!;
  if (lost) status.textContent = LOST;
  const player = screen.querySelector<HTMLInputElement>('[name=player]')!;
  const code = screen.querySelector<HTMLInputElement>('[name=code]')!;
  player.value = lost?.name ?? localStorage.getItem(NAME) ?? '';
  code.value = lost?.room ?? localStorage.getItem(ROOM) ?? '';
  return new Promise((resolve) => {
    const tryRoom = async (room: string) => {
      const name = player.value.trim();
      if (!name) {
        status.textContent = 'Введіть своє ім’я.';
        return;
      }
      status.textContent = 'З’єднання…';
      screen.inert = true;
      try {
        const value = await enter(room, name);
        localStorage.setItem(NAME, name);
        localStorage.setItem(ROOM, room);
        document.querySelector('.hint')?.remove();
        screen.replaceWith(hint(room));
        resolve(value);
      } catch (e) {
        const reason = (e as Partial<Refused>).reason;
        status.textContent = reason ? REFUSAL[reason] : (e as Partial<Late>).code === 'late' ? LATE : 'Немає зв’язку з сервером кімнат. Спробуйте ще раз.';
        screen.inert = false;
      }
    };
    // Digits only, so a code reads the same in any keyboard layout.
    screen.querySelector<HTMLButtonElement>('[name=create]')!.onclick = () => tryRoom(String(1000 + Math.floor(Math.random() * 9000)));
    screen.onsubmit = (e) => {
      e.preventDefault();
      const room = code.value.trim();
      if (/^\d{4}$/.test(room)) tryRoom(room);
      else status.textContent = 'Код кімнати — чотири цифри.';
    };
  });
}

function hint(room: string): HTMLElement {
  const p = document.createElement('p');
  p.className = 'hint';
  const k = keyOf;
  p.textContent = `Кімната ${room} · клацніть, щоб керувати камерою · ${k('forward')}${k('left')}${k('back')}${k('right')} — рух · ${k('sprint')} — біг · ${k('jump')} — стрибок · ${k('sneak')} — крастися · ${k('grab')} — схопити / кинути · ${k('plant')} — міна / пастка · ${k('interact')} — взаємодія, утримати — нюхати / знешкодити · ${k('perk')} — перк · ${k('mark')} — позначка · ${k('next')} — інший кіт (з вольєра) · ${k('report')} — звіт про розсинхрон`;
  return p;
}
