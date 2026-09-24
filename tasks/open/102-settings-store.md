zone: src/settings
size: S
files: src/settings/store.ts (new), src/settings/store.test.ts (new)
# The per-viewer settings store: one record, one key, consumers read

ADR 0012. Every setting the Beta and Release scope names is declared here up front so that consumer cards (117, 121, 122, 123–125, 147) add one read each and never a key: text scale, reduced motion, sound cues on the HUD, the team palette variant (normal, deuteranopia, protanopia, tritanopia), volume and mute, mouse sensitivity, invert Y, sneak as toggle or hold, gamepad deadzone, the binding overrides per device.

## DoD
- A typed record with a default for every key above; one versioned `localStorage` key; `settings()` returns the cached record; `save(patch)` writes and refreshes the cache.
- Storage unavailable or corrupt (a private window, blocked site data, an old version): defaults, no throw, `save` a no-op.
- No consumer is wired by this card.

## Acceptance
- A saved text scale of 1.4 survives a reload (1.4 → 1.4); with `localStorage` throwing, `settings().textScale` is 1 and nothing throws.

## Test
- Unit: save then read returns the patch; a corrupt value and a wrong version return defaults. Red without the try/catch and the version check.
