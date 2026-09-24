zone: src/render
size: M
# Scent trails and noise pings in the world

GAME.md, HUD contextual: noise pings and the scent overlay for dogs. Render shows a sniffing dog's trails (card 24's query) as fading marks on the floor, older samples fainter, and every noise ping (card 23's events) as a marker at its source that swells with loudness and fades in ~2 s, for dogs only; a cat sees neither. The overtime carrier's continuous ping (card 27) is the same marker, repeated. Colourblind-safe by shape and value, not hue alone (GAME.md, Accessibility).

## DoD
- Trails and pings are drawn from the sim's query and event list; render keeps no trail or ping of its own beyond the fading marker's age.
- A cat's screen never shows a trail or a ping marker (dogs are heard, not marked: audio).

## Acceptance
- A dog sniffing sees the trail of a cat that passed 20 s ago as ≥ 18 marks fading toward the older end; at 31 s the trail is gone (a screenshot at 20 s).
- A crate shoved 15 m away shows one marker at the impact on the dog's screen within one frame of the event and none on the cat's.
- The marker and the trail read in greyscale (a desaturated screenshot).

## Test
- None: screenshots in the report.
