#!/usr/bin/env bash
# A snapshot of limit spend into the ledger .studio/usage.jsonl (§9 rule 18 of STUDIO.md).
# One JSON line per Producer iteration. The ledger is not versioned.
#
#   gamestudio/usage-snapshot.sh            # write a snapshot and show the delta
#   gamestudio/usage-snapshot.sh --report   # only show, write nothing
#   NO_WAIT=1 gamestudio/usage-snapshot.sh  # do not wait for fresh figures (a quick look)
#
# The delta is computed against the previous ledger line: how many percent of
# each window burned, over how many minutes, and who was working meanwhile. The
# size of the next wave is planned from this.

set -euo pipefail
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
LEDGER="$ROOT/.studio/usage.jsonl"
mkdir -p "$ROOT/.studio"

MODE="${1:-append}"

# There is no forced limit refresh in the CLI: orca account list returns its
# cache, and polling arrives irregularly: measured from 200 to 780 seconds. So
# freshness is not begged for but waited for, and only when it can change
# something: we wait only while workers are running. If nobody is working there
# is nothing to spend, and stale figures are harmless: waiting for them is
# pointless.
FRESH_LIMIT_SEC="${FRESH_LIMIT_SEC:-120}"
WAIT_CAP_SEC="${WAIT_CAP_SEC:-90}"

# The age is taken from the OLDEST window, not the freshest: we wait until all
# providers are fresh. min would answer a different question ("has anyone
# refreshed at all"), and the loop would exit while the provider that is burning
# quota right now still had a stale figure.
# If the wait hits the cap, nothing is hidden: the age is printed per provider
# separately, and stale ones are flagged by the 210 s threshold.
# The output is guaranteed non-empty, otherwise `[ "" -gt N ]` breaks test
# inside the while.
age_of() {
  orca account list --json 2>/dev/null | python3 -c '
import json,sys,time
try: d=json.load(sys.stdin)
except Exception: print(99999); raise SystemExit
rl=d.get("result",d).get("rateLimits",{}) or {}
ages=[(time.time()-v["updatedAt"]/1000) for v in rl.values()
      if isinstance(v,dict) and v.get("updatedAt")]
print(int(max(ages)) if ages else 99999)
' || printf '%s' 99999
}

BUSY="$(orca orchestration task-list --brief 2>/dev/null | grep -c '\[dispatched\]' || true)"
if [ "${NO_WAIT:-}" != "1" ] && [ "${BUSY:-0}" -gt 0 ]; then
  waited=0
  age="$(age_of)"
  if [ "${age:-99999}" -gt "$FRESH_LIMIT_SEC" ] 2>/dev/null; then
    echo "limit data older than ${FRESH_LIMIT_SEC}s (age ${age}s); waiting for the Orca poll, it comes roughly every 200s"
    while [ "${age:-99999}" -gt "$FRESH_LIMIT_SEC" ] 2>/dev/null && [ "$waited" -lt "$WAIT_CAP_SEC" ]; do
      sleep 15; waited=$((waited + 15)); age="$(age_of)"
    done
    if [ "${age:-99999}" -gt "$FRESH_LIMIT_SEC" ] 2>/dev/null; then
      echo "  no poll arrived in ${waited}s; taking the snapshot at age ${age}s, do not trust the delta"
    else
      echo "  got it after ${waited}s, age ${age}s"
    fi
  fi
fi

LIMITS="$(orca account list --json 2>/dev/null || echo '{}')"
WORKERS="$(orca orchestration task-list --brief 2>/dev/null | grep -c '\[dispatched\]' || true)"
RUNNING="$(orca orchestration task-list --brief 2>/dev/null | sed -n 's/^\(task_[a-f0-9]*\) \[dispatched\] \(.*\) -> .*/\1|\2/p' | paste -sd';' - || true)"
DONE="$(orca orchestration task-list --brief 2>/dev/null | grep -c '\[completed\]' || true)"

LIMITS="$LIMITS" WORKERS="$WORKERS" RUNNING="$RUNNING" DONE="$DONE" \
LEDGER="$LEDGER" MODE="$MODE" python3 - <<'PY'
import json, os, time, datetime

ledger = os.environ["LEDGER"]
mode = os.environ["MODE"]

try:
    limits = json.loads(os.environ["LIMITS"]).get("result", {}).get("rateLimits", {})
except Exception:
    limits = {}

