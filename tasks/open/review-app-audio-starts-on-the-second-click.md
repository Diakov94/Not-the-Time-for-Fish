zone: src/app
size: S
files: src/app/main.ts
# The sound starts on the second click: the lobby and the start of prep are silent

`createAudio` registers its one `pointerdown` listener (the browser's autoplay rule needs a gesture) after `roomScreen` resolves, so the click that created or joined the room, the gesture the rule wants, is missed. The graph starts on the next click: a look picked in the lobby, the host's start button, or the canvas click for the mouse in prep. A joiner who waits in the lobby without clicking hears nothing through the lobby and the start of prep (the calm music of card 54 is that phase's), and a slow click misses the heist stinger. Seen with `?audio`: a third player's readout stays empty 4 s after its join click and fills at its next click on the page.

## DoD
- `createAudio()` runs before the room screen, so the room's own click starts the graph; nothing else moves.

## Acceptance
- With `?audio` the readout appears at the create or join click (1 click; before 2), and prep's music plays from its first beat on a joiner that never clicked in the lobby.

## Test
- None: the readout is the check.
