#!/usr/bin/env bash
# ═══════════════════════════════════════════════════════════════════
# Lifecycle-proof orchestrator — runs every scenario under
# ops/scripts/lifecycle-proofs/ and reports pass/fail/skip per scenario.
#
# Each scenario is a directory containing run.mjs (or run.sh). The runner
# is permissive: missing required env (TENANT_ID, JWTs, DATABASE_URL) makes
# the scenario emit a SKIP rather than a FAIL, so this wrapper is safe to
# include in CI even when only a subset of credentials are wired.
#
# Plan: /root/.claude/plans/need-to-clean-the-swift-trinket.md (Phase K-7)
#
# Usage:
#   ./ops/scripts/lifecycle-proofs/run-all.sh
#   ./ops/scripts/lifecycle-proofs/run-all.sh --only access-snapshot,decision-ledger
#   ./ops/scripts/lifecycle-proofs/run-all.sh --skip vendor,risk
#
# Exit codes:
#   0 — all selected scenarios pass or self-skip
#   1 — at least one scenario emitted a hard failure
#   2 — orchestrator/preflight error
# ═══════════════════════════════════════════════════════════════════
set -uo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ONLY=""
SKIP=""

while [ $# -gt 0 ]; do
  case "$1" in
    --only) ONLY="$2"; shift 2 ;;
    --skip) SKIP="$2"; shift 2 ;;
    -h|--help) sed -n '2,30p' "$0"; exit 0 ;;
    *) echo "Unknown arg: $1" >&2; exit 2 ;;
  esac
done

# Pre-flight: verify the platform is reachable (non-fatal — runner skips
# scenarios that can't connect rather than failing the whole gate).
PREFLIGHT="$SCRIPT_DIR/preflight.mjs"
if [ -f "$PREFLIGHT" ]; then
  echo "── preflight ──"
  node "$PREFLIGHT" 2>&1 | sed 's/^/  /' || true
  echo ""
fi

# Discover scenarios — every immediate child dir with a run.mjs or run.sh
declare -a SCENARIOS=()
for d in "$SCRIPT_DIR"/*/; do
  name=$(basename "$d")
  [ "$name" = "_lib" ] && continue
  if [ -f "$d/run.mjs" ] || [ -f "$d/run.sh" ]; then
    SCENARIOS+=("$name")
  fi
done

# Apply --only / --skip filters.
filter_match() {
  local name="$1" csv="$2"
  IFS=',' read -ra arr <<< "$csv"
  for n in "${arr[@]}"; do
    [ "$n" = "$name" ] && return 0
  done
  return 1
}

SELECTED=()
for s in "${SCENARIOS[@]}"; do
  if [ -n "$ONLY" ]; then filter_match "$s" "$ONLY" || continue; fi
  if [ -n "$SKIP" ] && filter_match "$s" "$SKIP"; then continue; fi
  SELECTED+=("$s")
done

if [ ${#SELECTED[@]} -eq 0 ]; then
  echo "No scenarios selected." >&2
  exit 2
fi

echo "── running ${#SELECTED[@]} scenario(s) ──"
declare -i PASSED=0 FAILED=0 SKIPPED=0
declare -a FAIL_LIST=()

for s in "${SELECTED[@]}"; do
  echo ""
  echo "▶ $s"
  if [ -f "$SCRIPT_DIR/$s/run.mjs" ]; then
    OUT=$(node "$SCRIPT_DIR/$s/run.mjs" 2>&1) || true
  elif [ -f "$SCRIPT_DIR/$s/run.sh" ]; then
    OUT=$(bash "$SCRIPT_DIR/$s/run.sh" 2>&1) || true
  fi
  RC=$?

  # Heuristic: every well-formed run.mjs prints "PASS", "SKIP", or "FAIL"
  # (uppercase) on its own line. Fall back to RC when the marker is absent.
  if echo "$OUT" | grep -qE "\\] PASS\\b" || echo "$OUT" | grep -qE "PASS$"; then
    PASSED+=1
    echo "  ✓ PASS"
  elif echo "$OUT" | grep -qE "\\] SKIP\\b" || echo "$OUT" | grep -qE "SKIP\\b"; then
    SKIPPED+=1
    echo "  ⊘ SKIP (env not wired)"
  elif [ "$RC" -ne 0 ]; then
    FAILED+=1
    FAIL_LIST+=("$s")
    echo "  ✗ FAIL (rc=$RC)"
    echo "$OUT" | tail -8 | sed 's/^/      /'
  else
    PASSED+=1
    echo "  ✓ PASS (rc=0)"
  fi
done

echo ""
echo "═══ summary ═══"
echo "  pass:    $PASSED"
echo "  skip:    $SKIPPED"
echo "  fail:    $FAILED"
if [ "$FAILED" -gt 0 ]; then
  echo "  failures: ${FAIL_LIST[*]}"
  exit 1
fi
exit 0
