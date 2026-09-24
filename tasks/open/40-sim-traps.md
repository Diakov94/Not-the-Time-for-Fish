zone: src/sim
size: M
# Traps: plant, set off, clear, pickups

GAME.md, Traps: a cat plants a distraction trap and sets it off by hand from anywhere with the same button (Q); one trap in play per cat, carried or planted; each cat starts with 1 and more spawn as pickups (card 18's points); dogs sniff (card 24 already returns traps in range) and clear a planted trap (E tap nearby) before it goes off. MVP has one type, the noise maker: a loud noise ping where it sits. Owners: the trap is an entity spawned by the cat's client with the cat as its home; `sprung {trap}` is accepted only from its home; `cleared {trap}` from a dog's client; the fold removes it on either, first delivered wins; a `pickup` of a trap pickup is folded like a bag's (ADR 0010), first delivered wins.

## DoD
- A cat with a trap planted or in hand cannot plant another; a cat with none cannot plant.
- A sprung trap is one `noise` from the springing client's folded message, at the trap's position, loud (card 23's scale names the number).

## Acceptance
- Three clients: a cat plants outside the fence in prep, walks 30 m in heist, springs it: 1 `noise` at the trap on every client within 150 ms; the trap is gone everywhere; before: no traps.
- A dog clears it first: the later `sprung` is rejected on every client and no ping follows; a second plant while one is planted does nothing (0 spawns).
- Two cats touch one pickup at the same step: exactly one gains a trap on every client's view of it.

## Test
- Vitest through the relay for spring-vs-clear ordering and for one-in-play, each red with its rule removed.
