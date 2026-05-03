/**
 * Phase M1.6 — Carbon Auth Pages Pack runtime spec.
 *
 * Verifies the public auth surfaces:
 *   ① /login renders <dos-auth-login-page> with split-screen at desktop and
 *      collapses to single column at ≤720px container.
 *   ② Login form emits auth.login.submitted (no auto-execute) and the host
 *      shell drives the OIDC POST.
 *   ③ MFA card flips to bottom-sheet at ≤480px container.
 *   ④ ?locale=ar flips dir=rtl across pages.
 *   ⑤ The auth surfaces never auth-probe in a loop — single /auth/me is OK.
 *
 * Currently `describe.skip`d: routes are seeded in dos.dynamic_ui_routes
 * but the SPA route table still owns the legacy /login. Phase M2 (unified
 * shell rewrite) will point /login at auth.login.page; drop `.skip` then.
 *
 * Companion contract test (passes today, no DOM):
 *   tests/contract/auth-pages-contract.test.ts
 */
import { test, expect, type Page } from '@playwright/test';

async function goto(page: Page, url: string) {
  await page.goto(url, { waitUntil: 'domcontentloaded' });
  await page.waitForLoadState('networkidle', { timeout: 15_000 }).catch(() => {});
}

// TODO(M2): unskip once product-shell maps /login → auth.login.page.
test.describe.skip('M1.6 — auth.login.page renders at /login', () => {
  test('split-screen layout at desktop', async ({ page }) => {
    await goto(page, '/login');
    const shell = page.locator('dos-auth-login-page [data-cds-component="grid"]').first();
    await expect(shell).toBeVisible();
    await expect(page.locator('dos-auth-brand-panel')).toBeVisible();
    await expect(page.locator('dos-auth-login-card')).toBeVisible();
  });

  test('login card emits submitted and does not auto-execute', async ({ page }) => {
    const writeRequests: string[] = [];
    page.on('request', (r) => {
      if (['POST','PUT','PATCH','DELETE'].includes(r.method()))
        writeRequests.push(`${r.method()} ${r.url()}`);
    });
    await goto(page, '/login');
    await page.locator('dos-auth-login-card input[name="email"]').fill('test@example.com');
    await page.locator('dos-auth-login-card input[name="password"]').fill('pw-redacted');
    await page.locator('dos-auth-login-card button[type="submit"]').click();

    // Only the host-shell POST /auth/login write is permitted from the host —
    // the component itself must not write directly.
    const componentWrites = writeRequests.filter((u) => !/\/auth\/login\b/.test(u));
    expect(componentWrites, `unexpected writes from login card: ${componentWrites.join(', ')}`).toEqual([]);
  });

  test('public surface — single /auth/me probe at most (no looping)', async ({ page }) => {
    const probes: string[] = [];
    page.on('request', (r) => {
      if (/\/auth\/(me|session)/.test(r.url())) probes.push(r.url());
    });
    await goto(page, '/login');
    expect(probes.length).toBeLessThanOrEqual(1);
  });
});

// TODO(M2): unskip with M1.6 SPA wiring.
test.describe.skip('M1.6 — register / forgot / reset / mfa surfaces', () => {
  test('/register renders the 4-step wizard', async ({ page }) => {
    await goto(page, '/register');
    await expect(page.locator('dos-auth-register-card')).toBeVisible();
    await expect(page.locator('[data-cds-component="progress-indicator"]')).toBeVisible();
  });

  test('/forgot-password renders single-field card', async ({ page }) => {
    await goto(page, '/forgot-password');
    await expect(page.locator('dos-auth-forgot-password-card input[name="email"]')).toBeVisible();
  });

  test('/reset-password validates password match', async ({ page }) => {
    await goto(page, '/reset-password');
    await page.locator('dos-auth-reset-password-card input[name="newPassword"]').fill('Aa!23456');
    await page.locator('dos-auth-reset-password-card input[name="confirmPassword"]').fill('mismatch');
    await page.locator('dos-auth-reset-password-card button[type="submit"]').click();
    await expect(page.locator('dos-auth-notification[data-kind="error"], [data-cds-component="notification"][data-kind="error"]')).toBeVisible();
  });

  test('/mfa renders the code field', async ({ page }) => {
    await goto(page, '/mfa');
    await expect(page.locator('dos-auth-mfa-card input[name="code"]')).toBeVisible();
  });
});

test.use({ viewport: { width: 390, height: 844 } });

// TODO(M3): unskip once archetype mobile reflow is delivered.
test.describe.skip('M1.6 — mobile 390px reflow', () => {
  test('/login collapses to single column at ≤720px', async ({ page }) => {
    await goto(page, '/login');
    const shell = page.locator('dos-auth-shell .dos-auth-shell').first();
    const cols = await shell.evaluate((el) => getComputedStyle(el).gridTemplateColumns);
    // Collapsed grid = single track.
    expect(cols.split(' ').length).toBeLessThanOrEqual(1);
  });

  test('MFA card flips to bottom-sheet at ≤480px', async ({ page }) => {
    await goto(page, '/mfa');
    await expect(page.locator('dos-auth-mfa-card [data-cds-component="modal"]'))
      .toHaveAttribute('data-mobile-mode', 'bottom-sheet');
  });

  test('?locale=ar flips dir=rtl', async ({ page }) => {
    await goto(page, '/login?locale=ar');
    await expect(page.locator('dos-auth-shell .dos-auth-shell')).toHaveAttribute('dir', 'rtl');
  });
});
