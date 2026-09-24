---
status: accepted
date: 2026-09-24
---

# Three more zones for the MVP: `content`, `audio` and `hud`; the level is data with a schema the content zone owns

ADR 0003 cut six zones and promised a content zone with the country house. The MVP adds three zones and no more: the level as data, the procedural audio, and the in-round HUD. The rules of the game (round, fish, mines, traps, kennel, noise, scent, perks) stay in `src/sim`, which is therefore the critical path: about three batches in sequence while the other zones fill in around them.

| zone | holds | imports |
| --- | --- | --- |
| `src/content` | the level schema (the `Level` type and its roles, below) and the country house as data; no code that runs a level | nothing from the game; no three.js, no DOM. Checked by the same grep as `sim`, `net` and `relay` |
| `src/audio` | the Web Audio graph: procedural music by phase, SFX from the sim's event list, ambience by the volume the player is in, directional sound from poses (dog steps and panting through walls for cats, noise pings for dogs) | `sim` (read only), `content` |
| `src/hud` | the in-round DOM overlay: phase and timer, fish counter, carried items, teammate status, the whisker cue, defuse and plant progress, the overtime warning, first-round hints; Ukrainian text | `sim` (read only) |

The six zones grow as follows. `sim` takes the rules and builds its world from a content `Level`, so the Prototype room in `src/sim/level.ts` retires. `net` carries the sim's message union and puts the round table into `state`. `relay` learns to announce a dead socket. `render` draws every kind, the level from content, the in-world overlays (scent, pings, markers, the peek camera in a hiding spot) and the juice. `app` gains the lobby, the results, the round flow, rejoin and the input for both base kits. `tools/headless` gains scripts per side and the MVP scenarios.

## The level schema

Content owns the schema because every level card changes it and no physics card should; the sim consumes it. The roles below are the contract between the content batch and the sim batches that follow it; the TypeScript is the content worker's.

| part | what content writes | what the sim makes of it |
| --- | --- | --- |
| statics | boxes with a pose, half extents and `blocks: all` or `blocks: dogs` | fixed colliders; a `dogs` blocker is a collider only dog bodies meet, so a cat route or an exit gap is a gap plus a `dogs` blocker |
| volumes | boxes with a role: `hideout`, `house`, `kennel`, `doghouse`, `storage` (with an access cost: `open`, `door`, `lid`), `exit`, `hidingSpot`, `climb` | sensors tagged by role; during prep every `exit` also carries a cats blocker |
| points | a position and facing with a role: `catSpawn`, `dogSpawn`, `fish` (each inside a storage), `bag`, `trapPickup`, `tunnelExit`, `hatch`, `latch` | spawn points by role and side; the interaction spots of the kennel |
| props | a label, a pose, a shape (box or ball), a mass, `synced` true or false, optionally `hidingSpot` (the prop carries a spot) | the host spawns synced props as entities of kind `prop`; debris (`synced: false`) is a local body on every client. The sim needs no table of prop labels: content is self-describing |
| doors | a panel with a hinge | a door the cat opens slowly and the dog barges |

Content also carries the numbers the anatomy promises (GAME.md, Map Anatomy): exits outnumber the largest dog team, every storage is within carry range of the hatch, the fence is taller than a fish toss. A content card proves them with a check over the data.

## The event list

Views need to know what happened, not only what is: an impact for the audio, a blast for the puff, a phase change for the music. The sim keeps one per-frame list, `sim.events`, appended by the sim's own step (a contact of a body it owns, its own steps, a phase flip) and by `receive` for the messages that are events (`noise`, `mark`, `blast`, `bark`, `sprung`). Render, audio and the HUD read it; the loop that owns the frame drains it once every view has read it. It is never sent: the network carries messages, not the list. It is a shared owner in the studio's sense (the event queue), so a change to it is reviewed.

## Considered options

- **A `rules` zone above `sim`**: rejected. Every mechanic splits into detection (a sensor, a contact, a hold) and bookkeeping (a message, a table row); the cut would make every card touch both zones, the opposite of the studio's test for a zone.
- **The level as glTF**: rejected for the MVP. The headless client would need a loader in Node, the file is binary-ish in git, and GAME.md's art pipeline builds geometry in code anyway. The sign to reopen: the house data passing the sim in lines, or Blender MCP producing the geometry.
- **The HUD inside `src/app`**: rejected. The app's queue (lobby, results, flow, input, rejoin, spectate) is already a full batch; the HUD would double it and share `main.ts` and `screens/` with the lobby, so two UI workers could not run at once.
- **Audio inside `src/render`**: rejected. The music is an XL on its own and would sit in the batch that draws meshes; nothing is shared between them but the event list.
- **Events as callbacks the sim invokes**: rejected. The sim would know its views, and the headless runner could not count events after the fact.
- **`content/` at the repository root, as ADR 0003 wrote**: `src/content` instead. `tsconfig.json`'s `include`, the zone grep and the profile's `PROD_FIND` all take `src`; the name changes, the zone does not.

## Consequences

- `npm run zones` (owner: `package.json`) extends to `src/content` for the three.js and DOM greps, and rejects a path into `render`, `app`, `hud` or `audio` from `sim`, `net`, `relay` or `content`. The `ZONES` array in `.studio/project.conf` lists nine paths; `UI_GLOBS` gains `src/hud/*`.
- The sim imports content's types and data; content imports nothing from the game. A cycle between them is a defect.
- The house is the only level of the MVP; a second map (Beta) is a second data file against the same schema, which is the test ADR 0003's anatomy promised.

## Refutation sign

A content card that must edit a sim file to land (the schema is wrong or the sim owns a role it should not); the zone grep printing a content or sim file; a `hud` or `audio` card that must keep a fact of its own beyond a per-viewer setting (a state the sim does not hold); the event list reaching the network as such; the house's data file exceeding the sim in lines.
