#!/usr/bin/env bash
# ═══════════════════════════════════════════════════════════════════
# DOS Platform — Per-Tenant Migration Runner
#
# Applies SQL migration files from ops/migrations/tenant/*.sql to every
# active tenant schema recorded in dos.tenants. Tracks applied state in
# dos.schema_migrations with a qualified filename of the form:
#
#   tenant/<schema_name>/<file>.sql
#
# Each file is processed with __TENANT_SCHEMA__ substituted to the quoted
# schema name for the tenant being migrated.
#
# Skips already-applied files per (schema, file). Records the ORIGINAL
# file checksum (pre-substitution) so drift detection matches the file on
# disk, not the per-tenant rendering.
#
# Usage:
#   ./ops/scripts/run-tenant-migrations.sh              # use DATABASE_URL from env
#   DATABASE_URL=postgresql://... ./ops/scripts/run-tenant-migrations.sh
#   ./ops/scripts/run-tenant-migrations.sh --dry-run    # show what would run
#
# Invoked automatically as Phase 3 of ./ops/scripts/run-migrations.sh.
# ═══════════════════════════════════════════════════════════════════
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
TENANT_MIG_DIR="$REPO_ROOT/ops/migrations/tenant"
DRY_RUN=false

# shellcheck disable=SC1091
source "$SCRIPT_DIR/lib/load-env.sh"

for arg in "$@"; do
  case "$arg" in
    --dry-run) DRY_RUN=true ;;
  esac
done

if [ -z "${DATABASE_URL:-}" ]; then
  dos_load_shared_env || true
fi

if [ -z "${DATABASE_URL:-}" ]; then
  echo "ERROR: DATABASE_URL is not set. Export it or add it to platform/config-center/env/.env.shared"
  exit 1
fi

PSQL="psql ${DATABASE_URL} -v ON_ERROR_STOP=1"

echo "╔═══════════════════════════════════════════════════╗"
echo "║     DOS Platform — Per-Tenant Migration Runner    ║"
echo "╚═══════════════════════════════════════════════════╝"
echo ""

if [ ! -d "$TENANT_MIG_DIR" ] && [ ! -d "$REPO_ROOT/modules" ]; then
  echo "No tenant migrations directory at $TENANT_MIG_DIR and no $REPO_ROOT/modules — nothing to do."
  exit 0
fi
if [ ! -d "$TENANT_MIG_DIR" ]; then
  echo "Note: $TENANT_MIG_DIR does not exist — only module tenant migrations will run."
fi

# Ensure tracking table exists (in case platform runner was not invoked first).
$PSQL -q <<'SQL'
CREATE SCHEMA IF NOT EXISTS dos;
CREATE TABLE IF NOT EXISTS dos.schema_migrations (
  id            SERIAL PRIMARY KEY,
  filename      TEXT NOT NULL UNIQUE,
  checksum      TEXT NOT NULL,
  applied_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  applied_by    TEXT NOT NULL DEFAULT current_user,
  duration_ms   INTEGER
);
SQL

APPLIED=$($PSQL -t -A -c "SELECT filename FROM dos.schema_migrations ORDER BY filename")

# Enumerate tenant schemas (exclude deleted). dos.tenants is the source of truth.
TENANT_SCHEMAS_RAW=$(
  $PSQL -t -A -F '|' -c \
    "SELECT tenant_id, schema_name FROM dos.tenants WHERE status <> 'deleted' ORDER BY tenant_id"
)

if [ -z "$TENANT_SCHEMAS_RAW" ]; then
  echo "No active tenants found in dos.tenants — nothing to migrate."
  exit 0
fi

