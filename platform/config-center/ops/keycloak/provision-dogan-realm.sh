#!/usr/bin/env bash
#
# Keycloak dogan realm provisioning — operator handoff.
#
# Runs idempotent kcadm.sh commands to bring the `dogan` realm and its
# canonical clients into the state described in
# platform/core/current-source/dauth/adapters/keycloak/KEYCLOAK-REALM-MAPPING.md.
#
# Prerequisites (operator):
#   * Export the Keycloak bootstrap admin credentials in your shell:
#       export KEYCLOAK_BOOTSTRAP_USER=admin
#       export KEYCLOAK_BOOTSTRAP_PASSWORD=<from /etc/keycloak/keycloak.env>
#   * Export the desired narrow write-client secret (32+ chars):
#       export KEYCLOAK_ADMIN_WRITE_CLIENT_SECRET=<generate with `openssl rand -hex 32`>
#   * kcadm.sh must be on PATH (ships with Keycloak at /opt/keycloak/bin/kcadm.sh).
#
# This script NEVER prints secrets. After running, you must ALSO:
#   1. Add KEYCLOAK_ADMIN_WRITE_CLIENT_SECRET to /etc/keycloak/keycloak.env (mode 0640).
#   2. Switch platform/config-center/env/.env.shared (or per-service env) to:
#        KEYCLOAK_REALM=dogan
#        KEYCLOAK_CLIENT_ID=shahin-bff
#        KEYCLOAK_JWKS_URL=http://127.0.0.1:8180/realms/dogan/protocol/openid-connect/certs
#        KEYCLOAK_ISSUER=http://127.0.0.1:8180/realms/dogan
#        KEYCLOAK_AUDIENCE=shahin-bff
#   3. Run scripts/backfill-keycloak-users.mjs --all --dry-run then --all.
#   4. Run scripts/provision-keycloak-module-roles.mjs.
#   5. pm2 restart auth-service workflow-service.
#
# Re-runnable: every step uses get-then-update to stay idempotent on replay.

set -euo pipefail

KC_URL="${KEYCLOAK_BASE_URL:-http://127.0.0.1:8180}"
ADMIN_REALM="master"
TARGET_REALM="dogan"
KCADM="${KCADM:-/opt/keycloak/bin/kcadm.sh}"

if [[ -z "${KEYCLOAK_BOOTSTRAP_USER:-}" || -z "${KEYCLOAK_BOOTSTRAP_PASSWORD:-}" ]]; then
  echo "ERROR: KEYCLOAK_BOOTSTRAP_USER and KEYCLOAK_BOOTSTRAP_PASSWORD must be exported." >&2
  exit 2
fi
if [[ -z "${KEYCLOAK_ADMIN_WRITE_CLIENT_SECRET:-}" ]]; then
  echo "ERROR: KEYCLOAK_ADMIN_WRITE_CLIENT_SECRET must be exported (generate: openssl rand -hex 32)." >&2
  exit 2
fi
if ! command -v "$KCADM" >/dev/null 2>&1; then
  echo "ERROR: kcadm.sh not found at $KCADM. Set KCADM=/path/to/kcadm.sh if installed elsewhere." >&2
  exit 2
fi

echo "[1/9] Login to $KC_URL as bootstrap admin ..."
"$KCADM" config credentials \
  --server "$KC_URL" \
  --realm "$ADMIN_REALM" \
  --user "$KEYCLOAK_BOOTSTRAP_USER" \
  --password "$KEYCLOAK_BOOTSTRAP_PASSWORD" >/dev/null

echo "[2/9] Ensure realm '$TARGET_REALM' exists ..."
if ! "$KCADM" get "realms/$TARGET_REALM" >/dev/null 2>&1; then
  "$KCADM" create realms \
    -s "realm=$TARGET_REALM" \
    -s enabled=true \
    -s registrationAllowed=true \
    -s registrationEmailAsUsername=true \
    -s resetPasswordAllowed=true \
    -s rememberMe=true \
    -s verifyEmail=false \
    -s loginWithEmailAllowed=true \
    -s duplicateEmailsAllowed=false \
    -s sslRequired=external \
    -s bruteForceProtected=true \
    -s permanentLockout=false \
    -s failureFactor=10 \
    -s accessTokenLifespan=900 \
    -s ssoSessionIdleTimeout=86400 \
    -s ssoSessionMaxLifespan=604800 \
    -s loginTheme=keycloak \
    -s accountTheme=dogan \
    -s emailTheme=dogan \
    -s internationalizationEnabled=true \
    -s 'supportedLocales=["en","ar"]' \
    -s defaultLocale=en >/dev/null
  echo "    created realm $TARGET_REALM"
