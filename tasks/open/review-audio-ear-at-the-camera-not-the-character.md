zone: src/audio
size: S
files: src/audio/audio.ts, src/app/main.ts
# The ear sits at the camera, 6 m behind the character, so distances are judged from the wrong point

`hear` takes render's camera as the listener (card 52). The camera orbits DISTANCE = 6 m behind and above the character, so with the panner's inverse model (REF 2 m) the player's own steps, the pickup chime, the defuse beeps and the impacts at its paws arrive at 2/6 of full level (−9.5 dB), and a dog's steps 10 m from the cat are heard as from 4 m or 16 m depending on which side the camera hangs: 4× louder or 4× quieter for the same dog. GAME.md, pillar 2 makes hearing dogs through walls a cat's detection tool, and card 53 built it; the ear has to measure from the cat. The point the camera orbits (`at` in render's `draw`: EYE over the followed character, or the kennel's centre while free-looking) is where the player is; the orientation stays the camera's, so left and right match the screen.

## DoD
- The listener's position is the point the camera orbits, its orientation the camera's; render exposes the point it orbited this frame, the app passes both, audio keeps nothing.

## Acceptance
- With `?audio`, a dog 10 m ahead of the cat and one 10 m behind it are heard at the same level (within 1 dB); before: 12 dB apart. The own cat's steps rise by 9.5 dB (name the readout's peak before and after on a sprint on grass; before −7.1 dBFS with the tense music under it).

## Test
- None: the readout is the measurement.
