zone: src/settings
size: L
files: src/settings/screen.ts (new), src/settings/style.ts (new), src/settings/store.ts
# The settings overlay and the remap UI

ADR 0012: a self-mounting overlay beside the store, the one writer of the store; it opens on Esc in play (and frees the mouse) and on any `[data-settings]` click, so the menu (card 118) and the lobby need no import of it. Every key of the store (card 102) is on it, in Ukrainian.

## DoD
- Text size (with a live preview), reduced motion, sound cues, the team palette variant (with the pair shown), volume and mute (the M key moves here and writes the store), mouse sensitivity, invert Y, sneak toggle or hold, gamepad deadzone; a reset to defaults.
- The remap: the bindings table (card 103) by action, keyboard and gamepad columns; press a key or a button to override; a conflict (one code, two actions) refused with the reason; the overrides go to the store, the input zone applies them (card 124).
- While open, keys do not reach the game; closing restores the pointer lock in play.

## Acceptance
- Every key of the store is on the screen (count = count, named); at 1280×720 no overflow, the worst control ≥ 44×44 px; a remap of sneak to C is in the store after closing (KeyC), and in play once card 124 has landed.

## Test
- None beyond the store's; layout and text.
