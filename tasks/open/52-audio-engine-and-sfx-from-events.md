zone: src/audio
size: L
# The audio engine, and SFX from the event list

GAME.md, Audio Direction: SFX are procedurally generated, priority on gameplay feedback: impacts (noise), grabs, fish pickup, dog steps and panting; procedural means synthesised in Web Audio at runtime, no samples in git (a CC0 fallback is GAME.md's risk mitigation, not the plan). `src/audio` creates the context on the first click (the browser's autoplay rule), one master bus, a listener at the camera, and `update(sim)` once per frame that reads the event list (card 23) and plays: an impact scaled by loudness, a grab and a throw, a fish pickup and drop, a cat's steps and a dog's steps and panting from the bodies' velocities; every source positioned in the world (a `PannerNode` per voice) so it comes from where it happened. M mutes. Nothing else in the app plays sound.

## DoD
- Audio reads the event list and the entity table; it keeps no fact of its own beyond the voices it is playing (ADR 0008's sign).
- A sound is one synthesis function per kind of event with loudness as the parameter; the same impact sounds the same in two tabs.

## Acceptance
- No sound before the first click; after it an impact sounds within 50 ms of its event (measured on the context's clock against the frame's time); 20 impacts in one second play without a dropout at 60 FPS.
- A crate dropped 10 m to the left is heard on the left; a dog 5 m away is heard walking; the five priority sounds are distinguishable blind (a tester names 5 of 5).
- The master bus's peak, read from an analyser in a dev readout over 60 s of play with every sound fired: ≤ −1 dBFS, no clipping.

## Test
- None: the peak readout and a browser check in the report.
