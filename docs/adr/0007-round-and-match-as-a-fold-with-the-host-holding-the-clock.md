---
status: accepted, the match part superseded by ADR 0014 on 2026-09-24 (no teams: the roster's `team`, the `roster` message, the match rows and the two-round successor)
date: 2026-09-24
---

# The round and the match are one fold over the relay's order; the host holds only the clock

ADR 0001 left round state on the host client, to be "re-derived by the next host on migration". The MVP makes that concrete the way ADR 0006 made ownership concrete: the round is a table that every client folds identically from the relay-ordered stream, so no client owns it and the next host has nothing to re-derive. The host's one duty is the clock: it sends the `phase` message when a phase's time is up, because clocks are the one thing the stream does not carry. Every count in the table comes from an event born at the fact's owner, and the fold rejects what it has already applied, so the table is a pure function of the order.

## Owners

| fact | owner | born where |
| --- | --- | --- |
| the roster: player name → team, current client, look, captured or not | the round table, `src/sim/round.ts`, written only by its fold | `hello {name}` from the joining client; `roster {name, team}` from the host (auto-balance on the first hello, reassignment by hand; a known name is a rejoin and keeps its team); `look {side, look}` from the player |
| the phase (`lobby`, `prep`, `heist`, `overtime`, `over`), the round number, which team is cats | the round table | `phase {to, round}` from the host, accepted only if `to` is the successor of the current phase and `from` is the host the relay names as of that message; the fold also flips to `over` by itself when the table says so (three fish secured, every cat captured, no fish held during overtime), since those conditions are in the stream |
| the phase's start | each client's own sim time at the fold of the accepted `phase`; remaining time is derived from it, never sent | the fold; the HUD reads it; clients differ by one relay hop |
| a secured fish and when it was secured | the round table | `secured {fish, at}` from the fish's owner, the carrying cat's client, when the fish it simulates is inside the hideout volume and held; accepted only if the ownership table says `from` holds it and it is not yet secured; `at` is the sender's time since the heist began, stored as sent, so every table holds the same number for the tiebreak |
| a captured cat | the round table | `captured {at}` from the cat's own client, when its unheld body is inside the kennel volume; `rescue` from a free cat's client at the latch frees every captured cat; `dugOut` from the captured cat's client after its own dig-out timer frees that cat |
| the match: each round's secured count and last-secure time, the winner, the session's match score | the round table; it survives rounds and matches for the life of the room | derived by the fold at `over` from the same table |
| a mine, a trap, a bag, a fish, a character | a row of the entity table, as in ADR 0004 | spawned by the client that makes it (a dog plants a mine, a cat a trap, the host the level's props, each player its character); removed by the fold on the message that ends it (`blast`, `defused`, `sprung`, `cleared`, `pickup`, `secured`, `despawn`) |
| a dog's mine count, a cat's trap in hand, a player's perk slot, a stun, a dig-out timer | the player's own client (`src/sim`, local character state) | nobody else acts on them; the shared effect is always a message (`spawn`, `blast`, `pickup`, `bark`) |

A round's entities are spawned at `prep` and dropped at the next `prep`: the same `phase` message clears the entity table and the ownership table on every client, then the host spawns the level's props and each client its character with the side the roster gives it this round. A side swap is therefore a respawn (ADR 0009). A joiner's `state` (ADR 0006) carries the round table beside the ownership table, with the current phase's elapsed time, so a joiner's timer is off by at most a hop.

## Under host migration

The next host holds the same table, because it folded the same stream. It takes over the clock from its own phase start, so a phase transition after a migration arrives within one hop plus one frame of when the old host would have sent it. `left` releases the leaver's entities (ADR 0006) and the roster keeps the name, so a rejoin by name lands in the same round with the same side and, if the cat was captured, in the kennel. Two hosts cannot both advance a phase: the successor rule rejects the second `phase`.

## Considered options

- **The host owns the round and broadcasts snapshots of it**: rejected. The host would decide "secured" from a copy of the fish's pose 100 ms old, or wait for the owner's message and re-broadcast it (a second hop and a second message per event); on migration the new host's copy would be a snapshot that misses the messages in flight to the old host; every client needs the table for its HUD anyway, so snapshots save nothing; and a joiner would need a second mechanism next to `state`.
- **Every transition by message, counts included**: rejected. A `phase over` sent by the host after a `secured` it saw makes the host a second owner of the count; the derived conditions cost nothing and agree everywhere by construction.
- **Timestamps taken by the folding client**: rejected. Two clients would hold two numbers for one event and the tiebreak could differ between screens. The message carries the sender's number; the fold stores it.
- **The relay keeps the round**: closed by ADRs 0001 and 0005, not reopened.

## Consequences

- The message kinds of the round (`hello`, `roster`, `look`, `phase`, `secured`, `captured`, `rescue`, `dugOut`, `despawn`) and of the mechanics (`blast`, `defused`, `sprung`, `cleared`, `pickup`, `hit`, `bark`) belong to the sim's message union (ADR 0008); net carries them and folds nothing.
- The fold reads the ownership table and the level's volumes; it writes only its own table. `receive` stays the one writer of the entity table.
- The headless runner can drive a whole round in Node and compare round tables between clients the way it compares poses.

## Refutation sign

Two headless clients ending a scripted round with different round tables (an event is not idempotent, or the fold reads something outside the stream); a phase advanced twice after a host migration; a timer on two clients differing by more than 250 ms one second after a `phase`; a fish counted twice or reappearing after `secured`; a rejoiner's side differing from its team's side.
