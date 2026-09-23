# Models

One provider, `claude` (Claude Code launched through Orca), on one subscription. The pilot also ran `codex` and `kimi`; its anecdotes about them (`ORCA.md`, `STUDIO.md`) stay as evidence, and nothing here is launched on them.

| model | used for | notes |
|---|---|---|
| `claude-fable-5-1` | architecture | its own weekly window; when its credits run out, `claude-opus-5-5` at the same effort |
| `claude-opus-5-5` | code, the interface, review, 3D | its default effort is `medium`, one step below Opus 5: `--effort` is always passed |
| `claude-sonnet-5` | bulk work | |
| `claude-haiku-4-5` | trivial work and playtests | the cheapest on the shared window; it has no effort levels, so `--effort` is not passed |

Every model can use MCP (blender, elevenlabs) and the Orca browser. **None of them generates raster images.** Icons and assets are vector or procedural (SVG, CSS, geometry rendered by the engine), which is how `GAME.md` plans the art anyway (sketches → procedural skeleton → AI detail); a card that needs a raster file goes back to the owner as an asset card, not to a worker.

**Windows.** One subscription, three windows in `orca account list --json`: `session` (5 h), `weekly` (Opus, Sonnet and Haiku share it) and `fableWeekly` (Fable alone). *This machine, 24 September 2026:* session 22 %, weekly 9 %, Fable weekly 16 %. So Fable's window is for the Architect, not for a spare developer, and the wave is set by the shared weekly window; `usage-snapshot.sh` reads all three.

**The `claude` binary on PATH must be newer than the model.** `400 Claude Code X does not support this model; version Y or newer is required` means the worker is `dispatched` and dead, not that the model was withdrawn: `claude update`, then repeat the launch. *This machine, 24 September 2026:* 2.1.221 refused `claude-opus-5-5` (needs 2.1.280) and `claude-fable-5-1` (needs 2.1.251) while Opus 5, Fable 5, Sonnet 5 and Haiku 4.5 answered; after `claude update` to 2.1.281 all six answered. The desktop app carries its own newer copy; Orca launches the one at `~/.local/bin/claude`.

## How to launch

```
orca orchestration task-create --spec "<spec>" --task-title "<...>" --display-name "<...>" --json
orca orchestration worker-start --task <FULL id from the task-create response> \
  --worktree "<Orca project id>::<root>/.worktrees/<name>" \
  --agent claude --model claude-opus-5-5 --effort xhigh --json
```

`<Orca project id>` is the UUID of the registered project; it is taken once from `orca worktree list` (or `orca project list`) and then substituted into every launch.

Take the task **by the id from the `task-create` response**, not by searching for `display_name`: names repeat across run generations, and a match gives `selector_not_found` on a live task.

After `git worktree add` Orca registers the worktree with a delay: the first `worker-start` may answer `selector_not_found`; repeat rather than creating the worktree again.

**A "done" report does not mean "committed".** Before removing a worktree: is `git -C <worktree> status --short` empty? `git -C <worktree> log --oneline -2`: is the tip the worker's commit and not the Producer's spec? If the work is not committed, save it yourself, naming in the message whose it is.

## Roles and who holds them

| role | model | why this one |
|---|---|---|
| Developer | `claude-opus-5-5`, effort `xhigh` | code and the game's rules |
| UI Developer | `claude-opus-5-5`, effort `high` | the interface and the vector assets; a card that reaches into the rules goes to the Developer even so |
| QA / Tester | `claude-haiku-4-5` | the browser and the game; the cheapest model on the shared window, and five playtests are needed at once |
| Architect | `claude-fable-5-1`, effort `xhigh` | decisions; its own window; when short on Fable credits, `claude-opus-5-5` |

**The Integrator and Code Reviewer roles no longer exist**: an owner's decision from 11 August 2026, based on the results of the shift. Merging and reading the diff are done by the Producer personally (§4 of `STUDIO.md`, where the review checklist has been moved). The reason, in numbers: both roles stood idle for the whole project, while the Producer in one shift landed eight branches on trunk with the full gate run before each landing. The Integrator could not complete a merge at all anyway: trunk is checked out in the Producer's worktree, and git does not let another worker switch to a busy branch.

**An owner's directive, in force:** the UI Developer is given the interface only, and a card that reaches into the game's rules goes to the Developer even if it looks like interface. In the pilot the reason was the model: the silent refusal in the city was fixed by opus, and the layout of the same panel by `gpt-5.6-sol`, whose code the owner did not trust. Here both roles run on the same model, and the reason is that every fact has one owner: the rules zone is the Developer's, so logic outside the UI zone in a UI delivery is read by eye before merging (§3 and §4 of `STUDIO.md`).

## Three launch failures that cost time every day

1. **The spec is not delivered**: roughly every third launch. The sign: the input field shows the default hint or `[Pasted text …]`, and there are no traces of work. Cured by `terminal send --enter --text ""`; the sign of success is a spinner appearing, not the fact that bytes were sent.
2. **`selector_not_found` on a fresh worktree**: Orca registers it with a delay, and the retry must be done SEVERAL times: on 11 August the launch went through on the fourth attempt within two minutes, while `orca worktree list` was already printing the worktree and the task sat in `ready`. Recreate neither the worktree nor the task.
3. **A bare prompt in the `worker-read` tail is NOT a sign of idleness.** The tail returns a stale slice. Judge by `orca terminal list`: a derived task title instead of the name + a spinner = the worker is reading the spec and working. A needless Enter goes into a working agent as an empty message.
