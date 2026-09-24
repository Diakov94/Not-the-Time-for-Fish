import { reset, save, settings, type Palette, type Settings } from './store.ts';
import { CSS } from './style.ts';

// ADR 0012: the settings overlay, the one writer of the store. It mounts itself when first imported and
// listens for itself: Esc opens it (in play the browser's Esc frees the mouse, which opens it too) and so
// does a click on any `[data-settings]` element, so the menu and the lobby need no import of it; M toggles
// the mute. While it is open no key reaches the game; closing it in play captures the mouse again. It
// imports nothing from the game: what it shows of other zones they lend it through `offerBindings` (the
// input zone: the bindings table, key names and the conflict rule) and `offerView` (the HUD: the team
// pairs of the palette and whether a round is in play).

// A bindings table per device: action -> codes, a KeyboardEvent code or `Mouse<button>`, or a pad's code.
export type Device = 'keyboard' | 'gamepad';
export type Remap = {
  table: () => Record<Device, Partial<Record<string, string[]>>>; // the effective codes, defaults and overrides
  name: (code: string) => string; // a code's name on screen
  conflict: (action: string, code: string) => string | null; // why `code` cannot do `action`, or null
  padPressed: () => string | null; // the code of a pad button held now, polled while one is awaited
};
export type View = { pairs: Record<Palette, { A: number; B: number }>; playing: () => boolean };

// Every player-facing word of the overlay, in Ukrainian.
const WORDS = {
  title: 'Налаштування',
  close: 'Закрити',
  general: 'Загальні',
  controls: 'Керування',
  reset: 'Скинути все',
  on: 'Увімк.',
  off: 'Вимк.',
  preview: 'Так виглядатиме текст у грі',
  action: 'Дія',
  wait: 'Натисніть…',
  cancel: 'Esc — скасувати',
  saved: 'Збережено',
  none: '—',
  noTable: 'Клавіші з’являться тут, щойно гра їх передасть',
};
const PALETTE: Record<Palette, string> = { normal: 'Звичайні', deuteranopia: 'Дейтеранопія', protanopia: 'Протанопія', tritanopia: 'Тританопія' };
const ACTIONS: Record<string, string> = {
  forward: 'Вперед',
  back: 'Назад',
  left: 'Ліворуч',
  right: 'Праворуч',
  sprint: 'Біг',
  sneak: 'Крастися',
  jump: 'Стрибок',
  grab: 'Схопити / кинути',
  plant: 'Міна / пастка',
  interact: 'Взаємодія',
  perk: 'Перк',
  mark: 'Позначка',
  next: 'Інший кіт (з вольєра)',
  report: 'Звіт про розсинхрон',
};
const actionName = (a: string) => ACTIONS[a] ?? (/^emote(\d)$/.test(a) ? `Емоція ${a.slice(5)}` : a);
const DEVICES: Record<Device, string> = { keyboard: 'Клавіатура', gamepad: 'Геймпад' };

// One row per key of the store, typed so a key without a row does not compile: the screen lists what the
// store holds, no more and no less. `bindings` is the second page.
type Row =
  | { name: string; range: [min: number, max: number, step: number]; show: (v: number) => string }
  | { name: string; toggle: true }
  | { name: string; choice: Record<string, string> }
  | { name: string; page: true };
const pct = (v: number) => `${Math.round(v * 100)}%`;
const ROWS: { [K in keyof Settings]: Row } = {
  textScale: { name: 'Розмір тексту', range: [0.8, 1.6, 0.1], show: pct },
  reducedMotion: { name: 'Менше руху (без трусіння камери)', toggle: true },
  soundCues: { name: 'Звуки на екрані (стрілки)', toggle: true },
  palette: { name: 'Кольори команд', choice: PALETTE },
  volume: { name: 'Гучність', range: [0, 1, 0.05], show: pct },
  mute: { name: 'Без звуку (M)', toggle: true },
  sensitivity: { name: 'Чутливість миші', range: [0.25, 3, 0.05], show: (v) => `×${v.toFixed(2)}` },
  invertY: { name: 'Інверсія осі Y', toggle: true },
  sneak: { name: 'Крастися', choice: { toggle: 'Перемикач', hold: 'Утримувати' } },
  deadzone: { name: 'Мертва зона стіка', range: [0, 0.5, 0.01], show: pct },
  bindings: { name: WORDS.controls, page: true },
};

