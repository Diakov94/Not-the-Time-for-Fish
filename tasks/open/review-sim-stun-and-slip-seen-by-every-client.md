zone: src/sim
size: M
files: src/sim/mines.ts, src/sim/traps.ts, src/render/work.ts
# A stunned cat and a slipped dog look free to everyone but themselves

A mine's stun (STUN 3 s) and a slip's tumble (SLIP 1.5 s) are the own client's facts (ADR 0007: nobody else acts on them), and render draws the stars only over the own head (card 57: the others see the launch and the blast, not the stun). So the dog that just blasted a cat cannot see it has 3 s to grab it, a teammate cannot see a mate is helpless, and the rig's stunned and tumble poses (card 110) have no fact to draw for anyone but the viewer. The stun stays the own client's; what the others need is a view of it, derived the way `hidden` is (ADR 0010) from what every client already folds: the `blast` event (its position and variant) against the poses this client holds, and a slip trap's `sprung` from the dog that stepped on it. No message, no table row; ADR 0007's owner does not move.

## DoD
- A sim query `stunnedUntil(sim, e)` answers for every character from the ends this client folded: a firecracker's blast puts every cat within BLAST of it (by this client's poses at the fold) under STUN from then; a slip trap's `sprung` puts its sender's dog under SLIP. For the own character it is `stunUntil`, unchanged. The sim keeps the ends it needs (a short list, pruned past STUN).
- Render draws the stars over every stunned cat and the tumble (a lean, until card 110's pose) over every slipped dog; `work.ts` reads the query per character and keeps nothing.

## Acceptance
- In the mines-and-traps scenario at 4 clients, the blasted cat is answered stunned on every client within one frame of the blast's fold and the answers end within 50 ms of the stunned client's own end (the poses differ by the interpolation delay, not the rule); before: 1 of 4 clients.

## Test
- A sim test: a blast folded with a copy of a cat 1 m from it answers stunned for STUN on a client that is not the cat's; red without the query.
