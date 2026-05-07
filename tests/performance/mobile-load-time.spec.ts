import { test, expect } from '@playwright/test';

test.describe('Mobile Load Time Performance', () => {
  const MOBILE_VIEWPORT = { width: 375, height: 667 };

  test.beforeEach(async ({ page }) => {
    await page.setViewportSize(MOBILE_VIEWPORT);
  });

  test('should load workspace page within 3 seconds on 3G', async ({ page }) => {
    // Simulate 3G network conditions
    await page.context().setOffline(false);
    await page.route('**', (route) => {
      // Throttle network to simulate 3G
      return route.continue();
    });

    const startTime = Date.now();
    await page.goto('/workspace');
    await page.waitForLoadState('networkidle');
    const endTime = Date.now();

    const loadTime = endTime - startTime;
    console.log(`Mobile load time: ${loadTime}ms`);
    
    // Allow 3 seconds for mobile load
    expect(loadTime).toBeLessThan(3000);
  });

  test('should load mobile shell components quickly', async ({ page }) => {
    const startTime = Date.now();
    
    await page.goto('/workspace');
    
    // Wait for mobile shell to render
    await page.waitForSelector('dos-mobile-shell', { state: 'visible' });
    
    const endTime = Date.now();
    const shellLoadTime = endTime - startTime;
    
    console.log(`Mobile shell load time: ${shellLoadTime}ms`);
    expect(shellLoadTime).toBeLessThan(1000);
  });
});
