---
status: accepted
date: 2026-09-24
---

# Ownership sync for the Prototype: one fold over the relay's order, one owner per fact

Every client folds the same relay-ordered stream of `claim`, `release` and `left` messages into the same ownership table, so the table is identical everywhere without anyone being asked. The client the table names for an entity simulates it as a dynamic Rapier body and sends its pose at ~20 Hz; every other client drives a kinematic copy from those snapshots. A claimant learns its own outcome the way everyone else does, from the echoed stream (ADR 0005), so no client ever decides ownership alone.

## Owners

| fact | owner | how everyone else learns it |
| --- | --- | --- |
| an entity's authority (who simulates it) | the ownership fold, run identically on every client over the relay's order | by running the same fold |
| an entity's pose and velocity | the Rapier body on the owning client | the owner's `tick` snapshots; a snapshot from a non-owner is dropped |
| a contested claim | the relay's delivery order, applied by the fold | the echo: the claimant waits for its own claim to come back |
| room membership and the host's identity | the relay's room module (ADR 0005) | `welcome`, `joined`, `left` |
| round state (which entities exist, their kinds and home owners; later timers and secured fish) | the host's client | `spawn` messages; `state` to a joiner; the next host takes the duty over on `left`, since every client already holds the table (ADR 0001) |
| a cat grabbed by a dog: its body while carried | the dog's client, the carrier | the carrier's `tick` carries the cat's pose; the cat's own client stops sending it |
| a character's inputs | its player's client | never sent in the Prototype; only the resulting poses are |
| what to display | `render` on each client, a view | not a fact |

Net ids are `<client id>:<counter>`, so any client spawns without collisions: the host spawns the level's synced props, each player spawns its own character.

## The fold

Each synced entity has a `home`: its player's client for a character, none for a prop. The table maps net id to `{owner, held}`.

- `claim {id, hold}` from `from`: if the entity is held by someone other than `from`, the claim is **rejected** and nothing changes. Otherwise `owner = from`, `held = hold`. So two simultaneous grabs resolve to the first delivered, and two pushes resolve to the last delivered, which is the player touching the prop most recently.
- `release {id, pose, velocity}` from the owner: `held = false`; `owner = home` if the entity has one, else the releaser. The message carries the handoff state, so the new owner continues the throw or the drop without a gap: a cat a dog tosses lands under its own player's simulation from the very message that released it.
- `left {id, host}` from the relay: every entity owned by the leaver goes to `host`; a character whose player left stays as a frozen kinematic body. Removal after 60 s and rejoin are Vertical Slice rules.

Claims are sent on a grab action (`hold: true`) and on the first contact between a body the client owns and an entity it does not (`hold: false`), at most once per entity per 500 ms per client. While its claim is in flight, a client simulates the entity it is touching and ignores incoming snapshots for it: the grab feels local; the fold decides. A held entity is a kinematic follower of its carrier on the carrier's client and a kinematic copy everywhere else; a released entity turns dynamic on its new owner. Body types switch with `setBodyType` on the fold's decision, on every client at the same message.

## Snapshots

One `tick` message per client per network tick (~20 Hz) carries every entity the client owns that moved since its last tick: pose, linear and angular velocity, and a `rest` flag on the first tick a body sleeps; a body at rest sends nothing after that. Receivers keep the last two snapshots per entity and interpolate the kinematic body's next pose 100 ms behind arrival, two network ticks of buffer. Every owner resends its resting entities once on every `joined`, so a joiner learns every pose from that pose's owner and never from the host's copy.

## Join

The joiner receives `welcome {you, members, host, seq}`. If it is the host, it spawns the level and sends `spawn`. Otherwise it buffers everything until the host's `state {seq, entities, table}` arrives, then applies the buffer: `tick`s as they are, fold messages only with `seq` greater than the state's. The relay's `seq` is what makes this exact; nothing else uses it.

## Considered options

- **First delivered claim wins for everything**: rejected. A prop pushed by a second player would never change hands, and the last toucher is the one whose physics the others should see.
- **Last delivered claim wins for everything**: rejected. A grab could be stolen by a later grab, so carrying would be mash-grab griefing and GAME.md's wiggle-free rule would have no meaning.
- **The claimant decides optimistically and rolls back**: rejected. Without the echo a client cannot tell whether a rival's claim was delivered before or after its own; the echo costs a few KB/s and removes the rollback code entirely.
- **The cat's client keeps simulating its own body while carried**: rejected. Dog and cat would come from two sources with two latencies, and the cat would swim around the dog's mouth on every screen. The carrier owns the carried; at the Vertical Slice the cat's wiggle becomes an event sent to the carrier, which counts it and releases.
- **The relay assigns ownership**: out of scope by ADR 0001, not reopened.

## Consequences

- No client owns ownership: the fold does. A screen or a system that decides "I own this" by any other rule introduces a second owner and is rejected at review.
- Determinism between clients is relied on nowhere; the deterministic Rapier build is not needed. Divergence is expected and measured: the headless runner's number is the maximum position difference per synced entity between clients over a run.
- The host sends identity, never positions. Entities at rest still reach a joiner because their owners resend them on `joined`.
- A backgrounded tab that stops ticking (a GAME.md risk) is covered by the touch claim: whoever touches its props takes them; its character freezes because nobody else drives it.
- The message kinds are the contract between the sim and net batches: `claim`, `release`, `tick`, `spawn`, `state` from clients; `welcome`, `joined`, `left` from the relay.

## Refutation sign

Two headless clients ending a scripted run with different ownership tables (the fold is not a pure function of the order, or the echo is not the same order for all); a resting prop differing between clients by more than 2 cm one second after rest; a carried entity on the carrier's screen more than 5 cm from its anchor in any tick; a crate pushed by both players visibly jittering between two sources, which asks for a minimum hold time on touch claims rather than a new mechanism; the free-plan arithmetic of ADR 0005 failing because ticks are not batched.
