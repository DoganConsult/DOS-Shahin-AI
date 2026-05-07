import { test, expect } from '@playwright/test';

const MOBILE_VIEWPORTS = [
  { width: 375, height: 667 },  // iPhone SE
  { width: 390, height: 844 },  // iPhone 12
  { width: 414, height: 896 },  // iPhone Max
  { width: 360, height: 640 },  // Android small
  { width: 412, height: 915 },  // Android large
];

test.describe('Mobile Viewport Tests', () => {
  for (const viewport of MOBILE_VIEWPORTS) {
    test.describe(`Viewport ${viewport.width}x${viewport.height}`, () => {
      test.beforeEach(async ({ page }) => {
        await page.setViewportSize(viewport);
      });

      test('should load mobile shell on mobile viewport', async ({ page }) => {
        await page.goto('/workspace');
        
        // Check for mobile shell presence
        const mobileShell = page.locator('dos-mobile-shell');
        await expect(mobileShell).toBeVisible();
      });

      test('should display mobile bottom navigation', async ({ page }) => {
        await page.goto('/workspace');
        
        const bottomNav = page.locator('.dos-bottom-nav');
        await expect(bottomNav).toBeVisible();
        
        // Verify touch targets are at least 44px
        const navItems = bottomNav.locator('.dos-bottom-nav__item');
        const count = await navItems.count();
        
        for (let i = 0; i < count; i++) {
          const item = navItems.nth(i);
          const height = await item.evaluate(el => (el as HTMLElement).offsetHeight);
          expect(height).toBeGreaterThanOrEqual(44);
        }
      });

      test('should use mobile layout for data tables', async ({ page }) => {
        await page.goto('/foundation/users');
        
        // Check for stacked rows on mobile
        const table = page.locator('.dos-mobile-table-wrapper');
        await expect(table).toBeVisible();
      });
    });
  }
});
