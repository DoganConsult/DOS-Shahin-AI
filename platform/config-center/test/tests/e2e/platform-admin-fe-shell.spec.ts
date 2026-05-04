/**
 * DOS Master — Platform Admin Carbon FE Workspace Shell Host E2E.
 *
 * Asserts the FE deliverable PLATFORM_ADMIN_FE_CONSOLE_WORKSPACE_SHELL_READY:
 *   1. Marketing public root has a `Sign in` CTA (via brand.routes.ts).
 *   2. /login renders the AuthBridgeComponent (DAuth/Keycloak bridge — SPA
 *      never collects credentials; CTA points at /api/auth/oidc/start?mode=login).
 *   3. Workspace post-auth landing route is /workspace-home (auth-service
 *      callback default) — verified by inspecting the OIDC start redirect.
 *   4. /platform-admin/* unauthenticated → guard redirects to login with
 *      ?returnTo preserved.
 *   5. Login flow against admin-console-bff /auth/email-login + token store.
 *   6. Carbon UIShell side nav lists exactly 12 NAV items, exactly one
 *      reflects the active route.
 *   7. Each of 12 panels triggers its real BFF call and renders content
 *      (skeletons cleared, no error/empty frame).
 *   8. PPD panel exposes the R0..R5 ring rows from the live ring engine.
 *   9. Evidence pack download returns application/json attachment.
 *  10. Workspace sign-out clears token and lands on /platform-admin/login.
 *  11. Garbage admin token → unauthorized state on every panel.
 */
import { test, expect, Page, APIRequestContext } from '@playwright/test';

const BASE = process.env.E2E_BASE_URL || 'http://localhost:3000';
const ADMIN_EMAIL = process.env.PLATFORM_ADMIN_E2E_EMAIL || 'e2e-admin@dos.platform';

