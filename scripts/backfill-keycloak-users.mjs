#!/usr/bin/env node
/**
 * One-shot backfill: DAuth `public.users` → Keycloak realm users.
 */

const showHelp = process.argv.includes('--help') || process.argv.includes('-h');
if (showHelp) {
  console.log(`
Usage: node scripts/backfill-keycloak-users.mjs --tenant <uuid> | --all [OPTIONS]

One-shot backfill: DAuth public.users → Keycloak realm users.

Arguments:
  --tenant <uuid>      Backfill single tenant
  --all                Backfill all tenants

Options:
  --dry-run            Show what would be done without executing
  --help, -h           Show this help message

Environment Variables:
  DATABASE_URL         PostgreSQL connection string
  KEYCLOAK_BASE_URL    Keycloak base URL
  KEYCLOAK_REALM       Keycloak realm name
  KEYCLOAK_ADMIN_CLIENT_ID/SECRET  Admin credentials
  KEYCLOAK_ADMIN_WRITE_CLIENT_ID/SECRET  Write credentials

Behavior:
  - Reads active DAuth users
  - Upserts to Keycloak via Admin API
  - Idempotent: skips existing users
  - Creates users with emailVerified=false
  - Tenant group membership applied

Output:
  Per-tenant summary + global totals. Exits non-zero on errors.

Examples:
  # Backfill single tenant
  node scripts/backfill-keycloak-users.mjs --tenant abc-123

  # Backfill all tenants
  node scripts/backfill-keycloak-users.mjs --all

  # Dry run to preview
  node scripts/backfill-keycloak-users.mjs --all --dry-run
`);
  process.exit(0);
}

import { Client } from 'pg';

const FETCH_PAGE_SIZE = 200;

function parseArgs(argv) {
  const out = { tenant: null, all: false, dryRun: false };
  for (let i = 2; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--tenant') out.tenant = argv[++i];
    else if (a === '--all') out.all = true;
    else if (a === '--dry-run') out.dryRun = true;
  }
  if (!out.tenant && !out.all) {
    console.error('Usage: backfill-keycloak-users.mjs --tenant <uuid> | --all [--dry-run]');
    process.exit(2);
  }
  return out;
}

function env(name, fallback) {
  const v = process.env[name];
  return v && v.length > 0 ? v : fallback;
}

async function getAdminToken(baseUrl, realm, clientId, clientSecret) {
  const body = new URLSearchParams({
    grant_type: 'client_credentials',
    client_id: clientId,
    client_secret: clientSecret,
  });
  const res = await fetch(
    `${baseUrl.replace(/\/$/, '')}/realms/${encodeURIComponent(realm)}/protocol/openid-connect/token`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: body.toString(),
    },
  );
  if (!res.ok) throw new Error(`admin token fetch failed: ${res.status}`);
  const json = await res.json();
  return json.access_token;
}

async function findUserIdByEmail(baseUrl, realm, token, email) {
  const url = `${baseUrl.replace(/\/$/, '')}/admin/realms/${encodeURIComponent(realm)}/users?email=${encodeURIComponent(email)}&exact=true`;
  const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
  if (!res.ok) return null;
  const list = await res.json();
  return Array.isArray(list) && list.length > 0 ? list[0].id : null;
}

async function createUser(baseUrl, realm, token, u) {
  const body = {
    username: u.email,
    email: u.email,
    firstName: u.first_name ?? '',
    lastName: u.last_name ?? '',
    enabled: u.status === 'active',
    emailVerified: Boolean(u.email_verified),
    requiredActions: u.status === 'active' ? ['UPDATE_PASSWORD'] : [],
    attributes: {
      dauth_user_id: [u.user_id],
      dauth_tenant_id: [u.tenant_id],
      dauth_role: [u.role ?? ''],
    },
  };
  const res = await fetch(
    `${baseUrl.replace(/\/$/, '')}/admin/realms/${encodeURIComponent(realm)}/users`,
    {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    },
  );
  if (res.status === 201) {
    const loc = res.headers.get('location') ?? '';
    return { userId: loc.split('/').pop() ?? '', created: true };
  }
  const text = await res.text();
  throw new Error(`createUser failed ${res.status}: ${text}`);
}

