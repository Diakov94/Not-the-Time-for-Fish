zone: src/input
size: L
files: src/input/gamepad.ts (new), src/input/index.ts (new), src/input/bindings.ts, src/input/keyboard.ts
# Gamepad support: GAME.md's table as the defaults, polled into the same intent

GAME.md, Controls, the gamepad column (release): left stick move, right stick camera, L3 sprint, R3 sneak toggle, A jump, RT grab, LB plant, X held sniff or defuse and tapped interact, RB perk, View mark, d-pad emotes. ADR 0012: the bindings are input's; the deadzone is the store's.

## DoD
- The Gamepad API polled once a frame inside the input zone; keyboard, mouse and pad merge into the one intent and the same actions; the pad's defaults in the bindings table's gamepad column; the store's deadzone applied; a pad that disconnects releases everything it held.
- The device used last names the keys in the hints (card 103's `keyOf`).
- The d-pad's emotes bind once card 125 lands (same batch).

## Acceptance
- A full round played on a pad with the keyboard untouched (name the pad and the browser); right-stick camera at full deflection turns 180°/s (name it); stick-to-intent latency ≤ 1 frame, measured with performance marks (name the ms).

## Test
- None; the round and the numbers are the check.
