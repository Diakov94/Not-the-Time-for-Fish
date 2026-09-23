#!/bin/bash
# The machine and housekeeping health instrument. Runs NOT every cycle (§14a).
#
# WHY IT EXISTS. On 10 August 2026 sixteen orphaned `node -e 'for(;;);'`
# processes burned twelve cores for 18 hours straight. All that time
# `usage-snapshot.sh` honestly printed "MACHINE OVERLOADED: do not widen the
# wave", and for 18 hours I obeyed: shrank the wave, did not launch roles,
# explained the overload to the owner. The load was NOT OURS. Finding G-22.
#
# WHAT WAS MISSING. Not the number: the number was right. What was missing was
# the QUESTION: whose load is this and how old is it. "The load is high" and
# "our workers overloaded the machine" are two different statements, and I read
# the first as the second. So the instrument prints not a verdict but NAMES and
# AGES: an orphaned long-lived process is visible to the eye at once.
#
# WHY NOT EVERY CYCLE. Such breakages live for hours, not minutes; checking them
# every 15 minutes is spending a cycle on what does not change. But they MUST be
# checked before blaming a slowdown or a shrunken wave on the machine: otherwise
# the verdict rests on someone else's processes.
#
# `etimes` on macOS SILENTLY drops out of the `ps` output: the columns shift and
# the script lies without failing. So we take `etime` and parse the
# [[dd-]hh:]mm:ss format ourselves.
set -u
cd "$(dirname "$0")/.." || exit 1

problems=0
echo "═══ machine and housekeeping health ═══"

# ── 1. Who holds the machine: names and ages, not only load ──────────────────
load1=$(uptime | sed 's/.*averages*: *//' | awk '{print $1}')
cores=$(sysctl -n hw.ncpu 2>/dev/null || echo 1)
echo
echo "load average 1 min: $load1 on $cores cores"
# %CPU here is the AVERAGE OVER THE WHOLE LIFE of the process, not instantaneous.
# The caption is mandatory: on 11 August 2026 I, the author of this warning, read
# "111 %, age two days" as a leak twelve hours after writing the caveat into the
# comment below myself. The comment is read by whoever edits the script; the
# line by whoever makes the decision.
echo "top five by AVERAGE CPU OVER THE WHOLE LIFE of the process (not instantaneous!):"
echo "  for a long-lived process this number is smeared: 100 % over two days and 100 % over a minute are different things"
ps -eo pid,ppid,etime,pcpu,args 2>/dev/null | tail -n +2 | sort -k4 -rn | head -5 |
  awk '{ pid=$1; ppid=$2; et=$3; cpu=$4; $1=$2=$3=$4="";
         sub(/^ +/,""); cmd=substr($0,1,72);
         printf "  %6.1f%%  age %-12s ppid %-6s %s\n", cpu, et, ppid, cmd }'

