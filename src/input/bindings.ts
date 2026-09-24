// ADR 0012: which key does what, one table. GAME.md's Controls as data, per device: per action the codes
// that do it, on the keyboard a KeyboardEvent code or `Mouse<button>`, on the gamepad a `Pad…` code
// (gamepad.ts names them); the listeners test these codes and every screen that names a key asks `keyOf`.
// `interact` is one key: tapped it interacts, held it sniffs or defuses. The camera is the mouse or the
// right stick, not a code. The emote keys are card 125's; the viewer's overrides are the settings store's
// (card 124).
export type Action = 'forward' | 'back' | 'left' | 'right' | 'sprint' | 'sneak' | 'jump' | 'grab' | 'plant' | 'interact' | 'perk' | 'mark' | 'next' | 'report';
export type Device = 'keyboard' | 'gamepad';

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
  },
};

// The codes that do `action`, on either device.
export const codesOf = (action: Action): string[] => [...BINDINGS.keyboard[action], ...(BINDINGS.gamepad[action] ?? [])];

// The device used last: the input zone reports every press, and the keys are named on that device.
let last: Device = 'keyboard';
export const used = (code: string) => (last = code.startsWith('Pad') ? 'gamepad' : 'keyboard');

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

// The action's key on the device used last; an action the pad has no button for is named by the keyboard.
export function keyOf(action: Action): string {
  const code = (BINDINGS[last][action] ?? BINDINGS.keyboard[action])[0]!;
  return NAMES[code] ?? code.replace(/^(Key|Digit|Pad)/, '');
}
