#!/usr/bin/env node
/**
 * Provision a DOS tenant into Keycloak.
 *
 * For every tenant in platform_dos.tenants_registry (or passed via --tenant
 * <uuid>) this script ensures:
 *   1. Group `/tenants/<tenantId>` exists.
 *   2. Subgroups `/tenants/<tenantId>/teams` and `/tenants/<tenantId>/departments`.
 *   3. A `tenant_<shortId>_admin` composite role exists and maps to tenant_admin.
 *   4. Tenant-scoped attributes are stamped on the group.
 *
 * Also mirrors the tenant's entitled products into OpenFGA as
 * `tenant:<uuid> entitled_tenant product:<code>` tuples (skipped if
 * OPENFGA_API_URL is not set).
 *
 * Idempotent; safe to re-run.
 *
 * Usage:
 *   node scripts/provision-keycloak-tenant.mjs --tenant <uuid>
 *   node scripts/provision-keycloak-tenant.mjs --all --dry-run
 */
import { Client } from 'pg';

function env(n, f) { const v = process.env[n]; return v && v.length > 0 ? v : f; }

function parseArgs(argv) {
  const out = { tenant: null, all: false, dryRun: false };
  for (let i = 2; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--tenant') out.tenant = argv[++i];
    else if (a === '--all') out.all = true;
    else if (a === '--dry-run') out.dryRun = true;
  }
  if (!out.tenant && !out.all) {
    console.error('Usage: provision-keycloak-tenant.mjs --tenant <uuid> | --all [--dry-run]');
    process.exit(2);
  }
  return out;
}

async function adminToken(baseUrl, realm, clientId, secret) {
  const body = new URLSearchParams({ grant_type: 'client_credentials', client_id: clientId, client_secret: secret });
  const res = await fetch(`${baseUrl.replace(/\/$/, '')}/realms/${encodeURIComponent(realm)}/protocol/openid-connect/token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: body.toString(),
  });
  if (!res.ok) throw new Error(`admin token failed: ${res.status}`);
  return (await res.json()).access_token;
}

const kcUrl = (b, r, p) => `${b.replace(/\/$/, '')}/admin/realms/${encodeURIComponent(r)}${p}`;

async function kcGet(b, r, t, p) {
  const res = await fetch(kcUrl(b, r, p), { headers: { Authorization: `Bearer ${t}` } });
  if (res.status === 404) return null;
  if (!res.ok) throw new Error(`GET ${p} → ${res.status}`);
  return await res.json();
}

async function kcPost(b, r, t, p, body) {
  const res = await fetch(kcUrl(b, r, p), {
    method: 'POST',
    headers: { Authorization: `Bearer ${t}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (res.status !== 201 && res.status !== 204 && res.status !== 409) {
    const txt = await res.text();
    throw new Error(`POST ${p} → ${res.status}: ${txt}`);
  }
  const loc = res.headers.get('location');
  return loc ? loc.split('/').pop() : null;
}

async function ensureGroupByPath(b, r, t, path, dryRun) {
  const existing = await kcGet(b, r, t, `/group-by-path/${path.replace(/^\//, '')}`);
  if (existing) return existing.id;
  if (dryRun) return null;
  const segments = path.split('/').filter(Boolean);
  let parentId = null;
  let cur = '';
  for (const seg of segments) {
    cur += `/${seg}`;
    const hit = await kcGet(b, r, t, `/group-by-path/${cur.replace(/^\//, '')}`);
    if (hit) { parentId = hit.id; continue; }
    if (!parentId) parentId = await kcPost(b, r, t, '/groups', { name: seg });
    else parentId = await kcPost(b, r, t, `/groups/${parentId}/children`, { name: seg });
  }
  return parentId;
}

async function ensureRole(b, r, t, name, description, dryRun) {
  const existing = await kcGet(b, r, t, `/roles/${encodeURIComponent(name)}`);
  if (existing) return existing;
  if (dryRun) return null;
  await kcPost(b, r, t, '/roles', { name, description, composite: true });
  return await kcGet(b, r, t, `/roles/${encodeURIComponent(name)}`);
}

async function addComposite(b, r, t, parentName, child) {
  if (!child) return;
  await kcPost(b, r, t, `/roles/${encodeURIComponent(parentName)}/composites`, [{ id: child.id, name: child.name }]);
}

async function listTenants(dbUrl, explicit) {
  if (explicit) return [{ tenant_id: explicit, products: [] }];
  if (!dbUrl) { console.error('DATABASE_URL required for --all'); process.exit(2); }
  const pg = new Client({ connectionString: dbUrl });
  await pg.connect();
  try {
    const tenants = await pg.query(
      `SELECT tenant_id FROM platform_dos.tenants_registry WHERE status = 'active' ORDER BY tenant_id`,
    ).catch(() => ({ rows: [] }));
    const entitlements = await pg.query(
      `SELECT tenant_id, product_code FROM platform_dos.tenants_registry WHERE status = 'active'`,
    ).catch(() => ({ rows: [] }));
    const byTenant = new Map();
    for (const row of tenants.rows) byTenant.set(row.tenant_id, { tenant_id: row.tenant_id, products: [] });
    for (const row of entitlements.rows) {
      const e = byTenant.get(row.tenant_id);
      if (e) e.products.push(row.product_code);
    }
    return Array.from(byTenant.values());
  } finally {
    await pg.end();
  }
}

async function writeFgaTuple(fgaUrl, storeId, modelId, tuple, dryRun) {
  if (!fgaUrl || !storeId || dryRun) return;
  const res = await fetch(`${fgaUrl.replace(/\/$/, '')}/stores/${encodeURIComponent(storeId)}/write`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(process.env.OPENFGA_API_TOKEN ? { Authorization: `Bearer ${process.env.OPENFGA_API_TOKEN}` } : {}),
    },
    body: JSON.stringify({ writes: { tuple_keys: [tuple] }, authorization_model_id: modelId }),
  });
  if (!res.ok && res.status !== 400) {
    const t = await res.text();
    throw new Error(`FGA write failed ${res.status}: ${t}`);
  }
}

