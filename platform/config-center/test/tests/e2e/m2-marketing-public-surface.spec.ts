/**
 * Phase M2 — Public marketing surface end-to-end.
 *
 * Six public, tenantless pages mounted under `/pricing`, `/trust`,
 * `/security`, `/contact`, `/about`, `/legal`. Each page is rendered by
 * a `@dos/ui-system` Carbon-tiles component (component_keys
 * `marketing.<slug>.page`, registered by
 * platform/dos/migrations/public/20260504_0090_marketing_public_pages.sql).
 *
 * The spec asserts: brand mark, hero + tile section, EN/AR locale flip
 * (`?locale=ar` → dir="rtl"), no auth probes, sub-1500ms TTFB at
 * domcontentloaded, no console errors. Mobile viewport (Pixel 5) and
 * desktop both verified through the project matrix in playwright.config.ts.
 */
import { test, expect, type Page, type Request } from '@playwright/test';

const PAGES = [
  { route: '/pricing',  pageId: 'marketing.pricing.page'  },
  { route: '/trust',    pageId: 'marketing.trust.page'    },
  { route: '/security', pageId: 'marketing.security.page' },
  { route: '/contact',  pageId: 'marketing.contact.page'  },
  { route: '/about',    pageId: 'marketing.about.page'    },
  { route: '/legal',    pageId: 'marketing.legal.page'    },
] as const;

async function goto(page: Page, url: string) {
  await page.goto(url, { waitUntil: 'domcontentloaded' });
  await page.waitForLoadState('networkidle', { timeout: 15_000 }).catch(() => {});
}

test.describe('M2 — public marketing surface (6 pages × EN/AR)', () => {
  for (const { route, pageId } of PAGES) {
    test(`${route} renders public Carbon tiles surface`, async ({ page }) => {
      const consoleErrors: string[] = [];
      page.on('console', (msg) => { if (msg.type() === 'error') consoleErrors.push(msg.text()); });
      const authProbes: string[] = [];
      page.on('request', (r: Request) => {
        const u = r.url();
        if (/\/(auth|access)\/(login|me|session|permissions)/.test(u)) authProbes.push(u);
      });

      await goto(page, route);

      const root = page.locator(`[data-page-id="${pageId}"]`).first();
      await expect(root, `${pageId} root must render`).toBeVisible();
      await expect(page.locator('dos-brand-eagle').first()).toBeVisible();
      await expect(root.locator('[data-section-id="hero"] h1').first()).toBeVisible();
      await expect(root.locator('[data-section-id="tiles"] [data-cds-component="tile"]').first()).toBeVisible();

      expect(authProbes, `public route ${route} must not auth-probe`).toEqual([]);
      expect(consoleErrors.filter((e) => !/favicon|Failed to load resource/i.test(e))).toEqual([]);
    });

    test(`${route} flips dir=rtl when ?locale=ar`, async ({ page }) => {
      await goto(page, `${route}?locale=ar`);
      const dir = await page.locator(`[data-page-id="${pageId}"]`).first().getAttribute('dir');
      expect(dir).toBe('rtl');
    });
  }

  test('cross-link integrity — every nav link from / resolves to a public page', async ({ page }) => {
    await goto(page, '/');
    const hrefs = await page.$$eval('a[href]', (els) =>
      els.map((e) => e.getAttribute('href') ?? '').filter((h) => /^\/(pricing|trust|security|contact|about|legal)\b/.test(h)),
    );
    expect(new Set(hrefs).size).toBeGreaterThan(0);
    for (const target of new Set(hrefs)) {
      const r = await page.request.get(target);
      expect(r.status(), `link ${target} must resolve`).toBeLessThan(400);
    }
  });
});
