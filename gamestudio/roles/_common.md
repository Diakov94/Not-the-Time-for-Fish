# Common to all roles

The Producer includes this in EVERY spec. It is written here once so that copies do not diverge.

**Commands are taken from `.studio/project.conf`**: `$INSTALL_CMD`, `$GATES_CMD`, `$SHOTS_CMD`, `$HEADLESS_GAMES_CMD`. In the spec the Producer substitutes their real names; the studio knows nothing about the engine.

Everything below is not a list of wishes but a list of failures that have already happened, each with its price. The numbers are marked with a date and a project: they are evidence that the rule was not invented, not "our metrics".

## First command: install dependencies (`$INSTALL_CMD`)

The worktree arrives fresh, with no dependencies in it. Without this the gates do not go red, they **do not run**, and the worker delivers a green report on checks that never happened.

## Work is not done until it is committed

*Pilot, 11 August 2026:* **three workers in a row** reported `worker_done` with detailed numbers, leaving zero commits and all the work in a dirty tree. One of them: 31 files, including thirteen new assets. The Producer committed for them.

Before reporting: the working tree is clean, and the branch log holds YOUR commit, not the Producer's spec. A report without a commit is not a delivery but an application for one.

## A check is named by command and exit code

Not "green", not "the quick set", not "ran the tests for the affected files". Write it like this:

> ran `$GATES_CMD` in full: exit code 0, wall time 113.3 s

*Pilot, 11 August 2026:* a worker reported "build, lint and 55 affected tests green"; trunk landed and failed on two gates that its selection of tests never touched. Since then the Producer re-checks with their own run on the branch **merged with trunk**, and that catches the real thing: a delivery can be green on its own and red after merging.

If the work changes what is visible: overwrite the reference screenshots with `$SHOTS_CMD` and name their number. If capture is outside the gates, a green gate exit code says NOTHING about the screenshots.

## An empty production-code diff = the work is not done

A report that retells the card reads as execution. *Pilot:* three workers out of four once did exactly that: read the plan, retold it and delivered a clean tree.

## Instruments: only when needed, and they are counted

**Instrument lines per game line** is the measure the Producer applies to every delivery. *Pilot, 11 August:* a worker built a 630-line browser rig for a 52-line fix: twenty to one, the instruments were thrown away whole, half a day lost.

A test is added **only for a critical scenario or a found bug**; there are no other reasons. A new test must go red without the fix: remove the fix, confirm it is red, put it back. If it does not go red, delete it: it guards lines, not a defect.

Throwaway things (unwrap sheets, temporary raster files, trial scripts in the root) do not go into the commit at all.

## Every fact has ONE owner

This is the dominant class of defects. *Pilot, four breakages in a row within one day:*

- the screen considered itself handed over to ANY battle: the map locked forever with a live button;
- the screen GUESSED the reason a route was refused from the target cell and called 29 of 51 non-hostile objects "no path here": that is, lied to the player's face;
- the log line was born in the click handler and so did not cover the second path of use;
- two owners of display timing stopped an animation dead.

The rule: the reason is given by whoever makes the decision; the event is born where it happens; the text lives in one place. If a fix needs a new fact from someone else's zone, **say so in the report** rather than deriving it yourself. A fix that introduces a second owner is rejected.

A good delivery names the owners itself: "the reason belongs to the passability rule, the warning to the AI actor, the log line to the engine event".

## The spec's boundaries are a prohibition, not advice

"Do not touch the rules", "do not touch the difficulty tuning", "do not start a second registry" are checked with one command over the zones from `.studio/project.conf`, and checked always.

## "Before" and "after" numbers, for every card

"It got better" is not a result. `24×20 → 44×44`, `overlapping letters 3-4 → 0`, `spread between screens 0.00 dB`, `empty days 11 of 12`. A threshold named without the current margin is not a check.

**A threshold raised instead of a fix is a defect recorded as the norm.** If the ceiling cannot be reached, name the number and say so, rather than moving the ceiling.

## The report: the first line answers the question asked

The Producer puts a direct question in the spec ("who owns the refusal reason now?", "is the mute map silence or emptiness?", "which of the two reasons applies to this seed?"). The first line of the report answers exactly that, rather than retelling what was done.

Then: what was done, what proves it, what remains. **Doubt is named**: staying silent about it costs more.

## Background runs

Waiting on background tasks with shell tools hangs the worker dead. Launch sequentially or with a timeout.
