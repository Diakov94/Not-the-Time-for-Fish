zone: src/hud
size: M
# The HUD, always on

GAME.md, UI / HUD: always on screen: the phase and its timer, the fish counter (secured / remaining), the carried items (mines / traps / perk), the teammate status. `src/hud` is a DOM overlay (ADR 0008) read from the round table (card 27), the player's own client state (cards 39, 40, 42) and the roster once per frame; chunky, playable, readable at a glance; Ukrainian text only. Teammate status is card 61; this card lays out the frame, the phase line with the timer, the fish counter and the carried items for the player's own side (a dog shows mines, a cat its trap and the perk).

## DoD
- The HUD reads the sim and shows it; it holds no timer, count or state of its own; the remaining time is the sim's derivation (ADR 0007), formatted here.
- A cat's and a dog's HUD differ only in the carried-items row.

## Acceptance
- The timer on two tabs differs by ≤ 250 ms (ADR 0007's sign) and counts down through prep into heist; the fish counter reads 1/4 within one frame of a `secured` on every tab; a dog's mine count drops on plant and rises at the doghouse.
- Readable at 1280×720 and 1920×1080 without overlap; the worst margin named; the phase and timer are read from a screenshot at 50 % scale.

## Test
- None: screenshots in the report.