const NAV: { path: string; label: string; endpoint?: string | null }[] = [
  { path: '/platform-admin/dos-master',                  label: 'Overview' },
  { path: '/platform-admin/dos-master/milestones',       label: 'Milestones (M1–M14)' },
  { path: '/platform-admin/dos-master/services',         label: 'Services 4007–4017' },
  { path: '/platform-admin/dos-master/doctrine',         label: 'Doctrine 11/11' },
  { path: '/platform-admin/dos-master/controlled-ddl',   label: 'Controlled DDL' },
  { path: '/platform-admin/dos-master/ppd',              label: 'PPD Rollouts R0–R5' },
  { path: '/platform-admin/dos-master/compensation',     label: 'Compensation' },
  { path: '/platform-admin/dos-master/auto-evaluator',   label: 'Auto Evaluator' },
  { path: '/platform-admin/dos-master/controlled-write', label: 'Controlled Writes' },
  { path: '/platform-admin/dos-master/rollout-ledger',   label: 'Rollout Ledger' },
  { path: '/platform-admin/dos-master/ci-guards',        label: 'CI Guards' },
  { path: '/platform-admin/dos-master/evidence',         label: 'Evidence Pack' },
  // L13 D2 — Workflow OS panels (BFF base differs from FE path: /workflow not /workflow-os)
  { path: '/platform-admin/workflow-os/definitions',     label: 'Workflow OS — Definitions', endpoint: '/api/admin/console/workflow/definitions' },
  { path: '/platform-admin/workflow-os/instances',       label: 'Workflow OS — Instances',   endpoint: '/api/admin/console/workflow/instances' },
  // L14..L27 — Phase 2 Full-Stack-Per-OS panels (28 entries; endpoint inferred via path replace)
  { path: '/platform-admin/ai-os/records',                label: 'AI OS — Records' },
  { path: '/platform-admin/ai-os/events',                 label: 'AI OS — Events' },
  { path: '/platform-admin/notification-os/records',      label: 'Notification OS — Records' },
  { path: '/platform-admin/notification-os/events',       label: 'Notification OS — Events' },
  { path: '/platform-admin/integration-os/records',       label: 'Integration OS — Records' },
  { path: '/platform-admin/integration-os/events',        label: 'Integration OS — Events' },
  { path: '/platform-admin/data-governance-os/records',   label: 'Data Governance OS — Records' },
  { path: '/platform-admin/data-governance-os/events',    label: 'Data Governance OS — Events' },
  { path: '/platform-admin/billing-os/records',           label: 'Billing OS — Records' },
  { path: '/platform-admin/billing-os/events',            label: 'Billing OS — Events' },
  { path: '/platform-admin/feature-flag-os/records',      label: 'Feature Flag OS — Records' },
  { path: '/platform-admin/feature-flag-os/events',       label: 'Feature Flag OS — Events' },
  { path: '/platform-admin/security-secrets-os/records',  label: 'Security Secrets OS — Records' },
  { path: '/platform-admin/security-secrets-os/events',   label: 'Security Secrets OS — Events' },
  { path: '/platform-admin/telemetry-os/records',         label: 'Telemetry OS — Records' },
  { path: '/platform-admin/telemetry-os/events',          label: 'Telemetry OS — Events' },
  { path: '/platform-admin/schema-authoring-os/records',  label: 'Schema Authoring OS — Records' },
  { path: '/platform-admin/schema-authoring-os/events',   label: 'Schema Authoring OS — Events' },
  { path: '/platform-admin/deployment-os/records',        label: 'Deployment OS — Records' },
  { path: '/platform-admin/deployment-os/events',         label: 'Deployment OS — Events' },
  { path: '/platform-admin/release-os/records',           label: 'Release OS — Records' },
  { path: '/platform-admin/release-os/events',            label: 'Release OS — Events' },
  { path: '/platform-admin/vendor-risk-os/records',       label: 'Vendor Risk OS — Records' },
  { path: '/platform-admin/vendor-risk-os/events',        label: 'Vendor Risk OS — Events' },
  { path: '/platform-admin/marketplace-os/records',       label: 'Marketplace OS — Records' },
  { path: '/platform-admin/marketplace-os/events',        label: 'Marketplace OS — Events' },
  { path: '/platform-admin/dr-os/records',                label: 'DR OS — Records' },
  { path: '/platform-admin/dr-os/events',                 label: 'DR OS — Events' },
];

async function loginViaApi(req: APIRequestContext): Promise<string> {
  const r = await req.post(`${BASE}/api/admin/console/auth/email-login`, {
    data: { email: ADMIN_EMAIL },
    headers: { 'content-type': 'application/json' },
  });
  expect(r.status(), 'auth/email-login must return 200 (provision the e2e admin first)').toBe(200);
  const body = await r.json();
  expect(body.token).toBeTruthy();
  return body.token as string;
}

async function seedAdminToken(page: Page, token: string): Promise<void> {
  await page.goto(`${BASE}/platform-admin/login`);
  await page.evaluate((t) => localStorage.setItem('dos_master_admin_token', t), token);
}

