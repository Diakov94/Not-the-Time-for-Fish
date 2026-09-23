# CLAUDE.md

Working rules for every agent in this repository: the workers the Producer launches through Orca, the Producer, and any Claude Code session here. Adapted from Andrej Karpathy's guidelines for reducing common LLM coding mistakes. What to build comes from `GAME.md`; how the studio works comes from `gamestudio/STUDIO.md` and the roles in `gamestudio/roles/`. Two places where Karpathy's text and the studio disagree are resolved in the studio's favour and marked *Studio*.

**Tradeoff:** these guidelines bias toward caution over speed. For trivial tasks, use judgment.

## 1. Think before coding

**Don't assume. Don't hide confusion. Surface tradeoffs.**

Before implementing:

- State your assumptions explicitly, and put them in the report.
- If multiple interpretations exist, present them; don't pick silently.
- If a simpler approach exists, say so. Push back when warranted.
- If something is unclear, name what is confusing.

*Studio:* a blocking question stalls the worker until the Producer's next cycle. Ask through `orchestration ask` only when the card and the spec diverge (the card has the authority) or when two readings lead to materially different work. Otherwise state the assumption in the report and proceed: the mechanism is the worker's choice.

## 2. Simplicity first

**Minimum code that solves the problem. Nothing speculative.**

- No features beyond what was asked.
- No abstractions for single-use code.
- No "flexibility" or "configurability" that wasn't requested.
- No error handling for impossible scenarios.
- If you write 200 lines and it could be 50, rewrite it.

Ask yourself: "Would a senior engineer say this is overcomplicated?" If yes, simplify. The studio's measure is instrument lines per game line (`gamestudio/roles/_common.md`).

## 3. Surgical changes

**Touch only what you must. Clean up only your own mess.**

When editing existing code:

- Don't "improve" adjacent code, comments, or formatting.
- Don't refactor things that aren't broken.
- Match existing style, even if you'd do it differently.
- If you notice unrelated dead code, mention it in the report; don't delete it.

When your changes create orphans:

- Remove imports, variables and functions that YOUR changes made unused.
- Don't remove pre-existing dead code unless asked.

The test: every changed line should trace directly to the card. The spec's boundaries ("do not touch the rules") are checked by command, not by promise.

## 4. Goal-driven execution

**Define success criteria. Loop until verified.**

Transform tasks into verifiable goals:

- "Fix the bug" → "Write a test that reproduces it and goes red with the fix removed, then make it pass."
- "Refactor X" → "Run the gates before and after; the numbers that describe behaviour do not move."
- "Make it clearer, louder, bigger" → "Name the before → after number."

*Studio:* a test is added only for a critical scenario or a found bug, and it must go red without the fix; a test that feeds itself the thing it checks is not evidence. Everything else is proven by a measurement, not by a test.

For multi-step tasks, state a brief plan:

```
1. [Step] → verify: [check]
2. [Step] → verify: [check]
3. [Step] → verify: [check]
```

Strong success criteria let you loop independently. Weak criteria ("make it work") require constant clarification.

---

**These guidelines are working if:** fewer unnecessary changes in diffs, fewer rewrites due to overcomplication, and clarifying questions come before implementation rather than after mistakes.
