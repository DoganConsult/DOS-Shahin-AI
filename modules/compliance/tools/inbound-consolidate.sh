#!/usr/bin/env bash
# Inbound consolidation: history-preserving git-mv of three sibling legacy roots
# (Controls Module / Attestation Module / ksa-regulatory Module) and the
# matching packages/modules/{controls,ksa-regulatory,packs} thin packages
# into modules/compliance/_inbound/<slug>/.
#
# This replaces the deprecated compliance-boundary-consolidate.sh, which used
# raw `mv`, referenced stale paths, and had no dry-run. This tool always
# uses `git mv` (so `git log --follow` continues to track each file across
# the rename) and dry-runs by default.
#
# Usage:
#   ./inbound-consolidate.sh                  # dry-run
#   ./inbound-consolidate.sh --apply          # execute git mv
#
set -euo pipefail

# Anchor to "DOS Platform/" (this script lives at modules/compliance/tools/).
# The repo's git root is one level higher (/root/DOS-AIO), so we cannot rely on
# `git rev-parse --show-toplevel` for path resolution.
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PLATFORM_ROOT="$(cd "$SCRIPT_DIR/../../.." && pwd)"
cd "$PLATFORM_ROOT"

DEST_BASE="modules/compliance/_inbound"
REPORT="$DEST_BASE/_move-report.txt"
APPLY=0

for arg in "$@"; do
  case "$arg" in
    --apply) APPLY=1 ;;
    --dry-run) APPLY=0 ;;
    -h|--help)
      sed -n '1,/^set -euo/p' "$0" | sed -n '2,/^set -euo/p' | sed 's/^# \{0,1\}//'
      exit 0
      ;;
    *) echo "unknown arg: $arg" >&2; exit 2 ;;
  esac
done

# (src-prefix, dest-slug) pairs. dest is modules/compliance/_inbound/<slug>/<rel-path>.
SOURCES=(
  "Controls Module|controls"
  "Attestation Module|attestation"
  "ksa-regulatory Module|ksa-regulatory"
  "packages/modules/controls|controls-package"
  "packages/modules/ksa-regulatory|ksa-regulatory-package"
  "packages/modules/packs|packs-package"
)

# Refuse if any in-scope source is itself in mid-merge / has unresolved conflicts.
for entry in "${SOURCES[@]}"; do
  src="${entry%%|*}"
  if [ ! -d "$src" ]; then
    echo "MISSING source dir: $src (skipping)" >&2
    continue
  fi
  if git status --porcelain "$src" 2>/dev/null | grep -qE '^(UU|AA|DD)'; then
    echo "ERROR: unresolved conflicts inside $src" >&2
    exit 1
  fi
done

# Collect (src, dst) pairs.
TMP="$(mktemp)"
trap 'rm -f "$TMP"' EXIT

for entry in "${SOURCES[@]}"; do
  src="${entry%%|*}"
  slug="${entry##*|}"
  if [ ! -d "$src" ]; then continue; fi
  while IFS= read -r f; do
    rel="${f#"$src"/}"
    dst="$DEST_BASE/$slug/$rel"
    printf '%s\t%s\n' "$f" "$dst" >> "$TMP"
  done < <(git ls-files -z "$src" | tr '\0' '\n')
done

count=$(wc -l < "$TMP")
echo "Files to move: $count"

if [ "$count" -eq 0 ]; then
  echo "Nothing to do."
  exit 0
fi

echo
echo "Sample (first 10):"
head -10 "$TMP" | awk -F'\t' '{printf "  %s\n    -> %s\n", $1, $2}'
echo

if [ "$APPLY" -eq 0 ]; then
  echo "DRY-RUN. Re-run with --apply to execute."
  exit 0
fi

mkdir -p "$DEST_BASE"
: > "$REPORT"
{
  echo "# Inbound consolidation move report"
  echo "# Generated: $(date -u +%Y-%m-%dT%H:%M:%SZ)"
  echo "# Total files moved: $count"
  echo
} >> "$REPORT"

moved=0
while IFS=$'\t' read -r src dst; do
  mkdir -p "$(dirname "$dst")"
  git mv -k "$src" "$dst"
  printf '%s -> %s\n' "$src" "$dst" >> "$REPORT"
  moved=$((moved + 1))
done < "$TMP"

# After moves, the legacy source dirs may be empty of tracked files but still
# contain gitignored dist/node_modules. Leave that physical cleanup to the
# import-rewrite commit (Step 3 of the consolidation plan).

echo
echo "DONE. Moved $moved files."
echo "Report: $REPORT"
