zone: src/art
size: L
files: src/art/props.ts (new), src/art/themes/country-house.ts, src/render/looks.ts
# The props and the country house in their final look

GAME.md, Art Direction: Ukrainian domestic details, embroidered cloth on furniture, rugs on walls, grandma's china cabinet; every prop low-poly and flat-shaded. ADR 0011: the kinds and the furniture families every map shares live in `src/art/props.ts`; the house's own labels in its theme (card 109).

## DoD
- `props.ts`: the kinds (fish, mine, trap, bag, lure) move from render/looks.ts and get their final look; the furniture families (table, chair, sofa, armchair, bed, wardrobe as the china cabinet, crate, stool, bin) built once for every theme to reuse.
- The house's theme: every label the house lists has a shape, none a plain box: the fence's boards, the doghouse, the kennel's bars, the shed, the woodpile, the car, the debris (plates, cups, jars, apples, vases, shoes, pots, the football); the cloth, rug and tiles from card 108.
- Debris stays local bodies drawn through the same table.

## Acceptance
- House labels drawn as a plain box: 33 → 0; p99 frame ≤ 16.7 ms in two tabs with the full house and eight characters; draw calls per frame named (three's `renderer.info`), ≤ 500.

## Test
- None; the counts and the frame number are the check.
