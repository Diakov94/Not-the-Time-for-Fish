zone: src/input
size: M
files: src/input/bindings.ts, src/input/keyboard.ts, src/input/gamepad.ts, src/app/main.ts
# The final bindings, the feel options, and the emote keys

GAME.md, Controls: "bindings are a draft; finalize them". The store (card 102) holds sensitivity, invert Y and sneak as toggle or hold; the emote message exists (card 104).

## DoD
- GAME.md's table final on both devices; sneak as toggle (default) or hold from the store; mouse sensitivity and invert Y from the store.
- Keys 1–4 and the d-pad call `emote(sim, n)`: one line in main.ts's actions (the only main.ts edit of this batch; card 126 adds one line elsewhere in the loop).
- A held emote key sends once (repeat ignored).

## Acceptance
- 5 presses of 1 → 5 `emote` messages; 1 held for 1 s → 1; sensitivity 0.5 and 2 turn the camera 0.00125 and 0.005 rad per pixel (linear).

## Test
- None beyond card 124's; the counts are the check.
