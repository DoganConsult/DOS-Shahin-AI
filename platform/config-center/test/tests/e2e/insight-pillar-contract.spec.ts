/**
 * Insight Pillar Contract — W12.5
 * Validates that the 5-pillar insight bar exposes all required slots
 * (whatChanged · whyItMatters · riskOrOpportunity · nextAction · evidence)
 * on a representative archetype landing.
 */
import { test, expect } from '@playwright/test';

test('dos-insight-bar surfaces 5-pillar slots', async ({ page }) => {
  await page.goto('/admin/dauth', { waitUntil: 'domcontentloaded' });
  const bar = page.locator('dos-insight-bar');
  await expect(bar).toBeVisible();
  // Each pillar exposes a stable data-pillar attribute on its <li>/<section>.
  for (const pillar of ['what-changed','why-it-matters','risk','next-action','evidence']) {
    await expect(
      bar.locator(`[data-pillar="${pillar}"]`),
      `pillar ${pillar} should be present`,
    ).toHaveCount(1);
  }
});
