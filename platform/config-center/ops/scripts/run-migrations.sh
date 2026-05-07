#!/usr/bin/env bash
# ═══════════════════════════════════════════════════════════════════
# DOS Platform — Unified Migration Runner
# ═══════════════════════════════════════════════════════════════════
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
PLATFORM_MIG_DIR="$REPO_ROOT/ops/migrations"
SERVICES_DIR="$REPO_ROOT/services"
DRY_RUN=false

show_help() {
  cat <<EOF
Usage: $(basename "$0") [OPTIONS]

Applies SQL migration files from platform-global and per-service locations.

Options:
  --dry-run            Show what would be run without executing
  --help, -h           Show this help message

Environment Variables:
  DATABASE_URL         PostgreSQL connection string

Migration Pipeline:
  1. Platform-global migrations: ops/migrations/*.sql
  2. Per-service migrations: services/<service>/migrations/*.sql

Tracking:
  Applied migrations tracked in dos.schema_migrations with qualified filenames:
  - "platform/<file>.sql" for ops/migrations/<file>.sql
  - "service/<svc>/<file>.sql" for services/<svc>/migrations/<file>.sql

Examples:
  # Run all migrations
  $(basename "$0)

  # Dry run to preview
  $(basename "$0) --dry-run

  # With explicit DATABASE_URL
  DATABASE_URL=postgresql://... $(basename "$0)
EOF
  exit 0
}

# shellcheck disable=SC1091
source "$SCRIPT_DIR/lib/load-env.sh"

for arg in "$@"; do
  case "$arg" in
    --dry-run) DRY_RUN=true ;;
    --help|-h) show_help ;;
  esac
done

# Resolve DATABASE_URL
if [ -z "${DATABASE_URL:-}" ]; then
  dos_load_shared_env || true
fi

if [ -z "${DATABASE_URL:-}" ]; then
  echo "ERROR: DATABASE_URL is not set. Export it or add it to platform/config-center/env/.env.shared"
  exit 1
fi

PSQL="psql ${DATABASE_URL} -v ON_ERROR_STOP=1"

echo "╔═══════════════════════════════════════════════════╗"
echo "║     DOS Platform — Unified Migration Runner       ║"
echo "╚═══════════════════════════════════════════════════╝"
echo ""

# Create tracking table if not exists
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

echo "✓ Migration tracking table ready"
echo ""

# Load already-applied set once
APPLIED=$($PSQL -t -A -c "SELECT filename FROM dos.schema_migrations ORDER BY filename")

APPLIED_COUNT=0
PENDING_COUNT=0
FAILED=0

# Locked exclusions — see ops/sql/sql-ownership.registry.yml runnersMustNotScan.
# Returns 0 (true) if the path should be skipped.
is_excluded_path() {
  local p="$1"
  case "$p" in
    */canonical/*) return 0 ;;
    */_frozen/*|*_frozen.sql|*_frozen_*.sql) return 0 ;;
    */ops/normalization/proposals/*) return 0 ;;
    */fixtures/*|*/tests/*|*/__tests__/*) return 0 ;;
    *_down.sql) return 0 ;;
  esac
  return 1
}

apply_one() {
  local migration="$1"
  local qualified="$2"

  if is_excluded_path "$migration"; then
    return 0
  fi

  local checksum
  checksum=$(sha256sum "$migration" | cut -d' ' -f1)

  if echo "$APPLIED" | grep -qxF "$qualified"; then
    local stored_checksum
    stored_checksum=$($PSQL -t -A -c "SELECT checksum FROM dos.schema_migrations WHERE filename = '$qualified'")
    if [ "$stored_checksum" != "$checksum" ]; then
      echo "⚠  DRIFT: $qualified checksum changed (stored: ${stored_checksum:0:12}… current: ${checksum:0:12}…)"
    fi
    APPLIED_COUNT=$((APPLIED_COUNT + 1))
    return 0
  fi

  PENDING_COUNT=$((PENDING_COUNT + 1))

  if [ "$DRY_RUN" = true ]; then
    echo "→  [DRY RUN] Would apply: $qualified"
    return 0
  fi

  echo "→  Applying: $qualified ..."
  local START_MS END_MS DURATION_MS
  START_MS=$(date +%s%N)

  if $PSQL -f "$migration" > /dev/null 2>&1; then
    END_MS=$(date +%s%N)
    DURATION_MS=$(( (END_MS - START_MS) / 1000000 ))
    # Use dollar-quoted literal to survive filenames with apostrophes or quotes
    $PSQL -q -c "INSERT INTO dos.schema_migrations (filename, checksum, duration_ms) VALUES (\$mig\$$qualified\$mig\$, '$checksum', $DURATION_MS)"
    echo "   ✓ Applied in ${DURATION_MS}ms"
  else
    echo "   ✗ FAILED: $qualified"
    FAILED=$((FAILED + 1))
    return 1
  fi
}

# ── Phase 1: Platform-global migrations ──────────────────────────────
echo "── Phase 1: Platform-global migrations ($PLATFORM_MIG_DIR) ──"
if [ -d "$PLATFORM_MIG_DIR" ]; then
  # Only flat *.sql files; ignore subdirectories (rollback/, tenant/, etc.)
  # Skip *_down.sql — those are explicit rollbacks, not forward migrations.
  while IFS= read -r -d '' mig; do
    [ -f "$mig" ] || continue
    fname=$(basename "$mig")
    case "$fname" in
      *_down.sql) continue ;;
    esac
    qualified="platform/$fname"
    if ! apply_one "$mig" "$qualified"; then
      break
    fi
  done < <(find "$PLATFORM_MIG_DIR" -maxdepth 1 -type f -name '*.sql' -print0 | sort -z)
fi

# ── Phase 2: Per-service migrations ──────────────────────────────────
if [ "$FAILED" -eq 0 ]; then
  echo ""
  echo "── Phase 2: Per-service migrations ($SERVICES_DIR) ──"
  # Deterministic service order
  for svc_dir in $(find "$SERVICES_DIR" -mindepth 1 -maxdepth 1 -type d | sort); do
    svc=$(basename "$svc_dir")
    # Only process services that actually have a migrations/ directory
    if [ ! -d "$svc_dir/migrations" ]; then
      continue
    fi
    # Run only numeric-prefixed top-level migration files; skip *_down.sql
    while IFS= read -r -d '' mig; do
      [ -f "$mig" ] || continue
      fname=$(basename "$mig")
      case "$fname" in
        *_down.sql) continue ;;
      esac
      qualified="service/$svc/$fname"
      if ! apply_one "$mig" "$qualified"; then
        break 2
      fi
    done < <(find "$svc_dir/migrations" -maxdepth 1 -type f -name '*.sql' -print0 | sort -z)
  done
fi

# ── Phase 2b: Per-module migrations (modules/*/db/...) ───────────────
# Two layouts are supported per module:
#   1. Flat:  modules/<mod>/db/migrations/*.sql        → module/<mod>/<file>.sql
#   2. Split: modules/<mod>/db/public/migrations/*.sql → module/<mod>/public/<file>.sql
#      (Per-tenant migrations under modules/<mod>/db/tenant/migrations/*.sql
#       are applied by run-tenant-migrations.sh during Phase 3.)
# A module may declare an ordered bundle at modules/<mod>/db/module-migration-bundle.json
# (currently honored only for the flat layout). Otherwise we fall back to a
# lexicographic sweep.
if [ "$FAILED" -eq 0 ]; then
  echo ""
  echo "── Phase 2b: Per-module migrations ($REPO_ROOT/modules) ──"
  if [ -d "$REPO_ROOT/modules" ]; then
    MODULE_DIRS=()
    if [ -d "$REPO_ROOT/modules/platform-core" ]; then
      MODULE_DIRS+=("$REPO_ROOT/modules/platform-core")
    fi
    while IFS= read -r mod_dir; do
      [ -d "$mod_dir" ] || continue
      if [ "$mod_dir" = "$REPO_ROOT/modules/platform-core" ]; then
        continue
      fi
      MODULE_DIRS+=("$mod_dir")
    done < <(find "$REPO_ROOT/modules" -mindepth 1 -maxdepth 1 -type d | sort)

    for mod_dir in "${MODULE_DIRS[@]}"; do
      mod=$(basename "$mod_dir")

      # ── Layout 1: flat (modules/<mod>/db/migrations) ─────────────
      mig_dir="$mod_dir/db/migrations"
      if [ -d "$mig_dir" ]; then
        bundle="$mod_dir/db/module-migration-bundle.json"
        if [ -f "$bundle" ] && command -v python3 >/dev/null 2>&1; then
          ORDERED=$(python3 -c "import json,sys; d=json.load(open('$bundle')); print('\n'.join(x['file'] for x in d.get('ordered',[])))" 2>/dev/null || true)
        else
          ORDERED=""
        fi
        if [ -n "$ORDERED" ]; then
          while IFS= read -r fname; do
            [ -z "$fname" ] && continue
            mig="$mig_dir/$fname"
            [ -f "$mig" ] || { echo "⚠  bundle references missing $mig"; continue; }
            qualified="module/$mod/$fname"
            if ! apply_one "$mig" "$qualified"; then
              break 2
            fi
          done <<< "$ORDERED"
        else
          while IFS= read -r -d '' mig; do
            [ -f "$mig" ] || continue
            fname=$(basename "$mig")
            case "$fname" in
              *_down.sql) continue ;;
            esac
            qualified="module/$mod/$fname"
            if ! apply_one "$mig" "$qualified"; then
              break 2
            fi
          done < <(find "$mig_dir" -maxdepth 1 -type f -name '*.sql' -print0 | sort -z)
        fi
      fi

      # ── Layout 2: split public (modules/<mod>/db/public/migrations) ──
      pub_dir="$mod_dir/db/public/migrations"
      if [ -d "$pub_dir" ]; then
        while IFS= read -r -d '' mig; do
          [ -f "$mig" ] || continue
          fname=$(basename "$mig")
          case "$fname" in
            *_down.sql) continue ;;
          esac
          qualified="module/$mod/public/$fname"
          if ! apply_one "$mig" "$qualified"; then
            break 2
          fi
        done < <(find "$pub_dir" -maxdepth 1 -type f -name '*.sql' -print0 | sort -z)
      fi
    done
  fi
