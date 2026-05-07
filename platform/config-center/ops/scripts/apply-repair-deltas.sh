#!/usr/bin/env bash
# Repair-before-retry: apply repair deltas to every tenant out-of-order.
set -euo pipefail

show_help() {
  cat <<EOF
Usage: $(basename "$0") [OPTIONS]

Applies repair deltas to every tenant schema before retrying failed migrations.

Options:
  --help, -h           Show this help message

Environment Variables:
  PGHOST               PostgreSQL host (default: localhost)
  PGUSER               PostgreSQL user (default: shahin)
  PGPASSWORD           PostgreSQL password
  PGDATABASE           PostgreSQL database (default: shahin_grc)

Behavior:
  - Applies six repair deltas to every tenant schema
  - Records each delta in dos.tenant_migrations as 'applied'
  - Subsequent reconcile pass skips them and retries originals

Examples:
  # Apply repair deltas with default settings
  $(basename "$0)

  # With custom PostgreSQL settings
  PGHOST=db.example.com PGUSER=admin $(basename "$0)
EOF
  exit 0
}

for arg in "$@"; do
  case "$arg" in --help|-h) show_help ;; esac
done

export PGPASSWORD=${PGPASSWORD:-shahin_grc_2024}
PSQL="psql -h ${PGHOST:-localhost} -U ${PGUSER:-shahin} -d ${PGDATABASE:-shahin_grc} -v ON_ERROR_STOP=1 -tA"

DELTAS_TENANT=(
  "modules/team/db/tenant/migrations/029_team_view_idempotency_for_028.sql:module/team/029_team_view_idempotency_for_028"
  "modules/team/db/tenant/migrations/030_team_002_facets_skip_views.sql:module/team/030_team_002_facets_skip_views"
  "modules/team/db/tenant/migrations/031_team_027_indexes_skip_views.sql:module/team/031_team_027_indexes_skip_views"
  "modules/team/db/tenant/migrations/032_team_028_view_replace_idempotency.sql:module/team/032_team_028_view_replace_idempotency"
  "modules/incident/db/tenant/migrations/130_incidents_unique_for_fk.sql:module/incident/130_incidents_unique_for_fk"
)

SCHEMAS=$($PSQL -c "SELECT schema_name FROM information_schema.schemata WHERE schema_name ~ '^tenant_' ORDER BY schema_name")

declare -A APPLIED_PER_TENANT
declare -A FAILED_PER_TENANT

for schema in $SCHEMAS; do
  tenant_id="${schema#tenant_}"
  APPLIED_PER_TENANT[$tenant_id]=0
  FAILED_PER_TENANT[$tenant_id]=0
  for entry in "${DELTAS_TENANT[@]}"; do
    file="${entry%%:*}"
    mig_id="${entry##*:}"
    fname=$(basename "$file")
    checksum=$(sha256sum "$file" | cut -d' ' -f1)
    # Substitute placeholder
    sql=$(sed -e "s/\"__TENANT_SCHEMA__\"/\"$schema\"/g" -e "s/__TENANT_SCHEMA__/$schema/g" "$file")
    start_ms=$(date +%s%3N)
    # Run with search_path scoped to tenant
    set +e
    err=$(printf "%s" "SET search_path TO \"$schema\", public; $sql" | psql -h "${PGHOST:-localhost}" -U "${PGUSER:-shahin}" -d "${PGDATABASE:-shahin_grc}" -v ON_ERROR_STOP=1 -tA 2>&1)
    rc=$?
    set -e
    end_ms=$(date +%s%3N)
    dur=$((end_ms - start_ms))
    if [ $rc -eq 0 ]; then
      $PSQL -c "INSERT INTO dos.tenant_migrations (tenant_id, migration_id, source, filename, checksum, status, duration_ms, applied_by) VALUES ('$tenant_id', '$mig_id', 'module/${mig_id#module/}', '$fname', '$checksum', 'applied', $dur, 'apply-repair-deltas') ON CONFLICT (tenant_id, migration_id, checksum) DO UPDATE SET status='applied', applied_at=NOW(), error_message=NULL, applied_by=EXCLUDED.applied_by" >/dev/null
      APPLIED_PER_TENANT[$tenant_id]=$((${APPLIED_PER_TENANT[$tenant_id]} + 1))
    else
      err_short=$(echo "$err" | tr '\n' ' ' | head -c 1000)
      $PSQL -c "INSERT INTO dos.tenant_migrations (tenant_id, migration_id, source, filename, checksum, status, duration_ms, error_message, applied_by) VALUES ('$tenant_id', '$mig_id', 'module/${mig_id#module/}', '$fname', '$checksum', 'failed', $dur, \$em\$$err_short\$em\$, 'apply-repair-deltas') ON CONFLICT (tenant_id, migration_id, checksum) DO UPDATE SET status='failed', applied_at=NOW(), error_message=EXCLUDED.error_message" >/dev/null
      FAILED_PER_TENANT[$tenant_id]=$((${FAILED_PER_TENANT[$tenant_id]} + 1))
      echo "  FAIL $tenant_id $mig_id: $err_short" >&2
    fi
  done
  echo "$tenant_id: applied=${APPLIED_PER_TENANT[$tenant_id]} failed=${FAILED_PER_TENANT[$tenant_id]}"
done
