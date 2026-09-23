# Studio: the working rules

Rewritten on 11 August 2026 after the owner demanded that the process be made sane and efficient. The previous edition was 934 lines long, was read by every worker every cycle, and produced **454 worker launches for 50 closed tasks: nine starts per task**. 2111 files were touched in `docs/` against 1685 in `src/`: we edited documentation more often than the game. That is the price the owner was paying.

What is here is exactly what the work breaks without. Everything else has been deleted.

**The folder ports to any project.** Commands, zones and file extensions live in `.studio/project.conf` (porting: `gamestudio/PORTING.md`); the studio knows nothing about the engine. The specific paths and file names in the examples below belong to the project **Pilot**, the name used here for the game (web, TypeScript) on which the studio was proven, and are given as EVIDENCE that a rule was earned through a mistake rather than invented. On a new engine they change, the rule does not.

# 1. What we make

A game. Not instruments, not rules, not documents about rules.

**The game leads by line count.** An owner's directive, checked with one command. What counts as code, instruments and documents is set by the project in `.studio/project.conf` (`PROD_FIND`, `STYLE_FIND`, `TEST_FIND`, `DOC_FIND`); the studio knows no file extensions:

```sh
. .studio/project.conf
prod=$(eval "$PROD_FIND"  | xargs cat | wc -l | tr -d ' ')
style=$(eval "$STYLE_FIND" | xargs cat | wc -l | tr -d ' ')
tst=$(eval "$TEST_FIND"  | xargs cat | wc -l | tr -d ' ')
doc=$(eval "$DOC_FIND"   | xargs cat | wc -l | tr -d ' ')
```

`tst` or `doc` larger than `prod+style` is a blocker: the first task of the cycle is to cut. `tasks/` is not counted.

**Tests only for critical scenarios and for bugs found by QA.** We write no process guards: 7,400 lines of them have already been deleted.

**We keep no documents.** The spec lives in the task card and dies with it. The worker's report is the commit message. The only things that live on are `docs/design` (the game's norms), `docs/ui` (geometry contracts) and `docs/RULES.md` (a rule earned through a mistake: one line each; written by the Producer only, a worker proposes a line in its report).

**Create nothing outside the project.** Worktrees are `$WORKTREES_DIR/<name>` INSIDE the project (`.studio/project.conf`), and that folder must be excluded from EVERY gate. Otherwise the gates check other people's branches and go red on someone else's code: *Pilot, 11 August 2026*: a landing failed on 12 lint errors, not one of which belonged to trunk.

# 2. BIG BATCHES AND BROAD STROKES

**An owner's directive from 11 August 2026, confirmed by measurement the same day.** This is the studio's main rule: work is handed out in big batches, not in cards, and is set in broad strokes, not operation by operation.

## The measurement that proves it

The wave of 11 August: **22 cards closed in 12 worker launches, and the weekly opus window went from 70 % to 72 %: two percentage points.** Under the old "one card, one worker" order the same 22 tasks would have cost about two hundred launches: until that day the score was **454 launches for 50 closed tasks, nine starts per task**.

It was not about models and not about limits. Every start pays again for installing dependencies, reading the rules and figuring out the code from scratch, and that payment is many times larger than the change itself.

## What it looks like in practice

**One worker: one zone and 3–6 cards in it.** A worker that had figured out `src/ui/adventure/` would be shut down, and the next one would figure it out there again from scratch. Five cards in one zone is five full context loads instead of one.

**A broad stroke instead of fine slicing.** The spec gives a zone, the list of cards, the boundaries ("what not to do") and the observable result with a "before" number. **The mechanism is chosen by the worker.** Prescribing the mechanism instead of the result is a Producer's mistake: on 11 August I demanded "5 frames at 60 ms" and at the same time "no fewer than 6 different images", which is impossible together; the worker took 6 × 50 ms, keeping the 300 ms that the measurement justified, and was right.

**No slicing small, not even for control.** Splitting into steps looks more manageable, but every step is a new context, a new spec and a new cycle of mine. A batch of five cards is delivered as one report with five numbers; five cards one at a time is five reports, five landings and five gate runs.