buckets = {}
freshness = {}
for provider, value in limits.items():
    if not isinstance(value, dict) or value.get("status") == "unavailable":
        continue
    if value.get("updatedAt"):
        freshness[provider] = value["updatedAt"]
    for window, data in value.items():
        if isinstance(data, dict) and "usedPercent" in data:
            buckets[f"{provider}.{window}"] = {
                "used": data["usedPercent"],
                "windowMinutes": data.get("windowMinutes"),
                "resetsAt": data.get("resetsAt"),
                "updatedAt": value.get("updatedAt"),
            }

now = time.time()
entry = {
    "ts": int(now * 1000),
    "at": datetime.datetime.fromtimestamp(now).isoformat(timespec="seconds"),
    "buckets": buckets,
    "freshness": freshness,
    "workersRunning": int(os.environ["WORKERS"] or 0),
    "running": [x for x in os.environ["RUNNING"].split(";") if x],
    "tasksCompletedTotal": int(os.environ["DONE"] or 0),
}

prev = None
if os.path.exists(ledger):
    with open(ledger) as fh:
        lines = [l for l in fh if l.strip()]
    if lines:
        prev = json.loads(lines[-1])

print(f"snapshot {entry['at']}  workers running: {entry['workersRunning']}")
for provider, upd in sorted(freshness.items()):
    age = now - upd / 1000
    mark = "  ← DATA IS STALE, do not trust the delta" if age > 210 else ""
    print(f"  {provider} data: age {age:.0f} s{mark}")
for name, b in sorted(buckets.items()):
    line = f"  {name:26} {round(b['used']):>3}%"
    if b["resetsAt"]:
        reset = datetime.datetime.fromtimestamp(b["resetsAt"] / 1000)
        left = reset - datetime.datetime.fromtimestamp(now)
        if left.total_seconds() < 0:
            # The reset moment has already passed while the cached percentage
            # stayed the same: so this is pre-reset data. Showing "in -1 day,
            # 23:55" would be fooling yourself.
            line += f"  reset {reset:%d %b %H:%M} ALREADY PASSED; figure from the pre-reset cache"
        else:
            line += f"  reset {reset:%d %b %H:%M} (in {str(left).split('.')[0]})"
    print(line)

if prev:
    minutes = (entry["ts"] - prev["ts"]) / 60000
    print(f"\ndelta against the previous snapshot ({minutes:.0f} min, workers then: {prev.get('workersRunning')}):")
    for name, b in sorted(buckets.items()):
        old = prev.get("buckets", {}).get(name)
        if not old:
            # The window appeared for the first time: a provider was added, or
            # its first measurement only arrived now. It cannot be skipped
            # silently: a new provider is usually the one the wave moved to,
            # and its spend matters more than anyone else's.
            print(f"  {name:26} new window in the ledger; nothing to compare with, the next snapshot will give a delta")
            continue
        # A window reset between snapshots makes the delta meaningless. The sign
        # of a reset: the percentage dropped, or resetsAt moved forward
        # noticeably. The threshold is mandatory: resetsAt drifts by
        # milliseconds between reads, and an exact comparison would catch a
        # false reset on every snapshot.
        moved = (b.get("resetsAt") or 0) - (old.get("resetsAt") or 0) > 60_000
        if b["used"] < old["used"] or moved:
            print(f"  {name:26} window reset, delta not computed (was {round(old['used'])}%, now {round(b['used'])}%)")
            continue
        # The provider returns cached figures: if updatedAt has not moved, this
        # is the same measurement, not "nothing burned". Silently showing 0 pp
        # here is more dangerous than showing nothing: a zero delta reads as
        # "you can load harder".
        if b.get("updatedAt") and b["updatedAt"] == old.get("updatedAt"):
            print(f"  {name:26} same data as in the previous snapshot; delta unknown")
            continue
        d = round(b["used"]) - round(old["used"])
        # The burn rate is computed over the interval of the PROVIDER'S DATA,
        # not the snapshot interval. On 9 August 2026 this gave a fourfold
        # error: Orca did not poll the providers for 75 minutes, then returned
        # the accumulated amount at once, and the script divided 15 pp by a
        # 15-minute snapshot and declared 61.8%/hour instead of the real
        # 12%/hour. An overstated rate is more dangerous than an understated
        # one: on it the wave is cut where there is margin, i.e. the limit
        # window burns out unused at reset.
        span = None
        if b.get("updatedAt") and old.get("updatedAt"):
            span = (b["updatedAt"] - old["updatedAt"]) / 60000
        source = "from provider data"
        if not span or span <= 0:
            span, source = minutes, "from the snapshot interval; updatedAt unavailable"
        rate = f", {d / (span / 60):.1f}%/hour over {span:.0f} min ({source})" if span >= 5 and d else ""
        print(f"  {name:26} {d:+d} pp{rate}")
    closed = entry["tasksCompletedTotal"] - prev.get("tasksCompletedTotal", 0)
    print(f"  tasks closed in the interval: {closed}")
