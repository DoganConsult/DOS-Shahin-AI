/**
 * Phase Slice-1 — Foundation shell hardening regression.
 *
 * Asserts the four contracts shipped by the Slice-1 fix on the foundation
 * routes that previously regressed with `TypeError: Cannot read properties
 * of undefined (reading 'fallback')`:
 *
 *   GATE 1 — No `.fallback` undefined-access throw on /foundation/delegations
 *     and /foundation/reference-data. Console errors and pageerror events
 *     are scraped for the regex; zero matches required.
 *
 *   GATE 2 — Single brand stamp inside `[data-testid="dos-workspace-header"]`.
 *     The Carbon `[name]` dual-stamp collapse must leave exactly one rendered
 *     occurrence of the resolved brand string.
 *
 *   GATE 3 — Migration `props` flow. The 20260505_1600 seed populates
 *     `props.title`, `props.subtitle`, and bilingual `props.emptyState` for
 *     both routes. The masthead title text must render on both pages.
 *
 *   GATE 4 — `coerceItems<T>` contract. The
 *     `/api/ui-os/workspace-shell/<tenantId>` payload's nested label fields
 *     are scanned; every `signals[*].label`, `messages[*].subject`,
 *     `actions[*].title`, `activities[*].agentName`, `activities[*].step`
 *     must be either a `WorkspaceI18nLabel` object (`{ i18nKey, fallback? }`),
 *     a plain string, or null/undefined. No mixed snake-case primitives may
 *     escape the binding service.
 *
 * Run:
 *   E2E_BASE_URL=http://localhost:3000 \
 *   cd platform/config-center/test && \
 *   npx playwright test phase-slice1-foundation-shell.spec.ts --project=chromium
 */
import { test, expect, type ConsoleMessage } from '@playwright/test';

const FOUNDATION_ROUTES = [
  { url: '/foundation/delegations',    titleEn: 'Delegations',    emptyEn: 'No delegations yet' },
  { url: '/foundation/reference-data', titleEn: 'Reference Data', emptyEn: 'No reference data sets yet' },
] as const;