let remap: Remap | undefined;
let view: View | undefined;
export const offerBindings = (r: Remap) => void (remap = r);
export const offerView = (v: View) => void (view = v);

document.head.append(Object.assign(document.createElement('style'), { textContent: CSS }));
const root = Object.assign(document.createElement('div'), { className: 'settings', hidden: true });
root.setAttribute('role', 'dialog');
root.setAttribute('aria-label', WORDS.title);
document.body.append(root);

let page: 'general' | 'controls' = 'general';
let waiting: { device: Device; action: string } | null = null;
let status = { text: '', refused: false };
let lostAt = -Infinity; // when the browser's Esc freed the mouse and opened the overlay

function open(): void {
  if (!root.hidden) return;
  root.hidden = false;
  status = { text: '', refused: false };
  draw();
  if (document.pointerLockElement) document.exitPointerLock();
}

function close(): void {
  root.hidden = true;
  waiting = null;
  if (view?.playing()) document.querySelector('canvas')?.requestPointerLock()?.catch(() => {});
}

function el<K extends keyof HTMLElementTagNameMap>(tag: K, props: object = {}, ...kids: (Node | string)[]): HTMLElementTagNameMap[K] {
  const e = Object.assign(document.createElement(tag), props);
  e.append(...kids);
  return e;
}
const button = (text: string | Node, onclick: () => void, pressed?: boolean) => {
  const b = el('button', { type: 'button', onclick });
  b.append(text);
  if (pressed !== undefined) b.setAttribute('aria-pressed', String(pressed));
  return b;
};

// The whole sheet from the store, on every open, page change and write but a slider's drag.
function draw(): void {
  const s = settings();
  root.style.setProperty('--k', String(s.textScale));
  const sheet = el(
    'div',
    { className: 'sheet' },
    el('header', {}, el('h1', {}, WORDS.title), ...(['general', 'controls'] as const).map((p) => button(WORDS[p], () => ((page = p), draw()), page === p)), closeButton()),
    page === 'general' ? general(s) : controls(),
    el('footer', {}, el('span', { className: `status${status.refused ? ' refused' : ''}` }, status.text), button(WORDS.reset, () => (reset(), (status = { text: '', refused: false }), draw()))),
  );
  root.replaceChildren(sheet);
}

function closeButton(): HTMLButtonElement {
  const b = button('✕', close);
  b.className = 'close';
  b.setAttribute('aria-label', WORDS.close);
  return b;
}

function general(s: Settings): HTMLElement {
  // The text size's preview spans both columns above the rows.
  const out = el('div', { className: 'page' }, preview());
  for (const key of Object.keys(ROWS) as (keyof Settings)[]) {
    const row = ROWS[key];
    if ('page' in row) continue;
    const control = 'range' in row ? range(key, row, s[key] as number) : 'toggle' in row ? toggle(key, s[key] as boolean) : choice(key, row.choice, s[key] as string);
    const line = el('div', { className: 'row' }, el('span', {}, row.name), control);
    line.dataset.key = key;
    out.append(line);
  }
  return out;
}

const preview = () => el('div', { className: 'preview' }, WORDS.preview);

function range(key: keyof Settings, row: Extract<Row, { range: unknown }>, value: number): HTMLElement {
  const [min, max, step] = row.range;
  const input = el('input', { type: 'range', min: String(min), max: String(max), step: String(step), value: String(value) });
  input.setAttribute('aria-label', row.name);
  const out = el('output', {}, row.show(value));
  input.oninput = () => {
    const v = Number(input.value);
    save({ [key]: v });
    out.textContent = row.show(v);
    if (key === 'textScale') root.style.setProperty('--k', String(v));
  };
  return el('div', { className: 'range' }, input, out);
}

function toggle(key: keyof Settings, on: boolean): HTMLElement {
  return el('div', { className: 'choice' }, button(on ? WORDS.on : WORDS.off, () => (save({ [key]: !on }), draw()), on));
}

function choice(key: keyof Settings, options: Record<string, string>, value: string): HTMLElement {
  return el(
    'div',
    { className: 'choice' },
    ...Object.entries(options).map(([id, name]) => {
      const pair = key === 'palette' && view ? view.pairs[id as Palette] : undefined;
      const label = pair ? el('span', {}, el('span', { className: 'pair' }, swatch(pair.A), swatch(pair.B)), name) : name;
      return button(label, () => (save({ [key]: id }), draw()), id === value);
    }),
  );
}