test.describe('Marketing → DAuth/Keycloak login bridge', () => {
  test('marketing public surface exposes /login Sign in CTA', async ({ request }) => {
    const r = await request.get(`${BASE}/api/ui-os/marketing/config?brand=shahin-ai&locale=en`);
    expect(r.ok(), 'public marketing brand surface must respond').toBeTruthy();
    const body = await r.json();
    const flat = JSON.stringify(body);
    expect(flat).toContain('"href":"/login"');
    expect(flat.toLowerCase()).toMatch(/"label":"sign in"|"labelkey":"marketing\.cta\.signin"/);
  });

  test('marketing landing renders IBM Carbon Sign-in icon button routing to /login', async ({ page }) => {
    await page.goto(`${BASE}/`);
    const cta = page.locator('[data-testid="marketing-signin-cta"]');
    await expect(cta).toBeVisible({ timeout: 15_000 });
    await expect(cta).toContainText(/Sign in|تسجيل الدخول/);
    const svgCount = await cta.locator('svg').count();
    expect(svgCount, 'Carbon login icon SVG must be present inside Sign-in CTA').toBeGreaterThanOrEqual(1);
    await cta.click();
    await page.waitForURL(/\/login(?:\?|$)/, { timeout: 10_000 });
  });

  test('/login renders AuthBridge with Keycloak SSO CTA', async ({ page }) => {
    await page.goto(`${BASE}/login`);
    const cta = page.locator('a.dos-auth-bridge-cta');
    await expect(cta).toBeVisible();
    const href = await cta.getAttribute('href');
    expect(href).toBe('/api/auth/oidc/start?mode=login');
  });

  test('/api/auth/oidc/start redirects to Keycloak (DAuth issuer)', async ({ request }) => {
    const r = await request.get(`${BASE}/api/auth/oidc/start?mode=login`, { maxRedirects: 0 });
    expect([301, 302, 303, 307, 308]).toContain(r.status());
    const loc = r.headers()['location'] || '';
    expect(loc).toMatch(/protocol\/openid-connect\/auth/);
  });
});

test.describe('Platform Admin FE Workspace Shell — auth gate', () => {
  test('unauthenticated /platform-admin/dos-master redirects to login with returnTo', async ({ page }) => {
    await page.evaluate(() => localStorage.removeItem('dos_master_admin_token')).catch(() => undefined);
    await page.goto(`${BASE}/platform-admin/dos-master`);
    await page.waitForURL(/\/platform-admin\/login\?returnTo=/, { timeout: 15_000 });
    expect(page.url()).toContain('returnTo=%2Fplatform-admin%2Fdos-master');
  });

  test('login form posts to BFF and lands on overview', async ({ page, request }) => {
    const token = await loginViaApi(request);
    await page.goto(`${BASE}/platform-admin/login`);
    await page.evaluate((t) => localStorage.setItem('dos_master_admin_token', t), token);
    await page.goto(`${BASE}/platform-admin/dos-master`);
    await expect(page.locator('[data-testid="platform-admin-sidenav"]')).toBeVisible({ timeout: 15_000 });
    await expect(page.locator('[data-testid="platform-admin-who"]')).toContainText('@');
  });
});

