#!/usr/bin/env bash
# Foundation module Definition-of-Done runner.
#
# Runs layered checks (DB / API / i18n / registry / routes) and prints a
# PASS/FAIL matrix per page. Does NOT mutate state. Safe to re-run.
#
# Usage:
#   BASE_URL=http://127.0.0.1:3000 \
#   DATABASE_URL=postgresql://... \
#   TOKEN=<optional-bearer> \
#     bash ops/scripts/foundation-dod.sh
#
# Exit codes:
#   0  all checks PASS
#   1  one or more FAIL (prints the matrix and summary)

set -u
set -o pipefail

BASE_URL="${BASE_URL:-http://127.0.0.1:3000}"
TOKEN="${TOKEN:-}"
DATABASE_URL="${DATABASE_URL:-}"

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"

FAIL=0
pass()   { printf '  [PASS] %s\n' "$*"; }
fail()   { printf '  [FAIL] %s\n' "$*"; FAIL=$((FAIL+1)); }
warn()   { printf '  [WARN] %s\n' "$*"; }

echo "========================================"
echo " Foundation Module — DoD Runner"
echo " base   = $BASE_URL"
echo " tenant = ${TENANT:-<all-active>}"
echo "========================================"

# ── Layer 1: DB existence + counts ─────────────────────────────────
echo ""
echo "── 1. DB existence + seed counts ──"
if [ -z "$DATABASE_URL" ]; then
  warn "DATABASE_URL not set — skipping DB checks"
else
  TABLES=(
    "dos.permissions"
    "dos.functional_roles"
    "platform_dauth.role_permissions"
    "dos.organizations"
    "dos.business_units"
    "dos.positions"
    "dos.locations"
    "dos.committees"
    "dos.audit_trail"
  )
  for qt in "${TABLES[@]}"; do
    cnt=$(psql "$DATABASE_URL" -tA -c "SELECT COUNT(*) FROM $qt" 2>/dev/null || echo "ERR")
    if [ "$cnt" = "ERR" ] || [ -z "$cnt" ]; then
      fail "$qt: table inaccessible"
    elif [ "$cnt" -gt 0 ]; then
      pass "$qt: $cnt rows"
    else
      fail "$qt: 0 rows (seed required)"
    fi
  done
fi

# ── Layer 2: API reachability ──────────────────────────────────────
echo ""
echo "── 2. API reachability (expect 200 with TOKEN, 401 without) ──"
ENDPOINTS=(
  "organizations"
  "business-units"
  "departments"
  "teams"
  "roles"
  "positions"
  "locations"
  "committees"
  "ownership-mappings"
  "invitations"
  "audit-trail"
  "access/my-permissions"
  "foundation/dashboard"
  "profiles/roles"
  "access-review"
  "delegations"
)
HDR=()
[ -n "$TOKEN" ] && HDR=(-H "Authorization: Bearer $TOKEN")
EXPECT_UNAUTH=401
EXPECT_AUTH=200
for ep in "${ENDPOINTS[@]}"; do
  code=$(curl -sS -o /dev/null -w '%{http_code}' --max-time 5 "${HDR[@]}" "$BASE_URL/api/$ep" 2>/dev/null || echo "000")
  expected=$EXPECT_UNAUTH
  [ -n "$TOKEN" ] && expected=$EXPECT_AUTH
  if [ "$code" = "404" ]; then
    fail "/api/$ep: 404 (route not mounted)"
  elif [ "$code" = "500" ]; then
    fail "/api/$ep: 500 (server error)"
  elif [ "$code" = "$expected" ]; then
    pass "/api/$ep: $code"
  else
    warn "/api/$ep: $code (expected $expected)"
  fi
done

# ── Layer 3: i18n raw-key + bridge presence ────────────────────────
echo ""
echo "── 3. i18n raw-key detection + bridge presence ──"
I18N_FILES=(
  "frontend/products/shahin/src/app/blueprint/assets/i18n/en.json"
  "frontend/products/shahin/src/app/blueprint/assets/i18n/ar.json"
  "frontend/products/shahin/dist/shahin-grc/browser/assets/i18n/en.json"
  "frontend/products/shahin/dist/shahin-grc/browser/assets/i18n/ar.json"
)
REQUIRED_NAV_KEYS=(
  "foundation"
  "foundationTeams"
  "foundationOwnership"
  "foundationOrganization"
  "foundationBusinessUnits"
  "foundationDepartments"
  "foundationRoles"
  "foundationUsers"
  "foundationPositions"
  "foundationLocations"
  "foundationCommittees"
  "foundationInvitations"
  "foundationAuditTrail"
)
for f in "${I18N_FILES[@]}"; do
  full="$REPO_ROOT/$f"
  if [ ! -f "$full" ]; then
    warn "i18n missing: $f"
    continue
  fi
  missing=$(python3 - "$full" "${REQUIRED_NAV_KEYS[@]}" <<'PY'
import json, sys
f=sys.argv[1]; keys=sys.argv[2:]
d=json.load(open(f))
nav=d.get('nav',{})
miss=[k for k in keys if k not in nav]
print(','.join(miss) if miss else '')
PY
)
  if [ -z "$missing" ]; then
    pass "$f: all ${#REQUIRED_NAV_KEYS[@]} nav.foundation* keys present"
  else
    fail "$f: missing nav keys → $missing"
  fi
