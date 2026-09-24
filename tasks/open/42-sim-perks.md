zone: src/sim
size: L
# Perks: mystery bags and the eight effects

GAME.md, Perk pickups: neutral mystery bags spawn in the house and the yard (card 18's points, spawned by the host at `prep`); the effect depends on who picks one up and lasts one use or ~30 s; one slot, a second bag replaces the first; use with F. ADR 0010: `pickup {bag}` from a touching player's client, first delivered wins and removes the bag; the picker's own client draws one of its side's four and owns the slot and its clock. Dogs: Sapper (two extra mines, faster planting), Bloodhound (trails visible longer), Bulldog (longer grab range), Bark (one use: flushes hidden cats in a radius out of their spots, each emitting a noise ping: `bark {p}` is the message, each cat's client answers for its own cat). Cats: Ninja (silent steps), Acrobat (double jump), Decoy (one use: throws a lure, an entity of kind `lure` that leaves scent for 30 s, card 24), Safecracker (defuse twice as fast, uninterruptible).

## DoD
- The slot, its kind and its clock live on the picker's client only; every effect is either a parameter the picker's own actions read (reach, mine cap and plant time, sniff window, step noise, jump count, defuse time) or a message (`bark`, the lure's `spawn`).
- A timed perk ends at 30 s on the picker's clock; a second bag replaces the slot at once.

## Acceptance
- Two players touching one bag in the same step: exactly one picker on every client, the bag gone everywhere.
- One number per effect, before → after: Bulldog grabs at 2.0 m (1.5 m without); Acrobat's second jump adds ≥ 1 m of height; Ninja sprints 20 m with 0 pings (8–12 without); Decoy's lure leaves a trail a sniffing dog sees 20 s later; Bark puts a hidden cat 6 m away outside its spot with 1 ping in the stream, and leaves one at 8 m hidden; Sapper plants 5 mines and plants in ≤ 0.75 s; Bloodhound sees a 45 s old trail (gone at 31 s without); Safecracker defuses in 1.5 s while walking.
- A perk picked at t is gone from the slot at t + 30 s; a second bag at t + 10 s replaces it.

## Test
- One Vitest test for first-pickup-wins through the relay, red with the rule removed; the effects are numbers in the report.
