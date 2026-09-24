zone: src/app
size: XS
files: src/app/main.ts, src/app/screens/room.ts
# A new name joining mid-round has no character until the next prep, no word about it, and a camera over the whole map

`enter` spawns a character only for a name with a team; a newcomer's team arrives from the host one hop after its hello, so a new player joining during a round (a late friend) waits for the next prep, as round.ts says and GAME.md means ("no mid-round rebalancing"). The app then has no own character: `target()` is undefined, the camera stays at its start pose above the yard (0, 12, −14), the keys do nothing and the HUD shows the round's counters. The player sees the whole property from above, both teams included, which the fence's opacity and the hiding spot's peek exist to deny, and cannot tell whether the join worked. The fix is a word and a parked view, nothing more.

Owners: "in play with no character of my own" is read off the round table and the entity table (`playerOf` and the character query), never kept; the line and where the camera parks are the app's.

## DoD
- In play with no own character: one line on screen, "Раунд уже йде. Ви зайдете з наступного раунду", and the camera parked at the hideout's spawn point looking at the fence (no view of the property).

## Acceptance
- A third tab joining during heist: the line shows within 1 s and the frame shows no part of the yard or the house (before: the start pose above the yard, no message).

## Test
- None: the flow is checked in two tabs.
