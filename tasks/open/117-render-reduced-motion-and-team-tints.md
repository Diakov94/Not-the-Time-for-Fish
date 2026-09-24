zone: src/render
size: M
files: src/render/juice.ts, src/render/view.ts, src/art/rig.ts
# Reduced motion, no screen shake, and the team band in the colour-blind pair

GAME.md, Accessibility: a reduced-motion and screen-shake toggle; colour-blind-friendly team colours. ADR 0012: the effect of a setting is the consumer's; the store (card 102) holds the value. The overlays are already told apart by shape and value (card 32); the teams are not marked on the characters at all today.

## DoD
- Under reduced motion the camera's shake amplitude is 0 and the peek camera's blend is instant; the stars, puffs and pings stay (they are not motion of the viewer).
- Every character wears a band at the collar anchor in its team's colour from the palette's pair (card 107), in the variant the store names; the lobby's and the HUD's team words stay words.

## Acceptance
- With the setting on, the camera's offset on a blast at 1 m is 0.000 m (before 0.1); off, unchanged.
- The band's two colours differ in luminance by ≥ 40 % in every variant (name the four numbers).

## Test
- None: a read of the store and a mesh.
