zone: src/input
size: XS
files: src/app/input.ts (src/input/bindings.ts and keyboard.ts once card 103 lands), src/app/screens/room.ts
# Sneak on Ctrl: Ctrl held into W closes the tab on Windows and Linux; Tab is eaten on every screen

GAME.md's draft table binds sneak to Ctrl (toggle). In Chrome, Firefox and Edge on Windows and Linux, Ctrl+W closes the tab, Ctrl+N opens a window, Ctrl+S saves the page, Ctrl+D bookmarks it; `preventDefault` does not stop Ctrl+W or Ctrl+N, and the pointer lock does not either. A cat that taps Ctrl and pushes W in the same 100 ms, the usual overlap of a toggle followed by a move, leaves the round: the tab is gone, and the way back is Ctrl+Shift+T and a click. The friend group plays on Windows. Only the keyboard lock API (Chromium, in full screen) holds those keys; Firefox has none.

Also, `keydown` calls `preventDefault` on Tab on every screen, so the lobby's and the results' buttons cannot be reached by keyboard; Tab has a meaning only while spectating.

Owner: the bindings table (card 103) and card 125's final bindings; this card is the constraint they meet, and it lands with whichever comes first.

## DoD
- No default binding is a modifier the browser pairs with a game key: sneak on a plain free key (C, for one); the hint bar and the HUD's hint follow the table (card 103).
- Tab's `preventDefault` only while spectating.

## Acceptance
- On Windows Chrome: 20 sneak-then-move presses in prep, 0 tabs closed (before: Ctrl held 100 ms into W closes the tab, 1 of 1); in the lobby, Tab moves the focus between buttons (before: 0 moves).

## Test
- None: a binding and a table.
