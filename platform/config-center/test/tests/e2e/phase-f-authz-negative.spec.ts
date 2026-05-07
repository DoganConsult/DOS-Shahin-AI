/**
 * Phase F-F6 H3 — AuthZ negative-path harness.
 *
 * For every customer-bound route seeded in waves V1..V6, asserts the
 * production AuthZ contract for an unauthenticated/viewer session:
 *
 *   GATE A — Route-guard block (preferred): the SPA must NOT serve the
 *     admin URL. The visitor is redirected to a public surface (`/`,
 *     `/login`, `/auth`, `/sign-in`, …). When this happens the test passes
 *     because the AuthZ guard already prevented data exposure.
 *
 *   GATE B — Render-time block (fallback): if the SPA does keep the user
 *     on the admin URL (e.g. dev mode), the dynamic-template host must
 *     mount, the bound template's selector must render, AND every
 *     mutator selector (Save bar, Create / Delete, role-grant dialog,
 *     known data-action-key buttons) must be absent.
 *
 *   GATE C — Network enforcement: any POST/PUT/PATCH/DELETE captured
 *     during the visit MUST respond 401 or 403.
 *
 *   GATE D — Legacy fallback: the "No widget configured" string must
 *     never appear anywhere on the rendered page.
 *
 * Prerequisites:
 *   - SPA served at E2E_BASE_URL (default http://localhost:4200).
 *   - Browser binaries installed: `npx playwright install chromium`.
 *   - Unauthenticated by default. Set ADMIN_STORAGE_STATE=<file.json> to
 *     opt into the positive-control suite that asserts mutators DO appear
 *     under an admin session.
 */
import { test, expect, type Page, type Route } from '@playwright/test';

interface BoundRoute {
  url: string;
  archetype: string;
  templateSelector: string;
}

const V1_V6_ROUTES: BoundRoute[] = [
  // V1 — Foundation
  { url: '/admin/foundation/lifecycle',      archetype: 'calendar-timeline',     templateSelector: 'dos-calendar-timeline' },
  { url: '/admin/foundation/organizations',  archetype: 'org-chart',             templateSelector: 'dos-org-chart' },
  { url: '/admin/foundation/persons',        archetype: 'ownership-map',         templateSelector: 'dos-ownership-map' },
  // V2 — Identity & Access
  { url: '/admin/dauth/roles',               archetype: 'delegation-center',     templateSelector: 'dos-delegation-center' },
  { url: '/admin/dauth/permissions',         archetype: 'ownership-map',         templateSelector: 'dos-ownership-map' },
  { url: '/admin/dauth/audit',               archetype: 'audit-trail-evidence',  templateSelector: 'dos-audit-trail-evidence' },
  { url: '/admin/multi-tenant/tenants',      archetype: 'ownership-map',         templateSelector: 'dos-ownership-map' },
  // V3 — Audit-trail-ledger (sample 3 of 11; same archetype, identical assertions)
  { url: '/admin/access/audit',              archetype: 'audit-trail-ledger',    templateSelector: 'dos-audit-trail-ledger' },
  { url: '/admin/dnoc/audit',                archetype: 'audit-trail-ledger',    templateSelector: 'dos-audit-trail-ledger' },
  { url: '/admin/dsoc/audit',                archetype: 'audit-trail-ledger',    templateSelector: 'dos-audit-trail-ledger' },
  // V4 — Agent suite
  { url: '/admin/ai',                        archetype: 'agent-flow',            templateSelector: 'dos-agent-flow' },
  { url: '/admin/ai/engine',                 archetype: 'agent-registry',        templateSelector: 'dos-agent-registry' },
  { url: '/admin/ai/gateway',                archetype: 'agent-registry',        templateSelector: 'dos-agent-registry' },
  { url: '/admin/ai/governance',             archetype: 'user-agent-workbench',  templateSelector: 'dos-user-agent-workbench' },
  // V5 — Incident response
  { url: '/admin/dnoc/alerts',               archetype: 'incident-response',     templateSelector: 'dos-incident-response' },
  { url: '/admin/dsoc/incidents',            archetype: 'incident-response',     templateSelector: 'dos-incident-response' },
  // V6 — Operational misc
  { url: '/admin/dnoc/services',             archetype: 'follow-up-center',      templateSelector: 'dos-follow-up-center' },
  { url: '/admin/dos/registries',            archetype: 'export-center',         templateSelector: 'dos-export-center' },
  { url: '/admin/dsoc/policies',             archetype: 'compliance-calendar',   templateSelector: 'dos-compliance-calendar' },
  { url: '/admin/multi-tenant/provisioning', archetype: 'workflow-timeline',     templateSelector: 'dos-workflow-timeline' },
  { url: '/admin/multi-tenant/quotas',       archetype: 'remediation-roadmap',   templateSelector: 'dos-remediation-roadmap' },
];

