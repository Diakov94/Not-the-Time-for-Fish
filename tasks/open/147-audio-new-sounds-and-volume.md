zone: src/audio
size: M
files: src/audio/audio.ts, src/audio/sfx.ts
# Emote, splash and slip sounds; volume and mute from the store

ADR 0012: audio reads the store (card 102); the M key now belongs to the settings overlay (card 121), which writes the store. New events: `emote` (card 104), the water bomb's `blast` variant (129), the slip's `sprung` (130).

## DoD
- A short procedural sound per emote index and side (four cats', four dogs'), a splash for the water variant, a slip; the master gain from the store's volume and mute, read each frame; the audio's own M listener goes.

## Acceptance
- Mute from the store reaches the master gain within 20 ms; every new event has a sound (10 of 10 in a two-tab session); the `?audio` readout's peak stays ≤ −1 dBFS under a blast and four emotes at once.

## Test
- None: the readout is the measurement.
