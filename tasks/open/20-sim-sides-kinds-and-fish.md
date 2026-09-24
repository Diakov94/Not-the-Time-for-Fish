zone: src/sim
size: M
# Sides as kinds, the message union, the fish's rules

ADR 0009: `cat` and `dog` replace `character` in the entity table; `fish`, `mine`, `trap`, `bag`, `lure` and `prop` are declared with their body types now, so render and the runner can draw and spawn every kind from this card on. `mayHold(holder, target)` is the one predicate: the fold rejects a hold claim it refuses, `grab` never sends one. An accepted grab on a cat releases what the cat holds. The sim's message union moves to `src/sim/messages.ts` (ADR 0008); `src/net/protocol.ts` changes by the one line that takes it, named in the report. Fish: a prop only cats hold, tossed ~3 m (GAME.md: between cats, over a sofa, never the fence). The callers of `spawn(..., 'character')` in app and headless change one word each; name them.

## DoD
- The predicate is written once and called from the fold and from `grab`; no other file decides who may hold what.
- A fish thrown at card 05's pitch lands 2.5–3.5 m away; the fish's mass and shape let a cat carry it at card 05's anchor within 0.05 m.

## Acceptance
- A dog's grab at a fish sends 0 claims (the relay's stream is counted); a `claim {hold: true}` from a dog on a fish injected into the stream is rejected on both clients; a cat's hold claim on a dog is rejected.
- A dog grabs a cat carrying a fish: the fish is `held: false` in both clients' tables at the grab's message and stays owned by the cat's client; the fish lands within 1 m of where the cat stood.

## Test
- One Vitest test per rule through the fold, red with the rule removed (the predicate's two call sites: one test each).
