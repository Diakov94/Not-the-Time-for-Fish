---
status: accepted
date: 2026-09-24
---

# The art pipeline in code: an `art` zone owns every look, the concept is content, characters and themes are found by their path

GAME.md's pipeline is concept → procedural skeleton → detail by code, with no image model. In the MVP the looks live in `src/render`: six placeholder characters and the prop kinds in `looks.ts`, the labels' shapes and colours in `level.ts`. The list of characters has three owners today: the count in `src/sim/round.ts` (`LOOKS = 3`), the names in the lobby, the builders in render. Beta and Release ask for twelve characters with emotes, the props and the house in their final look, five maps' themes and cosmetics, and the owner asks for all of it to be built by many workers at once. So the looks leave render for a zone of their own, and every fact of the art gets one owner and, where several batches would touch it, one file per batch.

## Owners

| fact | owner | how the others learn it |
| --- | --- | --- |
| the roster of characters: id, side, order (GAME.md's), Ukrainian name, palette slots, signature detail, emote names; the concept, as data | `src/content/characters.ts` | the sim counts a side's looks from it; the lobby names from it; art builds from it |
| a character's geometry, its emotes' poses, where its cosmetics attach | one file per character, `src/art/characters/<id>.ts`, found by its path (a Vite glob import, keyed by the roster's id) | render asks art for the `Object3D` of a look; no index file lists the characters |
| the rig: the skeleton's named parts per side (head, ears, muzzle, body, four legs, tail) and its anchors (head, back, collar); the locomotion and state poses (idle, walk, run, sneak, carry, stunned, tumble) | `src/art/rig.ts` | a character file dresses a rig; render's view calls `pose(rig, facts, t)` once per frame |
| what a character is doing: moving and how fast, carrying, stunned, hidden, emoting | the sim: the body's velocity, the queries, the event list | the view collects the facts; the rig only draws them |
| the palette: every colour in the game as a named slot, the warm home range and the team pair | `src/art/palette.ts` | every material comes from it; a colour literal outside `src/art` is rejected at review |
| a label's shape and colour in a map (table, sofa, stall, balcony rail) | one theme per map, `src/art/themes/<map>.ts`, found by its path and keyed by the map's file name | render's level drawer asks the theme; a label the theme has no shape for is a palette box, the rule of today's `level.ts` |
| procedural patterns (embroidery, rugs, tiles, wood grain) and SVG decals | `src/art/patterns.ts` and `src/art/decals.ts`: canvas and SVG rendered to textures, normalized to the palette | themes, props and characters use them |
| the props' looks: fish, mine, trap, bag, lure, the furniture families every map shares | `src/art/props.ts` | render draws a kind through it |
| a cosmetic's geometry | `src/art/cosmetics.ts`, attached at the rig's anchors | render draws what the roster says is worn (ADR 0013) |
| a map's list | the file system: a map is `src/content/maps/<map>.ts`, its name is its file name; the app finds the maps by a glob, the headless runner imports one by name | no index file; the lobby's list is the glob's keys |
| a Blender step | only where a card names why code cannot read the concept; the script is the source under `tools/art/`, its glTF a build artefact under `src/art/models/` | art loads it like any other look |

`src/art` imports three.js and `src/content`; never `sim`, `net`, `app`, `hud` or `audio`: it takes the shape, the facts and the time as arguments. `render` imports `art`. The headless client never loads either. The zone is the UI Developer's (`UI_GLOBS`): its work is geometry rendered by the engine and vector or procedural raster with the script as the source, which is that role's definition.

## Considered options

- **The looks stay in render**: rejected. Five batches (two sides, the props, every map's theme) would edit two files, so the wave would serialize on them; and render is a view of the sim, which must not also own a concept.
- **glTF assets authored in Blender for everything**: rejected. Binary-ish files no agent can diff, review or fix by hand, a slow loop through MCP for every tweak, and ADR 0008 already chose code over glTF for the level. Blender stays the exception, with a script as its source.
- **One file per side** (`cats.ts`, `dogs.ts`): rejected after the owner's directive for more parallel workers. Two batches on one side would share it; per-character files let four character batches run at once with no shared file. The price is twelve small files and a glob; a side's shared code lives in the rig.
- **An index of characters and an index of themes**: rejected. Every character and map batch would add its line to the same file, one merge conflict per batch, for a list the file system already holds. The glob is a Vite-only construct, in zones that are Vite-only anyway.
- **The concept as a document under `docs/`**: rejected. The studio keeps no documents; a concept apart from its numbers goes stale. The card carries the prose, the roster carries the data, the file's header the rest.
- **A character as an entity kind**: closed by ADR 0009: sides are kinds, looks are cosmetic.

## Consequences

- `src/render/looks.ts` becomes a dispatcher from kind and look to art; `src/render/level.ts` keeps the drawing loop and loses its tables. The frame budget stays render's: eight animated characters in two tabs at 60 FPS, p99 frame at most 16.7 ms (today 10.4 ms with static placeholders).
- A character card is its concept: silhouette, proportions, palette slots, one signature detail, its emotes (one to four), and an SVG sketch where a picture helps. The roster carries the numbers before the geometry is written, so the lobby and the sim take twelve characters from day one.
- `npm run zones` (owner: `package.json`) rejects `art` from `sim`, `net`, `relay` and `content`, and `sim`, `net`, `app`, `hud`, `audio` from `art`.
- `.studio/project.conf` lists `src/art` in `ZONES`; `UI_GLOBS` gains `src/art/*`.

## Refutation sign

Two batches from different zones needing one art file to land; a character that needs a change in `src/sim` to be drawn (then the rig lacks a fact the sim already holds); a character file past about 200 lines or the rig past about 400 (then the detail belongs in a pattern or a decal, or in Blender); the first character whose concept code cannot read as the card describes it; p99 frame over 16.7 ms with eight animated characters in two tabs.
