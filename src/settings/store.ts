// ADR 0012: what this viewer chose, one typed record with a default for every key, under one versioned
// localStorage key. Consumers read `settings()` at their frame or their event and apply the effect
// themselves; only the settings screen writes, through `save`. Nothing subscribes.
export type Palette = 'normal' | 'deuteranopia' | 'protanopia' | 'tritanopia';
export type Settings = {
  textScale: number; // the HUD's --u times this, 0.8-1.6
  reducedMotion: boolean; // no camera shake, no camera blends
  soundCues: boolean; // audible events as arrows on the HUD
  palette: Palette; // the team pair's variant
  volume: number; // the master gain times this, 0-1
  mute: boolean;
  sensitivity: number; // the mouse's camera turn per pixel times this
  invertY: boolean;
  sneak: 'toggle' | 'hold';
  deadzone: number; // of a gamepad stick, 0-1
  // The binding overrides only, action -> code per device: the defaults are the input zone's table.
  bindings: { keyboard: Record<string, string>; gamepad: Record<string, string> };
};

export const DEFAULTS: Readonly<Settings> = {
  textScale: 1,
  reducedMotion: false,
  soundCues: false,
  palette: 'normal',
  volume: 1,
  mute: false,
  sensitivity: 1,
  invertY: false,
  sneak: 'toggle',
  deadzone: 0.15,
  bindings: { keyboard: {}, gamepad: {} },
};

// Only the keys the viewer chose are kept, so a changed default reaches everyone who never chose it. A
// record of another version is not read: its keys may mean something else.
const KEY = 'settings';
const VERSION = 1;
type Stored = { version: number; chosen: Partial<Settings> };

let cache: Settings | undefined;

// Storage may be off (a private window, blocked site data) or hold anything: then nothing was chosen.
function read(): Partial<Settings> {
  try {
    const s = JSON.parse(localStorage.getItem(KEY) ?? 'null') as Stored | null;
    return s?.version === VERSION ? s.chosen : {};
  } catch {
    return {};
  }
}

export const settings = (): Settings => (cache ??= { ...DEFAULTS, ...read() });

// A patch replaces whole keys (the bindings are one key). Kept only if storage takes it.
export function save(patch: Partial<Settings>): void {
  const chosen = { ...read(), ...patch };
  try {
    localStorage.setItem(KEY, JSON.stringify({ version: VERSION, chosen } satisfies Stored));
  } catch {
    return;
  }
  cache = { ...DEFAULTS, ...chosen };
}

// Back to the defaults: nothing chosen, so a changed default reaches this viewer again.
export function reset(): void {
  try {
    localStorage.removeItem(KEY);
  } catch {
    return;
  }
  cache = undefined;
}
