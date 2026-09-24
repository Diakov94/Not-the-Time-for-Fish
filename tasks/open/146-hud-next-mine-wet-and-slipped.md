zone: src/hud
size: S
files: src/hud/hud.ts, src/hud/words.ts
# The next mine in hand, the wet cat and the slipped dog on the HUD

Cards 129 and 130 add facts the player must read: which mine comes next, how long the cat stays wet, that the dog slipped. The HUD reads the sim's queries and keeps nothing.

## DoD
- The dog's items name the next mine ("Міни: 2 · далі водяна"); a wet cat sees "Мокрий 0:18" counting down; a slipped dog sees "Послизнувся" for the tumble.

## Acceptance
- The wet countdown matches the sim's timer within 1 s, shown for 20 s and gone at 21; the next-mine word changes on the plant that uses the last firecracker.

## Test
- None: a read of the queries.
