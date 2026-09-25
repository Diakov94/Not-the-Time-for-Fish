import { keyOf } from '../../input/bindings.ts';
import type { Late, Refused, Session } from '../../net/client.ts';
import { inPlay, playerOf, type Refusal } from '../../sim/round.ts';
import type { Sim } from '../../sim/world.ts';
import { paint, settingsButton, tag, VOICE } from './parts.ts';

// Why the round's fold refused the name (card 68), as the player reads it.
const REFUSAL: Record<Refusal, string> = {
  taken: 'Це ім’я вже зайняте в цій кімнаті. Оберіть інше.',
  named: 'Ви вже в цій кімнаті під іншим ім’ям.',
};
// A join net gave up on with no answer (`late`), and the room gone under a player who was in it (`lost`).
const LATE = 'Кімната не відповідає. Спробуйте ще раз.';
const LOST = 'З’єднання втрачено. Приєднайтеся знову.';
// A join that found nobody in the room, and a create whose second code was in use too.
const NO_ROOM = (room: string) => `Кімнати ${room} немає. Перевірте код.`;
const IN_USE = 'Код кімнати вже зайнятий. Спробуйте створити ще раз.';
// A `taken` for the name and room this screen remembers is its own last connection, which the relay ends
// only 15-20 s after it went silent (card 46): the same join again every RETRY_MS, at most RETRIES times.
const CLOSING = 'Ваше попереднє з’єднання ще закривається. Спробуємо ще раз…';
const RETRY_MS = 3000;
const RETRIES = 8;

// What the room screen keeps in localStorage (card 50), the only save GAME.md allows: the player's
// name and the last room it entered, so a reload rejoins in one click.
const NAME = 'name';
const ROOM = 'room';
// A name in play with no character of its own: the fold seats a name at prep (ADR 0014), so one that
// joined mid-round waits for the next; read off the round table every frame, never kept. The app parks the
// camera on it, and the hint bar says it.
export const waiting = (sim: Sim) => inPlay(sim.round) && !playerOf(sim.round, sim.me)?.side;
const NEXT_ROUND = 'Раунд уже йде. Ви зайдете з наступного раунду.';
// And that this browser has had the hint bar through a whole round (card 120), a convenience of this
// screen like the name (ADR 0012), not a setting.
const SEEN = 'hints';
// Storage may be off (a private window, blocked site data, ADR 0012): a read gives '', a write does nothing.
const stored = (key: string) => {
  try {
    return localStorage.getItem(key) ?? '';
  } catch {
    return '';
  }
};
const store = (key: string, value: string) => {
  try {
    localStorage.setItem(key, value);
  } catch {
    // nothing kept: the next page asks again
  }
};

