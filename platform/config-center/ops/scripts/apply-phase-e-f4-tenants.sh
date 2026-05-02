#!/usr/bin/env bash
# ═══════════════════════════════════════════════════════════════════
# Phase H-3 — Apply Phase E + F-4 migrations to all live tenant schemas.
#
# Plan: /root/.claude/plans/need-to-clean-the-swift-trinket.md
#
# What it does
# ────────────
#   1. Loads platform/config-center/env/migrator.env to get MIGRATOR_DATABASE_URL.
#   2. Lists every tenant schema (`tenant_*` in pg_namespace) — or, if
#      `--tenant-filter <name>` is passed, just that one.
#   3. Pre-flight per tenant: counts rows in legacy team_* structure
#      tables. Refuses to proceed if any tenant has rows (the F-4 migration
#      drops empty tables only — a non-empty tenant needs a data migration
#      first, which is OUT OF SCOPE for this script).
#   4. For each tenant, in order:
#        Phase E:  platform/dauth/migrations/public/20260425_0010_consolidate_decision_logs.sql
#        Phase F-4: modules/team/db/tenant/migrations/028_team_structure_to_dos_views.sql
#      Each migration is run with TENANT_SCHEMA=$schema substituted via
#      envsubst (matches the documented pattern in 131_sod_rules.sql).
#   5. Post-flight: verifies the canonical authz_decision_log table and
#      the 3 legacy-name views exist.
#   6. Emits a JSON report to ops/reports/phase-e-f4-<timestamp>.json.
#   7. Exits non-zero if any tenant failed.
#
# Modes
# ─────
#   --dry-run                       Print what would happen; touch nothing.
#   --tenant-filter <name>          Only operate on the named tenant schema.
#   --rollback                      Run the *_down.sql files in reverse order.
#   --fail-fast-on-first-tenant     Abort the loop after the first failure
#                                   instead of trying every tenant. The JSON
#                                   report still records every tenant that
#                                   was processed before the abort.
#
# Usage
# ─────
#   ./ops/scripts/apply-phase-e-f4-tenants.sh --dry-run
#   ./ops/scripts/apply-phase-e-f4-tenants.sh --tenant-filter tenant_staging
#   ./ops/scripts/apply-phase-e-f4-tenants.sh
#   ./ops/scripts/apply-phase-e-f4-tenants.sh --rollback --tenant-filter tenant_staging
#   ./ops/scripts/apply-phase-e-f4-tenants.sh --fail-fast-on-first-tenant
# ═══════════════════════════════════════════════════════════════════
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
TIMESTAMP="$(date -u +%Y%m%dT%H%M%SZ)"
REPORT_DIR="$REPO_ROOT/ops/reports"
REPORT_FILE="$REPORT_DIR/phase-e-f4-$TIMESTAMP.json"

DRY_RUN=false
TENANT_FILTER=""
ROLLBACK=false
FAIL_FAST=false

while [ $# -gt 0 ]; do
  case "$1" in
    --dry-run)                   DRY_RUN=true; shift ;;
    --tenant-filter)             TENANT_FILTER="$2"; shift 2 ;;
    --rollback)                  ROLLBACK=true; shift ;;
    --fail-fast-on-first-tenant) FAIL_FAST=true; shift ;;
    -h|--help)
      sed -n '2,40p' "$0"
      exit 0 ;;
    *)
      echo "Unknown arg: $1" >&2
      exit 2 ;;
  esac
done

# ── Migrator role from platform/config-center/env/migrator.env ──
ENV_FILE="$REPO_ROOT/platform/config-center/env/migrator.env"
if [ ! -f "$ENV_FILE" ]; then
  echo "ERROR: migrator env not found at $ENV_FILE" >&2
  exit 2
fi
set -a
# shellcheck disable=SC1090
. "$ENV_FILE"
set +a

if [ -z "${MIGRATOR_DATABASE_URL:-}" ]; then
  echo "ERROR: MIGRATOR_DATABASE_URL not set in $ENV_FILE" >&2
  exit 2