**The zones the queue is cut by are declared by the project**: the `ZONES` array in `.studio/project.conf`. A zone is a coherent piece of code a worker figures out once; there are usually five to seven. The sign of a correct cut: two cards in one zone almost always touch shared files, and cards from different zones almost never do.

**A batch goes in one pass:** the worker does all the cards, commits each separately, runs `$GATES_CMD` once at the end and reports numbers for each.

# 3. Checking by risk, not by ritual

Four stages on every change cost five times over. Review is justified where our class of failures lives, and only there.

**Review is mandatory if a change touches a shared owner:** of state, of display timing, of the pointer boundary, of the event queue, of the save. That is exactly where review found the real thing: the victory sound lost at the end of every battle, a route promised under a panel, a touch target half the norm, two owners of one norm.

**Review is not needed** if the change is layout, size, colour, text, a moved number: the author proves it with a number, and acceptance will catch it.

**Acceptance by play: one pass per batch, and it is mandatory.** It is the only thing that caught what no green test caught: the player never reaches the first battle; a line reaches the log on one of two paths; a hint is not dismissed by the very action it teaches. Green tests saw none of that, not once.

**A test that feeds itself the thing it checks is not evidence.** There have been four such cases already. A test must go red with the fix removed; this is asked in every task.

# 4. Merging, review and acceptance: ALSO IN BATCHES

**An owner's directive from 11 August 2026.** If work is handed out in batches, the three checking stages must go in batches too, otherwise the savings on handing out are eaten at acceptance: five branches means five merges, five gate runs of 2–3 minutes under load and five cycles of mine.

## The Producer merges personally, and the Integrator role no longer exists

**An owner's decision from 11 August 2026, based on the results of the shift.** The separate Integrator role has been deleted together with its file. The reason is measurement, not taste: it stood idle for the whole project, and on 11 August the Producer landed eight branches on trunk by hand, each with the full gate run BEFORE landing, and that turned out both faster and more reliable. The "one integration branch out of everything ready" scheme was an answer to a wave of six batches; now we merge continuously, one branch at a time, as soon as it is delivered.

There is also a reason the role could never have worked: **trunk is checked out in the Producer's worktree**, and git does not let another worker switch to a busy branch. The Integrator physically got the work only as far as its own branch, and the ref was moved by the Producer anyway, so the role added a handoff without removing a step.

**The order for landing one branch, and it is not shortened:**

1. `git merge $TRUNK` INTO THE TASK BRANCH (trunk is `develop` in this repository; `TRUNK` in `.studio/project.conf`), not the other way round. A branch whose base is older than trunk brings stale ENTRIES, not breakage, and that is the least visible evil;
2. the full `$GATES_CMD` run RIGHT THERE. Red here costs nothing: trunk has not moved;
3. only then the landing on trunk: here a PR into `develop`, squash-merged (the repository allows only squash and rebase merges), and the source branch deleted after the merge.

Otherwise the requirement "gates red: leave trunk as it was" cannot be met: the merge is already in.

**The Producer resolves conflicts by UNION and by hand.** Both sides are needed: no landed change is lost and no new card is undone. Markers are not stripped by script, see below: that cost four red gate runs.

**Markers are checked over the WHOLE tree after every merge**, not in the conflicting files: `grep -rl '^<<<<<<< ' --exclude-dir=node_modules --exclude-dir=.git .`, and the count must be zero.

## The Producer reads the diff at acceptance, and the Reviewer role no longer exists

**An owner's decision from 11 August 2026.** The separate Code Reviewer role has been deleted together with its file: over the shift it was not called once, and its work was being done anyway: the Producer reads the diff of every delivery. The role is gone, its checklist stays here, because it existed for the checklist's sake.

**A worker's report is checked by the diff, not by the retelling.** In one shift on 11 August: three in a row reported "done" with zero commits and a dirty tree; one called the "quick set" a full check and broke trunk; one delivered "3 paths, 3 passed, 0 cards" while its own text held three unfiled findings.