fi

# Plan literal: expose module-scoped migrations as a view for operators.
set +e
$PSQL -q <<'SQL'
CREATE OR REPLACE VIEW dos.module_migrations AS
  SELECT
    split_part(filename, '/', 2) AS module,
    split_part(filename, '/', 3) AS file,
    checksum                      AS sha,
    applied_at
  FROM dos.schema_migrations
  WHERE filename LIKE 'module/%';
SQL
VIEW_EXIT=$?
set -e
if [ "$VIEW_EXIT" -ne 0 ]; then
  echo "⚠  module_migrations view creation skipped (non-fatal; DB may be Citus-distributed)."
fi

# ── Pre-tenant guard (matches ops/scripts/validate-migrations.mjs) ───
if [ "$FAILED" -eq 0 ]; then
  echo ""
  echo "── Pre-tenant guard: dos.workflow_instances ──"
  WF_EXISTS=$(
    $PSQL -t -A -c \
      "SELECT EXISTS (
         SELECT 1 FROM information_schema.tables
         WHERE table_schema = 'dos' AND table_name = 'workflow_instances'
       )" | tr -d '[:space:]'
  )
  if [ "$WF_EXISTS" != "t" ]; then
    echo "ERROR: dos.workflow_instances is missing after Phase 2."
    echo "Tenant migrations (e.g. ops/migrations/tenant/022_reconcile_workflow_tables.sql) expect"
    echo "services/workflow-service/migrations/001_workflow_tables.sql to have been applied first."
    FAILED=1
  else
    echo "   ✓ dos.workflow_instances present"
  fi
fi

# ── Phase 3: Per-tenant migrations ───────────────────────────────────
if [ "$FAILED" -eq 0 ]; then
  echo ""
  echo "── Phase 3: Per-tenant migrations ($PLATFORM_MIG_DIR/tenant) ──"
  TENANT_RUNNER="$SCRIPT_DIR/run-tenant-migrations.sh"
  if [ -x "$TENANT_RUNNER" ]; then
    if [ "$DRY_RUN" = true ]; then
      "$TENANT_RUNNER" --dry-run || FAILED=$((FAILED + 1))
    else
      "$TENANT_RUNNER" || FAILED=$((FAILED + 1))
    fi
  else
    echo "⚠  Tenant runner not found or not executable: $TENANT_RUNNER — skipping Phase 3"
  fi
fi

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
