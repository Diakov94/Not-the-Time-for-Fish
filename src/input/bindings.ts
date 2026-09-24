import { settings } from '../settings/store.ts';

// ADR 0012: which key does what, one table. GAME.md's Controls as data, per device: per action the codes
// that do it, on the keyboard a KeyboardEvent code or `Mouse<button>`, on the gamepad a `Pad…` code
// (gamepad.ts names them); the listeners test these codes and every screen that names a key asks `keyOf`.
// `interact` is one key: tapped it interacts, held it sniffs or defuses. The camera is the mouse or the
// right stick, not a code. These are the defaults, final on both devices (card 125): the viewer's
// overrides are the settings store's, applied on top by `resolve` at every use.
export type Action = 'forward' | 'back' | 'left' | 'right' | 'sprint' | 'sneak' | 'jump' | 'grab' | 'plant' | 'interact' | 'perk' | 'mark' | 'next' | 'report' | 'emote1' | 'emote2' | 'emote3' | 'emote4';
export type Device = 'keyboard' | 'gamepad';
type Table = Partial<Record<Action, string[]>>;

export const BINDINGS: { keyboard: Record<Action, string[]>; gamepad: Partial<Record<Action, string[]>> } = {
  keyboard: {
    forward: ['KeyW'],
    back: ['KeyS'],
    left: ['KeyA'],
    right: ['KeyD'],
    sprint: ['ShiftLeft', 'ShiftRight'],
    sneak: ['ControlLeft', 'ControlRight'],
    jump: ['Space'],
    grab: ['Mouse0'],
    plant: ['KeyQ'],
    interact: ['KeyE'],
    perk: ['KeyF'],
    mark: ['Mouse1'],
    next: ['Tab'], // the teammate a captured cat watches
    report: ['F9'], // the desync report
    emote1: ['Digit1'],
    emote2: ['Digit2'],
    emote3: ['Digit3'],
    emote4: ['Digit4'],
  },
  gamepad: {
    forward: ['PadStickUp'],
    back: ['PadStickDown'],
    left: ['PadStickLeft'],
    right: ['PadStickRight'],
    sprint: ['PadL3'],
    sneak: ['PadR3'],
    jump: ['PadA'],
    grab: ['PadRT'],
    plant: ['PadLB'],
    interact: ['PadX'],
    perk: ['PadRB'],
    mark: ['PadView'],
    emote1: ['PadUp'], // the d-pad clockwise from the top
    emote2: ['PadRight'],
    emote3: ['PadDown'],
    emote4: ['PadLeft'],
  },
};

// The other action that does `code` in `table`, if one does.
const clash = (table: Table, action: Action, code: string) => (Object.keys(table) as Action[]).find((other) => other !== action && table[other]!.includes(code));

// A device's table in effect: each override replaces its action's codes with its one code, and one whose
// code another action then also does is refused (both of two overrides on one code are), so its action
// keeps its default; a refusal can bring back a default another override clashes with, so it repeats.
export function resolve(defaults: Table, overrides: Record<string, string>): Table {
  let kept = Object.entries(overrides).filter(([action]) => action in BINDINGS.keyboard);
  for (;;) {
    const table: Table = { ...defaults, ...Object.fromEntries(kept.map(([action, code]) => [action, [code]])) };
    const refused = kept.filter(([action, code]) => clash(table, action as Action, code));
    if (refused.length === 0) return table;
    kept = kept.filter((o) => !refused.includes(o));
  }
}

const deviceOf = (code: string): Device => (code.startsWith('Pad') ? 'gamepad' : 'keyboard');
// Read from the store at every use, so a save is in effect from the next press and the next frame.
const bound = (device: Device) => resolve(BINDINGS[device], settings().bindings[device]);

// Both devices' tables in effect, for the settings screen's remap columns.
export const tables = () => ({ keyboard: bound('keyboard'), gamepad: bound('gamepad') });

// The codes that do `action` now, on either device.
export const codesOf = (action: Action): string[] => [...(bound('keyboard')[action] ?? []), ...(bound('gamepad')[action] ?? [])];

// Why the settings screen may not bind `code` to `action`: the action that does it now on its device;
// null when it is free.
export const conflict = (action: Action, code: string): Action | null => clash(bound(deviceOf(code)), action, code) ?? null;

// The device used last: the input zone reports every press, and the keys are named on that device.
let last: Device = 'keyboard';
export const used = (code: string) => (last = deviceOf(code));

// A key's name on the screen, in Ukrainian where it has one; a letter, a digit or a pad button is itself.
const NAMES: Record<string, string> = {
  Space: 'Пробіл',
  ShiftLeft: 'Shift',
  ShiftRight: 'Shift',
  ControlLeft: 'Ctrl',
  ControlRight: 'Ctrl',
  Mouse0: 'ЛКМ',
  Mouse1: 'СКМ',
  PadStickUp: 'L↑',
  PadStickDown: 'L↓',
  PadStickLeft: 'L←',
  PadStickRight: 'L→',
  PadUp: '↑',
  PadDown: '↓',
  PadLeft: '←',
  PadRight: '→',
};
// A code's name, for the hints and for the settings screen's remap columns.
export const nameOf = (code: string): string => NAMES[code] ?? code.replace(/^(Key|Digit|Pad)/, '');

// The action's key in effect on the device used last; one the pad has no button for is named by the keyboard.
export const keyOf = (action: Action): string => nameOf((bound(last)[action] ?? bound('keyboard')[action]!)[0]!);
