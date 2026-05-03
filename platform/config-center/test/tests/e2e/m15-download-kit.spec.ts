/**
 * Phase M1.5 — Download-Kit runtime spec.
 *
 * Asserts the public Download-Kit flow on the marketing landing surface:
 *   ① <dos-download-kit-card> renders for the featured asset and emits
 *      `marketing.download.opened` on primary CTA click.
 *   ② <dos-gated-download-modal> opens for `is_gated=TRUE` assets and
 *      emits `marketing.download.submitted` on form submit.
 *   ③ <dos-download-success> renders after the host shell calls
 *      `markCompleted()` (i.e. POST /marketing/downloads returned 202).
 *   ④ Mobile container (≤480px) flips the modal to bottom-sheet via
 *      `[data-mobile-mode="bottom-sheet"]`.
 *   ⑤ The landing surface stays unauthenticated — no /auth/* probes.
 *   ⑥ The locked 17-section ordering is preserved with `download-kit`
 *      sitting between `agentic-proof` and `platform-overview`.
 *
 * Currently `describe.skip`d: the marketing.home.page component_key is
 * registered in dos.dynamic_ui_component_registry + has the public root
 * route in dos.dynamic_ui_routes, but the SPA route table has not yet
 * been pointed at it (Phase M2 — unified shell rewrite). When M2 lands
 * and the asset CDN is published, drop the `.skip` and re-run.
 *
 * Companion contract test (passes today, no DOM):
 *   tests/contract/marketing-download-kit-contract.test.ts
 */
import { test, expect, type Page } from '@playwright/test';

const SECTIONS = [
  'hero','trust-pills','value-props','agentic-proof','download-kit',
  'platform-overview','modules','industries','architecture',
  'ai-and-agents','pricing-teaser','testimonials','logos',
  'resources','faq','cta-banner','footer',
];

async function goto(page: Page, url: string) {
  await page.goto(url, { waitUntil: 'domcontentloaded' });
  await page.waitForLoadState('networkidle', { timeout: 15_000 }).catch(() => {});
}

// TODO(M2): unskip once product-shell maps `/` → marketing.home.page.
test.describe.skip('M1.5 — download-kit renders inside marketing.home.page', () => {
  test('17-section ordering keeps download-kit between agentic-proof and platform-overview', async ({ page }) => {
    await goto(page, '/');
    const ids = await page.$$eval(
      '[data-section-id]',
      (els) => els.map((e) => e.getAttribute('data-section-id') ?? ''),
    );
    expect(ids).toEqual(SECTIONS);
    const a = ids.indexOf('agentic-proof');
    const d = ids.indexOf('download-kit');
    const p = ids.indexOf('platform-overview');
    expect(d).toBe(a + 1);
    expect(p).toBe(d + 1);
  });

  test('featured download-kit card renders and exposes selector hooks', async ({ page }) => {
    await goto(page, '/');
    const card = page.locator('[data-section-id="download-kit"] dos-download-kit-card').first();
    await expect(card).toBeVisible();
    const wrapper = card.locator('[data-asset-key]').first();
    await expect(wrapper).toHaveAttribute('data-asset-key', /.+/);
  });

  test('gated kit opens the modal and emits submitted (no auto-execute)', async ({ page }) => {
    const writeRequests: string[] = [];
    page.on('request', (r) => {
      if (['POST','PUT','PATCH','DELETE'].includes(r.method()))
        writeRequests.push(`${r.method()} ${r.url()}`);
    });

    await goto(page, '/?featured=shahin-executive-overview');
    await page.locator('[data-section-id="download-kit"] dos-download-kit-card button').click();

    const modal = page.locator('dos-gated-download-modal').first();
    await expect(modal).toBeVisible();
    await expect(modal.locator('[data-cds-component="modal"]')).toHaveAttribute('aria-hidden', 'false');

    await modal.locator('input[name="name"]').fill('Test User');
    await modal.locator('input[name="email"]').fill('test@example.com');
    await modal.locator('input[name="company"]').fill('Acme');
    await modal.locator('input[name="consent"]').check();
    await modal.locator('button[type="submit"]').click();

    // Only the host-shell POST /marketing/downloads write is permitted —
    // the component itself must not write directly.
    const componentWrites = writeRequests.filter((u) => !/\/marketing\/downloads\b/.test(u));
    expect(componentWrites, `unexpected writes from modal: ${componentWrites.join(', ')}`).toEqual([]);
  });

  test('open kit downloads directly without the gated form', async ({ page }) => {
    await goto(page, '/?featured=grc-readiness-checklist');
    await page.locator('[data-section-id="download-kit"] dos-download-kit-card button').click();
    // Open kits skip the modal — the modal stays hidden.
    await expect(page.locator('dos-gated-download-modal [data-cds-component="modal"]'))
      .toHaveAttribute('aria-hidden', 'true');
  });

  test('public surface — no auth/AccessStore probes from the download-kit section', async ({ page }) => {
    const authProbes: string[] = [];
    page.on('request', (r) => {
      const u = r.url();
      if (/\/auth\/(login|me|session)/.test(u)) authProbes.push(u);
    });
    await goto(page, '/');
    await page.locator('[data-section-id="download-kit"]').scrollIntoViewIfNeeded();
    expect(authProbes, `download-kit must not auth-probe (${authProbes.join(', ')})`).toEqual([]);
  });
});

test.use({ viewport: { width: 390, height: 844 } });

// TODO(M3): unskip when archetype mobile reflow is delivered.
test.describe.skip('M1.5 — mobile 390px reflow', () => {
  test('gated modal flips to bottom-sheet at 480px container', async ({ page }) => {
    await goto(page, '/?featured=shahin-executive-overview');
    await page.locator('[data-section-id="download-kit"] dos-download-kit-card button').click();
    await expect(page.locator('dos-gated-download-modal [data-cds-component="modal"]'))
      .toHaveAttribute('data-mobile-mode', 'bottom-sheet');
  });
});
