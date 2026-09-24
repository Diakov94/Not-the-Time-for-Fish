zone: src/render
size: M
# Mines, traps, bags and lures in the world; the blast, the stun, the progress

GAME.md: mines are visible cartoon props concealed with the environment (under rugs, behind doors, in tall grass); the blast is a comic "boom" puff with camera shake (card 33) and stun stars; defusing and planting show progress. Render draws a mine partly sunk into the floor with a rug-like decal where content marks a rug, a trap as a noise maker, a bag as a bag, a lure as a fish-shaped decoy; a `blast` event is a puff and a ring; a stunned cat wears stars for its 3 s (the stun is the cat's client's state; the others see the launch and the event); a defuse or a plant in progress is a ring above the actor, from the sim's progress query.

## DoD
- Everything drawn comes from the entity table, the event list or a sim query; render keeps only its effects' ages.
- A mine is visible to a careful eye: never fully hidden, never invisible from any angle at 2 m.

## Acceptance
- A planted mine at 10 m is found by a tester in ≤ 5 s of looking; at 2 m it is unmistakable (two screenshots).
- A blast shows the puff within one frame of the event and it is gone in ≤ 1 s; a stunned cat shows stars for 2.9–3.1 s; the defuse ring fills over 3 s and vanishes on interruption within one frame.

## Test
- None: screenshots in the report.
