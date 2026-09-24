zone: src/sim
size: M
# The kennel: capture, rescue, dig-out

GAME.md, Kennel & rescue and CONTEXT.md: a cat dropped into the kennel is captured, locked in until a teammate opens the latch (which frees everyone inside at once) or it digs out alone after ~60 s (the knob, card 27) through the tunnel to the hideout; each cat has its own timer; nobody is eliminated. `captured {at}` is born at the cat's own client when its unheld body is inside the kennel volume; `rescue` at a free cat's client interacting at the latch point (card 18); `dugOut` at the captured cat's client when its own timer ends, after which it moves its body to the tunnel exit. The latch opens the cage for a few seconds so the freed cats walk out.

## DoD
- Captured, free and the dig-out timer have the owners above and no other; the round table's captured set feeds card 27's win condition and the HUD.
- A dog can neither open the latch nor enter the kennel; a captured cat cannot leave through the hatch (card 18's walls).

## Acceptance
- Three clients: a dog tosses a cat through the hatch: the cat is captured on all three within 150 ms of its body coming to rest inside; before: no capture exists. The cat pressing against the cage for 5 s stays inside.
- A free cat's interact at the latch frees 2 captured cats at once on every client; the latch is open for their exit and closed 5 s later.
- A captured cat alone appears at the tunnel exit 60.0 ± 0.5 s (the 3-player knob) after its capture, on every client; a rescue at 30 s cancels its timer.

## Test
- Vitest through the relay for capture-by-position and for the rescue freeing all, each red with its rule removed.