# Collect ops/migrations/tenant/*.sql files (ops-owned tenant migrations,
# tracked as tenant/<schema>/<file>.sql for back-compat).
MIG_FILES=()
if [ -d "$TENANT_MIG_DIR" ]; then
  while IFS= read -r -d '' mig; do
    [ -f "$mig" ] || continue
    fname=$(basename "$mig")
    # Locked exclusions — see ops/sql/sql-ownership.registry.yml runnersMustNotScan.
    case "$fname" in
      *_down.sql) continue ;;
    esac
    case "$mig" in
      */canonical/*) continue ;;
      */_frozen/*|*_frozen.sql|*_frozen_*.sql) continue ;;
      */ops/normalization/proposals/*) continue ;;
      */fixtures/*|*/tests/*|*/__tests__/*) continue ;;
    esac
    MIG_FILES+=("$mig")
  done < <(find "$TENANT_MIG_DIR" -maxdepth 1 -type f -name '*.sql' -print0 | sort -z)
fi

# Collect modules/<mod>/db/tenant/migrations/*.sql files (module-owned tenant
# migrations, tracked as tenant/<schema>/module/<mod>/<file>.sql).
# Stored as parallel arrays because bash 3 lacks associative arrays in some
# environments; MOD_MIG_FILES[i] is the file path, MOD_MIG_NAMES[i] is the module.
MOD_MIG_FILES=()
MOD_MIG_NAMES=()
MODULES_ROOT="$REPO_ROOT/modules"
if [ -d "$MODULES_ROOT" ]; then
  for mod_dir in $(find "$MODULES_ROOT" -mindepth 1 -maxdepth 1 -type d | sort); do
    mod=$(basename "$mod_dir")
    mod_tenant_dir="$mod_dir/db/tenant/migrations"
    [ -d "$mod_tenant_dir" ] || continue
    while IFS= read -r -d '' mig; do
      [ -f "$mig" ] || continue
      fname=$(basename "$mig")
      # Locked exclusions — see ops/sql/sql-ownership.registry.yml runnersMustNotScan.
      case "$fname" in
        *_down.sql) continue ;;
      esac
      case "$mig" in
        */canonical/*) continue ;;
        */_frozen/*|*_frozen.sql|*_frozen_*.sql) continue ;;
        */ops/normalization/proposals/*) continue ;;
        */fixtures/*|*/tests/*|*/__tests__/*) continue ;;
      esac
      MOD_MIG_FILES+=("$mig")
      MOD_MIG_NAMES+=("$mod")
    done < <(find "$mod_tenant_dir" -maxdepth 1 -type f -name '*.sql' -print0 | sort -z)
  done
fi

TOTAL_MIG=$(( ${#MIG_FILES[@]} + ${#MOD_MIG_FILES[@]} ))
if [ "$TOTAL_MIG" -eq 0 ]; then
  echo "No tenant migration files found (ops/migrations/tenant or modules/*/db/tenant/migrations)"
  exit 0
fi

# Tenant scripts (e.g. 022) reconcile dos.workflow_*; require service DDL first.
echo "── Pre-tenant guard: dos.workflow_instances ──"
WF_EXISTS=$(
  $PSQL -t -A -c \
    "SELECT EXISTS (
       SELECT 1 FROM information_schema.tables
       WHERE table_schema = 'dos' AND table_name = 'workflow_instances'
     )" | tr -d '[:space:]'
)
if [ "$WF_EXISTS" != "t" ]; then
  echo "ERROR: dos.workflow_instances not found."
  echo "Apply platform + service migrations first (./ops/scripts/run-migrations.sh Phases 1–2) so"
  echo "services/workflow-service/migrations/001_workflow_tables.sql creates dos.workflow_*."
  exit 1
fi
echo "   ✓ dos.workflow_instances present"

APPLIED_COUNT=0
PENDING_COUNT=0
FAILED=0

# Migrations whose filename matches this pattern trigger a mandatory
# pre-flight pg_dump snapshot of every active tenant schema. The snapshot
# script writes a receipt; this runner refuses to proceed without one.
DESTRUCTIVE_MIGRATION_PATTERN='^(12[0-9]|1[3-9][0-9]|2[0-9]{2})_(drop|dead|rename|reserve)_'
SNAPSHOT_DONE=false

ensure_snapshot_before_destructive() {
  local fname="$1"
  if [[ ! "$fname" =~ $DESTRUCTIVE_MIGRATION_PATTERN ]]; then
    return 0
  fi
  if [ "$SNAPSHOT_DONE" = true ]; then
    return 0
  fi
  if [ "$DRY_RUN" = true ]; then
    echo "→  [DRY RUN] Would take pre-flight snapshot for $fname"
    SNAPSHOT_DONE=true
    return 0
  fi
  local snapshot_script="$SCRIPT_DIR/snapshot-before-drop.sh"
  if [ ! -x "$snapshot_script" ]; then
    echo "ERROR: destructive migration $fname requires $snapshot_script but it is missing."
    return 1
  fi
  echo "── Pre-flight snapshot required for destructive migration $fname ──"
  if ! "$snapshot_script"; then
    echo "ERROR: snapshot failed; refusing to apply $fname"
    return 1
  fi
  local receipt="${DOS_BACKUP_ROOT:-$REPO_ROOT/ops/backups}/LATEST/RECEIPT"
  if [ ! -f "$receipt" ] || ! grep -q '^STATUS=OK' "$receipt"; then
    echo "ERROR: snapshot receipt missing or not OK: $receipt"
    return 1
  fi
  SNAPSHOT_DONE=true
  return 0
}

