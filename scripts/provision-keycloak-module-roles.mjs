#!/usr/bin/env node
/**
 * Provision composite `<module>_admin/editor/viewer` realm roles in Keycloak
 * and optionally mirror `module:<code>` nodes into OpenFGA.
 *
 * Source of truth:
 *   - platform_dos.modules_registry (enabled=true), when DATABASE_URL is set;
 *   - else the local JSON registry at platform/registries/modules.registry.json;
 *   - else a built-in fallback list.
 *
 * Idempotent: existing roles are skipped; missing `tenant_member` base role
 * is created first. Each role is composite of `tenant_member`; editor ⊇ viewer;
 * admin ⊇ editor.
 *
 * Usage:
 *   node scripts/provision-keycloak-module-roles.mjs
 *   node scripts/provision-keycloak-module-roles.mjs --modules evidence,policy
 *   node scripts/provision-keycloak-module-roles.mjs --dry-run
 *   node scripts/provision-keycloak-module-roles.mjs --skip-fga
 */
import { Client } from 'pg';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const TIERS = ['admin', 'editor', 'viewer'];
const BASE_ROLE = 'tenant_member';
const FALLBACK_MODULES = [
  'evidence', 'policy', 'risk', 'control', 'report', 'incident', 'audit',
  'vendor', 'compliance', 'workflow', 'exception', 'dora', 'bcp', 'privacy',
  'governance', 'issues', 'attestation', 'notification', 'onboarding',
];

function env(name) { const v = process.env[name]; return v && v.length > 0 ? v : null; }

function parseArgs(argv) {
  const out = { modules: null, dryRun: false, skipFga: false };
  for (let i = 2; i < argv.length; i++) {
    if (argv[i] === '--modules') out.modules = argv[++i].split(',').map((s) => s.trim()).filter(Boolean);
    else if (argv[i] === '--dry-run') out.dryRun = true;
    else if (argv[i] === '--skip-fga') out.skipFga = true;
  }
  return out;
}

async function loadModules(explicit) {
  if (explicit) return explicit;
  const dbUrl = env('DATABASE_URL');
  if (dbUrl) {
    const pg = new Client({ connectionString: dbUrl });
    await pg.connect();
    try {
      const r = await pg.query(
        `SELECT module_code FROM platform_dos.modules_registry WHERE enabled = true ORDER BY module_code`,
      ).catch(() => ({ rows: [] }));
      if (r.rows.length > 0) return r.rows.map((x) => x.module_code);
    } finally { await pg.end(); }
  }
  try {
    const raw = readFileSync(resolve(process.cwd(), 'platform/registries/modules.registry.json'), 'utf8');
    const json = JSON.parse(raw);
    const ids = (json.modules || []).map((m) => m.id).filter(Boolean);
    if (ids.length > 0) return ids;
  } catch { /* fallthrough */ }
  return FALLBACK_MODULES;
}

async function adminToken(baseUrl, realm, clientId, secret) {
  const body = new URLSearchParams({ grant_type: 'client_credentials', client_id: clientId, client_secret: secret });
  const res = await fetch(`${baseUrl.replace(/\/$/, '')}/realms/${encodeURIComponent(realm)}/protocol/openid-connect/token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: body.toString(),
  });
  if (!res.ok) throw new Error(`admin token fetch failed: ${res.status}`);
  return (await res.json()).access_token;
}

async function getRole(baseUrl, realm, token, name) {
  const res = await fetch(`${baseUrl.replace(/\/$/, '')}/admin/realms/${encodeURIComponent(realm)}/roles/${encodeURIComponent(name)}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) return null;
  return await res.json();
}

async function createRole(baseUrl, realm, token, name, description) {
  const res = await fetch(`${baseUrl.replace(/\/$/, '')}/admin/realms/${encodeURIComponent(realm)}/roles`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ name, description, composite: true }),
  });
  if (res.status !== 201 && res.status !== 409) {
    const t = await res.text();
    throw new Error(`createRole ${name} → ${res.status}: ${t}`);
  }
  return getRole(baseUrl, realm, token, name);
}

