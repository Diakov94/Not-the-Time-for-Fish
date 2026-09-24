zone: src/audio
size: XL
# Procedural music adaptive to the phase

GAME.md, Audio Direction: music is procedurally generated and adaptive to the round phase: calm prep, tense infiltration, frantic chase. Generated in Web Audio from a scheduler (a sequencer clocked on the context) and synthesised voices; three states driven by the round table's phase and by one tension signal from the sim (a dog within some metres of the player's cat, or the player's dog within some metres of a cat, and overtime), with transitions on the beat so a phase change never cuts a note; the lobby and results are quiet or a stinger. A seed makes the piece reproducible for a recording; nothing is stored. Rendering in the browser's offline context through a dev page is the way to measure it; Node has no Web Audio.

## DoD
- Music reads the round table and the entity table and keeps only its scheduler's state; the tension signal is a query the sim answers, not a rule audio invents.
- The lobby is quiet; prep, heist and overtime are audibly three states; the transitions are on the beat.

## Acceptance
- An offline render of 60 s per state at one seed, in the browser: the three states differ in tempo or density by a number named (e.g. prep 80 BPM sparse, heist 110 BPM, chase 140 BPM dense); peak ≤ −1 dBFS.
- A phase change in the browser is followed by the music within one bar; a dog approaching a cat to 6 m raises the tension state within one bar, leaving lowers it within four.
- The music and card 52's SFX together stay under 3 ms of main-thread time per frame at 60 FPS (the audio graph runs off the main thread; the scheduler's cost is what is measured).

## Test
- None: the renders' numbers and the browser numbers in the report; the renders are not committed.
