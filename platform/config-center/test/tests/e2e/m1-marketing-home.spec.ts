/**
 * Phase M1 — `marketing.home.page` runtime spec.
 *
 * Asserts the unauthenticated public landing surface, when wired into the
 * SPA shell, renders all 16 sections, the agentic-proof strip (when the
 * `landingAgenticProof` flag is on), 9 agent-tile cards, and Arabic RTL.
 *
 * Currently `describe.skip`d: the marketing.home.page component_key is
 * registered in dos.dynamic_ui_component_registry + has a public route
 * row in dos.dynamic_ui_routes, but the SPA route table still has to be
 * pointed at it. That wiring is Phase M2 (unified shell rewrite). When
 * M2 lands, remove the `.skip` and re-run.
 *
 * Companion contract test (passes today, no DOM):
 *   tests/contract/marketing-home-contract.test.ts
 */
import { test, expect, type Page } from '@playwright/test';

const SECTIONS = [
  'hero','trust-pills','value-props','agentic-proof','download-kit',
  'platform-overview','modules','industries','architecture',
  'ai-and-agents','pricing-teaser','testimonials','logos',
  'resources','faq','cta-banner','footer',
];

const AGENT_CODES = ['A01','A02','A04','A05','A06','A07','A08','A09','A10'];

async function goto(page: Page, url: string) {
  await page.goto(url, { waitUntil: 'domcontentloaded' });
  await page.waitForLoadState('networkidle', { timeout: 15_000 }).catch(() => {});
}

// TODO(M2): unskip once product-shell maps `/` to marketing.home.page.
test.describe.skip('M1 — marketing.home.page renders without auth', () => {
  test('all 16 sections present in DOM order', async ({ page }) => {
    await goto(page, '/');
    const ids = await page.$$eval(
      '[data-section-id]',
      (els) => els.map((e) => e.getAttribute('data-section-id') ?? ''),
    );
    expect(ids).toEqual(SECTIONS);
  });

  test('brand eagle pictogram + 9 agent tiles render in agentic-proof', async ({ page }) => {
    await goto(page, '/');
    await expect(page.locator('dos-brand-eagle').first()).toBeVisible();
    const strip = page.locator('dos-agent-status-strip').first();
    await expect(strip).toBeVisible();
    for (const code of AGENT_CODES) {
      await expect(
        page.locator(`[data-section-id="agentic-proof"] [data-agent-code="${code}"]`),
        `agent tile ${code} should render`,
      ).toBeVisible();
    }
  });

  test('Arabic locale flips dir=rtl on the marketing root', async ({ page }) => {
    await page.addInitScript(() => localStorage.setItem('locale', 'ar'));
    await goto(page, '/?locale=ar');
    const dir = await page.locator('main.dos-marketing-home').first().getAttribute('dir');
    expect(dir).toBe('rtl');
  });

  test('public surface — no auth challenge, no AccessStore probes', async ({ page }) => {
    const authProbes: string[] = [];
    page.on('request', (r) => {
      const u = r.url();
      if (/\/auth\/(login|me|session)/.test(u)) authProbes.push(u);
    });
    await goto(page, '/');
    expect(authProbes, `landing must not auth-probe (${authProbes.join(', ')})`).toEqual([]);
  });
});
