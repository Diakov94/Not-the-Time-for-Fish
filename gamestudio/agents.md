# Models

One provider, `claude` (Claude Code launched through Orca), on one subscription.

| model | used for | notes |
|---|---|---|
| `claude-fable-5-1` | the Architect and the Producer | its own weekly window (`fableWeekly`); the Architect launches on it only while that window is above the 15 % reserve, otherwise on `claude-opus-5-5` at the same effort |
| `claude-opus-5-5` | code and the interface: the Developer and the UI Developer | Claude Code's default effort is not printed by `claude --help` and differs from the API's, so `--effort` is always passed |
| `claude-sonnet-5` | debt batches of XS and S cards, in the Developer role | effort `high` |
| `claude-haiku-4-5` | playtests and trivial work | the cheapest on the shared window; it has no effort levels, so `--effort` is not passed |

Every model can use MCP (blender, elevenlabs) and the Orca browser. **No worker generates raster with an image model.** Raster produced by code is a worker's job: procedural textures, canvas-rendered sprites, Blender MCP renders, with the script as the source and the file as a build artefact. Icons and UI assets are vector or procedural (SVG, CSS, engine geometry). Raster that only an image model could make is outside the art direction (`GAME.md`, the owner's decision of 24 September 2026): a card that seems to need it is a question for the owner, not a worker's job.

**Effort is set per batch, not per role.** Developer: `xhigh` when the batch holds an L or XL card or touches a shared owner (state, display timing, the pointer boundary, the event queue, the save); `high` otherwise, playtest-bug batches included. UI Developer: `high`: layout and looks, not rules. Architect: `xhigh`. `max` is not used. On a BURNING verdict from `usage-snapshot.sh` the Producer drops the wave's effort one step before shrinking the wave, and names it in the ledger. `--retry-of` does not carry the effort over: pass it again.

**Windows.** One subscription, three windows in `orca account list --json`: `session` (5 h), `weekly` (Opus, Sonnet and Haiku share it) and `fableWeekly` (Fable alone). *This machine, 24 September 2026:* all three reported `usedPercent`, all with headroom. The session window is the one that binds a wave: every worker AND the Producer draw on it, and it fills in hours, not days. `usage-snapshot.sh` reads all three; the launch and runway rules are in "Limits" of `START_PROMPT.md`.

**The `claude` binary on PATH must be newer than the model.** `400 Claude Code X does not support this model; version Y or newer is required` means the worker is `dispatched` and dead, not that the model was withdrawn. *This machine, 24 September 2026:* 2.1.221 refused `claude-opus-5-5` (needs 2.1.280) and `claude-fable-5-1` (needs 2.1.251) while Opus 5, Fable 5, Sonnet 5 and Haiku 4.5 answered; after `claude update` to 2.1.281 all six answered. The rules: the Producer runs `claude update` BETWEEN waves, never under a running one, then probes every pinned model with `claude -p "Reply with exactly: OK" --model <id>`; running workers keep the binary they started with (the updater keeps old versions on disk) and only new launches pick up the new one; `health-check.sh` prints which `claude` is on PATH with its version and flags a worker whose tail holds the 400. A second, stale copy lives at `~/.nvm/versions/node/*/bin/claude` (2.1.156): if a launch answers with the 400 right after an update, that is the one that ran.

## How to launch

```
orca orchestration task-create --spec "<spec>" --task-title "<...>" --display-name "<...>" --json
orca orchestration worker-start --task <FULL id from the task-create response> \
  --worktree "<Orca project id>::<root>/.worktrees/<name>" \
  --agent claude --model claude-opus-5-5 --effort xhigh --json   # no --effort for claude-haiku-4-5
```

`<Orca project id>` is the UUID of the registered project; it is taken once from `orca worktree list` (or `orca project list`) and then substituted into every launch.

Take the task **by the id from the `task-create` response**, not by searching for `display_name`: names repeat across run generations, and a match gives `selector_not_found` on a live task.

After `git worktree add` Orca registers the worktree with a delay: the first `worker-start` may answer `selector_not_found`; repeat rather than creating the worktree again.

**A "done" report does not mean "committed".** Before removing a worktree: is `git -C <worktree> status --short` empty? `git -C <worktree> log --oneline -2`: is the tip the worker's commit and not the Producer's spec? If the work is not committed, save it yourself, naming in the message whose it is.

## Roles and who holds them

| role | model | why this one |
|---|---|---|
| Producer | `claude-fable-5-1`, effort `high` | decides, merges, reads diffs; on the Fable window, which the developers' wave does not touch. Its spend is ours: an interval with no workers but a live Producer is not foreign spend in the ledger |
| Developer | `claude-opus-5-5`, effort per batch (`xhigh` / `high`) | code and the game's rules: state, sync, colliders, physics |
| UI Developer | `claude-opus-5-5`, effort `high` | the look and layout and the vector assets; a card that reaches into the rules goes to the Developer even so |
| QA / Tester | `claude-haiku-4-5` | drives the headless test clients through scripted scenarios and reports numbers; the cheapest model on the shared window. The judge of "fun and fair" is the friend group at the milestone playtest, or one Sonnet 5 scenario |
| Architect | `claude-fable-5-1`, effort `xhigh` | decisions; its own window; below the 15 % reserve on `fableWeekly`, `claude-opus-5-5` |

**The Integrator and Code Reviewer roles no longer exist**: an owner's decision from 11 August 2026, based on the results of the shift. Merging and reading the diff are done by the Producer personally (§4 of `STUDIO.md`, where the review checklist has been moved). The reason, in numbers: both roles stood idle for the whole project, while the Producer in one shift landed eight branches on trunk with the full gate run before each landing. The Integrator could not complete a merge at all anyway: trunk is checked out in the Producer's worktree, and git does not let another worker switch to a busy branch.

**An owner's directive, in force:** the UI Developer is given the interface only, and a card that reaches into the game's rules goes to the Developer even if it looks like interface. In the pilot the reason was the model: the silent refusal in the city was fixed by opus, and the layout of the same panel by another provider's model, whose code the owner did not trust. Here both roles run on the same model, and the reason is that every fact has one owner: the rules zone is the Developer's, so logic outside the UI zone in a UI delivery is read by eye before merging (§3 and §4 of `STUDIO.md`).

## Three launch failures that cost time every day

1. **The spec is not delivered**: roughly every third launch. The sign: the input field shows the default hint or `[Pasted text …]`, and there are no traces of work. Cured by `terminal send --enter --text ""`; the sign of success is a spinner appearing, not the fact that bytes were sent.
2. **`selector_not_found` on a fresh worktree**: Orca registers it with a delay, and the retry must be done SEVERAL times: on 11 August the launch went through on the fourth attempt within two minutes, while `orca worktree list` was already printing the worktree and the task sat in `ready`. Recreate neither the worktree nor the task.
3. **A bare prompt in the `worker-read` tail is NOT a sign of idleness.** The tail returns a stale slice. Judge by `orca terminal list`: a derived task title instead of the name + a spinner = the worker is reading the spec and working. A needless Enter goes into a working agent as an empty message.
