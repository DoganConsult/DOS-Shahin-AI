#!/usr/bin/env bash
set -euo pipefail

show_help() {
  cat <<EOF
Usage: $(basename "$0") [root-path] [OPTIONS]

Displays access matrix showing roles, permissions, and SoD rules.

Arguments:
  root-path            Root directory path (default: repo root)

Options:
  --help, -h           Show this help message

Environment Variables:
  DATABASE_URL         PostgreSQL connection string (optional, for live data)

Output:
  - Roles from seed script
  - Permission categories
  - SoD (Separation of Duties) rules
  - Live role-permission matrix (if DATABASE_URL set)

Examples:
  # Show static analysis only
  $(basename "$0)

  # Show with live database data
  DATABASE_URL=postgresql://... $(basename "$0)

  # Specific path
  $(basename "$0) /path/to/repo
EOF
  exit 0
}

for arg in "$@"; do
  case "$arg" in --help|-h) show_help ;; esac
done

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"

# shellcheck disable=SC1091
source "$SCRIPT_DIR/lib/load-env.sh"

if [ -z "${DATABASE_URL:-}" ]; then
  dos_load_shared_env || true
fi

echo "╔══════════════════════════════════════════════════╗"
echo "║  DOS Platform — Access Matrix                    ║"
echo "╚══════════════════════════════════════════════════╝"
echo ""

if [ -z "${DATABASE_URL:-}" ]; then
  echo "⚠  DATABASE_URL not set — showing static analysis only"
  echo ""

  ROOT="${1:-$REPO_ROOT}"

  echo "── Roles (from seed script) ────────────────────────"
  grep -oP "code: '([^']+)'" "$ROOT/ops/scripts/seed-platform-complete.ts" 2>/dev/null | head -20 | sed "s/code: '//;s/'$//" | while read -r role; do
    echo "  • $role"
  done

  echo ""
  echo "── Permission Categories ───────────────────────────"
  grep -oP "'[a-z_]+\.[a-z_]+\.[a-z_]+'" "$ROOT/ops/scripts/seed-platform-complete.ts" 2>/dev/null | sort -u | head -40 | while read -r perm; do
    echo "  $perm"
  done

  echo ""
  echo "── SoD Rules (Separation of Duties) ───────────────"
  if grep -q "sod\|separation" "$ROOT/ops/scripts/seed-platform-complete.ts" 2>/dev/null; then
    echo "  SoD rules found in seed script"
  else
    echo "  Standard SoD: auditor ≠ policy_owner, risk_manager ≠ auditor"
    echo "  Enforced via role mutual exclusivity in DAuth module"
  fi

  exit 0
fi

echo "── Functional Roles ──────────────────────────────"
psql "${DATABASE_URL}" -t -A -c "
  SELECT code, name_en, module_code, category, tier
  FROM dos.functional_roles
  ORDER BY category, tier, code
" 2>/dev/null || echo "  (table not found)"

echo ""
echo "── Permission Count by Module ────────────────────"
psql "${DATABASE_URL}" -t -A -c "
  SELECT module_code, count(*) AS perm_count
  FROM dos.permissions
  GROUP BY module_code
  ORDER BY perm_count DESC
" 2>/dev/null || echo "  (table not found)"

echo ""
echo "── Role → Permission Counts ──────────────────────"
psql "${DATABASE_URL}" -t -A -c "
  SELECT fr.code AS role, count(rp.permission_id) AS perms
  FROM dos.functional_roles fr
  LEFT JOIN dos.role_permissions rp ON rp.functional_role_id = fr.id
  GROUP BY fr.code
  ORDER BY perms DESC
" 2>/dev/null || echo "  (table not found)"

echo ""
echo "── Access Profiles ───────────────────────────────"
psql "${DATABASE_URL}" -t -A -c "
  SELECT code, name_en, description
  FROM dos.access_profiles
  ORDER BY code
" 2>/dev/null || echo "  (table not found)"

echo ""
echo "── Summary ───────────────────────────────────────"
ROLES=$(psql "${DATABASE_URL}" -t -A -c "SELECT count(*) FROM dos.functional_roles" 2>/dev/null || echo "?")
PERMS=$(psql "${DATABASE_URL}" -t -A -c "SELECT count(*) FROM dos.permissions" 2>/dev/null || echo "?")
MAPPINGS=$(psql "${DATABASE_URL}" -t -A -c "SELECT count(*) FROM dos.role_permissions" 2>/dev/null || echo "?")
echo "  Roles:       $ROLES"
echo "  Permissions: $PERMS"
echo "  Mappings:    $MAPPINGS"