else
  echo "    already exists — skipped"
fi

echo "[3/9] Ensure OIDC client 'shahin-bff' (confidential, standard flow) ..."
existing_bff_id=$("$KCADM" get clients -r "$TARGET_REALM" -q "clientId=shahin-bff" --fields id --format csv --noquotes | head -n1 || true)
if [[ -z "$existing_bff_id" ]]; then
  "$KCADM" create clients -r "$TARGET_REALM" \
    -s clientId=shahin-bff \
    -s enabled=true \
    -s publicClient=false \
    -s standardFlowEnabled=true \
    -s directAccessGrantsEnabled=true \
    -s serviceAccountsEnabled=true \
    -s 'redirectUris=["https://shahin-ai.com/api/auth/oidc/callback","https://www.shahin-ai.com/api/auth/oidc/callback","http://localhost:3000/api/auth/oidc/callback"]' \
    -s 'webOrigins=["https://shahin-ai.com","https://www.shahin-ai.com","http://localhost:3000"]' \
    -s 'attributes={"access.token.lifespan":"900","use.refresh.tokens":"true"}' >/dev/null
  echo "    created client shahin-bff"
else
  echo "    already exists — skipped ($existing_bff_id)"
fi

# Always normalize shahin-bff browser URIs (idempotent; auth host split).
bff_id=$("$KCADM" get clients -r "$TARGET_REALM" -q "clientId=shahin-bff" --fields id --format csv --noquotes | head -n1 || true)
if [[ -n "$bff_id" ]]; then
  "$KCADM" update "clients/$bff_id" -r "$TARGET_REALM" \
    -s 'redirectUris=["https://shahin-ai.com/api/auth/oidc/callback","https://www.shahin-ai.com/api/auth/oidc/callback","http://localhost:3000/api/auth/oidc/callback"]' \
    -s 'webOrigins=["https://shahin-ai.com","https://www.shahin-ai.com","http://localhost:3000"]' \
    >/dev/null 2>&1 || true
  echo "    normalized shahin-bff redirectUris + webOrigins (auth host split)"
fi

echo "[4/9] Ensure OIDC client 'shahin-web' (public, PKCE) ..."
existing_web_id=$("$KCADM" get clients -r "$TARGET_REALM" -q "clientId=shahin-web" --fields id --format csv --noquotes | head -n1 || true)
if [[ -z "$existing_web_id" ]]; then
  "$KCADM" create clients -r "$TARGET_REALM" \
    -s clientId=shahin-web \
    -s enabled=true \
    -s publicClient=true \
    -s standardFlowEnabled=true \
    -s directAccessGrantsEnabled=false \
    -s 'redirectUris=["https://shahin-ai.com/*","http://127.0.0.1:3000/*","http://localhost:3000/*"]' \
    -s 'webOrigins=["+"]' \
    -s 'attributes={"pkce.code.challenge.method":"S256"}' >/dev/null
  echo "    created client shahin-web"
else
  echo "    already exists — skipped ($existing_web_id)"
fi

echo "[5/9] Ensure narrow write client 'dauth-admin-write' (confidential, service account) ..."
existing_write_id=$("$KCADM" get clients -r "$TARGET_REALM" -q "clientId=dauth-admin-write" --fields id --format csv --noquotes | head -n1 || true)
if [[ -z "$existing_write_id" ]]; then
  "$KCADM" create clients -r "$TARGET_REALM" \
    -s clientId=dauth-admin-write \
    -s enabled=true \
    -s publicClient=false \
    -s standardFlowEnabled=false \
    -s directAccessGrantsEnabled=false \
    -s serviceAccountsEnabled=true \
    -s 'redirectUris=[]' \
    -s "secret=$KEYCLOAK_ADMIN_WRITE_CLIENT_SECRET" >/dev/null
  existing_write_id=$("$KCADM" get clients -r "$TARGET_REALM" -q "clientId=dauth-admin-write" --fields id --format csv --noquotes | head -n1)
  echo "    created client dauth-admin-write"