fi

PSQL=(psql "$MIGRATOR_DATABASE_URL" -v ON_ERROR_STOP=1 --quiet --tuples-only --no-align)

# ── Migration paths ──
PHASE_E_UP="$REPO_ROOT/platform/dauth/migrations/public/20260425_0010_consolidate_decision_logs.sql"
PHASE_E_DOWN="$REPO_ROOT/platform/dauth/migrations/public/20260425_0010_consolidate_decision_logs_down.sql"
PHASE_F4_UP="$REPO_ROOT/modules/team/db/tenant/migrations/028_team_structure_to_dos_views.sql"
PHASE_F4_DOWN="$REPO_ROOT/modules/team/db/tenant/migrations/028_team_structure_to_dos_views_down.sql"

for f in "$PHASE_E_UP" "$PHASE_F4_UP" "$PHASE_E_DOWN" "$PHASE_F4_DOWN"; do
  if [ ! -f "$f" ]; then
    echo "ERROR: missing migration file $f" >&2
    exit 2
  fi
done

# ── Banner ──
mode_banner=""
$DRY_RUN  && mode_banner+="[DRY-RUN] "
$ROLLBACK && mode_banner+="[ROLLBACK] "
echo "╔═══════════════════════════════════════════════════════════════╗"
echo "║   Phase E + F-4 migration orchestrator $mode_banner"
echo "║   Migrator: ${PGUSER:-unknown}@${PGHOST:-unknown}/${PGDATABASE:-unknown}"
echo "║   Report:   $REPORT_FILE"
echo "╚═══════════════════════════════════════════════════════════════╝"

# ── Discover tenant schemas ──
if [ -n "$TENANT_FILTER" ]; then
  TENANTS=("$TENANT_FILTER")
else
  mapfile -t TENANTS < <(
    "${PSQL[@]}" -c "SELECT nspname FROM pg_namespace WHERE nspname LIKE 'tenant_%' AND nspname NOT LIKE 'pg_%' ORDER BY nspname"
  )
fi

