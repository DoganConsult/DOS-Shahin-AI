#!/usr/bin/env bash
# Shared helper: mint a user-context bearer for the Phase-1 DoD harnesses.
#
# Usage:
#   source "$REPO_ROOT/ops/scripts/lib/dod-token.sh"
#   mint_dod_token       # exports TOKEN, TID, ROLE, ISS
#
# Env (optional overrides):
#   KC_BASE        (default http://127.0.0.1:8180)
#   KC_REALM       (default dogan)
#   KC_BFF_CLIENT  (default shahin-bff)
#   KC_BFF_SECRET  (read from gateway.env if absent)
#   DOD_USER       (default tenantadmin@shahin-ai.local)
#   DOD_PWD        (read from .env.shared.local if absent)
#
# Why X-Forwarded-Proto: KC has hostname-strict=false. Without the
# proto header, iss comes back as http://... and the auth-service
# rejects with INVALID_TOKEN because KEYCLOAK_ISSUER carries https://.

mint_dod_token() {
  local repo_root="${REPO_ROOT:-$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)}"
  : "${KC_BASE:=http://127.0.0.1:8180}"
  : "${KC_REALM:=dogan}"
  : "${KC_BFF_CLIENT:=shahin-bff}"
  : "${DOD_USER:=tenantadmin@shahin-ai.local}"

  if [ -z "${KC_BFF_SECRET:-}" ]; then
    KC_BFF_SECRET=$(grep -E '^KEYCLOAK_OIDC_CLIENT_SECRET=' "$repo_root/platform/config-center/env/gateway.env" 2>/dev/null | cut -d= -f2-)
  fi
  if [ -z "${DOD_PWD:-}" ]; then
    DOD_PWD=$(grep -E '^WORKSPACE_HOME_DOD_PWD=' "$repo_root/platform/config-center/env/.env.shared.local" 2>/dev/null | cut -d= -f2-)
  fi
  if [ -z "$KC_BFF_SECRET" ] || [ -z "$DOD_PWD" ]; then
    echo "[dod-token] ERROR: KC_BFF_SECRET or DOD_PWD missing." >&2
    return 2
  fi

  local resp
  resp=$(curl -sS --max-time 8 -X POST \
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

  TOKEN=$(echo "$resp" | python3 -c "import json,sys; print(json.load(sys.stdin).get('access_token',''))" 2>/dev/null)
  if [ -z "$TOKEN" ]; then
    echo "[dod-token] ERROR: token mint failed:"
    echo "$resp" | head -c 400
    return 3
  fi
  local claims
  claims=$(echo "$TOKEN" | awk -F. '{print $2}' | base64 -d 2>/dev/null || true)
  TID=$(echo "$claims"  | python3 -c "import json,sys; d=json.loads(sys.stdin.read()); print(d.get('dos_tenant_id',''))"     2>/dev/null)
  ROLE=$(echo "$claims" | python3 -c "import json,sys; d=json.loads(sys.stdin.read()); print(d.get('dos_role_profile',''))" 2>/dev/null)
  ISS=$(echo "$claims"  | python3 -c "import json,sys; d=json.loads(sys.stdin.read()); print(d.get('iss',''))"               2>/dev/null)
  export TOKEN TID ROLE ISS
}
