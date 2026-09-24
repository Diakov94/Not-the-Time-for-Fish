---
status: accepted
date: 2026-09-24
---

# Per-viewer settings have one owner, `src/settings`; the bindings are the input zone's; consumers read, only the screen writes

GAME.md's accessibility list (remappable controls, colour-blind-friendly teams and overlays, text size and UI scaling, reduced motion and no screen shake, the sound-visualization toggle), the gamepad, and the audio's volume are all facts about one viewer, chosen by that viewer, that no other player needs. The MVP already keeps three of them in three places: the mute in the audio's memory (M), the seen hints in the HUD under its own key, the last name and room in the room screen. A settings screen cannot list what it does not know, and a per-zone key can never be reset or migrated together. So per-viewer settings get one owner, and the natural mistake, a second copy of the bindings in the screen that edits them, is closed here.

## Owners

| fact | owner | how the others learn it |
| --- | --- | --- |
| what this viewer chose: text scale, reduced motion, sound cues on the HUD, the team palette variant, volume and mute, mouse sensitivity, invert Y, sneak as toggle or hold, gamepad deadzone, and the binding overrides | `src/settings/store.ts`: one typed record with a default for every key, under one versioned `localStorage` key | `settings()` returns the record (cached, re-read after a write); a consumer reads it at its frame or at its event; nothing subscribes |
| the default bindings, GAME.md's table as data (action → key code, mouse button, gamepad button or axis), and which device was used last | `src/input/bindings.ts` and the input zone | the settings screen shows the table and writes overrides into the store; the input zone applies the overrides on top of the defaults; the HUD's hints and the room's hint bar ask the input zone what key an action has |
| the effect of a setting | the consumer's zone: the shake amplitude in `render/juice.ts`, the `--u` scale in `hud/style.ts`, the master gain in `audio`, the team pair's variant in `art/palette.ts`, the deadzone in `input` | the store holds a value, never a behaviour |
| the settings screen | `src/settings/screen.ts`: a self-mounting overlay with its own CSS, opened by the key it listens for itself (Esc in play, which also frees the mouse) and by a button the menu and the lobby call | nothing is wired in `src/app/main.ts` |
| what this viewer has earned | not a setting: the meta save (ADR 0013) |
| incidental memory: the last name and room, the seen hints | stay with their screen (`room.ts`, `hud/hints.ts`): conveniences, not choices; not listed on the screen |

## Considered options

- **Settings in the round table**: rejected. They would travel to every client and die with the room; a per-viewer fact is not a shared fact.
- **One key per zone, as today**: rejected. Three keys already, no screen can list them, no reset, and a migration per zone.
- **A subscription or an event bus for changes**: rejected. A record read at 60 Hz from a cached object costs one property read; a consumer that reads at its frame needs no notification, and the bus is a mechanism to maintain.
- **The screen inside `src/app/screens`**: rejected. That folder is the UI batch's; a screen beside the store makes the settings batch self-contained and leaves `main.ts` untouched, which the owner's parallel wave needs.
- **The whole bindings table in the store**: rejected. A per-viewer copy of the defaults would never learn a changed default, and the screen would then own a second table. The store keeps overrides only.
- **Colour-blind support as a filter over the frame**: rejected. The overlays are already told apart by shape and value (ADR 0010's senses); the team pair is two palette slots with a variant per common deficiency, chosen by the viewer.

## Consequences

- Every setting is declared in the store up front: the record's keys are this ADR's list. A new setting is one store line and one consumer edit, in the same card.
- The store may be unavailable (a private window, blocked site data): `settings()` then returns the defaults and `save` does nothing, the way `hud/hints.ts` already behaves.
- `npm run zones` rejects `settings` and `input` from `sim`, `net`, `relay` and `content`; `settings` imports nothing from the game; `input` imports `sim` types and `settings`.
- `.studio/project.conf` lists `src/settings` and `src/input` in `ZONES`; `UI_GLOBS` gains `src/settings/screen*` (the store stays logic).

## Refutation sign

A consumer found writing the store; a setting whose value another player must see (then it is a roster fact, ADR 0007, not a setting); a second table of actions and keys outside `src/input`; the store's key list past about twenty (a screen with pages is a UX question, not a store question); the audio's mute disagreeing with the screen's toggle.
