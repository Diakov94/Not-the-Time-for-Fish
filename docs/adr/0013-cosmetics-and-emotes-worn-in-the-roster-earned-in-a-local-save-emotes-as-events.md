---
status: accepted
date: 2026-09-24
---

# Cosmetics and emotes: what is worn travels in the roster, what is earned is a local save, an emote is an event; the sim checks nothing

GAME.md's release meta loop is cosmetic unlocks earned by playing (hats, emotes, meme accessories), stored locally, with no accounts. Emotes are per character (one to four; The Egg's topple). Three natural mistakes are expensive: drawing another player's hat from this browser's save (every screen shows a different hat), putting the progress into the round table (it dies with the room), and letting the sim validate unlocks (the sim would need the save, and a rejoiner from a second browser would lose its hat mid-round). Each fact gets an owner here so that no card decides otherwise by default.

## Owners

| fact | owner | how the others learn it |
| --- | --- | --- |
| what a player wears, per side: a hat id and an accessory id from the catalogue | the round table's `Player` (ADR 0007), from the player's `look` message extended with `worn` | every client folds the same message; `state` carries the table to a joiner; art draws it (ADR 0011) |
| what this viewer has earned: counters (matches played, rounds won per side, fish secured, cats captured, rescues, defuses, mines planted) and the unlocked ids | `src/meta/progress.ts`: one versioned `localStorage` key, written from the round table's ends and this client's own events | the lobby's picker offers what `unlocked()` says; the results screen shows what the last match unlocked |
| the unlock rules: cosmetic id → a predicate over the progress | `src/meta/unlocks.ts` | the picker and the results screen ask it; the catalogue never encodes a rule |
| the catalogue: which cosmetics exist and how each looks | `src/art/cosmetics.ts` (ADR 0011) | meta names ids only; a rule for an id the catalogue lacks is a defect the test catches |
| an emote | an event `emote {n}` from the player's client, appended to every client's event list on arrival, never stored (ADR 0010); its look is the character's (ADR 0011) | render plays it from the event list; a joiner never sees an old emote |
| whether a player may wear what it sends | nobody: trusted friends, no anti-cheat, no accounts (GAME.md). The lobby offers only what is unlocked; the fold accepts any catalogue id |

## Considered options

- **The sim validates unlocks**: rejected. The sim would import the save, the round table would need the rules, and a browser without the save (a rejoin from another machine, a cleared storage) would strip a player mid-round on every screen.
- **Progress in the round table**: rejected. It is per person and outlives the room; the table is per room and dies with it.
- **Progress derived on the fly from a log of matches**: rejected. A log is a second save, larger and needing the same key; counters are enough for every rule GAME.md sketches.
- **A cosmetic as a synced entity or an attachment message of its own**: rejected. The roster already carries the look; a hat is one more field of it.
- **An emote as roster state (`emoting: n`)**: rejected. It would go stale, and a joiner would see a frozen emote; ADR 0010 made pings and markers events for the same reason.

## Consequences

- The `look` message gains `worn: {hat?, accessory?}`; the fold stores it beside the look; `src/net` changes nothing (the round table already travels in `state`).
- A browser's progress is that browser's: GAME.md's local-only save. A cleared storage is a fresh start, said once on the lobby's picker, never mitigated with a second store.
- `src/meta` imports `sim` (the round table's types and the event list) and nothing from `render`, `app` or `hud`; `sim`, `net`, `relay` and `content` never import `meta` (the zone grep). `.studio/project.conf` lists `src/meta` in `ZONES`.
- The results screen may show "unlocked" from the difference meta reports between the match's start and end; it keeps no copy.

## Refutation sign

A hat drawn on one client and not on another (then `worn` is not in the table); a progress counter disagreeing with the round table's own counts for the same session on the same client; the sim importing `meta`; an emote still playing on a joiner who arrived after it was sent.
