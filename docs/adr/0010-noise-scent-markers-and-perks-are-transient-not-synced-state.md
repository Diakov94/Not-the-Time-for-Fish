---
status: accepted
date: 2026-09-24
---

# Noise pings, scent trails, team markers and the perk slot are transient: events or per-client derivations, never synced state

The natural mistake is to put every new fact into the shared table. Four of the MVP's facts are transient or private, and the table would only make them stale, heavy or both. Each is named here with its owner, so that no card puts it into the round table by default.

| fact | owner | how the others learn it |
| --- | --- | --- |
| a noise ping | an event born at the client that simulates the body that made the noise: a contact above the force threshold on a body it owns, its own character's steps (a dog's always, a cat's when not sneaking), its own blast or sprung trap; sent as `noise {p, loud}` | every client appends the message to its event list (ADR 0008) on arrival; it is not folded and not stored; a joiner never sees an old ping |
| one ping per impact | when two synced bodies of different owners collide, the owner of the lower net id sends; when a synced body hits local debris, that body's owner sends | the rule is the sender's; nothing to reconcile |
| a scent trail | each client's own history of a cat's (or a lure's) poses as it applied them (its own cat from the body, the others from their snapshots), a ring buffer per entity in `src/sim`, 60 s long; sniff is a query over it with a window (30 s, longer under Bloodhound) and a radius (10 m) | no message: the poses already reach every client from one owner's ticks (ADR 0006), so two dogs hold the same trail without being told |
| a team marker | an event `mark {p}` from the marking client, the point found by a ray the sim casts for the app; shown to the marker's side for a while | the event list; not stored |
| the perk slot | the fold names the bag's picker (the first `pickup {bag}` delivered removes the bag); what the picker got, for how long, and its one use are the picker's own client's fact, the kind drawn locally from its side's four | nobody else needs it: every effect is either local to the picker's actions (reach, speed, silence, a second jump, defuse time, mine cap, the sniff window) or a message of its own (`bark`, the lure's `spawn`) |
| a hidden cat | derived on each client from the pose it holds: the body is inside a hiding-spot volume | the hider's client switches its camera; each cat's client answers a `bark` for its own cat; a dog's client only fails to see it |

## Considered options

- **Pings in the round table**: rejected. The table would grow without bound or need pruning, a joiner would receive stale pings, and the fold would have to accept unordered events.
- **Scent as messages**: rejected. Five cats sending samples for ten minutes, a lure needing a second sender, and a trail that is already identical on every dog because it is derived from one owner's ticks.
- **The perk slot in the round table**: rejected. Every effect would then be visible to all through the table while only the picker's own actions read it, and the random draw would have to be derived from `seq` to agree everywhere.
- **"Hidden" as a synced flag**: rejected. It would be a second owner of a fact the pose already states.

## Refutation sign

Two dogs showing the same cat's trail more than 1 m apart at the same moment (then the pose histories diverged, which is ADR 0006's sign, not this one's); a ping shown twice on any dog's screen for one impact; a joiner's HUD showing a ping older than its join; a perk whose effect another client must know without a message of its own (then it is a message, not a slot fact, as `bark` is).