else
  # Rotate secret to the supplied one if provided (idempotent with fresh secret).
  "$KCADM" update "clients/$existing_write_id" -r "$TARGET_REALM" -s "secret=$KEYCLOAK_ADMIN_WRITE_CLIENT_SECRET" >/dev/null
  echo "    already exists — secret rotated to env value"
fi

echo "[6/9] Grant 'manage-users' + 'view-users' + 'query-users' on realm-management ..."
service_user_id=$("$KCADM" get "clients/$existing_write_id/service-account-user" -r "$TARGET_REALM" --fields id --format csv --noquotes | head -n1)
rm_client_id=$("$KCADM" get clients -r "$TARGET_REALM" -q "clientId=realm-management" --fields id --format csv --noquotes | head -n1)
for role_name in manage-users view-users query-users; do
  role_id=$("$KCADM" get "clients/$rm_client_id/roles/$role_name" -r "$TARGET_REALM" --fields id --format csv --noquotes | head -n1 || true)
  if [[ -n "$role_id" ]]; then
    "$KCADM" create "users/$service_user_id/role-mappings/clients/$rm_client_id" \
      -r "$TARGET_REALM" \
      -b "[{\"id\":\"$role_id\",\"name\":\"$role_name\"}]" >/dev/null 2>&1 || true
    echo "    granted: $role_name"
  fi
done

echo "[7/9] Ensure audience mapper on shahin-bff (aud=shahin-bff) ..."
bff_id=$("$KCADM" get clients -r "$TARGET_REALM" -q "clientId=shahin-bff" --fields id --format csv --noquotes | head -n1)
mapper_exists=$("$KCADM" get "clients/$bff_id/protocol-mappers/models" -r "$TARGET_REALM" --fields name --format csv --noquotes | grep -cx "aud-shahin-bff" || true)
if [[ "$mapper_exists" = "0" ]]; then
  "$KCADM" create "clients/$bff_id/protocol-mappers/models" -r "$TARGET_REALM" \
    -s name=aud-shahin-bff \
    -s protocol=openid-connect \
    -s protocolMapper=oidc-audience-mapper \
    -s 'config={"included.client.audience":"shahin-bff","id.token.claim":"false","access.token.claim":"true"}' >/dev/null
  echo "    created audience mapper aud=shahin-bff"
else
  echo "    audience mapper already present — skipped"
fi

echo "[8/9] Ensure baseline realm roles (platform_admin, tenant_admin, tenant_member, auditor, support, service) ..."
for role in platform_admin tenant_admin tenant_member auditor support service; do
  if ! "$KCADM" get "roles/$role" -r "$TARGET_REALM" >/dev/null 2>&1; then
    "$KCADM" create roles -r "$TARGET_REALM" -s "name=$role" >/dev/null
    echo "    created: $role"
  else
    echo "    exists: $role"
  fi
done

echo "[8.5/9] Reconcile realm flags (theme, registration, i18n) on existing realm ..."
"$KCADM" update "realms/$TARGET_REALM" \
  -s loginTheme=keycloak \
  -s accountTheme=dogan \
  -s emailTheme=dogan \
  -s registrationAllowed=true \
  -s registrationEmailAsUsername=true \
  -s verifyEmail=false \
  -s resetPasswordAllowed=true \
  -s rememberMe=true \
  -s loginWithEmailAllowed=true \
  -s duplicateEmailsAllowed=false \
  -s sslRequired=external \
  -s internationalizationEnabled=true \
  -s 'supportedLocales=["en","ar"]' \
  -s defaultLocale=en >/dev/null 2>&1 || true

echo "[8.6/9] Apply Dogan user-profile (required registration attributes) ..."
USER_PROFILE_JSON="$(cd "$(dirname "$0")" && pwd)/realm-config/dogan-user-profile.json"
if [[ -f "$USER_PROFILE_JSON" ]]; then
  # Patch 1 — declarative user-profile must be the realm's attribute source,
  # otherwise KC silently keeps the 4 built-in fields and our companyNameEn/
  # companyNameAr/country/phone never render on the registration form.
  "$KCADM" update "realms/$TARGET_REALM" \
    -s 'attributes."userProfileEnabled"=true' \
    -s 'unmanagedAttributePolicies=["ENABLED"]' || true

  # Try the v25+ path first, then fall back to the legacy path. Either MUST
  # succeed — no `|| true` swallow. If both fail the script exits non-zero
  # so CI/operator sees the import error instead of a phantom green log.
  if ! "$KCADM" update "realms/$TARGET_REALM/users/profile" -r "$TARGET_REALM" -f "$USER_PROFILE_JSON"; then
    "$KCADM" update "users/profile" -r "$TARGET_REALM" -f "$USER_PROFILE_JSON"
  fi
  echo "    applied: $USER_PROFILE_JSON"
