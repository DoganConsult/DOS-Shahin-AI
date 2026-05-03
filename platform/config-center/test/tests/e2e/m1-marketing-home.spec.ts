/**
 * Phase M1 — `marketing.home.page` runtime spec.
 *
 * Asserts the unauthenticated public landing surface resolves through
 * Dynamic-UI, renders the locked 19-region public page contract, keeps
 * login/register as bridge links, renders the agentic-proof strip, and
 * supports Arabic RTL.
 *
 * Companion contract test (passes today, no DOM):
 *   tests/contract/marketing-home-contract.test.ts
 */
import { test, expect, type Page } from '@playwright/test';

const REGIONS = [
  'public-header','breadcrumb-row','hero','trust-pills','value-props',
  'agentic-proof','download-kit','platform-overview','modules','industries',
  'architecture','ai-and-agents','pricing-teaser','testimonials','logos',
  'resources','faq','cta-banner','footer',
];

const AGENT_CODES = ['A01','A02','A04','A05','A06','A07','A08','A09','A10'];

async function goto(page: Page, url: string) {
  await page.goto(url, { waitUntil: 'domcontentloaded' });
  await page.waitForLoadState('networkidle', { timeout: 15_000 }).catch(() => {});
}

test.describe('M1 — marketing.home.page renders without auth', () => {
  test('root route resolves the marketing-landing Dynamic-UI binding', async ({ page }) => {
    const binding = await page.request.get('/api/ui-os/template-binding?route=%2F');
    expect(binding.ok(), 'template-binding endpoint must resolve for public landing').toBe(true);
    const body = await binding.json();
    expect(body.route).toBe('/');
    expect(body.archetype).toBe('marketing-landing');
    expect(body.template_export).toBe('MarketingHomeTemplateComponent');
    expect(body.props?.brandCode).toBe('shahin-ai');
    expect(body.props?.homeContent?.hero?.title).toBeTruthy();
  });

  test('all 19 public regions present in DOM order', async ({ page }) => {
    await goto(page, '/');
    const ids = await page.$$eval(
      '[data-section-id]',
      (els) => els.map((e) => e.getAttribute('data-section-id') ?? ''),
    );
    expect(ids).toEqual(REGIONS);
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

  test('public surface — no credential forms and login/register are bridges', async ({ page }) => {
    const authProbes: string[] = [];
    page.on('request', (r) => {
      const u = r.url();
      if (/\/(auth|access)\/(me|session|permissions)/.test(u)) authProbes.push(u);
    });
    await goto(page, '/');
    await expect(page.locator('input[type="password"]')).toHaveCount(0);
    const bridgeHrefs = await page.$$eval('a[href]', (els) =>
      els.map((e) => e.getAttribute('href') ?? '').filter((h) => h === '/login' || h === '/register'),
    );
    expect(new Set(bridgeHrefs)).toEqual(new Set(['/login', '/register']));
    expect(authProbes, `landing must not auth-probe (${authProbes.join(', ')})`).toEqual([]);
  });
});
