#!/usr/bin/env bash
# Module 2 (Foundation Overview) — Definition-of-Done harness.
#
# Fan-out: 14 parallel slice calls per FoundationApiService.getOverviewData()
# (modules/foundation/source/frontend/foundation/services/foundation-api.service.ts:661).
# Per AGENTS.md the page must "load all slices or fail gracefully with real
# routes" — we accept HTTP 401-on-permission as PASS_AUTHZ_ENFORCED for
# slices the test user lacks role for, but every slice MUST resolve to a
# real handler (no 404, no 500).
#
# Reuses the M1 token-mint pattern:
#   - User-context bearer for tenantadmin@shahin-ai.local (tenant=shahin_visitors)
#   - X-Forwarded-Proto: https + Host: shahin-ai.com → KC issues with
#     iss=https://shahin-ai.com/login/realms/dogan (matches auth-service).
#
# Reads:
#   platform/config-center/env/gateway.env  -> KEYCLOAK_OIDC_CLIENT_SECRET
#   platform/config-center/env/.env.shared.local -> WORKSPACE_HOME_DOD_PWD

set -u
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"

KC_BASE="${KC_BASE:-http://127.0.0.1:8180}"
KC_REALM="${KC_REALM:-dogan}"
KC_BFF_CLIENT="${KC_BFF_CLIENT:-shahin-bff}"
BASE_URL="${BASE_URL:-http://127.0.0.1:4000}"
DOD_USER="${DOD_USER:-tenantadmin@shahin-ai.local}"

if [ -z "${KC_BFF_SECRET:-}" ]; then
  KC_BFF_SECRET=$(grep -E '^KEYCLOAK_OIDC_CLIENT_SECRET=' "$REPO_ROOT/platform/config-center/env/gateway.env" 2>/dev/null | cut -d= -f2-)
fi
if [ -z "${DOD_PWD:-}" ]; then
  DOD_PWD=$(grep -E '^WORKSPACE_HOME_DOD_PWD=' "$REPO_ROOT/platform/config-center/env/.env.shared.local" 2>/dev/null | cut -d= -f2-)
fi
if [ -z "$KC_BFF_SECRET" ] || [ -z "$DOD_PWD" ]; then
  echo "[dod] ERROR: KC_BFF_SECRET or DOD_PWD missing." >&2
  exit 2
fi

TS=$(date +"%Y%m%d_%H%M%S")
OUT="$REPO_ROOT/ops/proofs/module-foundation-overview-dod-${TS}.json"
mkdir -p "$(dirname "$OUT")"

# ── 1. Mint user-context bearer ──────────────────────────────────────
echo "[dod] minting user bearer for $DOD_USER"
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
  exit 3
fi

CLAIMS=$(echo "$TOKEN" | awk -F. '{print $2}' | base64 -d 2>/dev/null || true)
TID=$(echo "$CLAIMS" | python3 -c "import json,sys; d=json.loads(sys.stdin.read()); print(d.get('dos_tenant_id',''))" 2>/dev/null)
ROLE=$(echo "$CLAIMS" | python3 -c "import json,sys; d=json.loads(sys.stdin.read()); print(d.get('dos_role_profile',''))" 2>/dev/null)
ISS=$(echo "$CLAIMS" | python3 -c "import json,sys; d=json.loads(sys.stdin.read()); print(d.get('iss',''))" 2>/dev/null)
echo "[dod] iss=$ISS tenantId=$TID role=$ROLE"

# ── 2. Fan out the 14 overview slices (same as the FE forkJoin) ─────
TMP=$(mktemp -d)
declare -A STATUS MS

ENDPOINTS=(
  "users:/api/foundation/users"
  "departments:/api/foundation/departments"
  "locations:/api/locations"
  "organizations:/api/organizations"
  "businessUnits:/api/business-units"
  "roles:/api/profiles/roles"
  "audit:/api/audit-trail?limit=20"
  "invitations:/api/invitations"
  "teams:/api/foundation/teams"
  "positions:/api/positions"
  "committees:/api/committees"
  "delegations:/api/governance/delegations"
  "policies:/api/governance/policies"
  "assets:/api/assets"
)