apply_one_tenant() {
  local migration="$1"
  local schema_name="$2"
  local tenant_id="$3"
  local qualified_override="${4:-}"

  local fname
  fname=$(basename "$migration")
  local qualified
  if [ -n "$qualified_override" ]; then
    qualified="$qualified_override"
  else
    qualified="tenant/$schema_name/$fname"
  fi

  local checksum
  checksum=$(sha256sum "$migration" | cut -d' ' -f1)

  if echo "$APPLIED" | grep -qxF "$qualified"; then
    local stored_checksum
    stored_checksum=$($PSQL -t -A -c "SELECT checksum FROM dos.schema_migrations WHERE filename = \$mig\$$qualified\$mig\$")
    if [ "$stored_checksum" != "$checksum" ]; then
      echo "⚠  DRIFT: $qualified checksum changed (stored: ${stored_checksum:0:12}… current: ${checksum:0:12}…)"
    fi
    APPLIED_COUNT=$((APPLIED_COUNT + 1))
    return 0
  fi

  PENDING_COUNT=$((PENDING_COUNT + 1))

  if ! ensure_snapshot_before_destructive "$fname"; then
    FAILED=$((FAILED + 1))
    return 1
  fi

  if [ "$DRY_RUN" = true ]; then
    echo "→  [DRY RUN] Would apply: $qualified"
    return 0
  fi

  echo "→  Applying: $qualified (tenant=$tenant_id) ..."

  # Render migration to a temp file with schema substitution.
  # Migration templates wrap the placeholder in quotes already: "__TENANT_SCHEMA__".
  # Substitute with the bare identifier so the final SQL reads: "tenant_xyz".
  local tmp
  tmp=$(mktemp)
  # Validate schema_name matches the tenantSchema() regex to prevent injection.
  if ! [[ "$schema_name" =~ ^[a-zA-Z0-9_]+$ ]]; then
    echo "   ✗ REFUSED: schema_name '$schema_name' contains unsafe characters"
    FAILED=$((FAILED + 1))
    return 1
  fi
  # Always prepend a SET search_path so migrations with unqualified table names
  # land in the correct tenant schema, even if the file has no placeholder of
  # its own. Migrations that already SET search_path themselves simply override.
  {
    printf 'SET search_path TO "%s", public;\n' "$schema_name"
    sed "s/__TENANT_SCHEMA__/$schema_name/g" "$migration"
  } > "$tmp"

  local START_MS END_MS DURATION_MS
  START_MS=$(date +%s%N)

  if $PSQL -f "$tmp" > /dev/null 2>&1; then
    END_MS=$(date +%s%N)
    DURATION_MS=$(( (END_MS - START_MS) / 1000000 ))
    $PSQL -q -c "INSERT INTO dos.schema_migrations (filename, checksum, duration_ms) VALUES (\$mig\$$qualified\$mig\$, '$checksum', $DURATION_MS)"
    echo "   ✓ Applied in ${DURATION_MS}ms"
    rm -f "$tmp"
    # Refresh APPLIED set so subsequent iterations see the new row without re-querying.
    APPLIED="$APPLIED"$'\n'"$qualified"
  else
    echo "   ✗ FAILED: $qualified"
    echo "     Rendered file kept for inspection: $tmp"
    FAILED=$((FAILED + 1))
    return 1
  fi
}

echo "── Applying ${#MIG_FILES[@]} ops tenant migration(s) + ${#MOD_MIG_FILES[@]} module tenant migration(s) to each active tenant ──"

while IFS='|' read -r tenant_id schema_name; do
  [ -n "$tenant_id" ] || continue
  [ -n "$schema_name" ] || continue

  # ops/migrations/tenant/*.sql → tenant/<schema>/<file>.sql
  for mig in "${MIG_FILES[@]}"; do
    if ! apply_one_tenant "$mig" "$schema_name" "$tenant_id"; then
      break 2
    fi
  done

  # modules/<mod>/db/tenant/migrations/*.sql → tenant/<schema>/module/<mod>/<file>.sql
  if [ "${#MOD_MIG_FILES[@]}" -gt 0 ]; then
    i=0
    while [ "$i" -lt "${#MOD_MIG_FILES[@]}" ]; do
      mig="${MOD_MIG_FILES[$i]}"
      mod="${MOD_MIG_NAMES[$i]}"
      fname=$(basename "$mig")
      qualified="tenant/$schema_name/module/$mod/$fname"
      if ! apply_one_tenant "$mig" "$schema_name" "$tenant_id" "$qualified"; then
        break 2
      fi
      i=$((i + 1))
    done
  fi
done <<< "$TENANT_SCHEMAS_RAW"

echo ""
echo "── Summary ──────────────────────────────────────────"
echo "  Already applied: $APPLIED_COUNT"
echo "  Newly applied:   $((PENDING_COUNT - FAILED))"
if [ $FAILED -gt 0 ]; then
  echo "  Failed:          $FAILED"
  exit 1
fi
if [ "$DRY_RUN" = true ] && [ $PENDING_COUNT -gt 0 ]; then
  echo "  Pending (dry run): $PENDING_COUNT"
fi
echo "  Status:          ✓ OK"