function swatch(colour: number): HTMLElement {
  const i = el('i');
  i.style.background = `#${colour.toString(16).padStart(6, '0')}`;
  return i;
}

// The bindings by action in two halves, a keyboard and a gamepad column each; a cell awaits a press.
function controls(): HTMLElement {
  const out = el('div', { className: 'page' });
  out.dataset.key = 'bindings';
  const table = remap?.table();
  const actions = table ? [...new Set([...Object.keys(table.keyboard), ...Object.keys(table.gamepad)])] : [];
  if (!table || actions.length === 0) return (out.append(el('p', {}, WORDS.noTable)), out);
  const half = Math.ceil(actions.length / 2);
  for (const part of [actions.slice(0, half), actions.slice(half)]) {
    const keys = el('div', { className: 'keys' }, el('b', {}, WORDS.action), el('b', {}, DEVICES.keyboard), el('b', {}, DEVICES.gamepad));
    for (const action of part) {
      keys.append(el('span', {}, actionName(action)));
      for (const device of ['keyboard', 'gamepad'] as const) {
        const now = waiting?.device === device && waiting.action === action;
        const codes = table[device][action] ?? [];
        const b = button(now ? WORDS.wait : [...new Set(codes.map(remap!.name))].join(' / ') || WORDS.none, () => awaitPress(device, action));
        b.setAttribute('aria-label', `${actionName(action)}, ${DEVICES[device]}`);
        if (now) b.classList.add('waiting');
        keys.append(b);
      }
    }
    out.append(keys);
  }
  return out;
}

function awaitPress(device: Device, action: string): void {
  waiting = { device, action };
  status = { text: WORDS.cancel, refused: false };
  draw();
  if (device === 'gamepad') requestAnimationFrame(function poll() {
    if (waiting?.device !== 'gamepad') return;
    const code = remap?.padPressed();
    if (code) bind(code);
    else requestAnimationFrame(poll);
  });
}

// The pressed code for the awaited action, refused with the input zone's reason when it conflicts.
function bind(code: string): void {
  if (!waiting || !remap) return;
  const { device, action } = waiting;
  waiting = null;
  const reason = remap.conflict(action, code);
  if (reason) status = { text: reason, refused: true };
  else {
    const b = settings().bindings;
    save({ bindings: { ...b, [device]: { ...b[device], [action]: code } } });
    status = { text: `${WORDS.saved}: ${actionName(action)} — ${remap.name(code)}`, refused: false };
  }
  draw();
}

// Keys: Esc opens and closes (and cancels an awaited press), M mutes; while the overlay is open a key goes
// to its own controls or to an awaited binding, never on to the game.
addEventListener(
  'keydown',
  (e) => {
    const typing = e.target instanceof HTMLInputElement && e.target.type !== 'range';
    if (waiting?.device === 'keyboard' && !root.hidden) {
      e.preventDefault();
      e.stopImmediatePropagation();
      if (e.repeat) return;
      if (e.code === 'Escape') return void ((waiting = null), (status = { text: '', refused: false }), draw());
      return bind(e.code);
    }
    if (e.code === 'Escape' && !e.repeat && !typing) {
      if (root.hidden) open();
      else if (performance.now() - lostAt > 200) close();
    } else if (e.code === 'KeyM' && !e.repeat && !typing) {
      save({ mute: !settings().mute });
      if (!root.hidden) draw();
    }
    if (!root.hidden && !root.contains(e.target as Node)) e.stopImmediatePropagation();
  },
  true,
);
root.addEventListener('keydown', (e) => e.stopPropagation());
root.addEventListener('mousedown', (e) => {
  if (waiting?.device === 'keyboard') {
    e.preventDefault();
    bind(`Mouse${e.button}`);
  } else if (e.target === root) close();
});
// In play the browser's Esc frees the mouse without a keydown; a release the page asked for (a round's end)
// comes with the round out of play and opens nothing.
document.addEventListener('pointerlockchange', () => {
  if (document.pointerLockElement || !root.hidden || !view?.playing()) return;
  lostAt = performance.now();
  open();
});
document.addEventListener('click', (e) => {
  if ((e.target as Element).closest?.('[data-settings]')) open();
});
