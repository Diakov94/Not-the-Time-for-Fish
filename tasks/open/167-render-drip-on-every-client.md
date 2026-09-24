zone: src/render
size: XS
files: src/render/view.ts
# A wet cat drips only on its own screen: render reads the own client's `wet`, not `soakedUntil`

The tail of card 144 (THEMES-A). The water-bomb look (darkened fur and four falling drops, `soak` in `src/art/rig.ts`) is switched by the rig's `wet` fact, and `facts` in `src/render/view.ts` sets it only for `e.home === sim.me` from `wet(sim)`: when card 144 landed the sim had no wetness for another client's cat. SIM-FIX has since landed `soakedUntil(sim, e)` in `src/sim/mines.ts`, every cat's wet end on any client (its own client's `wetUntil`, another's from the splashes this client folded), as `stunnedUntil` already drives the tumble. So the dogs, who most need to see a soaked cat, see it dry.

## DoD
- `facts` reads `wet` for every cat as `sim.time < soakedUntil(sim, e)`; the own-client-only path (`e.home === sim.me && wet(sim)`) is gone and render keeps no wet timer of its own.

## Acceptance
- Two tabs, a cat soaked by a water bomb in one: the drip shows on the cat in both tabs, for 20 s in each (card 129's WET) within 0.5 s (before: 20 s in the cat's tab, 0 s in the other).

## Test
- None: the two-tab look is the measurement; `soakedUntil` is the sim's and has its own test.
