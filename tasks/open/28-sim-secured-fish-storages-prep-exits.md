zone: src/sim
size: M
# Secured fish, the storages' access costs, exits closed in prep

GAME.md: a fish counts only when a cat carries it into the hideout; fish sit in storages with different access costs (table: open; fridge: slow and loud; aquarium: needs a teammate); in prep cats are confined to the hideout. `secured {fish, at}` is born at the fish's owner when the held fish it simulates is inside the hideout volume (ADR 0007); the fold removes the fish from play. The fridge is a `door` storage: an interact (E tap, card 49) of ~3 s with a noise ping opens it before the fish can be grabbed; the aquarium is a `lid` storage: one cat holds the lid (E hold) while another takes the fish, or whatever mechanism makes one cat insufficient. Every `exit` volume carries a cats blocker while the phase is `prep`.

## DoD
- `secured` is sent only by the client the fold names as the fish's holder and only once per fish; a fish lying in the hideout unheld is not secured until a cat holds it there.
- A fish leaves play at `secured` on every client at the same message (the entity and its rows gone); the round table's count and last-secure time move together.

## Acceptance
- Two clients: a cat carries a fish through an exit into the hideout: the round table reads 1 secured on both clients within one message; before: fish are ordinary crates. A fish thrown into the hideout from the yard: 0 secured until a cat picks it up there.
- The fridge's fish is grabbable only after ≥ 3 s of interaction, with 1 noise ping; the aquarium's fish is not grabbed by one cat in 10 s and is by two cats in ≤ 5 s.
- In `prep` a cat pressing against an exit gap moves 0 m through it; in `heist` it passes; a dog never passes an exit in any phase.

## Test
- One Vitest test for `secured` held-and-inside through the relay, red with the held check removed; one for the prep blocker.
