zone: src/input
size: M
files: src/input/keyboard.ts (moved from src/app/input.ts), src/input/bindings.ts (new), src/app/main.ts, src/app/screens/room.ts, src/hud/words.ts, src/hud/hints.ts
# The input zone and the bindings table: one owner of which key does what

ADR 0012: the bindings are data in `src/input`, the store keeps overrides only (card 124 applies them), and every place that names a key to the player asks the input zone. Today the room's hint bar and the HUD's first-round hints each spell the keys by hand.

## DoD
- `src/app/input.ts` moves to `src/input/keyboard.ts` unchanged in behaviour; main.ts changes its import only.
- `src/input/bindings.ts`: GAME.md's Controls table as data, action → key code or mouse button, with a gamepad column left for card 123; `keyOf(action)` gives the key's Ukrainian name for the screen.
- The room's hint bar and the HUD's hints build their key names through `keyOf`; changing a code in the table changes both.
- Emote keys are not bound here (card 125 does, once the sim's emote of card 104 has landed).

## Acceptance
- The hint bar and the HUD hint name the same key for sneak; a dev change of sneak to KeyC shows "C" in both with no other edit. `npm run gates` exit 0.

## Test
- None beyond the gates: a move and a table. The words that named keys by hand are gone (`grep -c 'Ctrl' src/hud/words.ts` → 0).
