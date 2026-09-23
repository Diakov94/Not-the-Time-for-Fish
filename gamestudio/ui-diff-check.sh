#!/usr/bin/env bash
#
# WHAT IN A UI ROLE'S DELIVERY MUST BE READ BY EYE BEFORE MERGING.
#
# Why. The interface provider is trusted with the look and layout, not with the
# game's rules (the owner's directive: it can be trusted with the interface
# only). Green gates do not check that: on 11 August 2026 a UI worker touched
# the module that owns saves, the branch landed on a green gate run, and the Producer read
# the diff only AFTER the merge.
#
# The instrument prints the files WITH LOGIC OUTSIDE THE UI ZONE. Each of them
# is read as a diff before merging. Empty means gates and screenshots are enough.
#
# Usage:
#   gamestudio/ui-diff-check.sh <branch> [base]
#
# The zones are taken from `.studio/zones.conf` if it exists; otherwise they are
# derived from the project's engine. The config file is two lines of shell
# arrays:
#
#   LOGIC_GLOBS=('*.ts' '*.tsx')
#   UI_GLOBS=('src/ui/*' 'src/i18n/*' '*.css')
#
set -u

BRANCH="${1:?branch required}"
BASE="${2:-main}"
ROOT="$(git rev-parse --show-toplevel)"
CONF="$ROOT/.studio/zones.conf"

if [ -f "$CONF" ]; then
  # shellcheck disable=SC1090
  . "$CONF"
  ENGINE="from .studio/zones.conf"
elif [ -f "$ROOT/project.godot" ]; then
  ENGINE="Godot"
  LOGIC_GLOBS=('*.gd' '*.cs')
  UI_GLOBS=('*/ui/*' '*/gui/*' '*.tscn' '*.tres' '*.theme' '*/i18n/*' '*/locale*/*')
elif ls "$ROOT"/ProjectSettings/ProjectVersion.txt >/dev/null 2>&1 || ls "$ROOT"/*.sln >/dev/null 2>&1; then
  ENGINE="Unity"
  LOGIC_GLOBS=('*.cs')
  UI_GLOBS=('Assets/UI/*' 'Assets/Scripts/UI/*' '*.uxml' '*.uss' '*.prefab' 'Assets/Localization/*')
elif [ -f "$ROOT/package.json" ]; then
  ENGINE="web / TypeScript"
  LOGIC_GLOBS=('*.ts' '*.tsx' '*.js')
  UI_GLOBS=('src/ui/*' 'src/i18n/*' '*.css' '*.html')
else
  echo "engine not recognised: create .studio/zones.conf with LOGIC_GLOBS and UI_GLOBS" >&2
  exit 2
fi

# Tests and fixtures do not count as logic: they do not ship to the player.
TEST_RE='(\.test\.|\.spec\.|_test\.|Tests?/|__tests__/|\.fixture\.)'

changed=$(git diff --name-only "$BASE...$BRANCH")

in_ui() {
  local f="$1" g
  for g in "${UI_GLOBS[@]}"; do
    # shellcheck disable=SC2053
    case "$f" in $g) return 0 ;; esac
  done
  return 1
}
is_logic() {
  local f="$1" g
  for g in "${LOGIC_GLOBS[@]}"; do
    # shellcheck disable=SC2053
    case "$f" in $g) return 0 ;; esac
  done
  return 1
}

echo "engine: $ENGINE · branch $BRANCH against $BASE"
echo
echo "=== LOGIC OUTSIDE THE UI ZONE: READ THE DIFF BEFORE MERGING ==="
found=0
while IFS= read -r f; do
  [ -z "$f" ] && continue
  echo "$f" | grep -Eq "$TEST_RE" && continue
  is_logic "$f" || continue
  in_ui "$f" && continue
  echo "    $f"
  found=1
done <<< "$changed"
[ "$found" = 0 ] && echo "    (empty: gates and screenshots are enough)"

echo
echo "=== files in the UI zone ==="
echo "$changed" | while IFS= read -r f; do
  [ -z "$f" ] && continue
  in_ui "$f" && echo "    $f"
done | head -20

exit 0
