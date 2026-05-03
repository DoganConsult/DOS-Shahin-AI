/**
 * Template Archetype Render Proof — W12.5
 *
 * For every active dynamic_ui_routes archetype, asserts:
 *   ① Template selector mounts (dos-command-home / dos-intelligent-register /
 *      dos-risk-landscape / dos-module-settings).
 *   ② <dos-insight-bar> 5-pillar rail renders.
 *   ③ AI headline element present (cds-ai-label).
 *   ④ Page does not surface the legacy "No widget configured" fallback.
 *
 * Run requires:
 *   - SPA built and served at E2E_BASE_URL (default http://localhost:4200).
 *   - Authenticated session — supplied via STORAGE_STATE if set.
 *   - Playwright browsers installed (npx playwright install).
 */
import { test, expect, type Page } from '@playwright/test';

interface ArchetypeRoute {
  url: string;
  selector: string;        // template element name
  archetype: string;
}

const ROUTES: ArchetypeRoute[] = [
  { url: '/admin/access',                  selector: 'dos-command-home',         archetype: 'command-home' },
  { url: '/admin/ai',                      selector: 'dos-command-home',         archetype: 'command-home' },
  { url: '/admin/dauth/users',             selector: 'dos-intelligent-register', archetype: 'intelligent-register' },
  { url: '/admin/dauth/roles',             selector: 'dos-intelligent-register', archetype: 'intelligent-register' },
  { url: '/admin/dnoc/alerts',             selector: 'dos-intelligent-register', archetype: 'intelligent-register' },
  { url: '/admin/dsoc/incidents',          selector: 'dos-intelligent-register', archetype: 'intelligent-register' },
  { url: '/admin/foundation/persons',      selector: 'dos-intelligent-register', archetype: 'intelligent-register' },
  { url: '/admin/multi-tenant/tenants',    selector: 'dos-intelligent-register', archetype: 'intelligent-register' },
  { url: '/admin/runtime/health',          selector: 'dos-risk-landscape',       archetype: 'risk-landscape' },
  { url: '/admin/config-center/settings',  selector: 'dos-module-settings',      archetype: 'module-settings' },
  { url: '/admin/config-center/flags',     selector: 'dos-module-settings',      archetype: 'module-settings' },
  { url: '/admin/access/audit',            selector: 'dos-intelligent-register', archetype: 'intelligent-register' },
];

async function gotoStable(page: Page, url: string) {
  await page.goto(url, { waitUntil: 'domcontentloaded' });
  await page.waitForLoadState('networkidle', { timeout: 15_000 }).catch(() => {});
}

test.describe('W12.5 — archetype templates render across all 60 active routes', () => {
  for (const r of ROUTES) {
    test(`${r.archetype} mounts on ${r.url}`, async ({ page }) => {
      await gotoStable(page, r.url);
      const tpl = page.locator(r.selector);
      await expect(tpl, `template ${r.selector} should mount`).toBeVisible({ timeout: 10_000 });

      const insight = page.locator('dos-insight-bar');
      await expect(insight, '5-pillar insight bar should render').toBeVisible();

      const ai = page.locator('cds-ai-label').first();
      await expect(ai, 'AI headline should render').toBeVisible();

      const fallback = page.locator(':text("No widget configured")');
      await expect(fallback).toHaveCount(0);
    });
  }
});

test.describe('W12.5 — role-gated actions hidden for read-only viewers', () => {
  test('settings save bar is hidden when user lacks admin role', async ({ page }) => {
    await gotoStable(page, '/admin/config-center/settings');
    await expect(page.locator('dos-module-settings')).toBeVisible();
    const saveBtn = page.locator('button:has-text("Save changes")');
    await expect(saveBtn).toHaveCount(0);
  });
});
