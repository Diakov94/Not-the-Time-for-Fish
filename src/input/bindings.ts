// ADR 0012: which key does what, one table. GAME.md's Controls as data: per action the codes that do it,
// a KeyboardEvent code or `Mouse<button>`; the listeners test these codes and every screen that names a key
// asks `keyOf`. `interact` is one key: tapped it interacts, held it sniffs or defuses. The gamepad column
// is card 123's; the emote keys card 125's; the viewer's overrides are the settings store's (card 124).
export type Action = 'forward' | 'back' | 'left' | 'right' | 'sprint' | 'sneak' | 'jump' | 'grab' | 'plant' | 'interact' | 'perk' | 'mark' | 'next' | 'report';

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
  gamepad: {},
};

// A key's name on the screen, in Ukrainian where it has one; a letter or a digit is itself.
const NAMES: Record<string, string> = { Space: 'Пробіл', ShiftLeft: 'Shift', ShiftRight: 'Shift', ControlLeft: 'Ctrl', ControlRight: 'Ctrl', Mouse0: 'ЛКМ', Mouse1: 'СКМ' };

export function keyOf(action: Action): string {
  const code = BINDINGS.keyboard[action][0]!;
  return NAMES[code] ?? code.replace(/^(Key|Digit)/, '');
}
