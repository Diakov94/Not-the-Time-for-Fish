zone: src/net
size: S
files: src/net/client.ts, src/net/ticks.ts
# A copy jumps a whole step and then stands still on every frame that steps twice

`frame` interpolates every copy once per frame (`interpolate` sets the kinematic next pose) and then steps the sim for as many fixed steps as the frame's time holds. On a frame with two steps the first step moves the copy to the target and the second finds no next pose, so Rapier leaves it with zero velocity. Render's `place` reads the pose back along the velocity by STEP − accumulator, so that frame shows the copy a full step (16.7 ms of its motion: 10 cm at a cat's sprint, 15 cm at a dog's) ahead of where the previous and the next frame put it, and the next frame shows it in the same place. On a 59.94 Hz display against the 60 Hz step the accumulator gains 0.02–0.03 ms a frame (16.68–16.70 ms frames measured against the 16.67 ms step) and a two-step frame comes every 8–17 s; under load (any frame over 33 ms) every frame does it. The own character is not affected: `drive` runs every step. Seen from render, where the interpolation is right for everything the sim moves itself.

## DoD
- Every step gets its own target: net interpolates before each fixed step at that step's real time (the frame's `now` less the time not yet stepped), stepping one STEP at a time; `interpolate` keeps its buffer rule and the delay.

## Acceptance
- In the browser at 60 Hz with a copy sprinting in a straight line for 30 s, its displayed motion per frame (the Object3D's position delta, instrumented for the measurement only) stays within 1.2× the median; before: one frame at about 2× and one at about 0 every 8–17 s. The headless divergence numbers do not move.

## Test
- None: the frame deltas are the check.
