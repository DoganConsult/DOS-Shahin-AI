#!/usr/bin/env bash
# validate-enrolment.sh <profile> <module>
# All 18 GRC modules are tier='module'. Foundation is out of scope.
set -euo pipefail
PROFILE="${1:-grc}"; MODULE="${2:-}"
[ -n "$MODULE" ] || { echo "usage: $0 <profile> <module>"; exit 1; }
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
PROF="$ROOT/profiles/$PROFILE"
DIR="$PROF/enrolment/$MODULE"
ERR=0
echo "validating enrolment $PROFILE/$MODULE @ $DIR"
ok () { echo "  OK   $1"; }
fail () { echo "  FAIL $1"; ERR=1; }

[ -f "$PROF/manifests/$MODULE.profile.json" ] && ok "1. manifest" || fail "1. manifest"
[ -s "$DIR/01_module_registry.sql" ] && ok "2. module_registry" || fail "2. module_registry"
grep -q tenant_module_entitlements "$DIR/02_tenant_entitlement.sql" 2>/dev/null && ok "3. tenant_module_entitlements" || fail "3. tenant_module_entitlements"
[ -s "$DIR/03_permissions.sql" ] && ok "4. permissions sql" || fail "4. permissions sql"
[ -s "$DIR/04_role_permissions.sql" ] && ok "5. role_permissions sql" || fail "5. role_permissions"
[ -s "$DIR/routes.json" ] && ok "6. routes.json" || fail "6. routes.json"
for table in 01_ui_module 02_ui_route 03_ui_view 08_ui_navigation; do
  grep -q "'$MODULE'" "$PROF/dynamic-ui-seeds/$table.sql" 2>/dev/null && ok "7. seed $table" || fail "7. seed $table"
done
COUNT=$(find "$PROF/workflows/$MODULE" -name '*.workflow.json' 2>/dev/null | wc -l)
[ "$COUNT" -ge 5 ] && ok "8. workflows ($COUNT)" || fail "8. workflows ($COUNT/5)"

[ $ERR -eq 0 ] && { echo "PASS enrolment $PROFILE/$MODULE"; exit 0; } || { echo "FAIL enrolment $PROFILE/$MODULE"; exit 1; }
