#!/usr/bin/env node
/**
 * Provision a DOS product into Keycloak.
 *
 * For every product in platform_dos.products_registry (or passed via --product)
 * this script idempotently ensures:
 *   1. A confidential OIDC client `prod-<code>-bff`.
 *   2. A public PKCE OIDC client `prod-<code>-web`.
 *   3. A client-scope `product:<code>` that emits `dos_product_code=<code>`.
 *   4. Protocol mappers so every token carries dos_* claims.
 *   5. An audience mapper on the -bff client (aud=prod-<code>-bff).
 *
 * Source of truth for client composition is this script; the DB registry owns
 * which products exist. The script never deletes clients — rotations must go
 * through the admin console.
 *
 * Usage:
 *   node scripts/provision-keycloak-product.mjs --product shahin-grc
 *   node scripts/provision-keycloak-product.mjs --all --dry-run
 */
import { Client } from 'pg';

const DOS_CLAIMS = [
  'dos_user_id',
  'dos_tenant_id',
  'dos_workspace_id',
  'dos_role_profile',
  'dos_product_code',
  'dos_acr_required',
  'dos_risk_score',
];

function env(name, fallback) {
  const v = process.env[name];
  return v && v.length > 0 ? v : fallback;
}

function parseArgs(argv) {
  const out = { product: null, all: false, dryRun: false };
  for (let i = 2; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--product') out.product = argv[++i];
    else if (a === '--all') out.all = true;
    else if (a === '--dry-run') out.dryRun = true;
  }
  if (!out.product && !out.all) {
    console.error('Usage: provision-keycloak-product.mjs --product <code> | --all [--dry-run]');
    process.exit(2);
  }
  return out;
}

async function adminToken(baseUrl, realm, clientId, clientSecret) {
  const body = new URLSearchParams({
    grant_type: 'client_credentials',
    client_id: clientId,
    client_secret: clientSecret,
  });
  const res = await fetch(
    `${baseUrl.replace(/\/$/, '')}/realms/${encodeURIComponent(realm)}/protocol/openid-connect/token`,
    { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body: body.toString() },
  );
  if (!res.ok) throw new Error(`admin token failed: ${res.status}`);
  return (await res.json()).access_token;
}

function kcUrl(baseUrl, realm, path) {
  return `${baseUrl.replace(/\/$/, '')}/admin/realms/${encodeURIComponent(realm)}${path}`;
}

async function kcGet(baseUrl, realm, token, path) {
  const res = await fetch(kcUrl(baseUrl, realm, path), { headers: { Authorization: `Bearer ${token}` } });
  if (res.status === 404) return null;
  if (!res.ok) throw new Error(`GET ${path} → ${res.status}`);
  return await res.json();
}

