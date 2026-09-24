zone: src/app
size: M
files: src/app/screens/room.ts, src/app/screens/parts.ts, index.html
# The main menu and the room screen in the game's style

GAME.md, UI mood: chunky, playful, readable at a glance; Menus: main menu → create or join a room by code. The room screen of card 50 is a bare form. Ukrainian only.

## DoD
- The title, the name, create or join, in the game's palette and type; a settings button as a `[data-settings]` element (the settings overlay of card 121 opens on it; no import between the two); a line on the voice channels.
- The screens' base size follows `var(--scale, 1)` on the root (the HUD writes it from the store, card 122), so a text-size setting reaches the menus.
- Every player-facing string in Ukrainian, none in code outside the screens.

## Acceptance
- At 1280×720 and 1920×1080 no text overflows and the layout margin is named for each; the worst button is ≥ 44×44 px with its address; two screenshots at most.

## Test
- None: layout, size, colour, text.
