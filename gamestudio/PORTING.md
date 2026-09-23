# Porting the studio to another project

`gamestudio/` is copied whole and knows nothing about the engine. Everything that depends on the stack lives in the project files below, not here.

## What to fill in

| file | what is in it |
|---|---|
| `.studio/project.conf` | the install command, the gates command, the screenshot command, source zones, the logical screen size, the worst-case locale, the trunk branch (`TRUNK`; without it the instruments take the remote's default branch, then `main`) |
| `.studio/zones.conf` | what counts as logic and what counts as the UI zone (for `ui-diff-check.sh`) |
| `GAME.md` | the game itself: what we make, for whom, what we do not make. Always stays the project's own |
| `CLAUDE.md` | the working rules every Claude Code worker loads by itself: assumptions first, simplicity, surgical changes, verifiable goals. Copied, not filled in; the two points where it yields to `STUDIO.md` are marked inside it |

`.studio/project.conf` and `zones.conf` are code: written by the owner, never by a worker, and committed like code (the orchestrator's project id in the profile is a local identifier, not a secret). The instruments' ledgers, `.studio/*.jsonl`, are kept out of git by the root `.gitignore`.

`ui-diff-check.sh` can manage without `zones.conf` too: it recognises web/TS by `package.json`, Unity by `ProjectSettings/`, Godot by `project.godot`. The config is needed when the layout is non-standard.

## What must not be in `gamestudio/`

- names of stack commands (`npm`, `dotnet`, `godot`): only `$GATES_CMD` and its neighbours from the profile;
- paths like `src/ui/**`: only zones from `ZONES`;
- file extensions: only `LOGIC_GLOBS` / `UI_GLOBS`.

## What ports AS IS and needs no rewriting

The rules and the figures they were earned with. The numbers are tied to a project and a date: they are not "our metrics" but **evidence that the rule was not invented**. Example: "nine worker starts per task" stands next to the rule about big batches precisely so that the next Producer does not start slicing again.

Take the numbers away and only slogans remain, and the rules stop working within a week. So in a new project the old measurements **stay, marked with whose they are**, and your own appear next to them.

## What has to be earned again

Three things depend on the machine and the stack, and other people's numbers lie here:

1. **The gate wall time** and how many gate runs can go concurrently;
2. **The load correction**: how many times slower a test runs under a wave of workers;
3. **The spend rate of the provider's windows**: it depends on the size of the code and the length of the cycle.

Until your own first measurements, these thresholds are not assigned but observed.