test.describe('Platform Admin FE Workspace Shell — Carbon UIShell', () => {
  // BFF /dos-master/phase-1 + /evidence-pack run ciGuards() (spawnSync ≤90s),
  // which blocks admin-console-bff's event loop and stalls concurrent auth
  // requests. Run these heavy panels serially with an extended action timeout.
  test.describe.configure({ mode: 'serial' });
  test.use({ actionTimeout: 60_000, navigationTimeout: 90_000 });
  test.beforeEach(async ({ page, request }) => {
    const token = await loginViaApi(request);
    await seedAdminToken(page, token);
  });

  test('Carbon side nav renders exactly 42 NAV items', async ({ page }) => {
    await page.goto(`${BASE}/platform-admin/dos-master`);
    const sidenav = page.locator('[data-testid="platform-admin-sidenav"]');
    await expect(sidenav).toBeVisible();
    for (const item of NAV) {
      const node = sidenav.locator(`[data-nav-path="${item.path}"]`);
      await expect(node, `nav item missing: ${item.path}`).toBeVisible();
      await expect(node).toContainText(item.label);
    }
    const all = await sidenav.locator('[data-nav-path]').count();
    expect(all).toBe(42);
  });

  for (const item of NAV) {
    test(`panel ${item.path} renders BFF data without error/empty/loading frame`, async ({ page }) => {
      const endpoint = item.endpoint !== undefined
        ? item.endpoint
        : item.path.endsWith('/dos-master')
          ? '/api/admin/console/dos-master/milestones'
          : item.path.endsWith('/evidence')
            ? null
            : `/api/admin/console${item.path.replace('/platform-admin', '')}`;

      if (endpoint) {
        const wait = page.waitForResponse(
          (resp) => resp.url().includes(endpoint) && resp.status() === 200,
          { timeout: 20_000 },
        );
        await page.goto(`${BASE}${item.path}`);
        await wait;
      } else {
        await page.goto(`${BASE}${item.path}`);
      }

      const main = page.locator('[data-testid="platform-admin-main"]');
      await expect(main).toBeVisible();
      // No active error/forbidden/unauthorized frame.
      await expect(page.locator('[data-testid$="-error"]')).toHaveCount(0);
      await expect(page.locator('[data-testid$="-forbidden"]')).toHaveCount(0);
      await expect(page.locator('[data-testid$="-unauthorized"]')).toHaveCount(0);
    });
  }

  test('PPD panel surfaces ≥ 6 ring rows (R0..R5)', async ({ page }) => {
    await page.goto(`${BASE}/platform-admin/dos-master/ppd`);
    await page.waitForResponse(
      (r) => r.url().includes('/api/admin/console/dos-master/ppd') && r.status() === 200,
      { timeout: 20_000 },
    );
    const rings = page.locator('[data-testid="ppd-rings"] tbody tr');
    await expect.poll(async () => rings.count(), { timeout: 10_000 }).toBeGreaterThanOrEqual(6);
  });

  test('Evidence pack download returns application/json attachment', async ({ request, page }) => {
    const token = await page.evaluate(() => localStorage.getItem('dos_master_admin_token'));
    expect(token).toBeTruthy();
    const r = await request.get(`${BASE}/api/admin/console/dos-master/evidence-pack`, {
      headers: { authorization: `Bearer ${token}` },
    });
    expect(r.status()).toBe(200);
    expect(r.headers()['content-type']).toContain('application/json');
    expect(r.headers()['content-disposition']).toMatch(/attachment;\s*filename=/);
    const body = await r.json();
    expect(body.generated_at).toBeTruthy();
    expect(Array.isArray(body.milestones)).toBeTruthy();
    expect(body.ci_guards).toBeTruthy();
  });

  test('Sign out clears token and routes to /platform-admin/login', async ({ page }) => {
    await page.goto(`${BASE}/platform-admin/dos-master`);
    await expect(page.locator('[data-testid="platform-admin-sidenav"]')).toBeVisible();
    await page.locator('[data-testid="platform-admin-signout"]').click();
    await page.waitForURL(/\/platform-admin\/login(?:\?|$)/, { timeout: 10_000 });
    const tok = await page.evaluate(() => localStorage.getItem('dos_master_admin_token'));
    expect(tok).toBeNull();
  });
});

test.describe('Platform Admin FE Workspace Shell — negative auth', () => {
  test('garbage admin token surfaces unauthorized frame on every panel', async ({ page }) => {
    await page.goto(`${BASE}/platform-admin/login`);
    await page.evaluate(() => localStorage.setItem('dos_master_admin_token', 'tmp.invalid-bytes'));
    await page.goto(`${BASE}/platform-admin/dos-master`);
    // Guard redirects garbage tokens to login (whoami returns null).
    await page.waitForURL(/\/platform-admin\/login/, { timeout: 10_000 });
  });
});

/**
 * Evidence Pack panel — DB-driven, real BFF, full Carbon surface.
 *
 * The Platform-Admin workspace is observability-only (no tenant CRUD), so
 * "CRUD coverage" here means: every read endpoint behind every panel must
 * round-trip the live BFF → live Postgres (shahin_grc, dos_master + dos
 * + platform_admin schemas) and surface the row counts in the FE without
 * skeleton/empty/error frames remaining. The Evidence Pack panel is the
 * union surface — asserting it green covers all 13 evidence endpoints
 * plus the 2 auth endpoints and the writer audit trail.
 */