async function ensureGroup(baseUrl, realm, token, parentPath, name) {
  const fullPath = `${parentPath || ''}/${name}`.replace(/^\/+/, '/');
  const lookup = await fetch(
    `${baseUrl.replace(/\/$/, '')}/admin/realms/${encodeURIComponent(realm)}/group-by-path${fullPath.split('/').map(encodeURIComponent).join('/')}`,
    { headers: { Authorization: `Bearer ${token}` } },
  );
  if (lookup.ok) {
    const existing = await lookup.json();
    if (existing?.id) return existing.id;
  }

  let parentId = null;
  if (parentPath) {
    const parentLookup = await fetch(
      `${baseUrl.replace(/\/$/, '')}/admin/realms/${encodeURIComponent(realm)}/group-by-path${parentPath.split('/').map(encodeURIComponent).join('/')}`,
      { headers: { Authorization: `Bearer ${token}` } },
    );
    if (parentLookup.ok) {
      const p = await parentLookup.json();
      parentId = p?.id ?? null;
    }
  }

  const url = parentId
    ? `${baseUrl.replace(/\/$/, '')}/admin/realms/${encodeURIComponent(realm)}/groups/${encodeURIComponent(parentId)}/children`
    : `${baseUrl.replace(/\/$/, '')}/admin/realms/${encodeURIComponent(realm)}/groups`;
  const res = await fetch(url, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ name }),
  });
  if (res.status === 201) {
    const loc = res.headers.get('location') ?? '';
    return loc.split('/').pop() ?? null;
  }
  if (res.status === 409) {
    // Conflict — re-lookup.
    const again = await fetch(
      `${baseUrl.replace(/\/$/, '')}/admin/realms/${encodeURIComponent(realm)}/group-by-path${fullPath.split('/').map(encodeURIComponent).join('/')}`,
      { headers: { Authorization: `Bearer ${token}` } },
    );
    if (again.ok) return (await again.json())?.id ?? null;
  }
  return null;
}

async function addUserToGroup(baseUrl, realm, token, userId, groupId) {
  const res = await fetch(
    `${baseUrl.replace(/\/$/, '')}/admin/realms/${encodeURIComponent(realm)}/users/${encodeURIComponent(userId)}/groups/${encodeURIComponent(groupId)}`,
    {
      method: 'PUT',
      headers: { Authorization: `Bearer ${token}` },
    },
  );
  if (!res.ok && res.status !== 204) {
    const text = await res.text();
    throw new Error(`addUserToGroup failed ${res.status}: ${text}`);
  }
}

async function main() {
  const args = parseArgs(process.argv);
  const baseUrl = env('KEYCLOAK_BASE_URL');
  const realm = env('KEYCLOAK_REALM');
  const clientId =
    env('KEYCLOAK_ADMIN_WRITE_CLIENT_ID') ??
    env('KEYCLOAK_ADMIN_CLIENT_ID') ??
    env('KEYCLOAK_CLIENT_ID');
  const clientSecret =
    env('KEYCLOAK_ADMIN_WRITE_CLIENT_SECRET') ?? env('KEYCLOAK_ADMIN_CLIENT_SECRET');
  if (!baseUrl || !realm || !clientId || !clientSecret) {
    console.error('missing KEYCLOAK_BASE_URL / _REALM / admin client id+secret');
    process.exit(2);
  }

  const db = new Client({ connectionString: env('DATABASE_URL') });
  await db.connect();

  let tenantIds = [];
  if (args.all) {
    const { rows } = await db.query(`SELECT tenant_id FROM dos.tenants WHERE status = 'active'`);
    tenantIds = rows.map((r) => r.tenant_id);
  } else {
    tenantIds = [args.tenant];
  }

  const token = await getAdminToken(baseUrl, realm, clientId, clientSecret);
  await ensureGroup(baseUrl, realm, token, '', 'tenants');

  const totals = { users: 0, created: 0, skipped: 0, errors: 0 };
  for (const tenantId of tenantIds) {
    const tenantTotals = { users: 0, created: 0, skipped: 0, errors: 0 };
    const groupId = args.dryRun
      ? 'dry-run'
      : await ensureGroup(baseUrl, realm, token, '/tenants', tenantId);

    let offset = 0;
    while (true) {
      const { rows } = await db.query(
        `SELECT user_id, email, first_name, last_name, status, role, email_verified, tenant_id
         FROM public.users
         WHERE tenant_id = $1
         ORDER BY created_at
         LIMIT $2 OFFSET $3`,
        [tenantId, FETCH_PAGE_SIZE, offset],
      );
      if (!rows.length) break;
      for (const u of rows) {
        tenantTotals.users++;
        totals.users++;
        try {
          let kcUserId = await findUserIdByEmail(baseUrl, realm, token, u.email);
          let created = false;
          if (!kcUserId) {
            if (args.dryRun) {
              tenantTotals.created++;
              totals.created++;
              continue;
            }
            const r = await createUser(baseUrl, realm, token, u);
            kcUserId = r.userId;
            created = r.created;
          } else if (!args.dryRun) {
            tenantTotals.skipped++;
            totals.skipped++;
          }
          if (created) {
            tenantTotals.created++;
            totals.created++;
          }
          if (!args.dryRun && kcUserId && groupId && groupId !== 'dry-run') {
            await addUserToGroup(baseUrl, realm, token, kcUserId, groupId);
          }
        } catch (err) {
          tenantTotals.errors++;
          totals.errors++;
          console.error(`[backfill] tenant=${tenantId} user=${u.email} error=${err.message}`);
        }
      }
      if (rows.length < FETCH_PAGE_SIZE) break;
      offset += FETCH_PAGE_SIZE;
    }
    console.log(`[backfill] tenant=${tenantId} ${JSON.stringify(tenantTotals)}`);
  }
  console.log(`[backfill] TOTAL ${JSON.stringify(totals)}${args.dryRun ? ' (dry-run)' : ''}`);
  await db.end();
  process.exit(totals.errors > 0 ? 1 : 0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
