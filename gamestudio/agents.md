# Providers

| `--agent` | models | can do | known failure |
|---|---|---|---|
| `codex` | `gpt-5.6-sol` (frontier), `gpt-5.6-terra`, `gpt-5.6-luna` (cheap, `effort` up to `high`) | raster images via `image_gen`, built-in browser, `computer-use`, MCP | `400 … not supported when using Codex with a ChatGPT account` is a **lapsed subscription**, not a withdrawn model: look at `codex debug models` and tell the owner. `Selected model is at capacity`: take the neighbouring model |
| `claude` | `claude-opus-5` (code, review, 3D), `claude-sonnet-5` (bulk work), `claude-haiku-4-5` (trivial) | MCP blender and elevenlabs, the Orca browser. **Does not generate raster images** | the spec is pasted into the prompt and not sent: the sign is `[Pasted text #N +M lines]` before an empty prompt, cured by one Enter |
| `kimi` | `kimi-code/k3` | **code and tests only**: no raster, no browser, no MCP. Its own limit window | `--model` and `--effort` are rejected; the spec does not arrive, send it as text into the terminal |

**Only `codex` can do raster images.** A role that needs images must be there.

## How to launch

```
orca orchestration task-create --spec "<spec>" --task-title "<...>" --display-name "<...>" --json
orca orchestration worker-start --task <FULL id from the task-create response> \
  --worktree "<Orca project id>::<root>/.worktrees/<name>" \
  --agent codex --model gpt-5.6-sol --effort high --json
```

`<Orca project id>` is the UUID of the registered project; it is taken once from `orca worktree list` (or `orca project list`) and then substituted into every launch.

Take the task **by the id from the `task-create` response**, not by searching for `display_name`: names repeat across run generations, and a match gives `selector_not_found` on a live task.

After `git worktree add` Orca registers the worktree with a delay: the first `worker-start` may answer `selector_not_found`; repeat rather than creating the worktree again.

**A "done" report does not mean "committed".** Before removing a worktree: is `git -C <worktree> status --short` empty? `git -C <worktree> log --oneline -2`: is the tip the worker's commit and not the Producer's spec? If the work is not committed, save it yourself, naming in the message whose it is.

## Roles and who holds them, after 11 August 2026

| role | provider | why this one |
|---|---|---|
| Developer | `claude` / `claude-opus-5` | code and the game's rules |
| UI Developer | `codex` / `gpt-5.6-sol` | the interface AND RASTER IMAGES: only codex can generate icons |
| QA / Tester | `codex` / `gpt-5.6-luna` | browser and game; cheap, and five playtests are needed at once |
| Architect | `claude` / `claude-fable-5` | decisions; when short on credits, `claude-opus-5` |

**The Integrator and Code Reviewer roles no longer exist**: an owner's decision from 11 August 2026, based on the results of the shift. Merging and reading the diff are done by the Producer personally (§4 of `STUDIO.md`, where the review checklist has been moved). The reason, in numbers: both roles stood idle for the whole project, while the Producer in one shift landed eight branches on trunk with the full gate run before each landing. The Integrator could not complete a merge at all anyway: trunk is checked out in the Producer's worktree, and git does not let another worker switch to a busy branch.

**An owner's directive, in force:** do not trust code from the UI provider; it is given the interface only. So a card that reaches into the game's rules goes to opus even if it looks like interface: the silent refusal in the city was fixed by opus, and the layout of the same panel by sol.

**The irreplaceable provider is spent last.** Only codex can do raster images and the browser; if its window is running out, first give it what nobody else can do.

## Three launch failures that cost time every day

1. **The spec is not delivered**: roughly every third launch. The sign: the input field shows the default hint or `[Pasted text …]`, and there are no traces of work. Cured by `terminal send --enter --text ""`; the sign of success is a spinner appearing, not the fact that bytes were sent.
2. **`selector_not_found` on a fresh worktree**: Orca registers it with a delay, and the retry must be done SEVERAL times: on 11 August the launch went through on the fourth attempt within two minutes, while `orca worktree list` was already printing the worktree and the task sat in `ready`. Recreate neither the worktree nor the task.
3. **A bare prompt in the `worker-read` tail is NOT a sign of idleness.** The tail returns a stale slice. Judge by `orca terminal list`: a derived task title instead of the name + a spinner = the worker is reading the spec and working. A needless Enter goes into a working agent as an empty message.