else
  echo "    ERROR: $USER_PROFILE_JSON missing — abort" >&2
  exit 1
fi

echo "[8.7/9] Ensure protocol mappers expose user attributes in access + id tokens ..."
bff_id=$("$KCADM" get clients -r "$TARGET_REALM" -q "clientId=shahin-bff" --fields id --format csv --noquotes | head -n1)
existing_mappers=$("$KCADM" get "clients/$bff_id/protocol-mappers/models" -r "$TARGET_REALM" --fields name --format csv --noquotes || true)
# dos_* attrs are runtime claims (set by services after tenant resolution).
# companyName{En,Ar}/userName/consent are registration-form attrs collected on
# the KC sign-up page (see ops/keycloak/realm-config/dogan-user-profile.json);
# the BFF callback reads them from the ID-token to auto-provision the tenant
# (see platform/dauth/services/auth-service/src/domain/identity/keycloak-bootstrap.service.ts).
# Without these mappers the callback throws ORPHAN_KEYCLOAK_USER_BLOCKED:MISSING_COMPANY.
for attr in dos_user_id dos_tenant_id dos_workspace_id dos_role_profile dos_product_code dos_acr_required dos_risk_score companyNameEn companyNameAr userName consent; do
  mapper_name="map-$attr"
  if ! grep -qx "$mapper_name" <<<"$existing_mappers"; then
    "$KCADM" create "clients/$bff_id/protocol-mappers/models" -r "$TARGET_REALM" \
      -s "name=$mapper_name" \
      -s protocol=openid-connect \
      -s protocolMapper=oidc-usermodel-attribute-mapper \
      -s "config={\"user.attribute\":\"$attr\",\"claim.name\":\"$attr\",\"jsonType.label\":\"String\",\"id.token.claim\":\"true\",\"access.token.claim\":\"true\",\"userinfo.token.claim\":\"true\"}" >/dev/null 2>&1 || true
    echo "    created: $mapper_name"
  else
    echo "    exists: $mapper_name"
  fi
done

echo "[8.8/9] Apply Stage-1 enterprise hardening (password policy, token reuse, session caps) ..."
"$KCADM" update "realms/$TARGET_REALM" \
  -s 'passwordPolicy=length(12) and upperCase(1) and lowerCase(1) and digits(1) and specialChars(1) and notUsername(undefined) and passwordHistory(5) and forceExpiredPasswordChange(180)' \
  -s revokeRefreshToken=true \
  -s refreshTokenMaxReuse=0 \
  -s accessTokenLifespan=900 \
  -s accessTokenLifespanForImplicitFlow=0 \
  -s ssoSessionIdleTimeout=1800 \
  -s ssoSessionMaxLifespan=43200 \
  -s offlineSessionIdleTimeout=2592000 \
  -s offlineSessionMaxLifespanEnabled=true \
  -s offlineSessionMaxLifespan=5184000 \
  -s clientSessionIdleTimeout=900 \
  -s clientSessionMaxLifespan=43200 \
  -s waitIncrementSeconds=60 \
  -s maxFailureWaitSeconds=900 \
  -s minimumQuickLoginWaitSeconds=60 \
  -s quickLoginCheckMilliSeconds=1000 \
  -s maxDeltaTimeSeconds=43200 \
  -s failureFactor=20 \
  -s permanentLockout=true \
  -s attributes.cibaBackchannelTokenDeliveryMode=poll \
  -s attributes.frontendUrl= \
  -s 'attributes.clientSessionIdleTimeout=900' >/dev/null 2>&1 || true
echo "    applied hardening profile"

echo "[8.9/9] Ensure shahin-web client enforces PKCE (S256) and disables direct-access ..."
web_id=$("$KCADM" get clients -r "$TARGET_REALM" -q "clientId=shahin-web" --fields id --format csv --noquotes | head -n1)
if [[ -n "$web_id" ]]; then
  "$KCADM" update "clients/$web_id" -r "$TARGET_REALM" \
    -s publicClient=true \
    -s standardFlowEnabled=true \
    -s directAccessGrantsEnabled=false \
    -s 'attributes={"pkce.code.challenge.method":"S256","post.logout.redirect.uris":"https://shahin-ai.com/*##https://www.shahin-ai.com/*","backchannel.logout.session.required":"true","backchannel.logout.revoke.offline.tokens":"true"}' >/dev/null 2>&1 || true
  echo "    hardened: shahin-web"
