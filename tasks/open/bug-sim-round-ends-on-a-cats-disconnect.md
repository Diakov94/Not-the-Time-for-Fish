zone: src/sim
size: S
files: src/sim/round.ts, src/sim/heist.ts, src/sim/round.test.ts
# The round's cat count skips a cat whose tab died: a teammate's disconnect hands the dogs the win at once, and a rescue leaves the gone cat captured

`cats(r)` in round.ts keeps only names with `client !== null`. Measured with the fold (three names, p0 and p2 cats, p1 the dog, host c1):

- p0 captured, then cat p2's `left` folds: `settle` finds no free cat and ends the round at the `left` message: phase heist → over, `{why: 'captured', winner: B}`. GAME.md, Disconnects: the character freezes 60 s and the player rejoins into the same round; nothing ends. A Wi-Fi blip on one cat is a dogs' win.
- p2 captured, its tab dies, p0's `rescue` at the latch: refused (`inside` is empty), p2 stays captured in every table; its rejoin by name enters on the kennel floor, captured, and starts a dig-out, though the kennel was opened in front of it.

ADR 0007 makes the roster (name → team, client, captured) the one owner of who plays cats this round. The rule to write there: a name on the cats' team counts while it plays this round, connected or away (its character stands, frozen, until the host's `despawn` after 60 s, ADR 0007); a `left` never ends a round by itself and never keeps a rescue from freeing a captive. `interact`'s latch rule reads the same set.

Assumption for the Producer: after the host's `despawn` the name still sits on the team, so the simplest rule (every name on the team counts) means a round with one cat playing and one gone for good ends by fish or by the timer, not by capture. If a gone cat should stop counting at its `despawn`, that is one more read of the entity table in `settle` (the character with that name's last client is gone); the card leaves the choice to the Producer and takes the simplest rule.

## DoD
- `settle`'s "every cat captured" and the rescue's set read the roster's team, not `client`; a cat whose client is null keeps the state it had, free or captured, until the fold says otherwise.
- The `left` of a free cat during heist leaves the phase as it was; a rescue while the only captive is away frees it in every table; its rejoin enters at its side's spawn point.

## Acceptance
- The two fold sequences above: phase after the free cat's `left`: over → heist; the rescue with an away captive accepted: false → true; the rejoiner's `captured` at its hello: set → null. `round --clients 6` and chase-kennel-rescue-rejoin at 4 clients still pass.

## Test
- Two round tests: the `left` of a free cat with a teammate captured does not end the round; a rescue frees an away captive. Both red without the fix.
