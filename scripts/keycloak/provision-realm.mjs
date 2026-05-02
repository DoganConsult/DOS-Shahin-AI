#!/usr/bin/env node
/**
 * Provision the target Keycloak realm per
 * platform/core/current-source/dauth/adapters/keycloak/KEYCLOAK-REALM-MAPPING.md.
 *
 * Idempotent — safe to re-run. Creates only what is missing.
 *
 * Steps:
 *   1. Ensure realm `<KEYCLOAK_TARGET_REALM>` exists with hardened defaults
 *      (sslRequired=all, brute-force protection, OTP policy, token lifespans).
 *   2. Ensure clients `shahin-bff` (confidential), `shahin-web` (public PKCE),
 *      `dauth-admin` (read-only sync), `dauth-write` (manage-users),
 *      `dauth-pipeline` (CI/cron), `mobile` (public PKCE) exist.
 *   3. Ensure baseline realm roles exist (platform_admin, tenant_admin,
 *      tenant_member, support, auditor, service).
 *   4. Add `aud=shahin-bff` audience mapper to shahin-bff client.
 *
 * Usage:
 *   KEYCLOAK_BASE_URL=... KEYCLOAK_BOOTSTRAP_USER=admin \
 *     KEYCLOAK_BOOTSTRAP_PASSWORD=*** node scripts/keycloak/provision-realm.mjs
 *   node scripts/keycloak/provision-realm.mjs --dry-run
 *
 * The bootstrap admin (master realm `admin-cli` user) is required only for
 * the initial provision. After completion, all writes flow via
 * `dauth-write` service account.
 */

const REALM = process.env.KEYCLOAK_TARGET_REALM || 'dogan';
const BASE_URL = (process.env.KEYCLOAK_BASE_URL || 'http://127.0.0.1:8180').replace(/\/$/, '');
const BOOTSTRAP_USER = process.env.KEYCLOAK_BOOTSTRAP_USER || 'admin';
const BOOTSTRAP_PASS = process.env.KEYCLOAK_BOOTSTRAP_PASSWORD || '';
const DRY_RUN = process.argv.includes('--dry-run');

const REALM_SETTINGS = {
  realm: REALM,
  enabled: true,
  sslRequired: 'all',
  registrationAllowed: false,
  loginWithEmailAllowed: true,
  duplicateEmailsAllowed: false,
  resetPasswordAllowed: true,
  rememberMe: false,
  bruteForceProtected: true,
  permanentLockout: true,
  failureFactor: 30,
  waitIncrementSeconds: 60,
  maxFailureWaitSeconds: 900,
  // Token lifespans match DAuth defaults.
  accessTokenLifespan: 900,                // 15 min
  ssoSessionMaxLifespan: 7 * 24 * 3600,    // 7 d
  ssoSessionIdleTimeout: 24 * 3600,        // 24 h idle
  // OTP policy (TOTP, SHA256, 6 digits, 30s).
  otpPolicyType: 'totp',
  otpPolicyAlgorithm: 'HmacSHA256',
  otpPolicyDigits: 6,
  otpPolicyPeriod: 30,
  otpPolicyLookAheadWindow: 1,
};

const CLIENTS = [
  {
    clientId: 'shahin-bff',
    publicClient: false,
    serviceAccountsEnabled: true,
    standardFlowEnabled: true,
    directAccessGrantsEnabled: false,
    protocol: 'openid-connect',
    attributes: { 'access.token.lifespan': '900' },
  },
  {
    clientId: 'shahin-web',
    publicClient: true,
    standardFlowEnabled: true,
    directAccessGrantsEnabled: false,
    attributes: { 'pkce.code.challenge.method': 'S256' },
    protocol: 'openid-connect',
  },
  {
    clientId: 'dauth-admin',
    publicClient: false,
    serviceAccountsEnabled: true,
    standardFlowEnabled: false,
    directAccessGrantsEnabled: false,
    protocol: 'openid-connect',
    description: 'Read-only sync (view-users, query-users)',
  },
  {
    clientId: 'dauth-write',
    publicClient: false,
    serviceAccountsEnabled: true,
    standardFlowEnabled: false,
    directAccessGrantsEnabled: false,
    protocol: 'openid-connect',
    description: 'Narrow write (manage-users) — fire/hire/onboarding writes',
  },
  {
    clientId: 'dauth-pipeline',
    publicClient: false,
    serviceAccountsEnabled: true,
    protocol: 'openid-connect',
    description: 'CI/cron service account',
  },
  {
    clientId: 'mobile',
    publicClient: true,
    standardFlowEnabled: true,
    attributes: { 'pkce.code.challenge.method': 'S256' },
    protocol: 'openid-connect',
  },
  {
    clientId: 'dauth-login',
    publicClient: false,
    serviceAccountsEnabled: false,
    standardFlowEnabled: false,
    directAccessGrantsEnabled: true,
    implicitFlowEnabled: false,
    protocol: 'openid-connect',
    description: 'Confidential ROPC (direct access grant) client used by auth-service /api/auth/login to mint RS256 tokens with aud=shahin-bff. Never exposed to browser.',
    attributes: { 'access.token.lifespan': '900' },
  },
];