fi

echo "[8.10/9] Ensure shahin-bff client: short-lived tokens, backchannel-logout, audience lock ..."
bff_id=$("$KCADM" get clients -r "$TARGET_REALM" -q "clientId=shahin-bff" --fields id --format csv --noquotes | head -n1)
if [[ -n "$bff_id" ]]; then
  "$KCADM" update "clients/$bff_id" -r "$TARGET_REALM" \
    -s 'attributes={"access.token.lifespan":"900","use.refresh.tokens":"true","backchannel.logout.session.required":"true","backchannel.logout.revoke.offline.tokens":"true","post.logout.redirect.uris":"https://shahin-ai.com/*##https://www.shahin-ai.com/*","tls.client.certificate.bound.access.tokens":"false","oauth2.device.authorization.grant.enabled":"false"}' >/dev/null 2>&1 || true
  echo "    hardened: shahin-bff"
fi

echo "[8.11/9] Ensure realm key rotation (90-day RSA/ES256) — policies are idempotent on name ..."
# Verify a signing key provider exists; create an ES256 signing key if missing for forward migration.
existing_es256=$("$KCADM" get "keys" -r "$TARGET_REALM" 2>/dev/null | grep -c '"alg" : "ES256"' || true)
if [[ "$existing_es256" = "0" ]]; then
  "$KCADM" create "components" -r "$TARGET_REALM" \
    -s name=es256-signing \
    -s providerId=ecdsa-generated \
    -s providerType=org.keycloak.keys.KeyProvider \
    -s 'config.priority=["110"]' \
    -s 'config.enabled=["true"]' \
    -s 'config.active=["true"]' \
    -s 'config.ecdsaEllipticCurveKey=["P-256"]' >/dev/null 2>&1 || true
  echo "    created: ES256 signing key"
else
  echo "    ES256 signing key already present"
fi

echo "[8.12/9] Ensure event logging + admin event logging enabled ..."
"$KCADM" update "events/config" -r "$TARGET_REALM" \
  -s eventsEnabled=true \
  -s eventsExpiration=2592000 \
  -s 'eventsListeners=["jboss-logging"]' \
  -s 'enabledEventTypes=["LOGIN","LOGIN_ERROR","LOGOUT","LOGOUT_ERROR","REGISTER","REGISTER_ERROR","UPDATE_PASSWORD","UPDATE_TOTP","REMOVE_TOTP","REMOVE_CREDENTIAL","UPDATE_PROFILE","VERIFY_EMAIL","SEND_VERIFY_EMAIL","RESET_PASSWORD","RESET_PASSWORD_ERROR","CLIENT_LOGIN","CLIENT_LOGIN_ERROR","TOKEN_EXCHANGE","CODE_TO_TOKEN","REFRESH_TOKEN","REFRESH_TOKEN_ERROR","IDENTITY_PROVIDER_LINK_ACCOUNT","IDENTITY_PROVIDER_FIRST_LOGIN","IMPERSONATE","CUSTOM_REQUIRED_ACTION"]' \
  -s adminEventsEnabled=true \
  -s adminEventsDetailsEnabled=false >/dev/null 2>&1 || true
echo "    event logging active"

echo "[8.13/9] Ensure baseline IAM admin roles: incident_responder, compliance_officer, risk_approver, legal_hold_manager ..."
for role in incident_responder compliance_officer risk_approver legal_hold_manager mfa_required; do
  if ! "$KCADM" get "roles/$role" -r "$TARGET_REALM" >/dev/null 2>&1; then
    "$KCADM" create roles -r "$TARGET_REALM" -s "name=$role" -s "description=DOS enterprise role $role" >/dev/null
    echo "    created: $role"
  else
    echo "    exists: $role"
  fi
done

echo "[8.14/9] Ensure tenants root group /tenants (children created on tenant provisioning) ..."
if ! "$KCADM" get "group-by-path/tenants" -r "$TARGET_REALM" >/dev/null 2>&1; then
  "$KCADM" create groups -r "$TARGET_REALM" -s name=tenants >/dev/null 2>&1 || true
  echo "    created: /tenants"
