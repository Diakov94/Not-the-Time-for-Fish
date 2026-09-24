zone: src/sim
size: M
# Character movement that pushes props

A character in the entity table with a home (its player), moved by intents (move, sprint, jump) on Rapier's KinematicCharacterController, pushing dynamic bodies with impulses. If pushes feel wrong, a dynamic capsule with velocity control is the fallback: the card owner decides and says why.

## DoD
- Only intents move a character; nothing writes its pose directly.

## Acceptance
- A scripted 2 s run covers speed × 2 s ± 5 %.
- Running into a crate moves it more than 0.2 m.

## Test
- One Vitest test per number above.
