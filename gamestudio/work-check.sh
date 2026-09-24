#!/usr/bin/env bash
# The production-code extensions come from `.studio/project.conf` (PROD_EXT);
# otherwise the defaults below apply: the instrument ports between engines
# together with the folder.
# How many lines a worker added and WHERE, by file class.
#
# WHY. On a big project the typical failure looks like this: the worker is
# alive, the heartbeat goes on, there are commits, the report is upbeat, and
# there is no change to production code at all. It writes and runs tests, walks
# the code, "figures things out". From the Producer's side this is
# indistinguishable from work: both "six commits" and "clean tree" are true.
# One thing tells them apart: the numbers by file class.
#
# BOTH THE COMMITTED AND THE WORKING TREE ARE COUNTED. Otherwise a worker with
# no commits looks like a worker with no work, and those are different
# diagnoses: the first is reminded to commit, the second is asked what it is
# doing.
#
# Usage:
#   gamestudio/work-check.sh <path-to-worktree> [more paths…]
#   gamestudio/work-check.sh            # all child worktrees next to this one
set -uo pipefail

[ -f .studio/project.conf ] && . .studio/project.conf
# Trunk: from the profile (TRUNK), else the remote's default branch, else main.
TRUNK="${TRUNK:-$(git symbolic-ref --short refs/remotes/origin/HEAD 2>/dev/null | sed 's|^origin/||')}"
TRUNK="${TRUNK:-main}"

classify() {
  python3 -c '
import subprocess, sys, os

# Production-code extensions: from the project profile, otherwise the web/TS default.
PROD_EXT = tuple(
    e.strip() for e in os.environ.get(
        "PROD_EXT", ".ts,.tsx,.js,.css,.html,.json,.cs,.gd,.tscn,.uxml,.uss"
    ).split(",") if e.strip()
)
path, base = sys.argv[1], sys.argv[2]

def numstat(*args):
    out = subprocess.run(["git", "-C", path, *args], capture_output=True, text=True).stdout
    return [l.split("\t") for l in out.splitlines() if l.count("\t") >= 2]

rows = numstat("diff", "--numstat", f"{base}..HEAD") + numstat("diff", "--numstat", "HEAD")
untracked = subprocess.run(["git", "-C", path, "ls-files", "--others", "--exclude-standard"],
                           capture_output=True, text=True).stdout.split()

# BINARIES ARE NOT COUNTED LINE BY LINE. `git diff --numstat` prints "-" for a
# binary, and that is already handled below; but an uncommitted file is read
# here by hand, and without this cut-off four PNG acceptance screenshots turned
# into "docs 144" with the verdict "production untouched" on a task whose whole
# job was to deliver screenshots. An instrument that counts a screenshot as
# text lies in the same direction as silence.
BINARY = (".png", ".jpg", ".jpeg", ".gif", ".webp", ".ico", ".pdf",
          ".mp3", ".wav", ".ogg", ".zip", ".woff", ".woff2", ".ttf")
for f in untracked:
    if f.lower().endswith(BINARY):
        continue
    full = os.path.join(path, f)
    try:
        with open(full, "rb") as fh:
            rows.append([str(sum(1 for _ in fh)), "0", f])
    except OSError:
        pass

cls = {"prod": 0, "tests": 0, "docs": 0, "other": 0}
for added, _removed, f in rows:
    n = 0 if added == "-" else int(added)
    if f.startswith("docs/") or f.endswith(".md"):
        cls["docs"] += n
    elif ".test." in f or ".fixture." in f:
        cls["tests"] += n
    elif f.startswith("artifacts/"):
        # GENERATED IS NOT PRODUCTION. A regenerated measurement report
        # (artifacts/m3-08-headless-games.json) is 4000 lines that nobody
        # wrote: a ten-line change would look like major work. An instrument
        # that flatters is as useless as one that stays silent.
        cls["other"] += n
    elif f.endswith(PROD_EXT):
        cls["prod"] += n
    else:
        cls["other"] += n

# THE VERDICT IS NOT A SENTENCE BUT A REASON TO ASK. The threshold is
# deliberately coarse: a human must analyse the case, the instrument only
# shows where to look.
verdict = ""
if sum(cls.values()) == 0:
    verdict = "  ← NOT A SINGLE LINE: ask what it is doing"
elif cls["prod"] == 0 and cls["tests"] + cls["docs"] > 40:
    verdict = "  ← PRODUCTION CODE UNTOUCHED, but plenty of tests and docs: this is that very failure"
elif cls["prod"] > 0 and cls["tests"] > 8 * cls["prod"]:
    verdict = "  ← tests outnumber code several times over: check that the task did not collapse into harness code"
print("  " + ", ".join(f"{k} {v}" for k, v in cls.items()) + verdict)
' "$1" "$2"
}

