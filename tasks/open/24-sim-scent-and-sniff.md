zone: src/sim
size: M
# Scent trails and sniff

ADR 0010: a scent trail is each client's own history of a cat's (or a lure's) poses as it applied them, a ring buffer per entity, 60 s long, sampled every ~0.5 m of travel; no message. GAME.md: trails fade in ~30 s; sniff (a held action, dogs only) shows trails within ~10 m and slows the dog to a walk; it also reveals traps nearby (card 40 adds them: the query returns entities of kind `trap` in range from this card on). The `Intent` gains `sniff`; `sniffed(sim, window, radius)` is the query render and the HUD read.

## DoD
- The buffer is fed only where poses are applied (the own body after the step, snapshots on arrival), so it is a view of ADR 0006's poses and never a second source of them.
- The query's window and radius are parameters (Bloodhound, card 42, lengthens the window); their defaults are 30 s and 10 m.

## Acceptance
- A dog sniffing 20 s after a cat walked 10 m past sees a trail of 18–22 samples; at 31 s, 0 samples; a cat 12 m away leaves no visible sample.
- A sniffing dog moves at its walking speed and cannot sprint; releasing sniff restores the sprint within one step.
- Two clients: the trail a dog sees of a remote cat matches the cat's own path within 0.25 m per sample (the interpolation delay, ADR 0006).

## Test
- One Vitest test for the 30 s window, red with the window removed.
