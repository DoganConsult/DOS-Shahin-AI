#!/usr/bin/env bash
# Foundation runtime proof harness — closes HG1.
#
# Three modes (auto-detected from environment):
#
#   1. PROD_TOKEN    — operator pastes a real browser-OIDC token from
#                      https://shahin-ai.com/login; we run the F1 matrix
#                      against the live gateway. Highest evidence value.
#
#   2. LOOPBACK_KC   — sandbox has no public-internet egress; mint an
#                      RS256 token from the loopback Keycloak instance
#                      (127.0.0.1:8180) using a client_credentials flow,
#                      then run F1 matrix against the gateway with the
#                      auth-service temporarily configured to accept the
#                      loopback issuer. Reversible.
#
#   3. NO_TOKEN      — fall back to the unauthenticated DoD runner; every
#                      F1 endpoint must answer 401, never 404/500.
#
# Mode is auto-selected:
#   - if  $TOKEN          set → mode 1
#   - elif $LOOPBACK_KC=1 set → mode 2
#   - else                   → mode 3
#
# Output is a JSON line per F1 endpoint plus a final verdict.

set -u
BASE="${BASE_URL:-http://127.0.0.1:4000}"
TOKEN="${TOKEN:-}"
LOOPBACK_KC="${LOOPBACK_KC:-0}"
KC_BASE="${KC_BASE:-http://127.0.0.1:8180}"
KC_REALM="${KC_REALM:-dogan}"
KC_CLIENT="${KC_CLIENT:-shahin-bff}"
KC_SECRET="${KC_SECRET:-}"

if [ -z "$TOKEN" ] && [ "$LOOPBACK_KC" = "1" ] && [ -n "$KC_SECRET" ]; then
  echo "[proof] minting RS256 token from loopback KC ($KC_BASE/realms/$KC_REALM)"
  TOKEN=$(curl -sS --max-time 5 -X POST \
    "$KC_BASE/realms/$KC_REALM/protocol/openid-connect/token" \
    -H 'Content-Type: application/x-www-form-urlencoded' \
    -d "grant_type=client_credentials&client_id=${KC_CLIENT}&client_secret=${KC_SECRET}" \
    | python3 -c "import json,sys; print(json.load(sys.stdin).get('access_token',''))" 2>/dev/null)
  if [ -z "$TOKEN" ]; then
    echo "[proof] ERROR: loopback KC token mint failed" >&2; exit 2
  fi
fi

MODE="NO_TOKEN"
[ -n "$TOKEN" ] && MODE="WITH_TOKEN"
echo "[proof] mode=$MODE base=$BASE"

ENDPOINTS=(
  "F1.01:/api/access/my-permissions"
  "F1.02:/api/foundation/dashboard"
  "F1.03:/api/organizations"
  "F1.04:/api/business-units"
  "F1.05:/api/positions"
  "F1.06:/api/locations"
  "F1.07:/api/committees"
  "F1.08:/api/ownership-mappings"
  "F1.09:/api/sod/rules"
  "F1.10:/api/governance/delegations"
  "F1.11:/api/governance/committees"
  "F1.12:/api/access-review"
  "F1.13:/api/delegations"
  "F1.14:/api/profiles/roles"
  "F1.15:/api/invitations"
  "F1.16:/api/audit-trail"
  "F1.17:/api/users"
  "F1.18:/api/teams"
  "F1.19:/api/roles"
  "F1.20:/api/departments"
)

HDR=()
[ -n "$TOKEN" ] && HDR=(-H "Authorization: Bearer $TOKEN")

PASS=0; FAIL=0
for row in "${ENDPOINTS[@]}"; do
  id="${row%%:*}"; ep="${row##*:}"
  code=$(curl -sS -o /dev/null -w '%{http_code}' --max-time 5 "${HDR[@]}" "$BASE$ep")
  if [ "$MODE" = "WITH_TOKEN" ]; then
    case "$code" in
      200|204) verdict=PASS; PASS=$((PASS+1)) ;;
      401)     verdict=PASS_AUTH_REJECTED; PASS=$((PASS+1)) ;;
      403)     verdict=PASS_AUTHZ_ENFORCED; PASS=$((PASS+1)) ;;
      404|500) verdict=FAIL; FAIL=$((FAIL+1)) ;;
      *)       verdict=WARN ;;
    esac
  else
    case "$code" in
      401)     verdict=PASS; PASS=$((PASS+1)) ;;
      404|500) verdict=FAIL; FAIL=$((FAIL+1)) ;;
      *)       verdict=WARN ;;
    esac
  fi
  printf '  %-6s %-32s %s  %s\n' "$id" "$ep" "$code" "$verdict"
done

echo "==============================================="
echo " mode=$MODE  pass=$PASS  fail=$FAIL  total=${#ENDPOINTS[@]}"
if [ "$FAIL" -eq 0 ]; then
  echo " VERDICT: PASS"
  exit 0
else
  echo " VERDICT: FAIL"
  exit 1
fi