// The room screen: a name, then create a room or join one by its code, the settings button and the
// voice-channel reminder. `enter` connects to the room with the name; while it fails the screen stays and
// says why: the fold's reason for a refused name, no answer within net's JOIN_MS, or no relay, and the name
// can be changed. The name lives in its input and localStorage only; once in, the round's roster is the
// fact. Once in, the screen leaves the hint bar in its place; a rejoin's bar replaces the last one. After a
// lost connection it opens saying so, with the room and the name the player was in (`lost`, this tab's
// own, not the storage's another tab may have written), so one click rejoins. The relay makes a room for
// any code (ADR 0005), so whether the player pressed create or join, this screen's fact, is checked against
// the roster the join brought: a join where no other name is there and this client is the host found no
// room, and a create where another name is there landed in a stranger's; either session is closed, and a
// create tries a second code once. The app's player-facing text lives in its screens.
export function roomScreen<T extends { session: Session }>(enter: (code: string, name: string) => Promise<T>, lost?: { room: string; name: string }): Promise<T> {
  paint();
  const screen = document.createElement('form');
  screen.className = 'room';
  screen.innerHTML = `
    <div class="card">
      <h1>${document.title}</h1>
      <div class="band"></div>
      <label class="field">Ваше ім’я <input name="player" maxlength="20" autocomplete="off" /></label>
      <div class="ways">
        <button type="button" name="create">Створити кімнату</button>
        <p>або</p>
        <div class="join">
          <input name="code" placeholder="Код кімнати" inputmode="numeric" maxlength="4" autocomplete="off" />
          <button name="join">Приєднатися</button>
        </div>
      </div>
      <p class="status" role="status"></p>
      <p class="voice">${VOICE}</p>
    </div>`;
  screen.querySelector('.card')!.append(settingsButton());
  document.querySelector('.loading')?.remove(); // index.html's first paint
  document.body.append(screen);
  const status = screen.querySelector('.status')!;
  if (lost) status.textContent = LOST;
  const player = screen.querySelector<HTMLInputElement>('[name=player]')!;
  const code = screen.querySelector<HTMLInputElement>('[name=code]')!;
  player.value = lost?.name ?? stored(NAME);
  code.value = lost?.room ?? stored(ROOM);
  const remembered = { name: player.value, room: code.value };
  let retry: ReturnType<typeof setTimeout> | undefined;
  let retries = 0;
  // An edit stops the retry: the player chose another name or room.
  screen.oninput = () => {
    if (retry === undefined) return;
    clearTimeout(retry);
    retry = undefined;
    status.textContent = '';
  };
  return new Promise((resolve) => {
    // `create`: the codes a create has tried, this one included; 0 for a join.
    const tryRoom = async (room: string, create = 0): Promise<void> => {
      retry = undefined;
      const name = player.value.trim();
      if (!name) {
        status.textContent = 'Введіть своє ім’я.';
        return;
      }
      status.textContent = 'З’єднання…';
      screen.inert = true;
      try {
        const value = await enter(room, name);
        const { sim, host, ws } = value.session;
        const others = sim.round.roster.some((p) => p.name !== name);
        if (create ? others : !others && host === sim.me) {
          ws.close();
          sim.world.free();
          if (create === 1) return tryRoom(newCode(), 2);
          status.textContent = create ? IN_USE : NO_ROOM(room);
          screen.inert = false;
          return;
        }
        store(NAME, name);
        store(ROOM, room);
        document.querySelector('.hint')?.remove();
        screen.replaceWith(hint(room, value.session.sim));
        resolve(value);
      } catch (e) {
        const reason = (e as Partial<Refused>).reason;
        screen.inert = false;
        if (reason === 'taken' && name === remembered.name && room === remembered.room && retries < RETRIES) {
          retries++;
          status.textContent = CLOSING;
          retry = setTimeout(() => tryRoom(room, create), RETRY_MS);
          return;
        }
        status.textContent = reason ? REFUSAL[reason] : (e as Partial<Late>).code === 'late' ? LATE : 'Немає зв’язку з сервером кімнат. Спробуйте ще раз.';
      }
    };
    // The player's own press starts over: no retry pending, the full count again.
    const press = (room: string, create = 0) => {
      clearTimeout(retry);
      retries = 0;
      tryRoom(room, create);
    };
    // Digits only, so a code reads the same in any keyboard layout.
    const newCode = () => String(1000 + Math.floor(Math.random() * 9000));
    screen.querySelector<HTMLButtonElement>('[name=create]')!.onclick = () => press(newCode(), 1);
    screen.onsubmit = (e) => {
      e.preventDefault();
      const room = code.value.trim();
      if (/^\d{4}$/.test(room)) press(room);
      else status.textContent = 'Код кімнати — чотири цифри.';
    };
  });
}

// The hint bar, which the app shows in play: the room's code, so the other players can join it, and the
// controls, each key as the input zone names it this frame, so a remapped key shows its new name. When a
// round this browser saw in play ends, the bar has been seen: it hides from then on, in this room and
// the next. A rejoin's bar replaces it, and the replaced one stops. While the player waits for the next
// round the bar says so instead, seen or not, and that round does not count as seen in play.
function hint(room: string, sim: Sim): HTMLElement {
  const p = tag('p', { className: 'hint' });
  let seen = stored(SEEN) !== '';
  let played = false;
  requestAnimationFrame(function draw() {
    if (!p.isConnected) return;
    const late = waiting(sim);
    if (inPlay(sim.round) && !late) played = true;
    else if (played && !seen && sim.round.phase === 'over') {
      store(SEEN, '1');
      seen = true;
    }
    p.classList.toggle('seen', seen && !late);
    const text = late ? NEXT_ROUND : controls(room);
    if ((late || !seen) && p.textContent !== text) p.textContent = text;
    requestAnimationFrame(draw);
  });
  return p;
}

function controls(room: string): string {
  const k = keyOf;
  return `Кімната ${room} · клацніть, щоб керувати камерою · ${k('forward')}${k('left')}${k('back')}${k('right')} — рух · ${k('sprint')} — біг · ${k('jump')} — стрибок · ${k('sneak')} — крастися · ${k('grab')} — схопити / кинути · ${k('plant')} — міна / пастка · ${k('interact')} — взаємодія, утримати — нюхати / знешкодити · ${k('perk')} — перк · ${k('mark')} — позначка · ${k('next')} — інший кіт (з вольєра) · ${k('report')} — звіт про розсинхрон`;
}
