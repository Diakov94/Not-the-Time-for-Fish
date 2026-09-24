// The room screen: create a room or join one by its code. `enter` connects to the room; while it fails
// the screen stays and says so. Once in, the screen leaves a one-line hint that shows the room's code,
// so the other players can join it, and the controls. The app's player-facing text lives in its screens.
export function roomScreen<T>(enter: (code: string) => Promise<T>): Promise<T> {
  const screen = document.createElement('form');
  screen.className = 'room';
  screen.innerHTML = `
    <h1>Не час для рибки</h1>
    <button type="button" name="create">Створити кімнату</button>
    <p>або</p>
    <input name="code" placeholder="Код кімнати" inputmode="numeric" maxlength="4" autocomplete="off" />
    <button name="join">Приєднатися</button>
    <p class="status"></p>`;
  document.body.append(screen);
  const status = screen.querySelector('.status')!;
  const code = screen.querySelector('input')!;
  return new Promise((resolve) => {
    const tryRoom = async (room: string) => {
      status.textContent = 'З’єднання…';
      screen.inert = true;
      try {
        const value = await enter(room);
        screen.replaceWith(hint(room));
        resolve(value);
      } catch {
        status.textContent = 'Немає зв’язку з сервером кімнат. Спробуйте ще раз.';
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
  p.textContent = `Кімната ${room} · клацніть, щоб керувати камерою · WASD — рух · Shift — біг · Пробіл — стрибок · ЛКМ — схопити / кинути · F9 — звіт про розсинхрон`;
  return p;
}
