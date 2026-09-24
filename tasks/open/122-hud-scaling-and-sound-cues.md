zone: src/hud
size: M
files: src/hud/style.ts, src/hud/hud.ts, src/hud/words.ts
# Text size and UI scaling; the sound-visualization toggle

GAME.md, Accessibility: text size / UI scaling, and a sound visualization toggle: directional noise cues on the HUD. Card 61 gives dogs edge arrows for noise pings; a cat hears dogs through walls (card 53) and sees nothing. ADR 0012: the HUD reads the store (card 102).

## DoD
- The HUD's `--u` is multiplied by the store's text scale (0.8–1.6); the HUD writes `--scale` on the document root every frame so the app's screens follow (cards 118–120 read it).
- With sound cues on, every audible event the HUD can place gets an edge arrow like the pings' (card 61): a dog's steps and panting within 15 m for cats, impacts, blasts, sprung traps, opened doors; the arrows read the event list and the entity table and keep only their age; dogs' ping arrows stay as they are. Off: today's behaviour.

## Acceptance
- With cues on, a cat's HUD shows an arrow for a dog's step 10 m away within 1 frame of the event; off, 0 arrows on a cat's HUD.
- At text scale 1.6 and 1280×720 no HUD panel overlaps another (the clock and the fish counter boxes measured), and at 0.8 the smallest text is ≥ 12 px.

## Test
- None: a read of the store and DOM.
