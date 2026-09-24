zone: src/audio
size: M
# The round's SFX: mines, traps, kennel and phases

GAME.md's priority list continues: mine arm, defuse and blast; and from the round: a planted or sprung trap, a capture, a rescue, the dig-out, a secured fish, the phase changes (prep's end, overtime's start, the round's end) as stingers, and the overtime carrier's continuous ping. From the event list (cards 27, 28, 29, 39, 40): each event one synthesis function positioned where it happened; a blast is the loudest sound in the game and shakes with card 33.

## DoD
- Every sound is driven by an event the sim already emits; audio adds no detection of its own.

## Acceptance
- Each of the eleven events above plays a distinct sound within 50 ms of its event (a tester names 10 of 11 blind); a blast heard from 30 m is still audible; a defuse's progress is audible for its 3 s and stops within one frame of an interruption.
- The master bus's peak with every one of them fired: ≤ −1 dBFS (card 52's readout).

## Test
- None: the peak readout and a browser check in the report.