const REALM_ROLES = [
  'platform_admin',
  'tenant_admin',
  'tenant_member',
  'support',
  'auditor',
  'service',
];

async function bootstrapToken() {
  if (!BOOTSTRAP_PASS) {
    throw new Error(
      'KEYCLOAK_BOOTSTRAP_PASSWORD required for first provision (master-realm admin).',
    );
  }
  const body = new URLSearchParams({
    grant_type: 'password',
    client_id: 'admin-cli',
    username: BOOTSTRAP_USER,
    password: BOOTSTRAP_PASS,
  });
  const res = await fetch(
    `${BASE_URL}/realms/master/protocol/openid-connect/token`,
    { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body: body.toString() },
  );
  if (!res.ok) throw new Error(`bootstrap token failed: ${res.status}`);
  return (await res.json()).access_token;
}

async function api(method, token, path, body) {
  const res = await fetch(`${BASE_URL}${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  return res;
}

async function ensureRealm(token) {
  const res = await api('GET', token, `/admin/realms/${encodeURIComponent(REALM)}`);
  if (res.ok) {
    console.log(`[realm] ${REALM} exists — updating settings`);
    if (DRY_RUN) return;
    const upd = await api('PUT', token, `/admin/realms/${encodeURIComponent(REALM)}`, REALM_SETTINGS);
    if (!upd.ok && upd.status !== 204) {
      console.warn(`[realm] update returned ${upd.status}`);
    }
    return;
  }
  if (DRY_RUN) {
    console.log(`[realm] would create ${REALM}`);
    return;
  }
  const create = await api('POST', token, `/admin/realms`, REALM_SETTINGS);
  if (!create.ok && create.status !== 201) {
    throw new Error(`createRealm failed: ${create.status} ${await create.text()}`);
  }
  console.log(`[realm] created ${REALM}`);
}

async function findClientId(token, clientId) {
  const res = await api(
    'GET',
    token,
    `/admin/realms/${encodeURIComponent(REALM)}/clients?clientId=${encodeURIComponent(clientId)}`,
  );
  if (!res.ok) return null;
  const arr = await res.json();
  return Array.isArray(arr) && arr[0] ? arr[0].id : null;
}

async function ensureClient(token, def) {
  const existing = await findClientId(token, def.clientId);
  if (existing) {
    console.log(`[client] ${def.clientId} exists`);
    return existing;
  }
  if (DRY_RUN) {
    console.log(`[client] would create ${def.clientId}`);
    return null;
  }
  const res = await api('POST', token, `/admin/realms/${encodeURIComponent(REALM)}/clients`, def);
  if (!res.ok && res.status !== 201) {
    throw new Error(`createClient ${def.clientId} failed: ${res.status} ${await res.text()}`);
  }
  console.log(`[client] created ${def.clientId}`);
  return findClientId(token, def.clientId);
}

async function ensureAudienceMapper(token, clientUuid) {
  const url = `/admin/realms/${encodeURIComponent(REALM)}/clients/${clientUuid}/protocol-mappers/models`;
  const get = await api('GET', token, url);
  if (!get.ok) return;
  const list = await get.json();
  if (Array.isArray(list) && list.some((m) => m.name === 'shahin-bff-audience')) {
    console.log('[mapper] aud=shahin-bff exists');
    return;
  }
  if (DRY_RUN) {
    console.log('[mapper] would add aud=shahin-bff');
    return;
  }
  const mapper = {
    name: 'shahin-bff-audience',
    protocol: 'openid-connect',
    protocolMapper: 'oidc-audience-mapper',
    config: {
      'included.client.audience': 'shahin-bff',
      'id.token.claim': 'false',
      'access.token.claim': 'true',
    },
  };
  const res = await api('POST', token, url, mapper);
  if (!res.ok && res.status !== 201) {
    console.warn(`[mapper] add failed: ${res.status} ${await res.text()}`);
  } else {
    console.log('[mapper] aud=shahin-bff added');
  }
}

// DOS custom claim mappers — project the KC user attributes `dos_*` onto
// the access + id tokens so downstream services can read them without a
// round-trip to the Admin API. Claims included: dos_user_id, dos_tenant_id,
// dos_workspace_id, dos_role_profile. Keycloak `user-attribute` mapper.
const DOS_CLAIM_MAPPERS = [
  { attr: 'dos_user_id',       claim: 'dos_user_id' },
  { attr: 'dos_tenant_id',     claim: 'dos_tenant_id' },
  { attr: 'dos_workspace_id',  claim: 'dos_workspace_id' },
  { attr: 'dos_role_profile',  claim: 'dos_role_profile' },
];

async function ensureDosClaimMappers(token, clientUuid, clientName) {
  const url = `/admin/realms/${encodeURIComponent(REALM)}/clients/${clientUuid}/protocol-mappers/models`;
  const get = await api('GET', token, url);
  if (!get.ok) return;
  const list = await get.json();
  const names = new Set(Array.isArray(list) ? list.map((m) => m.name) : []);
  for (const { attr, claim } of DOS_CLAIM_MAPPERS) {
    const mapperName = `${claim}-mapper`;
    if (names.has(mapperName)) {
      console.log(`[mapper] ${clientName}.${mapperName} exists`);
      continue;
    }
    if (DRY_RUN) {
      console.log(`[mapper] would add ${clientName}.${mapperName}`);
      continue;
    }
    const mapper = {
      name: mapperName,
      protocol: 'openid-connect',
      protocolMapper: 'oidc-usermodel-attribute-mapper',
      config: {
        'user.attribute': attr,
        'claim.name': claim,
        'jsonType.label': 'String',
        'id.token.claim': 'true',
        'access.token.claim': 'true',
        'userinfo.token.claim': 'true',
        'multivalued': 'false',
      },
    };
    const res = await api('POST', token, url, mapper);
    if (!res.ok && res.status !== 201) {
      console.warn(`[mapper] ${clientName}.${mapperName} add failed: ${res.status} ${await res.text()}`);
    } else {
      console.log(`[mapper] ${clientName}.${mapperName} added`);
    }
  }
}

// Default required actions applied to freshly-created users so the first
// login goes through the canonical Keycloak authentication experience
// (verify email, force password reset, enrol TOTP). DAuth never stores
// user OTP secrets after cutover; Keycloak owns MFA.
async function ensureRequiredActionsDefaults(token) {
  const url = `/admin/realms/${encodeURIComponent(REALM)}/authentication/required-actions`;
  const res = await api('GET', token, url);
  if (!res.ok) {
    console.warn(`[required-actions] list failed: ${res.status}`);
    return;
  }
  const actions = await res.json();
  if (!Array.isArray(actions)) return;
  const wanted = new Set(['VERIFY_EMAIL', 'UPDATE_PASSWORD', 'CONFIGURE_TOTP']);
  for (const act of actions) {
    if (!wanted.has(act.alias)) continue;
    if (act.defaultAction === true && act.enabled === true) {
      console.log(`[required-actions] ${act.alias} already default`);
      continue;
    }
    if (DRY_RUN) {
      console.log(`[required-actions] would mark ${act.alias} default+enabled`);
      continue;
    }
    const body = { ...act, defaultAction: true, enabled: true };
    const upd = await api(
      'PUT',
      token,
      `/admin/realms/${encodeURIComponent(REALM)}/authentication/required-actions/${encodeURIComponent(act.alias)}`,
      body,
    );
    if (!upd.ok && upd.status !== 204) {
      console.warn(`[required-actions] ${act.alias} update returned ${upd.status}`);
    } else {
      console.log(`[required-actions] ${act.alias} marked default+enabled`);
    }
  }
}

async function ensureRealmRole(token, name) {
  const res = await api('GET', token, `/admin/realms/${encodeURIComponent(REALM)}/roles/${encodeURIComponent(name)}`);
  if (res.ok) {
    console.log(`[role] ${name} exists`);
    return;
  }
  if (DRY_RUN) {
    console.log(`[role] would create ${name}`);
    return;
  }
  const create = await api('POST', token, `/admin/realms/${encodeURIComponent(REALM)}/roles`, { name });
  if (!create.ok && create.status !== 201 && create.status !== 409) {
    throw new Error(`createRole ${name} failed: ${create.status} ${await create.text()}`);
  }
  console.log(`[role] created ${name}`);
}

async function main() {
  console.log(`[provision-realm] target=${REALM} baseUrl=${BASE_URL} dryRun=${DRY_RUN}`);
  const token = await bootstrapToken();
  await ensureRealm(token);
  let bffUuid = null;
  let loginUuid = null;
  for (const def of CLIENTS) {
    const uuid = await ensureClient(token, def);
    if (def.clientId === 'shahin-bff') bffUuid = uuid;
    if (def.clientId === 'dauth-login') loginUuid = uuid;
  }
  if (bffUuid) {
    await ensureAudienceMapper(token, bffUuid);
    await ensureDosClaimMappers(token, bffUuid, 'shahin-bff');
  }
  // dauth-login mints the backend token; it must carry the same DOS claims
  // and aud=shahin-bff so downstream services accept it via the configured
  // KEYCLOAK_AUDIENCE.
  if (loginUuid) {
    await ensureAudienceMapper(token, loginUuid);
    await ensureDosClaimMappers(token, loginUuid, 'dauth-login');
  }
  for (const r of REALM_ROLES) await ensureRealmRole(token, r);
  await ensureRequiredActionsDefaults(token);
  console.log('[provision-realm] done');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
