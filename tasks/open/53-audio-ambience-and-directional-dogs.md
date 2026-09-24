zone: src/audio
size: M
# Ambience by volume, and dogs heard through walls

GAME.md: procedural household and yard ambience; dogs are always loud, cats hear their steps and panting through walls; the sound visualization toggle is Beta scope. The ambience crossfades between yard and house on the player's volume (content's `house`); a dog's steps and panting (card 52's voices) are heard by cats at a distance that reaches through walls, louder when the dog sprints or carries, and a dog hears its own; a cat's steps are near-silent to dogs when sneaking (card 23's rule already sends no ping; the sound follows the same intent).

## DoD
- Where the player is comes from the sim's volume query for its own body; audio never tests a position against the level itself.

## Acceptance
- Walking from the yard into the house: the yard's ambience fades and the house's rises over 1–2 s (a recording of the master bus shows the crossfade).
- A dog walking 8 m away behind a wall is audible to a cat and heard from its direction; a sneaking cat 3 m away is inaudible to a dog; the same dog sprinting is louder than walking by ≥ 6 dB.

## Test
- None: the recording's numbers in the report.
