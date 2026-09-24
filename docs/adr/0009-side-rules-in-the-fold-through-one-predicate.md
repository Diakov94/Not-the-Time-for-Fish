---
status: accepted
date: 2026-09-24
---

# Side rules enter the fold through one predicate, applied by the fold and before a grab; a side swap is a respawn

The Prototype's fold (ADR 0006) is side-less: any character claims any entity. GAME.md's sides say only cats carry props and only dogs grab cats, and swap the sides between the two rounds. The MVP puts the side into a character's kind, the rule into one predicate, and the predicate at two call sites: the fold, which is the one owner of the decision, and `grab`, which never produces a claim the fold would refuse.

## Owners

- **A character's side** is its kind: `cat` or `dog` replace `character` in the entity table (ADR 0004), set at spawn from the roster's side for that client this round (ADR 0007) and never written again. The game's other kinds are `fish`, `mine`, `trap`, `bag`, `lure` and `prop` (content's props, with a label for render).
- **Whether a holder may hold a target** is `mayHold(holder kind, target kind)` in `src/sim`: a cat holds a `fish`, a `prop` or a `lure`; a dog holds a `cat`; nothing else holds anything. Mines, traps and bags are never held: they are planted or picked up by touch, which are messages of their own.
- **The decision** is the fold's: a `claim {hold: true}` the predicate refuses is rejected like any other rejected claim, on every client at the same message. Touch claims (`hold: false`) are unchanged: anyone shoves anything, a character never gets one.
- **The doomed claim never leaves**: `grab` applies the same predicate before its shape cast, so a dog pressing grab at a fish sends nothing and puts nothing in flight. Two call sites, one function; a second copy of the rule anywhere is a second owner.

## Two rules the sides add to the fold

- An accepted hold claim on a cat releases what that cat holds: every row held by the cat's client becomes `held: false` with its owner unchanged, so the cat's own client turns its fish dynamic where it is. "A grabbed cat drops its fish on the spot" is thus the same message as the grab, with no second mechanism; a stunned cat sends an ordinary `release` (ADR 0007).
- A `hit {dog}` from the client that owns a thrown prop releases what the dog holds, the way `left` does: without a handoff pose, the cat's client continuing from its copy. The wiggle-free at ~8 s is a `release` from the carrier's own clock.

## Considered options

- **The side check only in the sender**: rejected. The fold's tests could not prove the rule, and a client whose roster copy lags a swap (a rejoiner) would hold a fish as a dog on every screen with every table agreeing.
- **The side check only in the fold**: rejected. A dog's grab on a fish would put the fish in flight for a round trip: a 100 ms snap to the dog's mouth and back on the dog's screen, on every press.
- **A `side` field beside `kind`**: rejected. Two fields to keep consistent where one tells both; a `cat` is a side and a body size at once.
- **Mutating the kind at the swap**: rejected. A second write path to identity, and a `state` answered during the swap would carry the old kind to a joiner. The swap is the respawn ADR 0007 already needs to reset fish, mines and traps.
- **One fold per side**: rejected. The same message in two places.

## Refutation sign

A dog holding a fish on any client's screen; a cat holding a dog or a cat; a hold claim the predicate refuses found in the relay's stream (a client sent a doomed claim); the ownership tables of two headless clients differing after a round swap; a grabbed cat whose fish is still `held` in any table one message after the grab.
