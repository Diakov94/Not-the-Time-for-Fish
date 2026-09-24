zone: src/app
size: M
# Input for both base kits

GAME.md, Controls: Ctrl toggles sneak (cats); Space jumps and climbs (cats); LMB grabs, carries and throws for cats and grabs and tosses for dogs; Q plants a mine or a trap and sets off a planted trap; E held sniffs (dogs) or defuses (cats); E tapped interacts (doors, storages, the latch); F uses the perk; MMB marks for the team. The intent grows with `sneak` and `sniff`; the actions become the sim's calls (cards 21, 22, 24, 28, 29, 39–42) chosen by the player's own kind; the app decides nothing about what an action does. Remappable controls are Beta scope.

## DoD
- One key, one sim call; a key the player's kind has no use for does nothing and shows nothing.
- E's hold and tap are told apart without a mode key; how is the Developer's, named in the report.

## Acceptance
- Each key produces its sim action exactly once per press (Q: one plant per press over 10 presses; E held 3 s: the defuse completes; E released at 2 s: it stops within one frame; E tapped at a door: the door's interact starts and no sniff begins).
- A dog pressing Ctrl or Space changes nothing measurable in its body; a cat pressing E away from anything defuses nothing.

## Test
- None: a browser check named in the report.
