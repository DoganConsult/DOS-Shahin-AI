#!/usr/bin/env bash
# Module 1 (Workspace Home) — Definition-of-Done harness.

set -u

show_help() {
  cat <<EOF
Usage: $(basename "$0) [OPTIONS]

DoD harness for Phase 1 / Module 1 (Workspace Home).

Options:
  --help, -h           Show this help message

Environment Variables:
  KC_BASE              Keycloak base URL (default: http://127.0.0.1:8180)
  KC_REALM             Keycloak realm (default: dogan)
  KC_BFF_CLIENT        BFF client ID (default: shahin-bff)
  KC_BFF_SECRET        BFF client secret
  BASE_URL             API base URL (default: http://127.0.0.1:4000)
  DOD_USER             Test user (default: tenantadmin@shahin-ai.local)
  DOD_PWD              Test user password

Output:
  Creates timestamped proof file at ops/proofs/module-workspace-home-dod-<timestamp>.json

Probes:
  /api/access/my-permissions
  /api/foundation/access-snapshot
  /api/tenant-home/overview
  /api/workspaces

Examples:
  # Run workspace-home DoD proof
  $(basename "$0)
EOF
  exit 0
}

for arg in "$@"; do
  case "$arg" in --help|-h) show_help ;; esac
done

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"

KC_BASE="${KC_BASE:-http://127.0.0.1:8180}"
KC_REALM="${KC_REALM:-dogan}"
KC_BFF_CLIENT="${KC_BFF_CLIENT:-shahin-bff}"
BASE_URL="${BASE_URL:-http://127.0.0.1:4000}"
DOD_USER="${DOD_USER:-tenantadmin@shahin-ai.local}"

# Resolve secret + password from env files if not in environment.
if [ -z "${KC_BFF_SECRET:-}" ]; then
  KC_BFF_SECRET=$(grep -E '^KEYCLOAK_OIDC_CLIENT_SECRET=' "$REPO_ROOT/platform/config-center/env/gateway.env" 2>/dev/null | cut -d= -f2-)
fi
if [ -z "${DOD_PWD:-}" ]; then
  DOD_PWD=$(grep -E '^WORKSPACE_HOME_DOD_PWD=' "$REPO_ROOT/platform/config-center/env/.env.shared.local" 2>/dev/null | cut -d= -f2-)
fi
if [ -z "$KC_BFF_SECRET" ] || [ -z "$DOD_PWD" ]; then
  echo "[dod] ERROR: KC_BFF_SECRET or DOD_PWD missing." >&2
  echo "      Set WORKSPACE_HOME_DOD_PWD in platform/config-center/env/.env.shared.local," >&2
  echo "      and ensure platform/config-center/env/gateway.env carries KEYCLOAK_OIDC_CLIENT_SECRET." >&2
  exit 2
fi

TS=$(date +"%Y%m%d_%H%M%S")
OUT="$REPO_ROOT/ops/proofs/module-workspace-home-dod-${TS}.json"
mkdir -p "$(dirname "$OUT")"

# ── 1. Mint user-context bearer ───────────────────────────────────────
echo "[dod] minting user bearer for $DOD_USER on $KC_BASE/login/realms/$KC_REALM"
TOKEN_JSON=$(curl -sS --max-time 8 -X POST \
  "$KC_BASE/login/realms/$KC_REALM/protocol/openid-connect/token" \
  -H "Host: shahin-ai.com" \
  -H "X-Forwarded-Proto: https" \
  -H "X-Forwarded-Host: shahin-ai.com" \
  -H 'Content-Type: application/x-www-form-urlencoded' \
  --data-urlencode "grant_type=password" \
  --data-urlencode "client_id=$KC_BFF_CLIENT" \
  --data-urlencode "client_secret=$KC_BFF_SECRET" \
  --data-urlencode "username=$DOD_USER" \
  --data-urlencode "password=$DOD_PWD" \
  --data-urlencode "scope=openid profile email")

TOKEN=$(echo "$TOKEN_JSON" | python3 -c "import json,sys; print(json.load(sys.stdin).get('access_token',''))" 2>/dev/null)
if [ -z "$TOKEN" ]; then
  echo "[dod] ERROR: token mint failed:"
  echo "$TOKEN_JSON" | head -c 400
  echo
  exit 3
fi

# Decode + verify tenantId claim.
CLAIMS=$(echo "$TOKEN" | awk -F. '{print $2}' | base64 -d 2>/dev/null || true)
TID=$(echo "$CLAIMS" | python3 -c "import json,sys; d=json.loads(sys.stdin.read()); print(d.get('dos_tenant_id',''))" 2>/dev/null)
ROLE=$(echo "$CLAIMS" | python3 -c "import json,sys; d=json.loads(sys.stdin.read()); print(d.get('dos_role_profile',''))" 2>/dev/null)
ISS=$(echo "$CLAIMS" | python3 -c "import json,sys; d=json.loads(sys.stdin.read()); print(d.get('iss',''))" 2>/dev/null)
echo "[dod] iss=$ISS tenantId=$TID role=$ROLE"

if [ -z "$TID" ]; then
  echo "[dod] ERROR: token has no dos_tenant_id claim" >&2
  exit 4
fi

# ── 2. Probe endpoints + capture bodies ──────────────────────────────
TMP=$(mktemp -d)
declare -A STATUS MS BODY
for ep in "/api/access/my-permissions" "/api/foundation/access-snapshot" "/api/tenant-home/overview" "/api/workspaces"; do
  fn="$TMP/$(echo "$ep" | tr '/?&=' '_').json"
  start=$(date +%s%N)
  code=$(curl -sS -o "$fn" -w "%{http_code}" --max-time 8 \
         -H "Authorization: Bearer $TOKEN" -H "Host: shahin-ai.com" \
         "$BASE_URL$ep")
  ms=$(( ($(date +%s%N) - start) / 1000000 ))
  STATUS["$ep"]="$code"
  MS["$ep"]="$ms"
  BODY["$ep"]="$fn"
  echo "[dod] [$code] ${ms}ms $ep"
done

# ── 3. Shape-validate the overview ───────────────────────────────────
PYOUT=$(python3 - "$TMP" "$ISS" "$TID" "$ROLE" "$DOD_USER" \
  "${STATUS[/api/access/my-permissions]}"     "${MS[/api/access/my-permissions]}" \
  "${STATUS[/api/foundation/access-snapshot]}" "${MS[/api/foundation/access-snapshot]}" \
  "${STATUS[/api/tenant-home/overview]}"       "${MS[/api/tenant-home/overview]}" \
  "${STATUS[/api/workspaces]}"                 "${MS[/api/workspaces]}" \
<<'PY'
import json, os, sys
tmp, iss, tid, role, user = sys.argv[1:6]
codes = sys.argv[6:14]

def load(name):
    p = os.path.join(tmp, name)
    return json.load(open(p)) if os.path.exists(p) else {}

mp  = load("_api_access_my-permissions.json")
acc = load("_api_foundation_access-snapshot.json")
ov  = load("_api_tenant-home_overview.json")
ws  = load("_api_workspaces.json")

def has(obj, *path):
    cur = obj
    for p in path:
        if not isinstance(cur, dict) or p not in cur:
            return False, None
        cur = cur[p]
    return True, cur

slices = ['context','kpis','kpiTrends','summary','actionCenter','programHealth','lifecycle','activity']
slice_check = {s: s in ov for s in slices}

leaf_checks = []
def chk(label, present, value):
    leaf_checks.append({'field': label, 'present': bool(present), 'type': type(value).__name__ if present else None})

for label, path in [
    ('context.workspaceId',         ('context','workspaceId')),
    ('context.orgName',             ('context','orgName')),
    ('context.industry',            ('context','industry')),
    ('context.country',             ('context','country')),
    ('kpis.complianceScore',        ('kpis','complianceScore')),
    ('kpis.vendorHealthScore',      ('kpis','vendorHealthScore')),
    ('summary.totalFrameworks',     ('summary','totalFrameworks')),
    ('summary.totalControls',       ('summary','totalControls')),
    ('summary.risksByLevel',        ('summary','risksByLevel')),
    ('actionCenter.overdueTasks',    ('actionCenter','overdueTasks')),
    ('actionCenter.failingControls', ('actionCenter','failingControls')),
    ('actionCenter.pendingApprovals',('actionCenter','pendingApprovals')),
    ('programHealth.openFindings',   ('programHealth','openFindings')),
    ('programHealth.controlEffectiveness', ('programHealth','controlEffectiveness')),
    ('programHealth.coverage',       ('programHealth','coverage')),
    ('lifecycle.auditReadinessPercent', ('lifecycle','auditReadinessPercent')),  # number|null per FE contract
    ('activity.entries',             ('activity','entries')),
]:
    p, v = has(ov, *path)
    leaf_checks.append({'field': label, 'present': p, 'value_type': type(v).__name__ if p else None, 'value_is_null': p and v is None})

# /api/access/my-permissions
mp_data = mp.get('data', mp)
mp_perm_count = len((mp_data or {}).get('permissions', [])) if isinstance(mp_data, dict) else 0

# /api/foundation/access-snapshot
acc_data = acc.get('data', acc)
acc_keys = sorted(list((acc_data or {}).keys())) if isinstance(acc_data, dict) else []

# /api/workspaces
ws_count = len((ws or {}).get('workspaces', [])) if isinstance(ws, dict) else (len(ws) if isinstance(ws, list) else 0)

# Verdict: every leaf must be present (null is allowed where FE handles it).
# Specifically lifecycle.auditReadinessPercent may be null — that's the FE contract.
fail_fields = [c for c in leaf_checks if not c['present']]
ok_slices = all(slice_check.values())
ok_leafs = len(fail_fields) == 0
ok_status = all(c == "200" for c in codes[::2])
verdict = "PASS" if (ok_slices and ok_leafs and ok_status) else "FAIL"

result = {
    'module': 'workspace-home',
    'phase': 'Phase 1 / Module 1',
    'completedAt': __import__('datetime').datetime.utcnow().isoformat() + 'Z',
    'verdict': verdict,
    'tenant': tid,
    'user': user,
    'role': role,
    'issuer': iss,
    'endpoints': [
        {'path': '/api/access/my-permissions',     'status': int(codes[0]), 'ms': int(codes[1]),
         'shape': {'permission_count': mp_perm_count, 'data_keys': sorted(list((mp_data or {}).keys())) if isinstance(mp_data, dict) else []}},
        {'path': '/api/foundation/access-snapshot','status': int(codes[2]), 'ms': int(codes[3]),
         'shape': {'data_keys': acc_keys}},
        {'path': '/api/tenant-home/overview',      'status': int(codes[4]), 'ms': int(codes[5]),
         'slices_present': slice_check,
         'leaf_checks': leaf_checks},
        {'path': '/api/workspaces',                'status': int(codes[6]), 'ms': int(codes[7]),
         'shape': {'count': ws_count}},
    ],
    'fe_shape_failures': fail_fields,
}
print(json.dumps(result, indent=2))
PY
)

# ── 4. Emit DoD evidence JSON ────────────────────────────────────────
echo "$PYOUT" > "$OUT"
echo "[dod] wrote $OUT"

VERDICT=$(echo "$PYOUT" | python3 -c "import json,sys; print(json.load(sys.stdin)['verdict'])")
echo "[dod] verdict: $VERDICT"

# ── 5. Cleanup tmp ───────────────────────────────────────────────────
rm -rf "$TMP"

[ "$VERDICT" = "PASS" ] && exit 0 || exit 1
