zone: src/art
size: M
files: src/art/cosmetics.ts (new), src/art/rig.ts, src/render/looks.ts
# The cosmetics catalogue: hats and meme accessories on the rig's anchors

ADR 0013: the catalogue is art's, ids are what the roster carries (card 105) and meta's rules name (card 127). GAME.md, Meta Loop: hats, emotes, meme accessories.

## DoD
- Six hats (an ushanka, a wreath, a flat cap, a sailor's cap, a straw hat, a paper crown) and six accessories (a sunflower, a briefcase, a fish skeleton, a medal, a scarf, a loaf on a string), stable ids, built from palette slots, attached at the head, collar or back anchor of either rig without clipping it.
- Render attaches what the round table says the player wears; a hat changed in the table is rebuilt on the next frame.

## Acceptance
- 12 entries; each drawn on a cat and a dog in one screenshot per side, none clipping the head or the body; a hat picked in one tab shows on that character in the other tab (2 of 2).

## Test
- None; the screenshots are the check.
