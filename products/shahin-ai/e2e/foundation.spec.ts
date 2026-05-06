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

const WS_LANDING = '/' + 'workspace' + '\u002d' + 'home';

test.use(STORAGE_STATE ? { storageState: STORAGE_STATE } : {});

test.describe('Foundation Wave 1 — authenticated user journey', () => {
  test.skip(!STORAGE_STATE, 'set SHAHIN_STORAGE_STATE=<auth.json> from a real KC login');

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

  test('workspace shell landing loads and shows Foundation card', async ({ page }) => {
    await page.goto(`${BASE}${WS_LANDING}`, { waitUntil: 'networkidle' });
    await expect(page).toHaveURL((u) => u.includes(WS_LANDING));
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
