zone: src/sim
size: L
# Mines: plant, blast, stun, defuse, whisker cue, resupply

GAME.md, Mines and Demining, Friendly fire: a dog carries 3 (the knob, card 27; Sapper +2, card 42), plants one at its feet (Q, a short interruptible action; Sapper faster), the mine is a visible static prop concealed by the environment (render's, card 57); a cat stepping on it is stunned ~3 s and launched, drops its fish; the blast is loud and pings for everyone; the blast impulse pushes everyone, dogs included, but never stuns a dog; a cat defuses with a short interruptible hold (E, ~3 s; Safecracker 1.5 s and uninterruptible), a defused mine is gone for good; a sneaking cat within ~2 m gets the whisker cue; a used mine is replaced at the doghouse after ~30 s. Owners (ADR 0007, 0010): the mine is an entity spawned by the dog's client; `blast {mine}` is born at the client of the cat that stepped on it; `defused {mine}` at the defusing cat's; the fold removes the mine on either; every client applies the blast to the bodies it simulates within the radius; the count is the dog's own; the cue is a local query.

## DoD
- A mine is spawned only by a dog with a mine in hand; a carrying dog cannot plant (card 21).
- The stun disables the cat's intent on its own client and its fish leaves its hand by an ordinary `release`; the launch and the push are impulses each client applies to its own bodies on the folded `blast`.
- Two cats on one mine: both stunned, one `blast` accepted.

## Acceptance
- Two clients: a cat walking onto a mine is stunned 3.0 ± 0.1 s, thrown ≥ 1.5 m, and its fish is `held: false` on both clients within one message of the `blast`; a dog 1 m from the blast moves ≥ 0.5 m and is not stunned; 1 `noise` in the stream per blast.
- A defuse held 3 s removes the mine on both clients; interrupted at 2 s by moving or by a grab, the mine stays and progress restarts.
- The whisker cue is true at 1.9 m sneaking, false at 2.1 m or when walking; a dog plants 3 and cannot plant a 4th until 30 s in the doghouse (planting takes 1.5 s and cancels if the dog moves).

## Test
- Vitest through the relay for the blast (stun, drop, one blast for two cats) and the defuse interruption, each red with its rule removed.
