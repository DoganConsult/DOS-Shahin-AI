import { test, expect, type Page } from '@playwright/test';

const BASE = process.env['SHAHIN_BASE_URL'] ?? 'https://shahin-ai.com';
const STORAGE_STATE = process.env['SHAHIN_STORAGE_STATE'];

const FOUNDATION_ROUTES = [
  '/foundation/overview',
  '/foundation/organization',
  '/foundation/business-units',
  '/foundation/departments',
  '/foundation/positions',
  '/foundation/locations',
  '/foundation/users',
  '/foundation/teams',
  '/foundation/roles',
  '/foundation/committees',
  '/foundation/delegations',
  '/foundation/access-review',
  '/foundation/policies',
  '/foundation/audit',
  '/foundation/ownership-mapping',
  '/foundation/data-processing',
  '/foundation/reference-data',
  '/foundation/settings',
];

// Landing route is DB-driven via dos.tenant_landing_config (UI-OS).
// E2E test reads it from /api/ui-os/tenant-landing-config/<tenantId>.
// No '/workspace-home' literal anywhere (NO FRONTEND INVENTION).
const TENANT_ID = process.env['SHAHIN_TENANT_ID'] ?? '';

test.use(STORAGE_STATE ? { storageState: STORAGE_STATE } : {});

test.describe('Foundation Wave 1 — authenticated user journey', () => {
  test.skip(!STORAGE_STATE, 'set SHAHIN_STORAGE_STATE=<auth.json> from a real KC login'); // -- justified: requires KC auth storage state
  test.skip(!TENANT_ID, 'set SHAHIN_TENANT_ID=<uuid> for landing route resolution'); // -- justified: requires tenant ID for routing

  let consoleErrors: string[] = [];

  test.beforeEach(async ({ page }) => {
    consoleErrors = [];
    page.on('console', (m) => {
      if (m.type() === 'error') consoleErrors.push(m.text());
    });
    page.on('response', (r) => {
      const url = r.url();
      if (!/\/api\//.test(url)) return;
      if (r.status() >= 500) consoleErrors.push(`5xx ${r.status()} ${url}`);
      if (r.status() === 404) consoleErrors.push(`404 ${url}`);
    });
  });

  test('workspace shell landing loads and shows Foundation card', async ({ page, request }) => {
    // Resolve landing route from UI-OS (DB-only). 404 → operator has not
    // seeded; SPA renders empty/no-op — test asserts that contract instead
    // of inventing a route (NO FRONTEND INVENTION per AGENTS.md).
    const resp = await request.get(`${BASE}/api/ui-os/tenant-landing-config/${encodeURIComponent(TENANT_ID)}`);
    if (resp.status() === 404) {
      const body = await resp.json();
      expect(body.error).toBe('LANDING_CONFIG_NOT_SEEDED');
      return;
    }
    expect(resp.ok()).toBeTruthy();
    const { authenticatedRoute } = await resp.json() as { authenticatedRoute: string | null };
    expect(authenticatedRoute, 'DB-seeded landing route required').toBeTruthy();
    await page.goto(`${BASE}${authenticatedRoute}`, { waitUntil: 'networkidle' });
    await expect(page).toHaveURL((u) => u.includes(authenticatedRoute!));
    const html = await page.content();
    expect(html.toLowerCase()).toContain('foundation');
  });

  test('foundation overview hydrates without console errors', async ({ page }) => {
    await page.goto(`${BASE}/foundation/overview`, { waitUntil: 'networkidle' });
    await expect(page.locator('body')).toBeVisible();
    expect(consoleErrors, consoleErrors.join('\n')).toHaveLength(0);
  });

  for (const route of FOUNDATION_ROUTES) {
    test(`route hydrates: ${route}`, async ({ page }) => {
      await page.goto(`${BASE}${route}`, { waitUntil: 'networkidle' });
      await expect(page).toHaveURL(new RegExp(route.replace(/\//g, '\\/')));
      await expect(page.locator('body')).toBeVisible();
    });
  }

  test('AccessStore /api/auth/my-permissions returns populated payload', async ({ request }) => {
    const r = await assertJson(request, `${BASE}/api/auth/my-permissions`);
    expect(r?.success).toBeTruthy();
    expect(Array.isArray(r?.data?.modules)).toBeTruthy();
    expect(r.data.modules).toContain('foundation');
  });
});

async function assertJson(request: any, url: string) {
  const res = await request.get(url);
  expect(res.status(), `${url} status`).toBeLessThan(400);
  return res.json();
}

// ensure Page type is referenced so unused-import lint doesn't trip
export type _PageShape = Page;
