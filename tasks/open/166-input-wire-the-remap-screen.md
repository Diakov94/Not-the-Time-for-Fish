zone: src/input
size: XS
files: src/input/keyboard.ts, src/input/bindings.ts, src/settings/screen.ts
# The remap screen shows input's bindings and refuses a clash with input's rule

SETTINGS-UI (card 121) and INPUT (card 124) landed separately: the settings screen exposes a port for the bindings table, and input owns the table, key names and the clash rule, but nothing connects them, so the remap table is empty. Input stays the one owner of bindings and of the clash rule (ADR 0012).

## DoD
- Input hands the screen its table, a key-name function and its clash rule through the screen's port; nothing in settings or hud computes a clash.

## Acceptance
- The settings screen lists every action with its keys; assigning a key already used shows the clash and is refused. Before: an empty table.

## Test
- One test that a clash is refused through the port, red without the wiring.