async function addComposite(baseUrl, realm, token, parentName, childRole) {
  const res = await fetch(`${baseUrl.replace(/\/$/, '')}/admin/realms/${encodeURIComponent(realm)}/roles/${encodeURIComponent(parentName)}/composites`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify([{ id: childRole.id, name: childRole.name }]),
  });
  if (!res.ok && res.status !== 204 && res.status !== 409) {
    const t = await res.text();
    throw new Error(`addComposite ${parentName}⊇${childRole.name} → ${res.status}: ${t}`);
  }
}

async function writeFgaTuples(fgaUrl, storeId, modelId, tuples) {
  if (!fgaUrl || !storeId || tuples.length === 0) return;
  const res = await fetch(`${fgaUrl.replace(/\/$/, '')}/stores/${encodeURIComponent(storeId)}/write`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(process.env.OPENFGA_API_TOKEN ? { Authorization: `Bearer ${process.env.OPENFGA_API_TOKEN}` } : {}),
    },
    body: JSON.stringify({ writes: { tuple_keys: tuples }, authorization_model_id: modelId }),
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
  const clientId = env('KEYCLOAK_ADMIN_WRITE_CLIENT_ID') ?? env('KEYCLOAK_ADMIN_CLIENT_ID') ?? env('KEYCLOAK_CLIENT_ID');
  const clientSecret = env('KEYCLOAK_ADMIN_WRITE_CLIENT_SECRET') ?? env('KEYCLOAK_ADMIN_CLIENT_SECRET');
  if (!baseUrl || !realm || !clientId || !clientSecret) {
    console.error('missing KEYCLOAK_BASE_URL / REALM / admin client creds');
    process.exit(2);
  }

  const modules = await loadModules(args.modules);
  const token = await adminToken(baseUrl, realm, clientId, clientSecret);

  let base = await getRole(baseUrl, realm, token, BASE_ROLE);
  if (!base) {
    if (args.dryRun) console.log(`[dry-run] would create base role ${BASE_ROLE}`);
    else {
      await createRole(baseUrl, realm, token, BASE_ROLE, 'Default tenant member role');
      base = await getRole(baseUrl, realm, token, BASE_ROLE);
    }
  }

  const created = [], skipped = [], fgaTuples = [];
  for (const module of modules) {
    fgaTuples.push({ user: `product:_default_`, relation: 'in_product', object: `module:${module}` });
    for (const tier of TIERS) {
      const roleName = `${module}_${tier}`;
      const existing = await getRole(baseUrl, realm, token, roleName);
      if (existing) { skipped.push(roleName); continue; }
      if (args.dryRun) { console.log(`[dry-run] would create ${roleName}`); created.push(roleName); continue; }
      const nr = await createRole(baseUrl, realm, token, roleName, `Module ${module} tier ${tier}`);
      if (nr && base) await addComposite(baseUrl, realm, token, roleName, base);
      if (tier === 'editor') {
        const v = await getRole(baseUrl, realm, token, `${module}_viewer`);
        if (v) await addComposite(baseUrl, realm, token, roleName, v);
      } else if (tier === 'admin') {
        const e = await getRole(baseUrl, realm, token, `${module}_editor`);
        if (e) await addComposite(baseUrl, realm, token, roleName, e);
      }
      created.push(roleName);
    }
  }

  if (!args.skipFga && !args.dryRun) {
    try {
      await writeFgaTuples(env('OPENFGA_API_URL'), env('OPENFGA_STORE_ID'), env('OPENFGA_MODEL_ID'), fgaTuples);
    } catch (e) {
      console.warn(`[fga] mirror skipped: ${e.message}`);
    }
  }

  console.log(JSON.stringify({
    modulesProvisioned: modules.length,
    created: created.length,
    skipped: skipped.length,
    dryRun: args.dryRun,
    details: { created, skipped },
  }, null, 2));
}

main().catch((err) => { console.error(err); process.exit(1); });