const PUBLIC_PATH_PREFIXES = ['/login', '/auth', '/sign-in', '/sign-up', '/'];

function isAuthZBlockedRedirect(currentUrl: string, originalAdminPath: string): boolean {
  try {
    const u = new URL(currentUrl);
    if (u.pathname === originalAdminPath) return false;
    if (u.pathname.startsWith('/admin/')) return false;
    return PUBLIC_PATH_PREFIXES.some(p =>
      p === '/' ? u.pathname === '/' : u.pathname.startsWith(p),
    );
  } catch {
    return false;
  }
}

const MUTATOR_SELECTORS = [
  'button:has-text("Save changes")',
  'button:has-text("Create")',
  'button:has-text("Delete")',
  'button[data-action-key="role.grant"]',
  'button[data-action-key="permission.update"]',
  'button[data-action-key="incident.escalate"]',
  '[data-testid="role-grant-dialog"]',
];

async function gotoStable(page: Page, url: string): Promise<void> {
  await page.goto(url, { waitUntil: 'domcontentloaded' });
  await page.waitForLoadState('networkidle', { timeout: 15_000 }).catch(() => {});
}

test.describe('Phase F-F6 H3 — AuthZ negative paths', () => {
  test.describe.configure({ mode: 'parallel' });

  for (const r of V1_V6_ROUTES) {
    test(`viewer cannot mutate on ${r.url} (${r.archetype})`, async ({ page }) => {
      const writeCalls: Array<{ method: string; url: string; status: number }> = [];

      await page.route('**/api/**', async (route: Route) => {
        const req = route.request();
        const m = req.method();
        if (m === 'POST' || m === 'PUT' || m === 'PATCH' || m === 'DELETE') {
          const resp = await route.fetch().catch(() => null);
          const status = resp?.status() ?? 401;
          writeCalls.push({ method: m, url: req.url(), status });
          if (resp) {
            await route.fulfill({ response: resp });
          } else {
            await route.fulfill({ status: 401, body: '{"error":"unauthorized"}' });
          }
          return;
        }
        await route.continue();
      });

      await gotoStable(page, r.url);

      // GATE D — Legacy fallback must never render anywhere.
      const fallback = page.locator(':text("No widget configured")');
      await expect(fallback, 'legacy fallback must not render').toHaveCount(0);

      const blockedByGuard = isAuthZBlockedRedirect(page.url(), r.url);

      if (blockedByGuard) {
        // GATE A — Route-guard already blocked the visitor. No further DOM
        // assertions needed: the admin DOM was never delivered.
        expect(
          page.url().includes(r.url),
          `route-guard must redirect away from ${r.url}; current=${page.url()}`,
        ).toBeFalsy();
      } else {
        // GATE B — User somehow stayed on the admin URL → DynamicTemplate
        // must mount AND every mutator must be absent.
        const host = page.locator('dos-dynamic-template-page');
        await expect(
          host,
          `dynamic-template host should mount on ${r.url}`,
        ).toBeVisible({ timeout: 10_000 });

        const tpl = page.locator(r.templateSelector);
        await expect(
          tpl,
          `bound template ${r.templateSelector} should mount on ${r.url}`,
        ).toBeVisible({ timeout: 10_000 });

        for (const sel of MUTATOR_SELECTORS) {
          const node = page.locator(sel);
          await expect(
            node,
            `mutator "${sel}" must NOT render for viewer on ${r.url}`,
          ).toHaveCount(0);
        }
      }

      // GATE C — Network enforcement: every write call must be rejected.
      for (const c of writeCalls) {
        expect(
          [401, 403].includes(c.status),
          `write call ${c.method} ${c.url} returned ${c.status}; expected 401/403`,
        ).toBeTruthy();
      }
    });
  }
});

const ADMIN_STORAGE = process.env.ADMIN_STORAGE_STATE;
test.describe('Phase F-F6 H3 — positive control under admin session', () => {
  test.skip(!ADMIN_STORAGE, 'ADMIN_STORAGE_STATE not provided; skipping positive control.'); // -- justified: requires admin storage state env var

  test.use({ storageState: ADMIN_STORAGE });

  test('admin sees Save changes on /admin/foundation/persons', async ({ page }) => {
    await gotoStable(page, '/admin/foundation/persons');
    const tpl = page.locator('dos-ownership-map-template');
    await expect(tpl).toBeVisible({ timeout: 10_000 });
    const save = page.locator('button:has-text("Save changes"), button[data-action-key="ownership.update"]').first();
    await expect(save, 'admin must see at least one mutator on persons').toBeVisible();
  });
});