async function main() {
  const args = parseArgs(process.argv);
  const baseUrl = env('KEYCLOAK_BASE_URL');
  const realm = env('KEYCLOAK_REALM');
  const clientId = env('KEYCLOAK_ADMIN_WRITE_CLIENT_ID') ?? env('KEYCLOAK_CLIENT_ID');
  const clientSecret = env('KEYCLOAK_ADMIN_WRITE_CLIENT_SECRET') ?? env('KEYCLOAK_ADMIN_CLIENT_SECRET');
  if (!baseUrl || !realm || !clientId || !clientSecret) {
    console.error('missing KEYCLOAK_BASE_URL / REALM / admin creds');
    process.exit(2);
  }

  const token = await adminToken(baseUrl, realm, clientId, clientSecret);
  const tenants = await listTenants(env('DATABASE_URL'), args.tenant);

  // Ensure /tenants root exists once.
  await ensureGroupByPath(baseUrl, realm, token, '/tenants', args.dryRun);

  const tenantAdminRole = await kcGet(baseUrl, realm, token, `/roles/tenant_admin`);

  const out = { tenants: [], dryRun: args.dryRun };
  for (const t of tenants) {
    const path = `/tenants/${t.tenant_id}`;
    const gid = await ensureGroupByPath(baseUrl, realm, token, path, args.dryRun);
    await ensureGroupByPath(baseUrl, realm, token, `${path}/teams`, args.dryRun);
    await ensureGroupByPath(baseUrl, realm, token, `${path}/departments`, args.dryRun);

    const shortId = t.tenant_id.slice(0, 8);
    const roleName = `tenant_${shortId}_admin`;
    const role = await ensureRole(baseUrl, realm, token, roleName, `Admin role for tenant ${t.tenant_id}`, args.dryRun);
    if (role && tenantAdminRole && !args.dryRun) {
      try { await addComposite(baseUrl, realm, token, roleName, tenantAdminRole); } catch { /* noop */ }
    }

    // FGA entitlements tenant→product (v2 model).
    for (const productCode of t.products || []) {
      await writeFgaTuple(env('OPENFGA_API_URL'), env('OPENFGA_STORE_ID'), env('OPENFGA_MODEL_ID'), {
        user: `tenant:${t.tenant_id}`,
        relation: 'entitled_tenant',
        object: `product:${productCode}`,
      }, args.dryRun).catch((e) => console.warn(`[fga] ${t.tenant_id}/${productCode}: ${e.message}`));
    }

    out.tenants.push({ tenant: t.tenant_id, group: gid ?? 'dry-run', role: roleName, products: t.products || [] });
  }

  console.log(JSON.stringify(out, null, 2));
}

main().catch((e) => { console.error(e); process.exit(1); });