**What to look at in the diff, by risk, not top to bottom:**

- **whether anything the spec forbids was touched.** One command over the zones from `.studio/project.conf`: `git diff --stat $TRUNK..<branch> -- <rule zones>`. Empty output means the boundary held. That is how it was checked that the map-honesty fix did not make the game easier: `src/ai/tuning.ts` was not touched by a single line;
- **whether a SECOND OWNER OF A FACT appeared.** This is the project's dominant class of defects: four breakages in a row within a day, and the worst of them lied to the player's face: the screen GUESSED the reason a route was refused from the target tile and called 29 of 51 non-hostile objects "no path here". A correct delivery names the owner itself: "the reason belongs to the passability rule, the warning to the AI actor, the log line to the engine event";
- **extension or rewrite.** +11 lines in a core predicate is an extension; a rewritten predicate in the same card is a reason to ask why;
- **the test goes red without the fix.** Remove the fix, confirm the test is red, put it back. Checked this way on 11 August: the stuck-turn guard went red on exactly two of its three assertions;
- **instrument lines per game line.** A cheap measure that shows at once where the money went: 630 lines of throwaway test for a 52-line fix is twenty to one, and the instruments were thrown away whole.

**Logic outside the UI zone in a UI Developer's delivery is read by eye, and green gates do not replace that.** An owner's concern from 11 August, confirmed by fact: in the delivery about intros, the UI worker touched `src/app/session.ts`, the owner of saves, and the Producer landed the branch having checked only the gates and the "was `core` touched" boundary, which `src/app` was not part of. The change turned out to be correct, but it was read AFTER the merge.

The rule is mechanical, not "be more careful":

```sh
gamestudio/ui-diff-check.sh <branch> [base]
```

It prints the files WITH LOGIC OUTSIDE THE UI ZONE. The zones are not hard-coded: the engine is detected (web/TS by `package.json`, Unity by `ProjectSettings`, Godot by `project.godot`), and they can be overridden with `.studio/zones.conf`: two lines, `LOGIC_GLOBS` and `UI_GLOBS`. This is part of the portable `gamestudio/`, and the next project on another engine gets the same rule without editing the instrument. **The Producer reads every file on that list as a diff before merging.** Empty means gates and screenshots are enough.

The price of the rule was measured on the same day: of three UI deliveries, two gave an empty list (pure CSS and nine lines in `src/ui`), the third gave five files. So the reading is cheap and rarely kicks in, but it kicks in exactly where the risk is.

The UI Developer's zone is the look, the layout, the texts and the vector assets. A `.ts` with logic in its delivery is not necessarily a mistake, but it is always a reason to read: the owner's directive is that the role is given the interface only, whatever model it runs on (`gamestudio/agents.md`).

**With your own run, not theirs.** A "gates green" report is checked by your own gate run on the branch with trunk merged into it. On 11 August a worker honestly reported green on ITS OWN branch, and after merging with trunk the suite went red: that step exists for exactly this.

**The Producer does NOT resolve conflicts by script and does not strip them with one.** On 11 August I removed markers with a regular expression, the script failed on a binary file, `git add -A` committed markers into THREE code files, and trunk got four red gate runs. Automatic marker removal is not conflict resolution but conflict concealment: the compiler sees `<<<<<<<` in a `.ts`, nobody sees it in a `.md`.

**The exit code must be checked on the right command.** A pipeline returns the status of the LAST command, not of the gates: `$GATES_CMD | tail` returns the code of `tail`. Because of this the rollback on red never fired once. Either `${PIPESTATUS[0]}` or output to a file.

The diff does not need reading top to bottom: **layout, size, colour and text get no deep reading**: the author proves them with a number, and a miss will be caught by acceptance by play. Only the shared owner is read deeply: state, display timing, the pointer boundary, the event queue, the save.

## Acceptance: one pass through the game for the whole integration