else:
    print("\nfirst snapshot; nothing to compare the delta with")

# ─── Budget: a band, not a ceiling ──────────────────────────────────────────
#
# The rule and its meaning: gamestudio/BUDGET.md. Here only the arithmetic.
#
# THE MAIN NUMBER IS NOT A CEILING BUT THE EVEN SPEND: the window remainder
# divided by the time to reset. That one number solves both problems. Burning
# the weekly window in a day loses the days the studio does not work; NOT
# burning it by the reset loses the window whole, because what is unburned
# does not carry over. So the verdict is two-sided: "burning" and
# "underspending" are both mistakes, and the second is quieter than the first
# and costs as much.
#
# ALL WINDOWS, NOT ONLY THE WEEKLY ONE. The five-hour window is not a budget
# but a throttle: it refills by itself, and its unused capacity is lost every
# five hours. So what binds is the window whose even spend is LOWER: the weekly
# one sets how much is allowed per week, the session one how much is allowed
# right now.
#
# FOREIGN SPEND. The subscription is shared by the person and the studio: the owner may
# work with the same models in parallel. Counting their spend as ours cuts the
# wave for someone else's work; not counting it at all sleeps through the
# window running out. It is estimated over the intervals in which the studio
# had NOT A SINGLE worker: what burned then is not ours by construction. The
# median, not the mean: one spike does not inflate the estimate. The limitation
# is stated openly: with no such intervals it prints "unknown", not zero.
def load_ledger(path):
    if not os.path.exists(path):
        return []
    with open(path) as fh:
        return [json.loads(l) for l in fh if l.strip()]


def rate_between(a, b, name):
    """pp/hour from provider data; None if it cannot be computed."""
    ob, nb = a.get("buckets", {}).get(name), b.get("buckets", {}).get(name)
    if not ob or not nb:
        return None
    if nb["used"] < ob["used"] or (nb.get("resetsAt") or 0) - (ob.get("resetsAt") or 0) > 60_000:
        return None  # window reset
    if nb.get("updatedAt") and nb["updatedAt"] == ob.get("updatedAt"):
        return None  # same data
    span = None
    if nb.get("updatedAt") and ob.get("updatedAt"):
        span = (nb["updatedAt"] - ob["updatedAt"]) / 3_600_000
    if not span or span <= 0:
        span = (b["ts"] - a["ts"]) / 3_600_000
    d = round(nb["used"]) - round(ob["used"])
    # QUANTISATION. The provider returns WHOLE percentages, so "+1 pp" means
    # "somewhere between 0.5 and 1.5", and on a short interval that gives a
    # rate off by several times: +1 pp in 15 minutes is both 2 and 6 pp/hour.
    # A verdict on such a number would shout "BURNING" out of nowhere. So the
    # rate is computed only when the noise is small compared to the signal:
    # either 3+ pp has accumulated, or an hour has passed. Otherwise None, and
    # the snapshot honestly says the rate is unknown.
    if span < 1.0 and abs(d) < 3:
        return None
    if span < 5 / 60:
        return None
    return d / span


# A RECEDING BASE, AND WITHOUT IT THE QUANTISATION THRESHOLD MUTES THE VERDICT
# FOR GOOD. The threshold above demands "3+ pp or an hour". A snapshot is taken
# every 9–15 minutes, and an adjacent pair almost never gathers that much: the
# rate came out None cycle after cycle, and the budget line honestly printed
# "unknown", i.e. there was no verdict, NOT ONCE. This is the same mistake as
# "a criterion that cannot be failed" (STUDIO.md §10.4), only mirrored: a
# measurement that cannot become known. So the base is not the adjacent one
# but recedes backwards to the first pair that passes the threshold. The
# CLOSEST suitable one is taken: a long base averages over past waves and lags
# in reacting to today's. A window reset cannot be crossed: there rate_between
# gives None by construction, and the rate stays unknown.
def receding_rate(history, name):
    for a in reversed(history[:-1]):
        r = rate_between(a, history[-1], name)
        if r is not None:
            return r, (history[-1]["ts"] - a["ts"]) / 3_600_000
    return None, None


