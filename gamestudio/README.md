# Studio Igor

A process for developing a game with a team of AI agents.

> Translator's note: this is an English translation of [studioigor/gamestudio](https://github.com/studioigor/gamestudio) (commit `bb9aef7`, 14 August 2026). The numbers and dates below were measured on that project's pilot game, not on this one.

This is not a framework and not a library. It is a **production process**: the rules, roles and instruments by which one human coordinator and several parallel AI workers make a game, rather than documents about how to make a game.

Everything here was earned through mistakes and confirmed by measurement. Every rule sits next to its price: a number, a date and a short description of the failure that produced it. Take the numbers away and only slogans remain, and the rules stop working within a week.

## Where the numbers come from

The process was proven on a game the texts call **Pilot** (web, TypeScript). The specific paths, file names and models in the examples belong to it and are given as EVIDENCE, not as a template: on another engine they change, the rule does not.

The tidying went like this:

| before | after |
|---|---|
| 934 lines of rules, read by every worker every cycle | 400 lines, read once |
| 454 worker launches for 50 closed tasks: **nine starts per task** | 22 cards in **12 launches** |
| four checking stages on every change | checking by risk: review where the failure class lives |
| 2111 files touched in `docs/` against 1685 in `src/` | no documents: the spec dies with its card |

## The three rules everything else serves

1. **Big batches and broad strokes.** One zone and 15–20 weights per worker, not a card per worker. The cost of a start does not depend on the size of the batch, so the batch must be big.
2. **Checking by risk, not by ritual.** Review is mandatory where a change touches a shared owner of a fact: state, display timing, the pointer boundary, the event queue, the save. Layout, colour and text need none.
3. **We make a game, not instruments and not rules about rules.** Process work reproduces itself; a finding with no effect the player can observe waits in the queue instead of spawning a subsystem.

## What is inside

| file | who reads it | about |
|---|---|---|
| `STUDIO.md` | everyone | the working rules: batches, checking, merging, the queue, speed and money |
| `START_PROMPT.md` | Producer | the coordinator's start prompt: the cycle, a worker's signs of life, how to set a task |
| `agents.md` | Producer | providers, models, who holds which role, and the three launch failures |
| `ORCA.md` | Producer | orchestrator pitfalls, each of which has already cost time |
| `PORTING.md` | whoever ports it | what to fill in for a new project and what has to be earned again |
| `roles/_common.md` | all roles | the shared part of every spec: commit, checking, the instrument count, one owner per fact |
| `roles/*.md` | worker | Developer, UI Developer, QA / Tester, Architect: what each owns, what is forbidden, how it proves its work |

The instruments are four shell scripts. Each answers one question that the coordinator would otherwise answer by guessing:

| script | question |
|---|---|
| `health-check.sh` | whose load is this and how old is it; is there work without a worker |
| `work-check.sh` | how many lines a worker added and WHERE, by file class |
| `ui-diff-check.sh` | what in a UI role's delivery must be read by eye before merging |
| `usage-snapshot.sh` | the slope of limit spend over the whole current window, not what is left at one moment |

## How to port it to your project

The folder is copied whole and knows nothing about the engine. Everything that depends on the stack lives **outside** it, in two project files:

- `.studio/project.conf`: the install command, the gates command, the screenshot command, source zones, the logical screen size;
- `.studio/zones.conf`: what counts as logic and what counts as the UI zone (for `ui-diff-check.sh`);
- `GAME.md` in the project root: the game itself: what we make, for whom, what we do not make.

The details, and the list of what has to be measured again on your own machine, are in `PORTING.md`.

## Orchestrator

The process is written for launching workers through Orca (`orca orchestration task-create` / `worker-start`) with the providers `claude`, `codex` and `kimi`. The rules about batches, checking and the owner of a fact do not depend on the orchestrator; only `ORCA.md` and the launch commands in `agents.md` do.

## License

MIT, see `LICENSE`. Take it and port it; the numbers are vouched for only by the project they were measured on.