QA plays **the assembled game as a whole**, not each branch. One pass answers for every card in the batch at once and, in passing, for the question "does it work together". It is the only stage that caught what no green test caught, but ten passes of it cost as much as ten builds, and one is what is needed.

## Merging and checking must be FAST: an owner's directive

The owner's ceiling: **all checks no more than 3 minutes, ideally a minute.** Measurements from 11 August: on a free machine the gate run takes **60 s**, under a wave of six to ten worktrees **130…207 s** at a `load average` of 60…110. So our slowness comes not from the code but from **concurrency**.

Four rules that keep the speed:

1. **Only integration runs the full gate run, once.** A batch on its own branch runs the quick set (`tsc --noEmit`, lint, suite): enough not to deliver something broken. The full gate run with acceptance and screenshots is one run on the assembled result, not one for each of five branches. Acceptance alone costs 54…210 s, and five runs of it is five times the most expensive thing.
2. **Gates are not run concurrently.** Measured: three runs at once give a `load` of 185…194 on 12 cores, 20 live Chromiums and a wall time of 97…118 s against 52.7. While a wave is running, the full gate run is done by ONE worker, the integrator; the rest wait their turn or limit themselves to the quick set.
3. **Wall time above 180 s is a cycle blocker, but count the runs first, before blaming the machine.** "The load is high" and "our workers overloaded the machine" are two different statements. Look at how many `run-gates.ts` are alive right now.
4. **Acceptance by play: one pass per integration, from fixtures, not from scratch.** Fixtures (`docs/qa/fixtures/*.json`) put the game into the needed state in seconds; playing a whole playthrough from day one just to check a battle is minutes instead of seconds. A screencast is taken per assertion, not as a tape: no more than three screenshots per finding.

**The measure this is checked by:** the wall time of the full gate run with a single run live, and the number of full gate runs per wave. The target is one gate run per integration and a wall time under 90 s.

## The landing order is set by a number, not by a guess

Before assembling, count the branches' overlaps by `src` files:

```
for b in <branches>; do git diff --name-only $TRUNK...$b -- src; done   # then intersect
```

On 11 August, across eleven branches, the overlap was **one** file (`src/render/adventure/index.ts`), so the cut by zones works and almost everything merges without conflicts. Branches with no overlap go first, overlapping ones last and one at a time.

## Card size: a T-shirt size, not hours

**An owner's directive.** Hours are estimated by a neural net and are off by a factor of several: "a two-hour task" is in fact ten minutes of work. A T-shirt size is anchored to observable signs (how many files, whether a measurement is needed, whether it touches norms) and so does not lie.

**The size goes on the first line of the card when it is filed.** Whoever writes the card sets it; the Producer corrects it at grooming if the signs say otherwise.

| T-shirt size | signs | weight | examples from 11 August |
|---|---|---:|---|
| **XS** | one line, a constant, text; no measurement needed | 1 | a dead export, a link to a deleted file |
| **S** | one file, one "before → after" number | 2 | city embers, a bone in the decor, "your own turn is audible" |
| **M** | 2–4 files, one negative test, one measurement | 3 | castle ×2, the city opens on click, the quest book |
| **L** | a new owner of state or a new display phase; needs a browser measurement | 5 | the hero's step across tiles, the day log from state, the battle result screen |
| **XL** | touches the game's norms or several zones; needs a series of runs over seeds | 8 | pacing + generator density + XP curve, music from scratch |

## Batch budget: 15–20 weights, and no more than one XL

The sum of weights is counted, not the number of cards. Measured on 11 August over the delivered batches:

| batch | contents | weight | outcome |
|---|---|---:|---|
| debt: duplication | 8 cards XS…M | ~18 | closed calmly |
| sound and contrast | 5 cards S…L | ~15 | closed, 156k tokens |
| battle: display | M+M+L | ~11 | closed easily |
| map: input | M+M+L | ~11 | closed easily |
| pacing and XP | XL+XL+M | ~19 | closed at the limit, 82k+, longest of all |
| instruments | 6 cards, almost all L | ~25 | **DIED** at 232k tokens, 2 % before compaction |