# ── 2. Orphaned long-lived processes burning CPU: the G-22 case ──────────────
# The sign of a leak: ppid 1 (the parent died) + older than an hour + more than
# 20 % CPU. Each condition on its own is legitimate: daemons have ppid 1, a build
# lives long, a test eats CPU. All three together do not occur in real work,
# only in a forgotten process.
#
# SYSTEM DAEMONS ARE EXCLUDED, AND WITHOUT THAT THE INSTRUMENT IS USELESS:
# WindowServer, CoreServices and duetexpertd always meet all three conditions:
# ppid 1, alive since boot, percentages counted over twelve days. In the first
# run they gave three false positives out of three, i.e. they would have hidden
# a real leak in the noise.
#
# IMPORTANT ABOUT %CPU: on macOS `pcpu` is the average load OVER THE WHOLE LIFE
# of the process, not instantaneous. For a long-lived process it is smeared, for
# a fresh one it is almost instantaneous. So the number here is a sign, not a
# measure: look at the three conditions together.
leaks=$(ps -eo pid,ppid,etime,pcpu,args 2>/dev/null | tail -n +2 | awk '
  $5 ~ /^\/System\// || $5 ~ /^\/usr\// || $5 ~ /^\/sbin\// || $5 ~ /^\/Library\// { next }
  {
    pid=$1; ppid=$2; et=$3; cpu=$4;
    # [[dd-]hh:]mm:ss -> seconds
    d=0; rest=et;
    if (rest ~ /-/) { split(rest,a,"-"); d=a[1]; rest=a[2] }
    n=split(rest,t,":");
    if (n==3) secs=t[1]*3600+t[2]*60+t[3]; else if (n==2) secs=t[1]*60+t[2]; else secs=0;
    secs+=d*86400;
    if (ppid==1 && secs>3600 && cpu>20) {
      $1=$2=$3=$4=""; sub(/^ +/,"");
      printf "  %6.1f%%  age %-12s %s\n", cpu, et, substr($0,1,66)
    }
  }')
# ── 2a. WHOSE load: the share of our processes in the top ten by CPU ─────────
# The instrument answered the question "is there a leak", but the decision is
# made on a different question: "is this load ours". On 11 August 2026 the top
# lines were held by MediaAnalysis (83 % for four hours), syspolicyd and
# WindowServer, all Apple, and for several cycles in a row I did not widen the
# wave, citing a load of 50. Exactly the G-22 mistake, in a new form: then the
# foreign processes were orphaned, now they are system ones and legitimate.
# Neither is a leak; neither affects the wave.
#
# WHY THE PATTERN IS THE WAY IT IS. The worktree path is not visible in the
# agent's arguments: there is only `claude ... --model X --effort Y`, and `ps`
# does not print the working directory. We tell a worker from OUR OWN coordinator
# session by the `--model` flag: a worker is always launched with it
# (`worker-start --model`), the coordinator without. The first run of this line
# counted "0 of 10" while a live worker held the second line.
# The sign "the process is ours" is set by the project: OURS_RE in
# `.studio/project.conf`. The default covers Orca worktrees and the agents; on
# another engine add your own builder and runner names, otherwise the instrument
# counts foreign load as ours.
[ -f .studio/project.conf ] && . .studio/project.conf
OURS_RE="${OURS_RE:-orca/workspaces|$(basename "$PWD")|vite-node|vitest|puppeteer|dotnet|godot|claude .*--model|codex}"
ours=$(ps -eo pcpu,args 2>/dev/null | tail -n +2 | sort -k1 -rn | head -10 |
  grep -cE "$OURS_RE")
echo
echo "OURS among the top ten by CPU: $ours of 10"
if [ "$ours" -le 2 ]; then
  echo "  The load is held by processes that are NOT ours. Shrinking the wave on this load means"
  echo "  obeying someone else's spend: look at the top five above by name."
fi

echo
if [ -n "$leaks" ]; then
  echo "LEAK: orphaned (ppid 1) processes older than an hour are burning more than 20 % CPU."
  echo "$leaks"
  echo "  This is NOT worker activity. Before shrinking the wave, kill them and measure again."
  problems=$((problems + 1))
else
  echo "no orphaned long-lived processes burning CPU"
fi

# ── 3. Browsers abandoned by screenshot capture ──────────────────────────────
# `npm run shots` itself reports "browser close did not finish within 60000 ms:
# Chromium killed with SIGKILL". A browser killed with SIGKILL leaves live
# children behind.
#
# WE COUNT ONLY OUR OWN. The first run counted 23 "capture browsers": it was the
# owner's ordinary Chrome with its helper tabs. The sign of a capture browser:
# `--headless` or a path inside our worktrees. Without this the instrument
# frightens with what must not be touched.
#
# WE JUDGE BY AGE, NOT BY PRESENCE. The second run of the instrument counted 21
# "abandoned" browsers; they were 10 SECONDS old: a worker was capturing
# screenshots right then. An instrument that shouts at work in progress stops
# being read. Capture takes 70–135 s, so a live process OLDER THAN TEN MINUTES
# is a leftover, not work.
chr=$(ps -eo pid,etime,args 2>/dev/null |
  grep -iE '[Cc]hrom(e|ium)' | grep -v grep |
  grep -E -- '--headless|orca/workspaces|puppeteer' | awk '
  {
    et=$2; d=0; rest=et;
    if (rest ~ /-/) { split(rest,a,"-"); d=a[1]; rest=a[2] }
    n=split(rest,t,":");
    if (n==3) secs=t[1]*3600+t[2]*60+t[3]; else if (n==2) secs=t[1]*60+t[2]; else secs=0;
    secs+=d*86400;
    if (secs>600) c++
  } END { print c+0 }')
young=$(ps -eo args 2>/dev/null | grep -iE '[Cc]hrom(e|ium)' | grep -v grep |
  grep -cE -- '--headless|orca/workspaces|puppeteer')
echo
if [ "$chr" -gt 0 ]; then
  echo "capture browsers OLDER THAN 10 MINUTES: $chr; capture never takes that long, these are SIGKILL leftovers"
  problems=$((problems + 1))
elif [ "$young" -gt 0 ]; then
  echo "capture browsers alive: $young, all younger than 10 minutes; capture is running, this is work"
else
  echo "no abandoned capture browsers"
fi

# ── 4. Disk space: every worktree carries its own node_modules ───────────────
avail_kb=$(df -k . | tail -1 | awk '{print $4}')
avail_gb=$((avail_kb / 1048576))
wt=$(git worktree list 2>/dev/null | wc -l | tr -d ' ')
echo
echo "free: $avail_gb GB; worktrees (including the main one): $wt"
if [ "$avail_gb" -lt 15 ]; then
  echo "  LOW ON SPACE: a fresh worktree installs its own node_modules, and the worker will silently stall on install"
  problems=$((problems + 1))
fi

# ── 5. Worktrees without a live task ─────────────────────────────────────────
# A merged branch with its own worktree is gigabytes of node_modules and extra
# lines in work-check.sh. Membership in trunk is checked with
# `merge-base --is-ancestor`: `git branch --merged` lied on all five branches
# checked on 10 August 2026.
#
# "AN ANCESTOR OF TRUNK" IS TWO DIFFERENT STATES, AND CONFUSING THEM IS
# DANGEROUS. The first run of the instrument proposed removing the worktree of
# the LIVE worker M5-20: its branch had no commits yet, stood exactly at the tip
# of trunk, and was formally its ancestor. We tell them apart by the tip: a
# merged branch has its tip STRICTLY BEHIND trunk, a freshly created one EQUAL
# to it. The second guard is a dirty tree: the worker is at work.
#
# THE THIRD GUARD, AND IT IS THE ONLY REAL ONE: a live task on the worktree.
# Comparing tips does not cover the case "a branch with no commits while trunk
# has moved ahead": then the tip is formally BEHIND trunk, the tree is clean,
# and the instrument for the second time in a day proposed removing the
# worktree of a working worker (11 August: ui-three-bugs, before that M5-20).
# Git alone cannot tell a merged branch from a fresh one: both have their tip in
# the history of trunk. We ask the orchestrator who is busy.
echo
live_wt=$(orca orchestration worker-list --json 2>/dev/null | python3 -c "
import json,sys
try: d=json.load(sys.stdin)
except Exception: sys.exit(0)
for w in (d.get('result',{}).get('workers') or []):
    if w.get('dispatchStatus') == 'dispatched':
        print(w.get('resource',{}).get('worktreeId','').split('/')[-1])
" 2>/dev/null)
main_tip=$(git rev-parse main 2>/dev/null)
landed=""
fresh=""
while read -r _ path; do
  [ -z "$path" ] && continue
  b=$(basename "$path")
  git show-ref --verify --quiet "refs/heads/$b" 2>/dev/null || continue
  git merge-base --is-ancestor "$b" main 2>/dev/null || continue
  # A live task on the worktree: do not touch, whatever the tip says.
  if printf '%s\n' "$live_wt" | grep -qx "$b" 2>/dev/null; then fresh="$fresh $b(task)"; continue; fi
  tip=$(git rev-parse "$b" 2>/dev/null)
  if [ "$tip" = "$main_tip" ]; then fresh="$fresh $b"; continue; fi
  # A dirty tree: the worker is working between commits, do not touch.
  if [ -n "$(git -C "$path" status --short 2>/dev/null)" ]; then fresh="$fresh $b"; continue; fi
  landed="$landed $b"
done < <(git worktree list --porcelain 2>/dev/null | awk '/^worktree /{print "wt", $2}')
if [ -n "$landed" ]; then
  echo "worktrees of branches ALREADY IN TRUNK, candidates for orca worktree rm:"
  for b in $landed; do echo "  $b"; done
  echo "  Check in task-list that the branch has no live task: a tip behind trunk"
  echo "  and a clean tree do not prove the worker has gone."
  problems=$((problems + 1))
else
  echo "no worktrees of merged branches"
fi
if [ -n "$fresh" ]; then
  echo "deliberately left alone (tip = trunk, or the tree is dirty, i.e. work is in progress):"
  for b in $fresh; do echo "  $b"; done
fi

# ── 6. Uncommitted specs in trunk ────────────────────────────────────────────
# A worker sees only what is committed. A spec lying dirty in the main worktree
# never arrives in a fresh worktree at all, and the task goes out without its
# assignment.
dirty=$(git status --short -- docs/plan 2>/dev/null | wc -l | tr -d ' ')
echo
if [ "$dirty" -gt 0 ]; then
  echo "UNCOMMITTED files in docs/plan: $dirty; the worker will not see them"
  git status --short -- docs/plan | head -5 | sed 's/^/  /'
  problems=$((problems + 1))
else
  echo "specs in docs/plan are committed"
fi

# ── 7. A worker launched and NOT STARTED ─────────────────────────────────────
# A failure that cost three cases of two to three hours each (11 August:
# ui-three-bugs, codex on framing, review-cut). The spec goes into the input
# field and stays there: Orca shows `dispatched`, the process is alive, the
# heartbeats go on, `worker-read` returns the task text, and not a single line
# of work. It is not caught by eye, because the terminal tail looks plausible:
# the spec is sitting in it.
#
# THE SIGN is the welcome banner in the TAIL. The banner is printed once at
# start. If it is still visible in the last forty lines, the agent has printed
# NOTHING since, i.e. has not started. For a working worker the banner scrolled
# off the edge long ago. Cured by pressing Enter: `terminal send --enter --text ""`.
echo
stalled=""
finished=""
if command -v orca >/dev/null 2>&1; then
  for h in $(orca orchestration worker-list --json 2>/dev/null | python3 -c "
import json,sys
try:
    for w in json.load(sys.stdin)['result']['workers']:
        if w.get('dispatchStatus') == 'dispatched':
            print(w['agentTerminalHandle'])
except Exception:
    pass
" 2>/dev/null); do
    tail40=$(orca terminal read --terminal "$h" --limit 40 2>/dev/null)
    # ONE SIGN, and it was verified in both directions on one worker: for
    # review-cut, while stuck, the banner was in the tail; after pressing Enter,
    # zero matches, same as for the three other working ones. The guard can go
    # red and can go green.
    #
    # I tried a second sign and threw it away: the terminal's `latest cursor`
    # counts pages, not lines, and counts DIFFERENTLY per provider: for working
    # claude workers it equals 1, for codex it runs into thousands. A check on
    # it gave four false positives out of four. A broad wrong guard is worse
    # than a narrow right one: it teaches you not to believe red.
    #
    # What remains is an honestly named blind spot: on codex the sign is NOT
    # VERIFIED: by the time of the check its banner has scrolled out of the
    # buffer ("older output is no longer retained"), and we did not record the
    # exact text in either of the two cases. So a codex worker is still checked
    # by eye on the first cycle.
    # `MCP startup incomplete` and `Use /skills` are the same banner of an
    # unstarted worker, only codex reaches it AFTER the MCP servers fail (for
    # us blender and godot-ai regularly fail to come up; they have nothing to
    # do with the game). The day-log review stood like that for a whole cycle:
    # the instrument was silent because it looked only for the agent greeting,
    # and the tail ended with the MCP complaint.
    # The same banner also sits in the tail of a FINISHED worker: having done
    # the work, it returns to the prompt, and the tail again ends with the
    # banner. The day-log review got onto the list that way a second time,
    # having already delivered its report as commit `1d1ffca`. What
    # distinguishes them is not the banner but the RESULT: whether the branch
    # of its worktree has commits ahead of trunk. Hence two different verdicts
    # below, and they need opposite cures: Enter for one, collecting the work
    # for the other.
    if printf '%s' "$tail40" | grep -qE 'Claude Code v[0-9]|Codex v[0-9]|Welcome to|MCP startup incomplete|Use /skills'; then
      # We tell them apart by the TRACES OF WORK above the banner, not by the
      # tree: Orca has no binding of a terminal to a worktree (`worktreeId` is
      # the project root for everyone). A finished one has its own commands in
      # the tail (`Ran ...`), an unstarted one only the noise of MCP start-up.
      if printf '%s' "$tail40" | grep -qE '(^|[^a-zA-Z])Ran [a-z]'; then
        finished="$finished $h"
      else
        stalled="$stalled $h"
      fi
    fi
  done
fi
if [ -n "$stalled" ]; then
  echo "LAUNCHED AND NOT STARTED: banner in the tail, no commits: the spec is sitting in the input field"
  echo "  (if Enter does not change the tail, the spec was NOT DELIVERED: send the instruction itself as text)"
  for h in $stalled; do echo "  $h  cure: orca terminal send --terminal $h --enter --text \"\""; done
  problems=$((problems + 1))
else
  echo "no workers launched and not started"
fi
if [ -n "$finished" ]; then
  echo
  echo "FINISHED AND NOT REPORTED: banner in the tail, but there are traces of work: collect the work"
  for h in $finished; do echo "  $h  check the branch of its worktree: commit present, no letter"; done
  problems=$((problems + 1))
fi

# ── 8. Work without a worker ─────────────────────────────────────────────────
# A failure that cost four tasks at once: workers finish and are released, while
# the branches with their work remain. The Orca status is honest here (the
# worker simply is not there), and it can only be noticed by comparing the
# BRANCHES with the live worktrees. On 11 August that is how the first-screen
# touch budget, the owner-label margin, the four MEDIUM UI findings and the
# acceptance landing were orphaned; one of them I later re-issued on top of work
# already done, because I kept the state in my head instead of in the instrument.
#
# A branch lands here if it has commits of its own on top of trunk and NO live
# worktree stands on it. This is not always bad (the work may be waiting to
# land deliberately), so the section does not count as a problem: it lists.
echo
# The sign "branch in progress" is taken from the WORKTREES, not from Orca, and
# this fixes a real blind spot: in `worker-list` the field `resource.worktreeId`
# of every worker points to the PROJECT ROOT, not to the worktree that was
# passed. So live_branches was reading the HEAD of the main worktree, i.e.
# always `main`, and the section never distinguished workers: it listed every
# branch with work not yet landed, while calling itself something else. A
# branch checked out in some worktree is a branch in progress; this holds
# without Orca and does not lie in the first minutes after dispatch, when the
# worker is still in `ready` but the instrument is already being asked.
# A worktree counts as live if it is IN THE WORK AREA: the project's worktree
# directory (`$WORKTREES_DIR` from `.studio/project.conf`, `.worktrees` by
# default) or `orca/workspaces/`, or the main worktree of the repository.
# A worktree off to the side is not work but parking, and this is not theory:
# the touch-layout HIGH finding lay invisible exactly that way: the branch was
# checked out in a worktree left over from a completely different task, and so
# read as "in progress". The sign "there is a worktree" without checking WHERE
# it is hides exactly the class of loss the section was written for.
PROJECT_ROOT="$(git rev-parse --show-toplevel 2>/dev/null || pwd)"
WORK_AREA="${WORKTREES_DIR:-.worktrees}"
export PROJECT_ROOT WORK_AREA
live_branches=" $(git worktree list --porcelain 2>/dev/null | python3 -c "
import os, sys
root = os.environ.get('PROJECT_ROOT', '')
area = os.environ.get('WORK_AREA', '.worktrees').strip('/')
def in_work_area(p):
    return '/orca/workspaces/' in p or f'/{area}/' in p or p == root
path = None
for line in sys.stdin:
    line = line.rstrip('\n')
    if line.startswith('worktree '):
        path = line[9:]
    elif line.startswith('branch refs/heads/'):
        if path and in_work_area(path):
            print(line[18:])
" | tr '\n' ' ') "
parked=$(git worktree list --porcelain 2>/dev/null | python3 -c "
import os, sys
root = os.environ.get('PROJECT_ROOT', '')
area = os.environ.get('WORK_AREA', '.worktrees').strip('/')
def in_work_area(p):
    return '/orca/workspaces/' in p or f'/{area}/' in p or p == root
path = None
for line in sys.stdin:
    line = line.rstrip('\n')
    if line.startswith('worktree '):
        path = line[9:]
    elif line.startswith('branch refs/heads/'):
        if path and not in_work_area(path):
            print(f'  {line[18:]}: worktree off to the side: {path}')
")
if [ -n "$parked" ]; then
  echo
  echo "BRANCHES IN FOREIGN WORKTREES: this is parking, not work:"
  echo "$parked"
  echo "  Such a worktree does not prove a worker. Check task-list and decide on each."
fi
orphans=""
for b in $(git for-each-ref --format='%(refname:short)' refs/heads | grep -v '^main$'); do
  ahead=$(git rev-list --count "main..$b" 2>/dev/null || echo 0)
  [ "$ahead" -gt 0 ] || continue
  case " $live_branches " in *" $b "*) continue ;; esac
  orphans="$orphans $b:$ahead"
done
if [ -n "$orphans" ]; then
  echo "WORK WITHOUT A WORKER: a branch with commits and no live worktree on it:"
  for o in $orphans; do echo "  ${o%%:*}: ${o##*:} commits waiting for a stage"; done
  echo "  Not always a defect: the work may be waiting to land. But each needs a decision."
else
  echo "no branches with work and no worker"
fi

# ── Ledger: "periodically" without a timestamp turns into "whenever I remember" ─
# Rule §14a says to run the instrument about every 2 hours, not every cycle.
# That can only be checked against a record: the coordinator loses memory
# between cycles, and "I looked recently" is not a fact. The last line answers
# the question "how long has it been".
mkdir -p .studio
printf '{"at":"%s","load1":"%s","problems":%d}\n' \
  "$(date -u +%Y-%m-%dT%H:%M:%SZ)" "$load1" "$problems" >> .studio/health.jsonl

echo
if [ "$problems" -eq 0 ]; then
  echo "═══ no issues ═══"
else
  echo "═══ issues: $problems; sort them out BEFORE blaming the slowdown on the machine ═══"
fi
prev=$(tail -2 .studio/health.jsonl 2>/dev/null | head -1)
[ -n "$prev" ] && echo "previous run: $prev"
exit 0