# The foreign rate comes from RUNS of consecutive snapshots without workers,
# not from adjacent pairs: an adjacent pair hits the same quantisation
# threshold.
def idle_runs(history):
    run, out = [], []
    for r in history:
        if (r.get("workersRunning") or 0) == 0:
            run.append(r)
        else:
            if len(run) >= 2:
                out.append((run[0], run[-1]))
            run = []
    if len(run) >= 2:
        out.append((run[0], run[-1]))
    return out


history = load_ledger(ledger) + [entry]
budget_path = os.path.join(os.path.dirname(ledger), "budget.json")
cap_pp = None
# NON-SPENDABLE WINDOWS. A window's percentage and a model's availability are
# different things: a window can show 90 pp free while the model behind it is
# switched off (provider credits, a separate wallet). Giving such a window the
# verdict "underspending, the wave can be widened" is a plain lie: there is
# nothing to widen into. The list lives in the project's state, not in this
# file: which windows are non-spendable depends on the subscription.
unusable = set()
if os.path.exists(budget_path):
    try:
        cfg = json.load(open(budget_path))
        v = cfg.get("capPpPerDay")
        cap_pp = float(v) if v is not None else None
        unusable = set(cfg.get("unusableWindows") or [])
    except Exception:
        pass

print("\nbudget: even spend = remainder / time to reset; band ±25 %")
even_rates = {}
for name, b in sorted(buckets.items()):
    if not b.get("resetsAt"):
        continue
    hours_left = (b["resetsAt"] / 1000 - now) / 3600
    if hours_left <= 0:
        print(f"  {name:26} window already reset; figure from cache, no verdict")
        continue
    remaining = 100 - round(b["used"])
    even = remaining / hours_left
    if name in unusable:
        print(f"  {name:26} remainder {remaining:>3} pp; window NOT SPENDABLE "
              f"(the model behind it is switched off), no verdict and the wave cannot be widened with it")
        continue
    even_rates[name] = even

    idle = sorted(
        r
        for a, b2 in idle_runs(history)
        for r in [rate_between(a, b2, name)]
        if r is not None
    )
    foreign = idle[len(idle) // 2] if idle else None
    total, base_h = receding_rate(history, name)

    head = (f"  {name:26} remainder {remaining:>3} pp over {hours_left:>5.1f} h → "
            f"even spend {even:.2f} pp/hour ({even * 24:.0f} pp/day)")
    if total is None:
        print(head + "; own rate unknown (reset, cache, or the ledger is shorter than the threshold)")
        continue

    # THE PROVIDER'S DATA CAN BE DEAD, AND THEN THERE IS NO VERDICT AT ALL.
    # On 11 August 2026 the `updatedAt` of all segments froze at 00:17 and did
    # not move for five hours while the studio burned the window with eight
    # workers. `receding_rate` honestly receded the base to the last pair with
    # a DIFFERENT `updatedAt`, i.e. to the night, and printed "BURNING ×3.4",
    # and I repeated that to the owner eight cycles in a row as a fresh verdict.
    # The number was right for 00:17 and meaningless for 05:25.
    #
    # This is the same class as "a guard that cannot go red", only mirrored: a
    # reading that cannot refresh but looks alive. So freshness is checked
    # separately from the base: the base says WHAT was used to compute,
    # freshness says whether what was computed on is CURRENT.
    # `entry`, not the comprehension variable above: in Python 3 it does not
    # leak out, and the guard failed with `NameError` on exactly the segment
    # that decides the wave.
    fresh_h = None
    nb_now = entry.get("buckets", {}).get(name) or {}
    if nb_now.get("updatedAt"):
        fresh_h = (entry["ts"] - nb_now["updatedAt"]) / 3_600_000
    if fresh_h is not None and fresh_h > 1.0:
        print(head + f"; provider data OLDER THAN THE SNAPSHOT by {fresh_h:.1f} h "
                     f"(last update on the provider's side, not ours); NO VERDICT")
        print(f"  {'':26} ← the remainder and rate refer to that moment, not to now;"
              f" measure the wave by cores (health-check.sh), not by this number")
        continue
    own = total if foreign is None else max(0.0, total - foreign)
    src = (f"base {base_h:.1f} h; "
           + ("upper estimate, foreign share unknown" if foreign is None
              else f"foreign {foreign:.2f} over {len(idle)} runs without workers"))
    if own > even * 1.25:
        verdict = f"BURNING ×{own / even:.1f}; shrink the wave"
    elif own < even * 0.75:
        verdict = f"UNDERSPENDING ×{even / own:.1f}; the window will be lost at reset, the wave can be widened" if own > 0 else "UNDERSPENDING; no spend at all, the window will be lost at reset"
    else:
        verdict = "within the band"
    print(head + f"; own {own:.2f} ({src}); {verdict}")
    if (entry.get("workersRunning") or 0) == 0 and total > even * 1.25:
        print(f"  {'':26} ← zero workers, yet the window is burning: the spend is entirely foreign, "
              f"it does not affect the studio's wave but shortens the runway")
    elif own > even * 1.25:
        # THE LIMITATION OF THIS SIGN IS NAMED, NOT HIDDEN. Workers are counted as a
        # TOTAL, without a per-provider breakdown: a task does not say which
        # agent it runs on. So a provider's window with no workers of its own
        # can burn while the total counter is non-zero, and the sign above
        # stays silent. Until there is a breakdown, a human draws the
        # conclusion: if no work was launched on this provider, what burns is
        # foreign, not the studio.
        print(f"  {'':26} ← the worker counter is a TOTAL, not per provider: "
              f"if there is no work of our own on this provider, the spend is foreign")

# THE WAVE IS LIMITED NOT ONLY BY THE WINDOW BUT BY THE MACHINE. On 10 August
# 2026, with three workers, the load average reached 112 with 91 node
# processes, and the suite run of one task stretched from minutes to half an
# hour. Costlier than the lost time here is the second effect: numbers taken under
# such load measure the scheduler queue, not the code, and end up in reports
# as a property of the change ("1305 s on a loaded machine"). So the load is
# printed next to the limit remainder: the wave is sized by both, and by the
# tighter of the two.
try:
    load1 = os.getloadavg()[0]
    cores = os.cpu_count() or 1
    ratio = load1 / cores
    if ratio >= 4:
        verdict = "; MACHINE OVERLOADED: do not widen the wave, timing measurements are unreliable"
    elif ratio >= 2:
        verdict = "; machine busy: a new worker will slow the neighbours and its own measurements"
    else:
        verdict = "; machine free"
    print(f"\nmachine: load average {load1:.0f} on {cores} cores "
          f"(x{ratio:.1f}){verdict}")
except (OSError, AttributeError):
    pass

if even_rates:
    binding = min(even_rates, key=even_rates.get)
    limit = even_rates[binding]
    note = ""
    if cap_pp is not None and cap_pp / 24 < limit:
        limit, note = cap_pp / 24, f" (the owner's ceiling of {cap_pp:.0f} pp/day is below the even spend)"
    print(f"  binding: {binding}; {limit:.2f} pp/hour, "
          f"i.e. {limit * 24:.0f} pp/day{note}")

# ── THE SLOPE OVER THE WHOLE CURRENT WINDOW, not over a receding base ────────
# The verdicts above take "own" from a base of 0.3…1.4 h. With the provider's
# granularity of 1 pp, one quantisation step over such a baseline gives a spread of
# SEVERAL TIMES: on 11 August 2026 the instrument printed codex ×16.1 while the
# remainder over the same interval had shifted by exactly one, i.e. the rate
# lay between 0 and 6 pp/hour. Worse: the codex window had reset, and the short
# base compared numbers across the reset boundary.
#
# The reliable baseline is the WHOLE current window: the last monotonically
# non-decreasing stretch of `used` in the ledger. It ends at the reset by
# itself, without knowing `resetsAt`.
print("\nslope over the WHOLE current window (the monotonic tail of the ledger); size the wave by this:")
for name in sorted({n for r in history for n in (r.get("buckets") or {})}):
    pts = [(r["ts"], (r.get("buckets") or {}).get(name, {}).get("used")) for r in history]
    pts = [(t, u) for t, u in pts if u is not None]
    if len(pts) < 2:
        continue
    i = len(pts) - 1
    while i > 0 and pts[i - 1][1] <= pts[i][1]:
        i -= 1
    seg = pts[i:]
    if len(seg) < 2:
        print(f"  {name:26} window just reset; no baseline, no verdict")
        continue
    hours = (seg[-1][0] - seg[0][0]) / 3_600_000
    if hours <= 0:
        continue
    rate = (seg[-1][1] - seg[0][1]) / hours
    rem = 100 - seg[-1][1]
    tail = f"; remainder {rem} pp → enough for {rem / rate:.1f} h" if rate > 0 else "; no spend"
    print(f"  {name:26} {seg[0][1]}% → {seg[-1][1]}% over {hours:.1f} h across {len(seg)} snapshots "
          f"= {rate:.2f} pp/hour{tail}")

if mode != "--report":
    with open(ledger, "a") as fh:
        fh.write(json.dumps(entry, ensure_ascii=False) + "\n")
    print(f"\nwritten to {ledger}")
PY