Hence the owner's rule: **a batch is 15–20 weights.** Twenty is taken when the cards are light on measurements (XS, S, M): eighteen weights out of eight small cards went through calmly. And stricter than the number itself: **no more than one XL and no more than two L per batch**: what eats the context is not the cards but the measurements inside them. The instruments batch failed at 25 weights not because it had six cards but because almost every one needed gate runs and screenshot capture.

In one line: **20 weights of XS/S/M is fine; 20 weights of L and XL is not.**

**What binds is the number of MEASUREMENTS, not the sum of weights.** More than two measuring cards: split the batch, even if there are fewer than fifteen weights. On 11 August the remainder of the queue was only 16 weights over five cards, but they held four measurements (a seed series, a series of screenshot runs, an offline audio render, gate wall time under load), and that is exactly the composition that killed the instruments batch. Handed it out as two batches of 8 weights and told the owner why I stepped back from their boundary: the boundary is about weight, but batches die of measurements.

**Do not hand out without reading the queue on every unmerged branch.** The open cards at the tip of the integration branch are not the whole truth: work also lives on branches not yet merged into it. That is how I handed out a duplicate batch of 8 weights (19.3k tokens, withdrawn after five minutes): all three of its cards were already closed on a branch whose work I had committed myself the day before. I did follow my own rule "the disk beats the spec", but looked at the wrong disk.

**The sign that a batch was too big comes from the worker:** `% until auto-compact` appears in the tail. That is not "it could not cope" but "I gave too much"; the work is committed immediately (the Producer commits it personally if the worker did not manage to), and the remainder goes as the next batch.

## Batch sizes: an owner's directive, in numbers

| stage | size of one batch | how many in parallel | model |
|---|---|---|---|
| development | **15–20 weights of one zone**, no more than one XL and two L | by the number of zones, 6–10 | opus 5.5 (code and interface) |
| integration | **all ready branches into one** | **1** | the Producer, by hand (§4) |
| playtest | **one scripted scenario and client count per worker** | **2 until the load is measured, then by Chromium count** | haiku 4.5 drives; the friend group, or one sonnet 5 scenario, judges |
| fixing playtest bugs | **ALL bugs of one zone at once**, however many | 4–6 | opus 5.5 |
| debt and ideas | **15–20 weights**, grouped by meaning; XS and S can be many | 2–3 | opus 5.5 / sonnet 5 |

**An owner's directive: make the sizes BIGGER.** When in doubt between "split into two batches" and "hand out as one", hand out as one, until the sum of weights passes 20. There is one limit, the worker's context, and it shows itself (`% until auto-compact` in the tail). Until it shows, the batch is small.

The measurement this stands on: a batch of eight debt cards closed in one pass and one gate run; a batch of three cards cost exactly the same start-up expense. **The cost of a start does not depend on the size of the batch, so the batch must be big.**

**Never one card at a time.** Not in development, not in bug fixing. The only stage where "one" applies is integration: it is one by construction.

**Before launching playtests, clean up.** An owner's directive. Close the terminals of lingering workers, remove merged worktrees and branches, check that `git status --short` is empty in every worktree being removed. The reason is not tidiness for its own sake: browser playtests each bring up their own vite, Chromium and three to eight clients, and if ten dead terminals with half-killed processes are hanging around, the playtests fail on a busy port and on load: exactly the way `shots` already failed on a timeout. Cleanup takes a minute and removes a whole class of false failures.

```
# lingering terminals: everything not bound to a live worker
orca terminal list --json     # against worker-list --json (dispatchStatus == dispatched)
# merged worktrees and branches
git worktree list; git branch --merged $TRUNK   # lists trunk's own ancestors too (main here): delete by explicit name with -d, never main or develop
```

