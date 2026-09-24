zone: src/input
size: M
files: src/input/bindings.ts, src/input/keyboard.ts, src/input/gamepad.ts, src/input/bindings.test.ts (new)
# Remappable controls: the store's overrides applied on top of the defaults

GAME.md, Accessibility: remappable controls. ADR 0012: the table is input's, the overrides are the store's, the screen (card 121) writes them and asks input whether a code is free.

## DoD
- `resolve(defaults, overrides)` per device: an override replaces one action's code; a conflict (one code on two actions) is refused with the reason and `conflict(action, code)` answers the screen; `keyOf` names the effective key.
- A save applies live: the next frame reads the new table, no reload.

## Acceptance
- Sneak remapped to KeyC sneaks with C and no longer with Ctrl within 1 frame of the save; a conflicting override leaves the store's previous value (named).

## Test
- A unit test of the resolution (defaults, overrides, conflicts); red with the conflict check removed.
