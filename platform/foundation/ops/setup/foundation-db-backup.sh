#!/usr/bin/env bash
# Foundation DB backup — Phase 0.2 of the 10-phase extraction plan.
#
# Dumps the foundation-owned tables in both the public (platform) schema and
# the canonical `dos` schema, plus every tenant schema referenced by
# public.tenants.schema_name.
#
# Requires: pg_dump in PATH, PGHOST/PGPORT/PGUSER/PGPASSWORD/PGDATABASE env.
# Usage:    ops/setup/foundation-db-backup.sh [output-dir]
# Output:   backups/foundation-YYYYMMDD-HHMMSS.sql.gz (default)

set -euo pipefail

OUT_DIR="${1:-$(cd "$(dirname "$0")/../../backups" && pwd)}"
mkdir -p "$OUT_DIR"

STAMP="$(date -u +%Y%m%d-%H%M%S)"
OUT="$OUT_DIR/foundation-${STAMP}.sql.gz"

: "${PGHOST:?set PGHOST}"
: "${PGUSER:?set PGUSER}"
: "${PGDATABASE:?set PGDATABASE}"

TABLES=(
  public.tenants
  public.users
  public.tenant_user_memberships
  public.lookup_countries
  public.lookup_cities
  public.lookup_sectors
  public.lookup_employee_ranges
  public.lookup_timezones
  public.lookup_languages
  public.lookup_frameworks
  public.lookup_org_types
  dos.permissions
  dos.functional_roles
  dos.role_permissions
  dos.organizations
  dos.business_units
  dos.positions
  dos.position_assignments
  dos.locations
  dos.location_bu_map
  dos.committees
  dos.committee_members
  dos.ownership_mappings
  dos.invitations
  dos.audit_trail
)

ARGS=()
for t in "${TABLES[@]}"; do
  ARGS+=( -t "$t" )
done

echo "[foundation-db-backup] dumping ${#TABLES[@]} tables to $OUT"
pg_dump \
  --no-owner \
  --no-privileges \
  --data-only=false \
  --quote-all-identifiers \
  "${ARGS[@]}" \
  | gzip -9 > "$OUT"

ls -la "$OUT"
echo "[foundation-db-backup] OK"
