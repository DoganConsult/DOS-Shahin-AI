/**
 * Phase Foundation Route AuthZ Contract — live principal + live bindings.
 *
 * Proves the current Foundation direct-seed runtime contract end to end:
 *
 *   GATE 1 — discover a real active principal from Postgres and resolve the
 *            live tenant-service /permissions snapshot through the trusted
 *            header path.
 *   GATE 2 — the resolved principal carries the full Foundation route
 *            permission surface published by the direct-seed contract.
 *   GATE 3 — anonymous calls to ui-os-service /template-binding fail closed
 *            with 401/403 for every Foundation route.
 *   GATE 4 — authenticated calls return the contract archetype,
 *            template_export, permission_key, and non-null props for all
 *            21 /foundation/* routes.
 *
 * Run:
 *   cd platform/config-center/test && \
 *   npx playwright test phase-foundation-route-authz-contract.spec.ts --project=chromium
 */
import { expect, request as pwRequest, test, type APIRequestContext } from '@playwright/test';
import { readFileSync } from 'node:fs';
import { Client } from 'pg';

interface ContractPage {
  route: string;
  archetype: string;
  template_export: string;
  permission: string;
  props: Record<string, unknown>;
}

interface ContractFile {
  pages: ContractPage[];
}

interface PrincipalSeed {
  tenantId: string;
  userId: string;
  email: string;
}

interface PermissionSnapshot {
  tenantId: string;
  roles: string[];
  permissions: string[];
  modules: string[];
}

const UI_OS_BASE = process.env.UI_OS_BASE_URL || 'http://localhost:4015';
const TENANT_BASE = process.env.TENANT_SERVICE_BASE_URL || 'http://localhost:4002';
const CONTRACT_PATH = '/root/DOS-Platform/platform/ui-system/module_complete_direct_seed_pack/foundation-complete-direct-seed.json';
const CONTRACT = JSON.parse(
  readFileSync(
    CONTRACT_PATH,
    'utf8',
  ),
) as ContractFile;

const ROUTE_CASES = CONTRACT.pages
  .filter((page) => page.route.startsWith('/foundation/'))
  .map((page) => ({
    route: page.route,
    archetype: page.archetype,
    templateExport: page.template_export,
    permission: page.permission,
  }));

const UNIQUE_ROUTE_PERMISSIONS = Array.from(new Set(ROUTE_CASES.map((page) => page.permission))).sort();

function pgClient(): Client {
  const cs = process.env.DATABASE_URL
    || `postgres://${process.env.PGUSER || 'dos_auth'}:${process.env.PGPASSWORD || 'dos_auth_pass_2026'}@${process.env.PGHOST || 'localhost'}:${process.env.PGPORT || 5432}/${process.env.PGDATABASE || 'shahin_grc'}`;
  return new Client({ connectionString: cs });
}

let principal: PrincipalSeed;
let permissionSnapshot: PermissionSnapshot;
let tenantApi: APIRequestContext;
let uiApi: APIRequestContext;
let anonUiApi: APIRequestContext;

test.beforeAll(async () => {
  expect(ROUTE_CASES.length, 'expected 21 Foundation routes from the direct-seed contract').toBe(21);

  const client = pgClient();
  await client.connect();
  try {
    const { rows } = await client.query<PrincipalSeed>(
      `SELECT m.tenant_id AS "tenantId",
              m.user_id   AS "userId",
              u.email     AS "email"
         FROM dos.tenant_memberships m
         JOIN dos.users u
           ON u.user_id = m.user_id
         LEFT JOIN platform_dauth.user_role_assignments ura
           ON ura.tenant_id = m.tenant_id
          AND ura.user_id = m.user_id
          AND ura.role_code = 'tenant_admin'
          AND ura.is_active = true
          AND ura.revoked_at IS NULL
          AND (ura.expires_at IS NULL OR ura.expires_at > NOW())
        WHERE m.status = 'active'
          AND COALESCE(u.email, '') <> ''
        ORDER BY CASE WHEN ura.user_id IS NOT NULL THEN 0 ELSE 1 END,
                 m.created_at ASC
        LIMIT 1`,
    );
    expect(rows.length, 'expected at least one active principal with an email address').toBeGreaterThan(0);
    principal = rows[0]!;
  } finally {
    await client.end();
  }

  tenantApi = await pwRequest.newContext({
    baseURL: TENANT_BASE,
    extraHTTPHeaders: {
      'x-user-sub': principal.userId,
      'x-user-email': principal.email,
      'x-tenant-id': principal.tenantId,
    },
  });

  const permissionsResponse = await tenantApi.get('/permissions');
  expect(permissionsResponse.status(), `tenant-service /permissions must resolve for ${principal.userId}`).toBe(200);
  permissionSnapshot = await permissionsResponse.json() as PermissionSnapshot;

  uiApi = await pwRequest.newContext({
    baseURL: UI_OS_BASE,
    extraHTTPHeaders: {
      'x-user-sub': principal.userId,
      'x-user-email': principal.email,
      'x-tenant-id': principal.tenantId,
      'x-user-roles': permissionSnapshot.roles.join(','),
    },
  });

  anonUiApi = await pwRequest.newContext({ baseURL: UI_OS_BASE });
});

test.afterAll(async () => {
  await Promise.all([
    tenantApi?.dispose(),
    uiApi?.dispose(),
    anonUiApi?.dispose(),
  ]);
});

test('GATE 1/2 — live principal resolves the full Foundation route permission surface', async () => {
  expect(permissionSnapshot.tenantId, 'tenant-service must resolve the active tenant').toBe(principal.tenantId);
  expect(permissionSnapshot.modules, 'Foundation must be present in the resolved module list').toContain('foundation');

  const missing = UNIQUE_ROUTE_PERMISSIONS.filter(
    (permission) => !permissionSnapshot.permissions.includes(permission),
  );
  expect(
    missing,
    `principal ${principal.userId} is missing Foundation route permissions: ${missing.join(', ')}`,
  ).toEqual([]);
});

test.describe('GATE 3/4 — Foundation route bindings fail closed anonymously and resolve for the live principal', () => {
  for (const page of ROUTE_CASES) {
    test(`${page.route} -> ${page.permission}`, async () => {
      const anon = await anonUiApi.get(`/api/ui-os/template-binding?route=${encodeURIComponent(page.route)}`);
      expect(
        [401, 403].includes(anon.status()),
        `anonymous resolver call must fail closed for ${page.route}; got ${anon.status()}`,
      ).toBe(true);

      const res = await uiApi.get(`/api/ui-os/template-binding?route=${encodeURIComponent(page.route)}`);
      expect(res.status(), `resolver must return 200 for ${page.route}`).toBe(200);
      const body = await res.json() as {
        archetype?: string;
        template_export?: string;
        permission_key?: string | null;
        props?: Record<string, unknown> | null;
      };

      expect(body.archetype, `archetype mismatch for ${page.route}`).toBe(page.archetype);
      expect(body.template_export, `template_export mismatch for ${page.route}`).toBe(page.templateExport);
      expect(body.permission_key, `permission_key mismatch for ${page.route}`).toBe(page.permission);
      expect(body.props && typeof body.props === 'object', `props must be an object for ${page.route}`).toBe(true);
      expect(permissionSnapshot.permissions, `principal must hold ${page.permission} for ${page.route}`).toContain(page.permission);
    });
  }
});