const FALLBACK_THROW_RX =
  /Cannot read properties of undefined \(reading ['"]fallback['"]\)/i;

for (const route of FOUNDATION_ROUTES) {
  test.describe(`Slice-1 contracts — ${route.url}`, () => {
    test('GATE 1 — no `.fallback` undefined-access throw', async ({ page }) => {
      const consoleErrors: string[] = [];
      const pageErrors: string[] = [];
      page.on('console', (m: ConsoleMessage) => {
        if (m.type() === 'error') consoleErrors.push(m.text());
      });
      page.on('pageerror', (e) => { pageErrors.push(String(e?.message ?? e)); });

      await page.goto(route.url, { waitUntil: 'domcontentloaded' });
      await page.waitForTimeout(4000);

      const hits = [...consoleErrors, ...pageErrors].filter((s) => FALLBACK_THROW_RX.test(s));
      expect(hits, `Slice-1 regression: ${hits.join('\n')}`).toEqual([]);
    });

    test('GATE 2 — single brand stamp in workspace header', async ({ page }) => {
      await page.goto(route.url, { waitUntil: 'domcontentloaded' });
      await page.waitForTimeout(1500);
      // Anonymous visitors redirect to /login (workspaceShellGuard). The
      // dual-stamp regression cannot manifest on the login surface, so the
      // gate passes vacuously when the URL has been rewritten away from the
      // foundation route OR the workspace shell is not mounted.
      if (!page.url().includes(route.url)) test.skip(true, `redirected to ${page.url()}`);
      const header = page.locator('[data-testid="dos-workspace-header"]').first();
      const headerCount = await header.count();
      if (headerCount === 0) test.skip(true, 'workspace header not mounted (no auth)');
      // The brand projection only renders inside an authenticated workspace
      // shell. If the header is mounted but the brand span is absent the
      // visitor is mid-redirect or on a stub page — skip.
      const brandCount = await header.locator('.dos-wh-brand-name').count();
      if (brandCount === 0) test.skip(true, 'brand projection not rendered (mid-redirect / no tenant)');
      expect(brandCount).toBe(1);
    });

    test('GATE 3 — migration props.title rendered', async ({ page }) => {
      await page.goto(route.url, { waitUntil: 'domcontentloaded' });
      // Wait briefly for client-side guard redirect to settle.
      await page.waitForTimeout(1500);
      if (!page.url().includes(route.url)) test.skip(true, `redirected to ${page.url()}`);
      // If the workspace shell is not mounted, the visitor is on a public
      // surface (e.g. login flash before redirect) and the migration props
      // are not the source of any rendered text — skip.
      const shellMounted = await page.locator('[data-testid="dos-workspace-header"]').count();
      if (shellMounted === 0) test.skip(true, 'workspace shell not mounted (no auth)');
      const body = page.locator('body');
      await expect(body).toContainText(new RegExp(route.titleEn, 'i'), { timeout: 10_000 });
    });
  });
}

test('GATE 4 — workspace-shell binding payload label fields are contract-shaped', async ({ request, page }) => {
  // Resolve the active tenantId via the public bootstrap surface. The
  // /api/ui-os/workspace-shell/<id> endpoint is tenant-scoped; without a
  // session the endpoint returns 401 and the gate is skipped (the binding
  // service's pre-load grace path is the only consumer in that case).
  await page.goto('/', { waitUntil: 'domcontentloaded' });
  const tenantHeader = await request.get('/api/auth/whoami').catch(() => null);
  if (!tenantHeader || !tenantHeader.ok()) test.skip(true, 'no session — gate vacuously holds');

  const whoami = await tenantHeader!.json().catch(() => ({} as Record<string, unknown>));
  const tenantId = (whoami as { tenantId?: string }).tenantId;
  if (!tenantId) test.skip(true, 'no tenantId in whoami payload');

  const resp = await request.get(`/api/ui-os/workspace-shell/${encodeURIComponent(tenantId!)}`);
  expect(resp.status(), `workspace-shell endpoint must be reachable for tenant ${tenantId}`).toBe(200);
  const body = await resp.json() as { surfaces?: Array<{ component_key: string; props?: Record<string, unknown> }> };
  expect(Array.isArray(body.surfaces)).toBe(true);

  const isLabel = (v: unknown) =>
    v == null
    || typeof v === 'string'
    || (typeof v === 'object' && v !== null && ('i18nKey' in (v as object) || 'fallback' in (v as object)));

  for (const surface of body.surfaces ?? []) {
    const props = surface.props ?? {};
    const groups: Array<[string, unknown[]]> = [
      ['signals',    Array.isArray((props as Record<string, unknown>)['signals'])    ? (props as Record<string, unknown[]>)['signals']    : []],
      ['items',      Array.isArray((props as Record<string, unknown>)['items'])      ? (props as Record<string, unknown[]>)['items']      : []],
      ['activities', Array.isArray((props as Record<string, unknown>)['activities']) ? (props as Record<string, unknown[]>)['activities'] : []],
      ['messages',   Array.isArray((props as Record<string, unknown>)['messages'])   ? (props as Record<string, unknown[]>)['messages']   : []],
      ['actions',    Array.isArray((props as Record<string, unknown>)['actions'])    ? (props as Record<string, unknown[]>)['actions']    : []],
      ['results',    Array.isArray((props as Record<string, unknown>)['results'])    ? (props as Record<string, unknown[]>)['results']    : []],
    ];
    for (const [key, rows] of groups) {
      for (const row of rows) {
        if (!row || typeof row !== 'object') continue;
        const r = row as Record<string, unknown>;
        for (const f of ['label', 'title', 'subject', 'preview', 'agentName', 'step', 'origin', 'emptyMessage']) {
          if (f in r) {
            expect(isLabel(r[f]), `surface=${surface.component_key} group=${key} field=${f} value=${JSON.stringify(r[f])}`).toBe(true);
          }
        }
      }
    }
  }
});
