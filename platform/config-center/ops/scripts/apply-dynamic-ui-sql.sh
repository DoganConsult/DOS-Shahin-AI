#!/usr/bin/env bash
# Apply Dynamic UI SQL migrations and seeds to a PostgreSQL database.
set -euo pipefail

show_help() {
  cat <<EOF
Usage: $(basename "$0") [DATABASE_URL] [OPTIONS]

Applies Dynamic UI SQL migrations and seeds to PostgreSQL.

Arguments:
  DATABASE_URL         PostgreSQL connection string (or set via env)

Options:
  --help, -h           Show this help message

Environment Variables:
  DATABASE_URL         PostgreSQL connection string

Order:
  1. Migrations 001–006
  2. Seeds 001–011
  3. Foundation completion seeds 019–022

Examples:
  # Apply with DATABASE_URL env
  DATABASE_URL=postgresql://... $(basename "$0)

  # Pass DATABASE_URL as argument
  $(basename "$0) 'postgresql://user:pass@host:port/dbname'
EOF
  exit 0
}

for arg in "$@"; do
  case "$arg" in --help|-h) show_help ;; esac
done

ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
DB_URL="${1:-${DATABASE_URL:-}}"
if [[ -z "$DB_URL" ]]; then
  echo "Usage: DATABASE_URL=... $0   OR   $0 'postgresql://user:pass@host:port/dbname'" >&2
  exit 1
fi

MIG="$ROOT/platform/dynamic-ui/db/public/migrations"
SEED="$ROOT/platform/dynamic-ui/db/public/seeds"
COMPLIANCE_SEED="$ROOT/modules/compliance/db/seeds/dynamic-ui"
CONTRACT_JSON="$SEED/foundation-contract.json"

run() {
  local f="$1"
  echo "==> $f"
  psql "$DB_URL" -v ON_ERROR_STOP=1 -f "$f"
}

run_with_contract() {
  local f="$1"
  echo "==> $f (contract=$CONTRACT_JSON)"
  psql "$DB_URL" -v ON_ERROR_STOP=1 -v contract_path="$CONTRACT_JSON" -f "$f"
}

run "$MIG/001_dynamic_ui_core.sql"
run "$MIG/002_dynamic_ui_navigation_routes.sql"
run "$MIG/003_dynamic_ui_shells_registry.sql"
run "$MIG/004_dynamic_ui_route_permissions.sql"
run "$MIG/005_dynamic_ui_readiness.sql"
run "$MIG/006_dynamic_ui_page_experience.sql"

run "$SEED/001_seed_foundation_module.sql"
run "$SEED/002_seed_foundation_nav_routes_shell.sql"
run "$SEED/003_seed_sample_unavailable_module.sql"
run "$SEED/004_seed_sample_ops_not_enrolled.sql"
run "$SEED/005_seed_foundation_contract.sql"

if [[ -f "$CONTRACT_JSON" ]]; then
  run_with_contract "$SEED/005a_seed_foundation_contract_from_json.sql"
else
  echo "(skip) 005a — $CONTRACT_JSON not present; run publish-contract.mjs to regenerate."
fi

run "$SEED/006_seed_foundation_permissions.sql"
run "$SEED/007_seed_test_tenant_foundation.sql"
run "$SEED/008_seed_test_tenant_module_status.sql"
run "$SEED/009_seed_foundation_actions_widgets_agents.sql"
run "$SEED/019_seed_foundation_dynamic_ui_complete.sql"
run "$SEED/020_seed_foundation_lifecycle_pages.sql"
run "$SEED/021_seed_foundation_authority_sod_pages.sql"
run "$SEED/022_seed_foundation_compliance_pages.sql"
# Compliance module seeds — sourced from modules/compliance/ per Rule #2.
run "$COMPLIANCE_SEED/001_seed_compliance_module.sql"
run "$COMPLIANCE_SEED/002_seed_compliance_nav_routes_shell.sql"
run "$COMPLIANCE_SEED/003_seed_compliance_route_permissions.sql"
run "$COMPLIANCE_SEED/004_seed_compliance_readiness.sql"
run "$COMPLIANCE_SEED/005_seed_compliance_page_experience.sql"
run "$SEED/011_seed_ai_os_module.sql"

echo "Dynamic UI SQL apply complete."
echo "If the app role (e.g. dos_auth) cannot read schema dos, run as superuser:"
echo "  psql \"\$DATABASE_URL\" -v ON_ERROR_STOP=1 -f ops/sql/grant-dynamic-ui-readonly-dos-auth.sql"