async function kcPost(baseUrl, realm, token, path, body) {
  const res = await fetch(kcUrl(baseUrl, realm, path), {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (res.status !== 201 && res.status !== 204 && res.status !== 409) {
    const text = await res.text();
    throw new Error(`POST ${path} → ${res.status}: ${text}`);
  }
}

async function findClient(baseUrl, realm, token, clientId) {
  const list = await kcGet(baseUrl, realm, token, `/clients?clientId=${encodeURIComponent(clientId)}`);
  return list && list.length > 0 ? list[0] : null;
}

async function ensureClient(baseUrl, realm, token, spec, dryRun) {
  const existing = await findClient(baseUrl, realm, token, spec.clientId);
  if (existing) {
    if (dryRun) return { id: existing.id, created: false, updated: 'dry-run' };
    const merged = {
      ...existing,
      rootUrl: spec.rootUrl ?? existing.rootUrl,
      baseUrl: spec.baseUrl ?? existing.baseUrl,
      adminUrl: spec.adminUrl ?? existing.adminUrl,
      redirectUris: spec.redirectUris ?? existing.redirectUris,
      webOrigins: spec.webOrigins ?? existing.webOrigins,
      attributes: { ...(existing.attributes || {}), ...(spec.attributes || {}) },
    };
    const res = await fetch(kcUrl(baseUrl, realm, `/clients/${existing.id}`), {
      method: 'PUT',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(merged),
    });
    if (res.status !== 204 && res.status !== 200) {
      const text = await res.text();
      throw new Error(`PUT /clients/${existing.id} → ${res.status}: ${text}`);
    }
    return { id: existing.id, created: false, updated: true };
  }
  if (dryRun) return { id: null, created: true, dryRun: true };
  await kcPost(baseUrl, realm, token, '/clients', spec);
  const created = await findClient(baseUrl, realm, token, spec.clientId);
  return { id: created?.id ?? null, created: true };
}

async function ensureClientScope(baseUrl, realm, token, name, dryRun) {
  const scopes = await kcGet(baseUrl, realm, token, '/client-scopes');
  const existing = (scopes || []).find((s) => s.name === name);
  if (existing) return existing.id;
  if (dryRun) return null;
  await kcPost(baseUrl, realm, token, '/client-scopes', {
    name,
    protocol: 'openid-connect',
    attributes: { 'include.in.token.scope': 'true', 'display.on.consent.screen': 'false' },
  });
  const after = await kcGet(baseUrl, realm, token, '/client-scopes');
  return (after || []).find((s) => s.name === name)?.id ?? null;
}

async function ensureDosMappers(baseUrl, realm, token, clientUuid, dryRun) {
  const existing = await kcGet(baseUrl, realm, token, `/clients/${clientUuid}/protocol-mappers/models`);
  const names = new Set((existing || []).map((m) => m.name));
  for (const attr of DOS_CLAIMS) {
    const name = `map-${attr}`;
    if (names.has(name)) continue;
    if (dryRun) continue;
    await kcPost(baseUrl, realm, token, `/clients/${clientUuid}/protocol-mappers/models`, {
      name,
      protocol: 'openid-connect',
      protocolMapper: 'oidc-usermodel-attribute-mapper',
      config: {
        'user.attribute': attr,
        'claim.name': attr,
        'jsonType.label': 'String',
        'id.token.claim': 'true',
        'access.token.claim': 'true',
        'userinfo.token.claim': 'true',
      },
    });
  }
}

async function ensureAudienceMapper(baseUrl, realm, token, clientUuid, audience, dryRun) {
  const existing = await kcGet(baseUrl, realm, token, `/clients/${clientUuid}/protocol-mappers/models`);
  const name = `aud-${audience}`;
  if ((existing || []).some((m) => m.name === name)) return;
  if (dryRun) return;
  await kcPost(baseUrl, realm, token, `/clients/${clientUuid}/protocol-mappers/models`, {
    name,
    protocol: 'openid-connect',
    protocolMapper: 'oidc-audience-mapper',
    config: {
      'included.client.audience': audience,
      'id.token.claim': 'false',
      'access.token.claim': 'true',
    },
  });
}

async function listProducts(dbUrl, explicit) {
  if (explicit) return [{ product_code: explicit }];
  if (!dbUrl) {
    console.error('DATABASE_URL required for --all');
    process.exit(2);
  }
  const pg = new Client({ connectionString: dbUrl });
  await pg.connect();
  try {
    const res = await pg.query(
      `SELECT DISTINCT product_code FROM platform_dos.tenants_registry WHERE status = 'active' ORDER BY product_code`,
    ).catch(() => ({ rows: [] }));
    return res.rows;
  } finally {
    await pg.end();
  }
}

/**
 * Resolve the public product host(s) and IdP fronting host for a product.
 *
 * Same-domain factory reset: Keycloak is mounted under
 * https://shahin-ai.com/login (KC_HTTP_RELATIVE_PATH=/login). There is no
 * separate auth.* subdomain — `authHost` collapses to the canonical product
 * host. It's kept in the return shape only for back-compat with callers
 * that still read it.
 *
 * Priority:
 *   1. Explicit env override: PRODUCT_HOST_<CODE_UPPER> (comma-separated)
 *   2. Known registry (shahin-grc/shahin → shahin-ai.com)
 *   3. Fallback to `<code>.shahin-ai.com`
 *
 * Returned `productHosts` feed webOrigins + Valid Redirect URIs + Valid
 * Post Logout URIs on the BFF and web clients.
 */
function resolveHostsFor(code) {
  const upper = code.replace(/[^A-Za-z0-9]/g, '_').toUpperCase();
  const explicit = env(`PRODUCT_HOST_${upper}`);
  if (explicit) {
    const hosts = explicit.split(',').map((s) => s.trim()).filter(Boolean);
    return { productHosts: hosts, authHost: env(`AUTH_HOST_${upper}`) || hosts[0] };
  }
  if (/^shahin/.test(code)) {
    return {
      productHosts: ['shahin-ai.com', 'www.shahin-ai.com'],
      authHost: 'shahin-ai.com',
    };
  }
  return {
    productHosts: [`${code}.shahin-ai.com`],
    authHost: 'shahin-ai.com',
  };
}

function buildClientUris(productHosts) {
  const origins = productHosts.map((h) => `https://${h}`);
  const redirects = productHosts.flatMap((h) => [
    `https://${h}/api/auth/oidc/callback`,
    `https://${h}/auth/callback`,
    `https://${h}/`,
  ]);
  const postLogout = productHosts.flatMap((h) => [
    `https://${h}/`,
    `https://${h}/login`,
  ]);
  return {
    rootUrl: origins[0],
    baseUrl: '/',
    adminUrl: origins[0],
    redirectUris: redirects,
    webOrigins: origins,
    attributesPostLogout: postLogout.join('##'),
  };
}

async function main() {
  const args = parseArgs(process.argv);
  const baseUrl = env('KEYCLOAK_BASE_URL');
  const realm = env('KEYCLOAK_REALM');
  const clientId = env('KEYCLOAK_ADMIN_WRITE_CLIENT_ID') ?? env('KEYCLOAK_CLIENT_ID');
  const clientSecret = env('KEYCLOAK_ADMIN_WRITE_CLIENT_SECRET') ?? env('KEYCLOAK_ADMIN_CLIENT_SECRET');
  if (!baseUrl || !realm || !clientId || !clientSecret) {
    console.error('missing KEYCLOAK_BASE_URL / REALM / admin client creds');
    process.exit(2);
  }

  const token = await adminToken(baseUrl, realm, clientId, clientSecret);
  const products = await listProducts(env('DATABASE_URL'), args.product);

  const out = { products: [], dryRun: args.dryRun };
  for (const { product_code: code } of products) {
    const bffId = `prod-${code}-bff`;
    const webId = `prod-${code}-web`;

    const { productHosts, authHost } = resolveHostsFor(code);
    const uris = buildClientUris(productHosts);
    out.products = out.products || [];

    const bff = await ensureClient(baseUrl, realm, token, {
      clientId: bffId,
      enabled: true,
      publicClient: false,
      standardFlowEnabled: true,
      directAccessGrantsEnabled: false,
      serviceAccountsEnabled: true,
      rootUrl: uris.rootUrl,
      baseUrl: uris.baseUrl,
      adminUrl: uris.adminUrl,
      redirectUris: uris.redirectUris,
      webOrigins: uris.webOrigins,
      attributes: {
        'access.token.lifespan': '900',
        'use.refresh.tokens': 'true',
        'backchannel.logout.session.required': 'true',
        'backchannel.logout.revoke.offline.tokens': 'true',
        'post.logout.redirect.uris': uris.attributesPostLogout,
      },
    }, args.dryRun);

    const web = await ensureClient(baseUrl, realm, token, {
      clientId: webId,
      enabled: true,
      publicClient: true,
      standardFlowEnabled: true,
      directAccessGrantsEnabled: false,
      rootUrl: uris.rootUrl,
      baseUrl: uris.baseUrl,
      adminUrl: uris.adminUrl,
      redirectUris: uris.redirectUris,
      webOrigins: uris.webOrigins,
      attributes: {
        'pkce.code.challenge.method': 'S256',
        'post.logout.redirect.uris': uris.attributesPostLogout,
        'backchannel.logout.session.required': 'true',
      },
    }, args.dryRun);

    const scopeId = await ensureClientScope(baseUrl, realm, token, `product:${code}`, args.dryRun);

    if (!args.dryRun) {
      if (bff.id) {
        await ensureDosMappers(baseUrl, realm, token, bff.id, args.dryRun);
        await ensureAudienceMapper(baseUrl, realm, token, bff.id, bffId, args.dryRun);
      }
      if (web.id) {
        await ensureDosMappers(baseUrl, realm, token, web.id, args.dryRun);
      }
    }

    out.products.push({
      product: code,
      hosts: productHosts,
      authHost,
      bff: bff.created ? 'created' : 'exists',
      web: web.created ? 'created' : 'exists',
      scope: scopeId ? 'ok' : 'pending',
    });
  }

  console.log(JSON.stringify(out, null, 2));
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
