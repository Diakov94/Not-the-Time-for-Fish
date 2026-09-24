zone: src/app
size: M
# Spectate from the kennel

GAME.md, Kennel: captured cats spectate a teammate or free-look around the kennel. While the round table says the player's cat is captured (card 29), the app names a free teammate as the camera's target (card 34), Tab cycles the teammates, and with none free the camera orbits the kennel's centre; the captured cat's own input still counts for nothing but the dig-out. On rescue or dig-out the camera is back on the own cat.

## DoD
- Whom to follow is the app's one decision, read from the round table each frame; render and the sim keep no spectating state.
- A spectating cat's keys move nothing: the intent sent to the sim is idle.

## Acceptance
- Within 1 s of capture the view shows a free teammate; Tab switches to the next within one frame; with every cat captured the camera orbits the kennel; on rescue the own cat is back in view within one frame.
- A captured cat mashing WASD for 5 s: its body moves 0 m.

## Test
- None: a browser check named in the report.
