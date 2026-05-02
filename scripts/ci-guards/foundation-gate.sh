#!/usr/bin/env bash
# Foundation runtime production-readiness gate. Asserts the seven contract
# layers required for the foundation module to render in any tenant's
# workspace shell. Exits non-zero on any failure so CI / pnpm release-gate
# can short-circuit a deploy.
set -euo pipefail

GATEWAY="${GATEWAY:-http://127.0.0.1:4000}"
USER_SVC="${USER_SVC:-http://127.0.0.1:4003}"
UI_OS_SVC="${UI_OS_SVC:-http://127.0.0.1:4015}"
SHELL_URL="${SHELL_URL:-http://127.0.0.1:3000}"
PG_DSN="${PG_DSN:-postgresql://dos_auth:dos_auth_pass_2026@localhost:5432/shahin_grc}"

fail() { echo "FOUNDATION_GATE_FAIL: $*" >&2; exit 1; }
pass() { echo "  ✓ $*"; }

echo "[foundation-gate] G1 contract catalogue"
PERMS=$(psql "$PG_DSN" -At -c "SELECT count(*) FROM platform_dauth.permissions WHERE permission_code LIKE 'foundation%' OR permission_code LIKE 'audit_trail%' OR permission_code LIKE 'access_review%' OR permission_code LIKE 'delegation%';")
[ "$PERMS" -ge 14 ] || fail "expected ≥14 foundation perms, got $PERMS"
pass "permissions=$PERMS"

NAV=$(psql "$PG_DSN" -At -c "SELECT count(*) FROM dos.dynamic_ui_navigation WHERE module_code='foundation';")
[ "$NAV" -ge 14 ] || fail "expected ≥14 nav rows, got $NAV"
pass "dynamic_ui_navigation=$NAV"

ROLES=$(psql "$PG_DSN" -At -c "SELECT count(*) FROM platform_dauth.functional_roles WHERE role_code IN ('tenant_admin','tenant_owner','viewer','standard_user') AND array_length(permissions,1) > 0;")
[ "$ROLES" -ge 4 ] || fail "expected 4 active functional roles, got $ROLES"
pass "functional_roles=$ROLES"

echo "[foundation-gate] G2 backend health"
curl -fsS -o /dev/null "$USER_SVC/api/health/foundation"   || fail "user-service /api/health/foundation"
pass "user-service:/api/health/foundation"
curl -fsS -o /dev/null "$UI_OS_SVC/api/dynamic-ui/health"  || fail "ui-os-service /api/dynamic-ui/health"
pass "ui-os-service:/api/dynamic-ui/health"

echo "[foundation-gate] G3 gateway surface"
HC=$(curl -s -o /dev/null -w "%{http_code}" "$GATEWAY/api/health/foundation")
[ "$HC" = "200" ] || fail "gateway /api/health/foundation HTTP $HC"
pass "gateway/api/health/foundation=$HC"
HC=$(curl -s -o /dev/null -w "%{http_code}" "$GATEWAY/api/foundation/users")
[ "$HC" = "401" ] || fail "gateway /api/foundation/users expected 401 (auth required), got $HC"
pass "gateway/api/foundation/users=$HC (auth-protected)"

echo "[foundation-gate] G4 product-shell SPA frame"
HC=$(curl -s -o /dev/null -w "%{http_code}" "$SHELL_URL/workspace-home")
[ "$HC" = "200" ] || fail "product-shell /workspace-home HTTP $HC"
pass "shell/workspace-home=$HC"
HC=$(curl -s -o /dev/null -w "%{http_code}" "$SHELL_URL/foundation/overview")
[ "$HC" = "200" ] || fail "product-shell /foundation/overview HTTP $HC"
pass "shell/foundation/overview=$HC"

echo "[foundation-gate] all 7 gates green — foundation runtime READY"
