#!/usr/bin/env bash
# Idempotent provisioning of AI-OS-related realm roles in Keycloak realm `dogan`.
#
# Roles managed:
#   platform_admin     — global platform admin (description tightened for AI-OS)
#   compliance_officer — compliance steward (description tightened for AI-OS)
#   ai_ops_oncall      — NEW: composite role for DNOC AI Ops + DSOC AI Security
#                        on-call operators. Composes ai_viewer + ai-governance_viewer
#                        + audit_viewer.
#
# Auth: uses dauth-admin-write client_credentials from /etc/keycloak/keycloak.env.
# Pre-req: Keycloak listening at https://127.0.0.1:8443/login (relative path /login).
#
# Re-running this script is safe: PUT for existing roles, POST for new roles
# (skipped on 409 conflict). Idempotency is verified by description re-PUT.
set -euo pipefail

KC_BASE="${KC_BASE:-https://127.0.0.1:8443/login}"
REALM="${REALM:-dogan}"
ENV_FILE="${KC_ENV_FILE:-/etc/keycloak/keycloak.env}"

if [[ ! -r "$ENV_FILE" ]]; then
  echo "ERROR: cannot read $ENV_FILE — set KC_ENV_FILE or run as root" >&2
  exit 1
fi
# shellcheck disable=SC1090
source "$ENV_FILE"

CLIENT_ID="${KEYCLOAK_ADMIN_WRITE_CLIENT_ID:-dauth-admin-write}"
CLIENT_SECRET="${KEYCLOAK_ADMIN_WRITE_CLIENT_SECRET:?KEYCLOAK_ADMIN_WRITE_CLIENT_SECRET not set}"

echo "[1/4] Authenticating as $CLIENT_ID against realm $REALM..."
TOKEN=$(curl -sk -X POST "$KC_BASE/realms/$REALM/protocol/openid-connect/token" \
  -d "grant_type=client_credentials" \
  -d "client_id=$CLIENT_ID" \
  -d "client_secret=$CLIENT_SECRET" \
  | python3 -c "import json,sys;print(json.load(sys.stdin)['access_token'])")
[[ ${#TOKEN} -gt 100 ]] || { echo "ERROR: token acquisition failed" >&2; exit 1; }

put_role() {
  local name="$1" desc="$2"
  curl -sk -X PUT -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" \
    -d "$(python3 -c "import json,sys;print(json.dumps({'name':sys.argv[1],'description':sys.argv[2]}))" "$name" "$desc")" \
    -o /dev/null -w "%{http_code}" \
    "$KC_BASE/admin/realms/$REALM/roles/$name"
}

create_role_if_missing() {
  local name="$1" desc="$2"
  local code
  code=$(curl -sk -o /dev/null -w "%{http_code}" -H "Authorization: Bearer $TOKEN" \
    "$KC_BASE/admin/realms/$REALM/roles/$name")
  if [[ "$code" == "200" ]]; then
    echo "  $name: exists — updating description"
    put_role "$name" "$desc" >/dev/null
  else
    echo "  $name: creating"
    curl -sk -X POST -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" \
      -d "$(python3 -c "import json,sys;print(json.dumps({'name':sys.argv[1],'description':sys.argv[2]}))" "$name" "$desc")" \
      -o /dev/null -w "%{http_code}\n" \
      "$KC_BASE/admin/realms/$REALM/roles"
  fi
}

echo "[2/4] Updating descriptions for platform_admin and compliance_officer..."
put_role "platform_admin" \
  "DOS Platform global admin — full access across DOS / DAuth / DNOC / DSOC modules including AI-OS governance, alert rule administration, and ecosystem configuration. Highest privilege at platform tier." \
  >/dev/null && echo "  platform_admin OK"
put_role "compliance_officer" \
  "Compliance module steward — controls, evidence, attestations, audit findings, and governance reviews. Read-only access to AI-OS surfaces (DSOC AI Security read, DNOC AI Operations read) for compliance oversight. Cannot administer agents." \
  >/dev/null && echo "  compliance_officer OK"

echo "[3/4] Ensuring ai_ops_oncall exists..."
create_role_if_missing "ai_ops_oncall" \
  "AI-OS on-call operator (DNOC AI Operations + DSOC AI Security). Reads agent health, gate decisions, HITL queue. Acknowledges and dispatches ai_alert_warning and ai_alert_critical breaches. Cannot mutate agent registry / SoD policies / cost caps."

echo "[4/4] Adding composites (ai_viewer, ai-governance_viewer, audit_viewer) to ai_ops_oncall..."
COMPOSITE_BODY=$(python3 - <<PY
import json, urllib.request, ssl, os
ctx = ssl.create_default_context(); ctx.check_hostname=False; ctx.verify_mode=ssl.CERT_NONE
roles=[]
for n in ['ai_viewer','ai-governance_viewer','audit_viewer']:
    req = urllib.request.Request(f"$KC_BASE/admin/realms/$REALM/roles/{n}", headers={'Authorization':'Bearer $TOKEN'})
    j = json.loads(urllib.request.urlopen(req, context=ctx).read())
    roles.append({'id':j['id'],'name':j['name']})
print(json.dumps(roles))
PY
)
curl -sk -X POST -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" \
  -d "$COMPOSITE_BODY" \
  -o /dev/null -w "  composites POST: %{http_code}\n" \
  "$KC_BASE/admin/realms/$REALM/roles/ai_ops_oncall/composites"

echo "Done. Verifying ai_ops_oncall composites:"
curl -sk -H "Authorization: Bearer $TOKEN" \
  "$KC_BASE/admin/realms/$REALM/roles/ai_ops_oncall/composites" \
  | python3 -c "import json,sys;[print('  -',r['name']) for r in json.load(sys.stdin)]"