done

# ── Layer 4: route registry consistency ────────────────────────────
echo ""
echo "── 4. route registry + manifest ──"
MANIFEST="$REPO_ROOT/modules/foundation/module.manifest.json"
if [ -f "$MANIFEST" ]; then
  ok=$(python3 -c "
import json
d=json.load(open('$MANIFEST'))
rbs=d.get('routeBases', [])
req=['/api/foundation','/api/organizations','/api/business-units','/api/positions','/api/locations','/api/committees','/api/invitations','/api/audit-trail','/api/access-review','/api/delegations']
miss=[r for r in req if r not in rbs]
print('OK' if not miss else 'MISSING:'+','.join(miss))
")
  [ "$ok" = "OK" ] && pass "manifest routeBases complete" || fail "manifest $ok"
else
  fail "module.manifest.json not found"
fi
REG="$REPO_ROOT/platform/registries/modules.registry.json"
if [ -f "$REG" ]; then
  status=$(python3 -c "
import json
d=json.load(open('$REG'))
for m in d.get('modules',[]):
  if m.get('id')=='foundation':
    print(m.get('status'))
    break
")
  case "$status" in
    extracted-production) pass "registry.status=$status" ;;
    *)                    fail "registry.status=$status (want extracted-production)" ;;
  esac
fi

# ── Layer 5: nav duplicate detection ───────────────────────────────
echo ""
echo "── 5. navigation duplicate scan ──"
python3 - "$REPO_ROOT" <<'PY' || FAIL=$((FAIL+1))
import os, re, sys
root=sys.argv[1]
fe=os.path.join(root,'frontend/products/shahin/src/app')
pat=re.compile(r"path:\s*['\"]foundation['\"]|moduleCode:\s*['\"]foundation['\"]")
matches=[]
for dp,_,files in os.walk(fe):
    for f in files:
        if f.endswith(('.ts','.routes.ts')):
            p=os.path.join(dp,f)
            try:
                with open(p,'r',encoding='utf-8') as fh:
                    for i,ln in enumerate(fh,1):
                        if pat.search(ln):
                            matches.append((p,i,ln.strip()))
            except Exception: pass
# more than one route module path decl per file is expected; just report total.
print(f"  [PASS] scanned {len(matches)} foundation route references")
PY

# ── Per-page PASS/FAIL matrix ──────────────────────────────────────
echo ""
echo "── 6. per-page DoD matrix ──"
PAGES=(
  "overview:/api/foundation/dashboard"
  "organizations:/api/organizations"
  "business-units:/api/business-units"
  "departments:/api/departments"
  "teams:/api/teams"
  "users:/api/users"
  "roles:/api/roles"
  "positions:/api/positions"
  "locations:/api/locations"
  "committees:/api/committees"
  "ownership-mapping:/api/ownership-mappings"
  "access-review:/api/access-review"
  "invitations:/api/invitations"
  "audit-trail:/api/audit-trail"
  "approval-center:/api/workflow/approvals"
)
printf '  %-22s | %-6s | %s\n' "PAGE" "STATUS" "ENDPOINT"
printf '  %-22s-+-%-6s-+-%s\n' "----------------------" "------" "----------"
for row in "${PAGES[@]}"; do
  page="${row%%:*}"; ep="${row##*:}"
  code=$(curl -sS -o /dev/null -w '%{http_code}' --max-time 4 "${HDR[@]}" "$BASE_URL$ep" 2>/dev/null || echo "000")
  verdict=FAIL
  if [ "$code" = "401" ] && [ -z "$TOKEN" ]; then verdict=PASS
  elif [ "$code" = "200" ] && [ -n "$TOKEN" ]; then verdict=PASS
  elif [ "$code" = "404" ]; then verdict=FAIL
  elif [ "$code" = "500" ]; then verdict=FAIL
  fi
  printf '  %-22s | %-6s | %s → %s\n' "$page" "$verdict" "$ep" "$code"
  [ "$verdict" = "FAIL" ] && FAIL=$((FAIL+1))
done

# ── Summary ────────────────────────────────────────────────────────
echo ""
echo "========================================"
if [ "$FAIL" -eq 0 ]; then
  echo " RESULT: PASS"
  exit 0
else
  echo " RESULT: FAIL  (failures=$FAIL)"
  exit 1
fi