# `mapfile` is not in every shell (macOS bash 3.2 lacks it), so the list of
# paths is collected line by line: that works everywhere.
if [ "$#" -gt 0 ]; then
  roots=$(printf '%s\n' "$@")
else
  roots=$(orca worktree list 2>/dev/null | grep -oE '/[^ ]*/workspaces/[^ ]+' | sort -u)
fi

# THE BASE IS THE NEAREST ANCESTOR BRANCH, NOT `main`. Work is started
# guard-first: the Producer puts a red guard on a separate branch and launches
# the worker from it. Counting from `main`, the guard commit lands in the
# worker's diff, and EVERY fresh worker in its very first minute looks exactly
# like the failure the script hunts for: "prod 0, tests 128". An
# instrument that normally shouts at the healthy will not be listened to the
# one time it shouts for a reason.
#
# The base finds itself, without knowing any names: for every local branch the
# point of divergence from HEAD is taken, and the one with the fewest commits
# from there to HEAD wins.
#
# Divergence, not "ancestor": `main` stops being an ancestor of the working
# branch the moment someone else's task is merged into it, but it does not stop
# being the base. Requiring ancestry would silently move the base to the old
# guard branch of a neighbouring task and credit the worker with someone else's
# three thousand lines.
nearest_base() {
  local wt="$1" self="$2" best="" best_n=""
  local b mb n
  # Trunk (`$TRUNK`) goes first so that on an equal divergence the caption names it: a
  # guard branch and trunk diverge from the working branch at the same point,
  # and calling the guard the base when it added nothing confuses for no reason.
  for b in "$TRUNK" $(git -C "$wt" for-each-ref --format='%(refname:short)' refs/heads 2>/dev/null); do
    [ "$b" = "$self" ] && continue
    mb=$(git -C "$wt" merge-base "$b" HEAD 2>/dev/null) || continue
    n=$(git -C "$wt" rev-list --count "$mb"..HEAD 2>/dev/null) || continue
    if [ -z "$best_n" ] || [ "$n" -lt "$best_n" ]; then best="$b"; best_n="$n"; fi
  done
  [ -n "$best" ] && echo "$best"
}

echo "$roots" | while IFS= read -r wt; do
  [ -n "$wt" ] || continue
  [ -d "$wt" ] || continue
  branch=$(git -C "$wt" rev-parse --abbrev-ref HEAD 2>/dev/null) || continue
  baseref=$(nearest_base "$wt" "$branch")
  [ -n "$baseref" ] || baseref="$TRUNK"
  base=$(git -C "$wt" merge-base HEAD "$baseref" 2>/dev/null) || base="$TRUNK"
  commits=$(git -C "$wt" rev-list --count "$base"..HEAD 2>/dev/null)
  dirty=$(git -C "$wt" status --porcelain 2>/dev/null | wc -l | tr -d ' ')
  echo "$(basename "$wt")  branch $branch (from $baseref)  commits $commits, edited files $dirty"
  classify "$wt" "$base"
done