if [ ${#TENANTS[@]} -eq 0 ]; then
  echo "No tenant schemas found. Nothing to do."
  exit 0
fi
echo "Discovered ${#TENANTS[@]} tenant schema(s): ${TENANTS[*]}"
echo ""

mkdir -p "$REPORT_DIR"

# ── Pre-flight: refuse non-empty team_* structure tables ──
preflight_check_tenant() {
  local schema="$1"
  for t in team_departments team_positions team_org_chart team_reporting_lines; do
    local exists
    exists="$("${PSQL[@]}" -c "SELECT 1 FROM pg_tables WHERE schemaname='$schema' AND tablename='$t'" 2>/dev/null || true)"
    if [ "$exists" = "1" ]; then
      local rows
      rows="$("${PSQL[@]}" -c "SELECT COUNT(*)::int FROM \"$schema\".$t" 2>/dev/null || echo "?")"
      if [ "$rows" != "0" ] && [ "$rows" != "?" ]; then
        echo "  pre-flight FAIL: $schema.$t has $rows rows" >&2
        return 1
      fi
    fi
  done
  return 0
}

# ── Apply / rollback a single migration to one tenant ──
apply_migration() {
  local schema="$1"
  local file="$2"
  local label="$3"

  if $DRY_RUN; then
    echo "  [dry-run] would apply $label → $schema"
    return 0
  fi

  # The migration files carry the literal placeholder __TENANT_SCHEMA__
  # (no $ prefix). envsubst would not touch it; sed does the substitution
  # safely because the placeholder cannot occur in real DDL.
  sed "s/__TENANT_SCHEMA__/${schema//\//\\/}/g" "$file" \
    | psql "$MIGRATOR_DATABASE_URL" -v ON_ERROR_STOP=1 --quiet >/dev/null
  # PIPESTATUS[1] = psql's exit. We must check it explicitly because
  # bash's `set -e` is disabled inside `&&` chains, so a pipe-fail
  # propagates only when we surface the rc by hand.
  local rc="${PIPESTATUS[1]}"
  if [ "$rc" -ne 0 ]; then
    echo "  ✗ FAILED $label → $schema (psql exit $rc)" >&2
    return "$rc"
  fi
  echo "  ✓ applied $label → $schema"
}

# ── Post-flight verification ──
post_check_tenant() {
  local schema="$1"
  $DRY_RUN && return 0
  local table_count view_count
  table_count="$("${PSQL[@]}" -c "SELECT COUNT(*) FROM pg_tables WHERE schemaname='$schema' AND tablename='authz_decision_log'")"
  view_count="$("${PSQL[@]}" -c "SELECT COUNT(*) FROM pg_views WHERE schemaname='$schema' AND viewname IN ('authorization_decision_log','guard_decision_log','policy_decision_log')")"
  if [ "$table_count" != "1" ]; then
    echo "  post-check FAIL: authz_decision_log not present in $schema" >&2
    return 1
  fi
  if [ "$view_count" != "3" ]; then
    echo "  post-check FAIL: expected 3 legacy-name views in $schema, got $view_count" >&2
    return 1
  fi
  return 0
}

# ── Main loop ──
declare -a REPORT_ENTRIES=()
declare -i FAIL_COUNT=0

for schema in "${TENANTS[@]}"; do
  echo "── tenant: $schema"
  status="applied"
  err_msg=""

  if ! $ROLLBACK; then
    if ! preflight_check_tenant "$schema"; then
      status="skipped_preflight"
      err_msg="non-empty legacy team_* tables present"
      FAIL_COUNT+=1
    else
      if apply_migration "$schema" "$PHASE_E_UP" "Phase E up" \
         && apply_migration "$schema" "$PHASE_F4_UP" "Phase F-4 up" \
         && post_check_tenant "$schema"; then
        :
      else
        status="failed"
        err_msg="see psql output above"
        FAIL_COUNT+=1
      fi
    fi
  else
    if apply_migration "$schema" "$PHASE_F4_DOWN" "Phase F-4 down" \
       && apply_migration "$schema" "$PHASE_E_DOWN" "Phase E down"; then
      status="rolled_back"
    else
      status="rollback_failed"
      err_msg="see psql output above"
      FAIL_COUNT+=1
    fi
  fi

  REPORT_ENTRIES+=("{\"tenant\":\"$schema\",\"status\":\"$status\",\"error\":\"$err_msg\"}")

  # Fail-fast: bail on the first failure so ops can investigate before
  # touching the next tenant. Useful for canary rollouts and for catching
  # privilege-grant regressions before they propagate.
  if $FAIL_FAST && [ "$FAIL_COUNT" -gt 0 ]; then
    echo "── --fail-fast-on-first-tenant: aborting after first failure on $schema" >&2
    break
  fi
done

# ── Write JSON report ──
{
  echo "{"
  echo "  \"mode\": \"$($ROLLBACK && echo rollback || echo apply)$($DRY_RUN && echo "+dry-run" || echo "")\","
  echo "  \"timestamp\": \"$TIMESTAMP\","
  echo "  \"migrator\": \"${PGUSER:-unknown}@${PGHOST:-unknown}/${PGDATABASE:-unknown}\","
  echo "  \"tenant_count\": ${#TENANTS[@]},"
  echo "  \"failures\": $FAIL_COUNT,"
  echo "  \"results\": ["
  printf '    %s' "${REPORT_ENTRIES[0]:-}"
  for ((i=1; i<${#REPORT_ENTRIES[@]}; i++)); do
    printf ',\n    %s' "${REPORT_ENTRIES[$i]}"
  done
  echo ""
  echo "  ]"
  echo "}"
} > "$REPORT_FILE"

echo ""
echo "Report: $REPORT_FILE"
echo "Tenants processed: ${#TENANTS[@]}, failures: $FAIL_COUNT"

if [ "$FAIL_COUNT" -gt 0 ]; then
  exit 1
fi
exit 0
