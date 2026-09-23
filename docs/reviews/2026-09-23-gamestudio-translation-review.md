# gamestudio/ translation review, 2026-09-23

Scope: a full fidelity review of the English translation in [gamestudio/](../../gamestudio/README.md) against its Russian source, [studioigor/gamestudio](https://github.com/studioigor/gamestudio) at commit `bb9aef7` (14 August 2026): six documents, five role specs, four shell scripts, LICENSE and .gitignore. Six independent reviewers each took a file group (STUDIO.md; ORCA, START_PROMPT, agents, PORTING and README; the roles with LICENSE and .gitignore; the two script pairs; one cross-cutting pass for terminology, cross-references and structure). Every finding was checked against the source before anything changed. Mechanical checks on top: comment-stripped diffs of the scripts against the source, Python AST parity of the embedded blocks, `bash -n`, a run of all four scripts in a throwaway repository (Orca is installed on this machine, so `usage-snapshot.sh` read live limit windows), a Cyrillic grep, and heading, bullet and table-row parity per file.

## Verdict

Faithful. No rule, number, date, model name, command or path diverges from the source. No paragraph, bullet or table row is missing, and nothing is added beyond the translator's note at the top of README.md. The scripts' code is identical to the source outside comments and output strings, and the embedded Python parses and runs. The reviewers reported one HIGH item (a self-contradiction in the source that the translation resolved silently), twelve MEDIUM items (terminology drift and three sentences whose English could be read the wrong way) and about forty LOW items (clarity). Everything with more than 90 % confidence was applied; the judgment calls are listed with their reasons.

## Findings fixed

| # | Finding | Files |
| - | ------- | ----- |
| 1 | «полная череда» was "the full run" in four places and "the full gate run" elsewhere, and bare "run" collided with «партия» (a playthrough). Now "the full gate run" or "gate run" everywhere, and «партия» is "playthrough". | STUDIO.md, START_PROMPT.md, ui-diff-check.sh, roles/developer.md |
| 2 | «свести со стволом» read as "on the merged branch" and "IN THE BRANCH", which can mean a branch already merged into main. Now "the branch with trunk merged into it" and "INTO THE BRANCH". | STUDIO.md, START_PROMPT.md |
| 3 | «расход» was consumption, usage or spend depending on the file. Now "spend" throughout, and the usage-snapshot budget line prints "even spend" rather than a bare "even". | README.md, health-check.sh, usage-snapshot.sh |
| 4 | «предел» (the limitation of the estimation method) was "limit", which in that script means a rate limit. Now "limitation". | usage-snapshot.sh |
| 5 | "The subscription is one per person and studio" could be read as two subscriptions; the source says one shared by both. | usage-snapshot.sh |
| 6 | «число кадров» in the rule about over-prescriptive specs is screenshots, not animation frames. | START_PROMPT.md |
| 7 | «четыре MEDIUM интерфейса» became "four MEDIUM UI cards", which broke the sentence's own count of four orphaned tasks; now "the four MEDIUM UI findings". Likewise "the touch-layout HIGH finding" and "re-issued" for «поставил заново». | health-check.sh |
| 8 | «заводить» was "start" (a test is started, starting documents, starting a registry), which reads as "run". Now add, create or introduce. | roles/_common.md, roles/architect.md, roles/ui-developer.md, STUDIO.md |
| 9 | «счёт приборов» was "counting instruments", which parses two ways; now "the instrument count". | README.md, roles/developer.md, roles/ui-developer.md |
| 10 | «плечо» (a lever-arm metaphor for the measurement baseline) was "arm"; now "baseline", including the output line "no baseline, no verdict". | ORCA.md, usage-snapshot.sh |
| 11 | «по итогу смены» was "at the end of the shift" (timing only); now "based on the results of the shift". | STUDIO.md, agents.md |
| 12 | «обвязка» was "scaffolding", which suggests generated boilerplate; now "harness code". | work-check.sh |
| 13 | Clarity, applied as suggested: "its sample" → "its selection of tests"; "finding registries" → "registries of findings"; "go as a five" → "run five at a time" / "run five in parallel"; "Grew: cycle blocker." → "If it grows, that is a cycle blocker."; "To the owner:" → "Escalate to the owner"; "parsing the code" → "figuring out the code"; "would close" → "would be shut down"; "hours drift several times over" → "off by a factor of several"; "holds on to signs" → "anchored to signs"; "top of the integration" → "tip of the integration branch"; "a ready decision" → "a ready-made solution"; "completed a tail from memory" → "reconstructed the end of a handle"; "a quoted screenshot command" → "a capture command in backticks"; "it had been standing" → "the worker had been standing idle"; "it is standing and waiting" → "the worker is stalled, waiting"; the gate-lock sentence now says the first run must not measure the second; the Pilot sentence in the STUDIO.md header was untangled; "the owner of saves" → "the module that owns saves" and "own zone" → "files in the UI zone" in ui-diff-check.sh; "production 0, tests 128" → "prod 0, tests 128" to match the labels the script prints; the PORTING.md heading "must not be rewritten" → "needs no rewriting"; "measured again" → "earned again" in the README table; the README subtitle "for a team of AI agents" → "with a team of AI agents"; the table header "size" → "T-shirt size"; "the Producer read Cyrillic" → "the Producer personally read Cyrillic"; the README provenance line is now marked as a translator's note. | various |

## Judgment calls kept, and why

1. **The conflicts sentence in STUDIO.md §4.** Source: «Producer конфликты НЕ разрешает и скриптами их не снимает.» Literally: the Producer does NOT resolve conflicts and does not strip them with scripts. Twenty lines earlier the same section says «Producer конфликты разрешает ОБЪЕДИНЕНИЕМ и руками» (the Producer resolves conflicts by union and by hand), and the paragraph itself is entirely about script-based marker removal. The sentence looks like a leftover from the edition that still had an Integrator. The translation keeps the reading the section supports: "The Producer does NOT resolve conflicts by script and does not strip them with one." Revert to the literal wording if the author confirms the other meaning.
2. **«развёртки»** in roles/_common.md, in the list of throwaway artefacts that never go into a commit. The word is ambiguous (UV unwraps, unrolled sheets, parameter sweeps). Rendered "unwrap sheets" on the strength of the Blender MCP and "3D" in agents.md; the first translation, "dumps", was wrong.
3. **«перенос числа»** in STUDIO.md §3, in the list of changes that need no review: "a moved number" (relocating a constant) or "a number wrapping" (a layout event). Kept "a moved number".
4. **The LICENSE holder** «Студия Игор (studioigor)» is rendered "Studio Igor (studioigor)"; the GitHub handle identifies the party. Restore the Cyrillic name if a literal notice is preferred.
5. **The finding ID «Г-22»** is rendered "G-22"; it is a key in the pilot's own register, not ours.
6. **Placeholders inside code spans** are translated (`<ветка>` → `<branch>`, `# и пересечь` → `# then intersect`); commands, flags, paths and model names are not.
7. **One Cyrillic string remains**: «завтра +500» in ORCA.md, quoted in the anecdote about Cyrillic and Latin glyphs being indistinguishable at ×1. The anecdote needs it.
8. **Merged and split terms.** Where English has one word, the source's near-synonyms merge: проба and тест → test; страж, сторож and защита → guard; исполнитель and воркер → worker; приглашение and промпт → prompt. Where English distinguishes, one Russian word splits: дерево → worktree (a git worktree) or working tree (its state); журнал → log (in the game) or ledger (the usage file); разбор → grooming (the backlog), analysis or judging by sense.

## Inconsistencies inherited from the source

These exist in the Russian original too and were left as they are, because the folder is meant to port unchanged. They matter the moment the process is adapted:

- Section references to the older 934-line edition: §14a in health-check.sh, §9 rule 18 and §10.4 in usage-snapshot.sh. `gamestudio/BUDGET.md`, cited by usage-snapshot.sh, does not exist. ORCA.md points to a command in the "Cycle" section of START_PROMPT.md that is not there.
- The second and third bullets of ORCA.md are truncated mid-sentence.
- `.gitignore` says `snapshots/` is the instruments' output; both scripts write to `.studio/`.
- health-check.sh checks for uncommitted specs in `docs/plan`, while STUDIO.md §1 says specs live only in task cards.
- STUDIO.md §4 still names "the integrator" as the one who runs the full gate run, after deleting the role.
- STUDIO.md §4 puts the size on the first line of a card; START_PROMPT.md and roles/qa-tester.md put the zone first and the size second.
- ORCA.md wants hand-made worktrees under `orca/workspaces/<branch>`; agents.md and the health-check default use `.worktrees/`.
- README.md and PORTING.md list five `project.conf` keys; the files also read `PROD_FIND`, `STYLE_FIND`, `TEST_FIND`, `DOC_FIND`, `WORKTREES_DIR`, `PROD_EXT`, `OURS_RE`, `LOGICAL_BOX` and `SCALES`.

## Fit with this project

What has to change before the process can run for Not the Time for Fish. None of it is a translation matter, and none of it was changed:

1. `.studio/project.conf` and `.studio/zones.conf` do not exist. `$INSTALL_CMD`, `$GATES_CMD`, `$SHOTS_CMD`, `$HEADLESS_GAMES_CMD`, `ZONES` and the `*_FIND` commands can only be written once the stack from [ADR 0002](../adr/0002-browser-only-three-js-stack.md) has a package.json. [GAME.md](../../GAME.md) already plans headless test clients, which is what `$HEADLESS_GAMES_CMD` and the QA role need.
2. Document locations disagree. The Architect role files ADRs in `docs/decisions/`; this repo keeps them in `docs/adr/`. STUDIO.md §1 lets only `docs/design`, `docs/ui` and `docs/RULES.md` live; this repo relies on CONTEXT.md, `docs/adr/` and `docs/reviews/`. Decide which wins and edit the copy.
3. The `tasks/` queue (`tasks/open/`, `tasks/DONE.md`, the NN-, bug-, debt-, idea- and later- prefixes) does not exist yet.
4. Provider and model pinning in agents.md and in the role front matter (`gpt-5.6-sol`, `gpt-5.6-luna`, `claude-fable-5`, `kimi-code/k3`) is the pilot's subscription. Orca is installed on this machine and `usage-snapshot.sh` already reads its claude windows; codex and kimi availability is unverified.
5. The UI Developer rule measures layout margin "for EN" as the worst case. This game ships a Ukrainian UI (Beta milestone), so the worst-case locale must be re-measured, exactly as PORTING.md says for every number.
6. `LOGICAL_BOX` and `SCALES` assume a fixed logical resolution with integer scale steps, a 2D pixel-game notion. A Three.js scene has no such thing, so the icon-legibility and touch-target rules need a different yardstick.
7. Acceptance by play assumes one QA worker can play the game alone. This game needs three or more clients in a room, so a playtest scenario needs headless clients or several workers in one room.
8. The scripts write `.studio/health.jsonl` and `.studio/usage.jsonl` in the project root. There is no root `.gitignore` yet, so they would appear as untracked files.

## Appendix: translation glossary

The choices used throughout the folder. Keep them when editing.

| Russian | English | Note |
| ------- | ------- | ---- |
| воркер, исполнитель | worker | |
| круг | cycle | «итерация» stays "iteration" |
| пачка | batch | |
| карточка | card | |
| зона | zone | |
| майка | T-shirt size | XS, S, M, L, XL |
| вес | weight | |
| ворота, полная череда | gates, the full gate run | |
| стена | wall time | |
| ствол | trunk | the `main` branch |
| посадка, посадить | landing, land | |
| свести со стволом | merge trunk into the branch | |
| дерево | worktree, working tree | by sense |
| приборы | instruments | the scripts, and test rigs |
| проба, тест | test | «отрицательная проба» is "negative test" |
| страж, сторож | guard | a regression guard test |
| стенд | rig | |
| приёмка игрой | acceptance by play | |
| плейтест | playtest | |
| находка | finding | |
| спека | spec | |
| владелец | owner | the human owner; pronouns they/them |
| владелец факта | owner of a fact | a code module |
| указание, решение владельца | an owner's directive, decision | |
| замер | measurement | |
| кадры, съёмка | screenshots, capture | animation frames stay "frames" |
| раскладка | layout | |
| показ, время показа | display, display timing | |
| граница указателя | pointer boundary | |
| очередь событий | event queue | |
| сейв | save | |
| нормы игры | the game's norms | `docs/design` |
| тач-цель, тач-раскладка | touch target, touch layout | |
| растр | raster images | |
| значок | icon | |
| заглушка | placeholder | |
| ступень | step | a scale step: ×1, ×3 |
| партия | playthrough | |
| сид | seed | |
| журнал | log, ledger | in-game log; usage ledger |
| окно | window | a rate-limit window |
| волна | wave | |
| провайдер | provider | |
| п.п. | pp | percentage points |
| ровный расход, вилка | even spend, band | |
| ГОРИМ, НЕДОБИРАЕМ, в вилке | BURNING, UNDERSPENDING, within the band | |
| чужой расход | foreign spend | scripts; "someone else's" in prose |
| хвост | tail | of a terminal |
| приглашение, промпт | prompt | |
| поле ввода | input field | |
| письмо | letter | a message to a worker |
| блокирующий вопрос | blocking question | |
| осевшие воркеры | lingering workers | |
| разбор бэклога | backlog grooming | |
| долг | debt | |
| быстрый набор | the quick set | the short gate subset |
| Пилот | Pilot | the pilot project |