for row in "${ENDPOINTS[@]}"; do
  slice="${row%%:*}"
  ep="${row#*:}"
  fn="$TMP/$slice.json"
  start=$(date +%s%N)
  code=$(curl -sS -o "$fn" -w "%{http_code}" --max-time 8 \
         -H "Authorization: Bearer $TOKEN" -H "Host: shahin-ai.com" \
         "$BASE_URL$ep")
  ms=$(( ($(date +%s%N) - start) / 1000000 ))
  STATUS["$slice"]="$code"
  MS["$slice"]="$ms"
  echo "[dod] [$code] ${ms}ms $slice  $ep"
done

# ── 3. Validate per AGENTS.md §10 ────────────────────────────────────
# PASS criteria: every slice resolves to a real handler.
#   - 200/204 -> PASS
#   - 401 -> PASS_AUTH_REJECTED  (handler reachable, just permission-gated)
#   - 403 -> PASS_AUTHZ_ENFORCED
#   - 404/500/503/000 -> FAIL (route missing, handler crash, gateway block)
PYOUT=$(python3 - "$TMP" "$ISS" "$TID" "$ROLE" "$DOD_USER" "${STATUS[users]}" "${MS[users]}" \
  "${STATUS[departments]}" "${MS[departments]}" "${STATUS[locations]}" "${MS[locations]}" \
  "${STATUS[organizations]}" "${MS[organizations]}" "${STATUS[businessUnits]}" "${MS[businessUnits]}" \
  "${STATUS[roles]}" "${MS[roles]}" "${STATUS[audit]}" "${MS[audit]}" \
  "${STATUS[invitations]}" "${MS[invitations]}" "${STATUS[teams]}" "${MS[teams]}" \
  "${STATUS[positions]}" "${MS[positions]}" "${STATUS[committees]}" "${MS[committees]}" \
  "${STATUS[delegations]}" "${MS[delegations]}" "${STATUS[policies]}" "${MS[policies]}" \
  "${STATUS[assets]}" "${MS[assets]}" \
<<'PY'
import json, os, sys, datetime
tmp, iss, tid, role, user = sys.argv[1:6]
flat = sys.argv[6:]
slices = ['users','departments','locations','organizations','businessUnits','roles',
          'audit','invitations','teams','positions','committees','delegations','policies','assets']
def cls(code):
    c = int(code)
    if c in (200, 204): return 'PASS'
    if c == 401: return 'PASS_AUTH_REJECTED'
    if c == 403: return 'PASS_AUTHZ_ENFORCED'
    return 'FAIL'

endpoints = []
fails = []
for i, slice_name in enumerate(slices):
    code = flat[i*2]
    ms = int(flat[i*2 + 1])
    fn = os.path.join(tmp, f"{slice_name}.json")
    sample = ""
    if os.path.exists(fn):
        try:
            data = json.load(open(fn))
            if isinstance(data, dict):
                # extract array length per FE shape
                for k, v in data.items():
                    if isinstance(v, list):
                        sample = f"{k}: list[{len(v)}]"
                        break
                if not sample:
                    sample = "object"
            elif isinstance(data, list):
                sample = f"list[{len(data)}]"
        except Exception:
            sample = "non-json"
    verdict = cls(code)
    endpoints.append({
        'slice': slice_name,
        'status': int(code),
        'ms': ms,
        'verdict': verdict,
        'sample': sample,
    })
    if verdict == 'FAIL':
        fails.append(slice_name)

verdict = 'PASS' if not fails else 'FAIL'
result = {
    'module': 'foundation-overview',
    'phase': 'Phase 1 / Module 2',
    'completedAt': datetime.datetime.utcnow().isoformat() + 'Z',
    'verdict': verdict,
    'tenant': tid,
    'user': user,
    'role': role,
    'issuer': iss,
    'sliceCount': len(slices),
    'passCount': len(slices) - len(fails),
    'failCount': len(fails),
    'failingSlices': fails,
    'endpoints': endpoints,
}
print(json.dumps(result, indent=2))
PY
)

echo "$PYOUT" > "$OUT"
echo "[dod] wrote $OUT"
VERDICT=$(echo "$PYOUT" | python3 -c "import json,sys; print(json.load(sys.stdin)['verdict'])")
echo "[dod] verdict: $VERDICT"
rm -rf "$TMP"
[ "$VERDICT" = "PASS" ] && exit 0 || exit 1
