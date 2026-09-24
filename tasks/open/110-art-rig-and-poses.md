zone: src/art
size: L
files: src/art/rig.ts (new), src/art/characters/*.ts (six new, moved from src/render/looks.ts), src/render/looks.ts, src/render/view.ts
# The procedural rig: named parts, anchors and the poses every character shares

GAME.md, Art Direction, step 2: a procedural skeleton per character. ADR 0011: one rig per side in `src/art/rig.ts`, one file per character found by its path, and render's view hands the rig the sim's facts once a frame. Today's characters are static groups.

## DoD
- `rig.ts`: a cat rig and a dog rig with named parts (head, ears or muzzle, body, four legs, tail) and anchors (head, back, collar); `pose(rig, facts, t)` with idle, walk, run, sneak (cats), carry, stunned, tumble (a launched or slipped body) and an emote slot that plays the character's named emote from the `emote` event (card 104; land after it).
- The view builds the facts from the sim each frame: speed from the body's velocity, carrying from the ownership table, stunned and hidden from the queries, the emote from the event list. Render keeps no state of the pose beyond the time.
- The six placeholders move to `src/art/characters/<id>.ts` (ids from the roster, card 100) and are dressed on the rig; render/looks.ts dispatches kind and look to art.

## Acceptance
- 8 characters walking in two tabs at 60 FPS, p99 frame ≤ 16.7 ms (before 10.3 ms static); a cat's legs cycle once per 2 m at a walk, the sim's stride (card 23); a stunned cat's tumble ends within one frame of the stun's 3 s.

## Test
- None; the frame measurement is the check.