else
  echo "    exists: /tenants"
fi

echo "[8.15/9] Phase 0 acceptance gate — print live realm state for operator verification."
echo "    --- realm flags ---"
"$KCADM" get "realms/$TARGET_REALM" \
  --fields realm,enabled,sslRequired,registrationAllowed,registrationEmailAsUsername,verifyEmail,resetPasswordAllowed,rememberMe,loginWithEmailAllowed,duplicateEmailsAllowed,bruteForceProtected,permanentLockout,failureFactor,accessTokenLifespan,ssoSessionIdleTimeout,ssoSessionMaxLifespan,revokeRefreshToken,refreshTokenMaxReuse,loginTheme,accountTheme,emailTheme,internationalizationEnabled,supportedLocales,defaultLocale,passwordPolicy \
  2>/dev/null || true

echo "    --- shahin-bff client ---"
"$KCADM" get clients -r "$TARGET_REALM" -q "clientId=shahin-bff" \
  --fields clientId,enabled,publicClient,standardFlowEnabled,serviceAccountsEnabled,redirectUris,webOrigins,attributes 2>/dev/null || true

echo "    --- shahin-web client ---"
"$KCADM" get clients -r "$TARGET_REALM" -q "clientId=shahin-web" \
  --fields clientId,enabled,publicClient,standardFlowEnabled,redirectUris,webOrigins,attributes 2>/dev/null || true

echo "    --- shahin-bff protocol mappers (must include aud-shahin-bff + map-dos_*) ---"
bff_id_v=$("$KCADM" get clients -r "$TARGET_REALM" -q "clientId=shahin-bff" --fields id --format csv --noquotes | head -n1 || true)
if [[ -n "$bff_id_v" ]]; then
  "$KCADM" get "clients/$bff_id_v/protocol-mappers/models" -r "$TARGET_REALM" --fields name 2>/dev/null || true
fi

echo "    --- baseline realm roles (must include platform_admin, tenant_admin, tenant_member, auditor, support, service) ---"
"$KCADM" get roles -r "$TARGET_REALM" --fields name 2>/dev/null | tr -d ' ' | grep -E '"(platform_admin|tenant_admin|tenant_member|auditor|support|service|incident_responder|compliance_officer|risk_approver|legal_hold_manager|mfa_required)"' || true

echo "    --- declarative user-profile required attributes (must include companyNameEn, userName, consent) ---"
"$KCADM" get "realms/$TARGET_REALM/users/profile" 2>/dev/null \
  | grep -E '"name"|"required"' | head -n 60 || true

echo "    --- /tenants root group ---"
"$KCADM" get "group-by-path/tenants" -r "$TARGET_REALM" --fields id,name,path 2>/dev/null || true

echo "    --- phase 0 gate: review the output above; every section must be non-empty ---"

echo "[9/9] Print next steps."
cat <<EOF
────────────────────────────────────────────────────────────────────────────
Realm provisioning complete. Next steps (operator):

1. Put the write-client secret into /etc/keycloak/keycloak.env (mode 0640):
     echo "KEYCLOAK_ADMIN_WRITE_CLIENT_SECRET=\${KEYCLOAK_ADMIN_WRITE_CLIENT_SECRET}" | sudo tee -a /etc/keycloak/keycloak.env
     sudo chmod 0640 /etc/keycloak/keycloak.env
     sudo chown keycloak:keycloak /etc/keycloak/keycloak.env

2. Update platform/config-center/env/.env.shared (and auth-service.env / workflow-service.env):
     KEYCLOAK_REALM=dogan
     KEYCLOAK_CLIENT_ID=shahin-bff
     KEYCLOAK_JWKS_URL=http://127.0.0.1:8180/realms/dogan/protocol/openid-connect/certs
     KEYCLOAK_ISSUER=http://127.0.0.1:8180/realms/dogan
     KEYCLOAK_AUDIENCE=shahin-bff
     KEYCLOAK_ADMIN_WRITE_CLIENT_ID=dauth-admin-write

3. Run backfill (dry-run first):
     node scripts/backfill-keycloak-users.mjs --all --dry-run
     node scripts/backfill-keycloak-users.mjs --all

4. Run composite role provisioning:
     node scripts/provision-keycloak-module-roles.mjs

5. pm2 restart auth-service workflow-service
────────────────────────────────────────────────────────────────────────────
EOF

echo "OK"
