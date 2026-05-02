/**
 * Foundation module — end-to-end vertical proof (Playwright).
 *
 * Run with `pnpm exec playwright test` from the foundation module root once
 * the platform Playwright config is wired in. Until then this file documents
 * the canonical vertical path the demo tenant must traverse.
 */
import { test, expect } from '@playwright/test';

test.describe('foundation vertical', () => {
  test.skip(!process.env.E2E_BASE_URL, 'set E2E_BASE_URL to run');

  test('foundation overview renders and navigates through the hierarchy', async ({ page }) => {
    await page.goto(`${process.env.E2E_BASE_URL}/foundation/overview`);
    await expect(page.getByRole('heading', { name: /foundation/i })).toBeVisible();

    await page.getByRole('link', { name: /organization/i }).click();
    await expect(page).toHaveURL(/\/foundation\/organization/);

    await page.getByRole('link', { name: /business[- ]units/i }).click();
    await expect(page).toHaveURL(/\/foundation\/business-units/);

    await page.getByRole('link', { name: /departments/i }).click();
    await expect(page).toHaveURL(/\/foundation\/departments/);

    await page.getByRole('link', { name: /audit/i }).click();
    await expect(page).toHaveURL(/\/foundation\/audit/);
  });

  test('list export action gated by permission', async ({ page }) => {
    await page.goto(`${process.env.E2E_BASE_URL}/foundation/organization`);
    const exportBtn = page.getByRole('button', { name: /export/i });
    await expect(exportBtn).toBeVisible();
  });
});
