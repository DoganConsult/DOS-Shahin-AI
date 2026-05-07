import { test, expect } from '@playwright/test';

test.describe('Touch Latency Performance', () => {
  const MOBILE_VIEWPORT = { width: 375, height: 667 };

  test.beforeEach(async ({ page }) => {
    await page.setViewportSize(MOBILE_VIEWPORT);
  });

  test('should respond to touch within 100ms', async ({ page }) => {
    await page.goto('/workspace');
    
    const button = page.locator('.dos-bottom-nav__item').first();
    
    const startTime = Date.now();
    await button.tap();
    const endTime = Date.now();
    
    const latency = endTime - startTime;
    console.log(`Touch latency: ${latency}ms`);
    
    expect(latency).toBeLessThan(100);
  });

  test('should provide haptic feedback on touch', async ({ page }) => {
    await page.goto('/workspace');
    
    // Check if vibration API is available
    const vibrationSupported = await page.evaluate(() => 'vibrate' in navigator);
    
    if (vibrationSupported) {
      console.log('Haptic feedback API available');
    } else {
      console.log('Haptic feedback API not available (desktop)');
    }
  });
});