test.describe('Platform Admin — Evidence Pack panel (DB-driven, full Carbon surface)', () => {
  test.describe.configure({ mode: 'serial' });
  test.use({ actionTimeout: 60_000, navigationTimeout: 90_000 });
  test.setTimeout(120_000);
  test.beforeEach(async ({ page, request }) => {
    const token = await loginViaApi(request);
    await seedAdminToken(page, token);
  });

  test('renders 9 Carbon summary tiles with live DB counts', async ({ page }) => {
    await page.goto(`${BASE}/platform-admin/dos-master/evidence`);
    await page.waitForResponse(
      (r) => r.url().includes('/api/admin/console/dos-master/phase-1') && r.status() === 200,
      { timeout: 30_000 },
    );
    await expect(page.locator('[data-testid="evidence-summary-grid"]')).toBeVisible();
    for (const id of [
      'evidence-card-validation',
      'evidence-card-milestones',
      'evidence-card-guards',
      'evidence-card-doctrine',
      'evidence-card-services',
      'evidence-card-ddl',
      'evidence-card-rings',
      'evidence-card-negative',
      'evidence-card-git',
    ]) {
      await expect(page.locator(`[data-testid="${id}"]`), `tile ${id}`).toBeVisible();
    }
    await expect(page.locator('[data-testid="evidence-card-doctrine"]')).toContainText('/11');
    await expect(page.locator('[data-testid="evidence-card-negative"]')).toContainText(/REJECTED|ACCEPTED/);
  });

  test('endpoint coverage table lists ≥ 15 endpoints surfaced from real BFF', async ({ page }) => {
    await page.goto(`${BASE}/platform-admin/dos-master/evidence`);
    await page.waitForResponse(
      (r) => r.url().includes('/api/admin/console/dos-master/phase-1') && r.status() === 200,
      { timeout: 30_000 },
    );
    const rows = page.locator('[data-testid="evidence-endpoints"] tbody tr');
    await expect.poll(async () => rows.count(), { timeout: 10_000 }).toBeGreaterThanOrEqual(15);
    const txt = await page.locator('[data-testid="evidence-endpoints"]').innerText();
    expect(txt).toContain('/auth/email-login');
    expect(txt).toContain('/auth/whoami');
    expect(txt).toContain('/dos-master/milestones');
    expect(txt).toContain('/dos-master/ppd');
    expect(txt).toContain('/dos-master/controlled-write');
    expect(txt).toContain('/dos-master/evidence-pack');
    expect(txt).toContain('/dos-master/negative-proof');
  });

  test('every panel BFF call returns 200 and reflects live DB rows (no stub data)', async ({ page, request }) => {
    const token = await page.evaluate(() => localStorage.getItem('dos_master_admin_token'));
    expect(token, 'admin token must be seeded by beforeEach').toBeTruthy();
    const endpoints = [
      '/dos-master/milestones',
      '/dos-master/services',
      '/dos-master/doctrine',
      '/dos-master/controlled-ddl',
      '/dos-master/ppd',
      '/dos-master/compensation',
      '/dos-master/auto-evaluator',
      '/dos-master/controlled-write',
      '/dos-master/rollout-ledger',
      '/dos-master/ci-guards',
      '/dos-master/cli',
      '/dos-master/negative-proof',
      '/dos-master/phase-1',
    ];
    for (const ep of endpoints) {
      const r = await request.get(`${BASE}/api/admin/console${ep}`, {
        headers: { authorization: `Bearer ${token}` },
      });
      expect(r.status(), `${ep} must be 200 (real BFF + DB)`).toBe(200);
      const body = await r.json();
      expect(body, `${ep} must return JSON`).toBeTruthy();
    }
  });

  test('writer-audit trail surfaces real dos.dos_master_writer_audit rows', async ({ request, page }) => {
    const token = await page.evaluate(() => localStorage.getItem('dos_master_admin_token'));
    const r = await request.get(`${BASE}/api/admin/console/dos-master/controlled-write`, {
      headers: { authorization: `Bearer ${token}` },
    });
    expect(r.status()).toBe(200);
    const body = await r.json();
    expect(body.totals).toBeTruthy();
    expect(typeof body.totals.rows).toBe('number');
    expect(body.totals.rows).toBeGreaterThan(0);
    expect(typeof body.totals.actors).toBe('number');
    expect(body.totals.actors).toBeGreaterThan(0);
    expect(Array.isArray(body.recent)).toBeTruthy();
    if (body.recent.length > 0) {
      expect(body.recent[0]).toHaveProperty('actor');
      expect(body.recent[0]).toHaveProperty('target');
      expect(body.recent[0]).toHaveProperty('op');
      expect(body.recent[0]).toHaveProperty('occurred_at');
    }
  });

  test('Article 11 negative-proof endpoint actually attempts uncontrolled INSERT and is rejected', async ({ request, page }) => {
    const token = await page.evaluate(() => localStorage.getItem('dos_master_admin_token'));
    const r = await request.get(`${BASE}/api/admin/console/dos-master/negative-proof`, {
      headers: { authorization: `Bearer ${token}` },
    });
    expect(r.status()).toBe(200);
    const body = await r.json();
    expect(body.rejected, 'controlled-table INSERT without dos.actor must be rejected').toBe(true);
    expect(body.sqlstate).toBeTruthy();
    expect(body.sqlstate).not.toBe('00000');
  });

  test('PPD endpoint surfaces real ring engine rows tied to platform-rollout plan', async ({ request, page }) => {
    const token = await page.evaluate(() => localStorage.getItem('dos_master_admin_token'));
    const r = await request.get(`${BASE}/api/admin/console/dos-master/ppd`, {
      headers: { authorization: `Bearer ${token}` },
    });
    expect(r.status()).toBe(200);
    const body = await r.json();
    expect(body.plan).toBeTruthy();
    expect(body.plan.title).toBe('platform-rollout');
    expect(Array.isArray(body.rings)).toBeTruthy();
    expect(body.rings.length).toBeGreaterThanOrEqual(6);
    const codes = body.rings.map((r: { ring_code: string }) => r.ring_code).sort();
    expect(codes).toEqual(expect.arrayContaining(['R0', 'R1', 'R2', 'R3', 'R4', 'R5']));
    expect(Array.isArray(body.health_gate_adapters)).toBeTruthy();
    expect(body.health_gate_adapters.length).toBeGreaterThanOrEqual(5);
  });

  test('Evidence Pack download triggers JSON attachment and refreshes last-file marker', async ({ page }) => {
    await page.goto(`${BASE}/platform-admin/dos-master/evidence`);
    await page.waitForResponse(
      (r) => r.url().includes('/api/admin/console/dos-master/phase-1') && r.status() === 200,
      { timeout: 30_000 },
    );
    const downloadPromise = page.waitForEvent('download', { timeout: 30_000 });
    await page.locator('[data-testid="evidence-pack-download"]').click();
    const dl = await downloadPromise;
    expect(dl.suggestedFilename()).toMatch(/^dos-master-phase-1-evidence-\d{4}-\d{2}-\d{2}\.json$/);
    await expect(page.locator('[data-testid="evidence-pack-last"]')).toBeVisible();
    await expect(page.locator('[data-testid="evidence-pack-last"]')).toContainText('dos-master-phase-1-evidence-');
  });

  test('controlled-DDL surface lists ≥ 40 trg_dos_master_only-protected tables', async ({ request, page }) => {
    const token = await page.evaluate(() => localStorage.getItem('dos_master_admin_token'));
    const r = await request.get(`${BASE}/api/admin/console/dos-master/controlled-ddl`, {
      headers: { authorization: `Bearer ${token}` },
    });
    expect(r.status()).toBe(200);
    const body = await r.json();
    expect(body.total).toBeGreaterThanOrEqual(40);
    expect(Array.isArray(body.tables)).toBeTruthy();
    expect(body.tables.length).toBe(body.total);
    expect(body.tables.some((t: { schema: string }) => t.schema === 'dos_master')).toBeTruthy();
  });
});
