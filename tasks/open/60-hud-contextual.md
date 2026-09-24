zone: src/hud
size: M
# The HUD, contextual: whisker cue, defuse and plant progress, overtime warning

GAME.md, HUD contextual: the whisker cue and defuse progress (cats), the overtime warning; and the plant progress for both sides. The cue is card 39's query (a sneaking cat within ~2 m of a mine), shown as a twitch at the screen's edge and nothing more; the progress bars read the sim's progress query; the overtime warning reads the phase and, for a carrier, that it is the one pinging. None of it is a tutorial: a cue, a bar, a line.

## DoD
- Every element appears and disappears with the sim's fact it shows, within one frame; the HUD infers nothing from timing of its own.

## Acceptance
- The whisker cue shows at 1.9 m sneaking and not at 2.1 m or walking (matches card 39's numbers on screen); the defuse bar fills over 3 s and vanishes within one frame of an interruption; the overtime line appears at `overtime` on every tab and the carrier's tab says it is pinging.

## Test
- None: screenshots in the report.