**Playtests are driven by `claude-haiku-4-5` and judged elsewhere**: an owner's decision from 24 September 2026. Haiku, the cheapest model on the shared window, drives the headless test clients (`GAME.md`, `$HEADLESS_GAMES_CMD`) through a scripted scenario and reports numbers; the question "is it fun, is losing fair" is answered by the friend group at the milestone playtest (`GAME.md`), or by one Sonnet 5 scenario when the Producer asks for it. Acceptance by play is still the only stage that caught what no green test saw. In the pilot, on a cheap model with a window of its own, five passes cost about one opus worker; here every playtest also brings up vite, a Chromium and three to eight clients, so two run in parallel until the load and the spend under a wave are measured (`usage-snapshot.sh`, `PORTING.md`).

Every playtest gets **its own scenario and client count**, otherwise two workers find the same bug. The pilot's cut (the first ten minutes with no explanations; a playthrough to the ending; a battle to the result screen; the city; the map and the touch layout) is evidence that scenarios are cut by what the player does, not by the code. This game's cut is written together with the first headless clients: a round to the end at three and at eight players; a grab, the kennel and a rejoin; mines armed, sniffed and defused; a fish carried out under chase.

**Bugs from playtests come back in batches by zone, not one at a time.** Playtests yield dozens of findings; handing them out one at a time is going back to nine starts per task. Group by zone (`src/ui/battle`, `src/ui/adventure`, `src/core`, …) and hand out one batch per zone.

# 5. The queue: `tasks/`

Work is taken from `tasks/open/` and from nowhere else. The prefix in the name: `NN-` (release, in order), `bug-` (broken, front of the queue), `debt-`, `idea-`, `later-`. **The game is done when there is not a single `NN-` and not a single `bug-`.**

`later-` is work the owner has postponed until the game is accepted. On 11 August all four publishing-platform tasks went there: until the game is complete and accepted by the owner, the platform is not touched at all.

Closed it: delete the file and add a line to `tasks/DONE.md`. Never silently delete someone else's request: a reason is mandatory.

**Every card has three sections**: DoD, acceptance criteria, test criteria, and **at least one criterion is observable game behaviour**. "Tests green" is not a criterion: it is satisfied by writing tests. The Producer fills these in at grooming, not the author of the request.

**When you set a threshold, set the current margin too.**

**Backlog grooming: once an hour**, and off-schedule: when the owner drops an order as a batch and before declaring readiness. Grooming checks whether the card is alive (with a command, not from memory), whether it is a duplicate, whether it has the three sections, whether the prefix is right. Grooming does not fix.

# 6. Speed and money

**All checks: no more than 3 minutes, ideally a minute.** If it grows, that is a cycle blocker.

**The model is pinned to the role by the owner's directive, not chosen by price:** code `claude-opus-5-5`, interface `claude-opus-5-5`, architecture `claude-fable-5-1`, acceptance `claude-haiku-4-5`; diff reading is the Producer's own session (`gamestudio/agents.md`). Effort is the one knob left: it is set per batch by the rule in `agents.md`, and on a BURNING verdict the Producer drops it one step before shrinking the wave, naming it in the ledger. Savings come from **fewer starts**, not from a weaker model: in the pilot, on 11 August, code from another provider's model did not satisfy the owner, and that decision is not revisited for the sake of limits. That is why the interface here runs on the same model as the code.

**There is one measure of efficiency: worker launches per closed task.** It was nine. The target is no more than two: the batch and the acceptance. Counted by `worker-list` against the lines in `DONE.md`.

**The wave is set by the remaining limit**, not by desire: look at the slope over the whole current window (`gamestudio/usage-snapshot.sh`), not at what is left at one moment.

# 7. Producer

Decides and passes verdicts; does not execute. Does not write production code, does not edit other people's tests, does not introduce instruments and rules instead of the game.

**The Orca status column is not evidence.** A worker can be `dispatched` and dead: the model withdrawn, the provider overloaded, the spec never arrived. The verdict comes from the terminal tail and from the numbers in the worktree.

**Every cycle, name the roles without tasks and why.** **A cycle ends with work running.**

Escalate to the owner only at a decision gate: whether the work is needed at all. A model being unavailable, and mechanics within the frame of `GAME.md`, are not gates; the weekly window at 100 % is one (extra usage or wait: the owner's money).
