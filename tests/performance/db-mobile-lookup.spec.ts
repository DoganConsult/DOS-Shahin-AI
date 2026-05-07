import { test, expect } from '@playwright/test';

test.describe('DB Mobile Lookup Performance', () => {
  test('should load mobile breakpoint config within 50ms', async ({ page, request }) => {
    const startTime = Date.now();
    
    const response = await request.get('/api/ui-os/mobile-breakpoint-config');
    const endTime = Date.now();
    
    const latency = endTime - startTime;
    console.log(`Mobile breakpoint config lookup: ${latency}ms`);
    
    expect(response.ok()).toBeTruthy();
    expect(latency).toBeLessThan(50);
  });

  test('should load mobile component variants within 50ms', async ({ page, request }) => {
    const startTime = Date.now();
    
    const response = await request.get('/api/ui-os/mobile-component-variants');
    const endTime = Date.now();
    
    const latency = endTime - startTime;
    console.log(`Mobile component variants lookup: ${latency}ms`);
    
    expect(response.ok()).toBeTruthy();
    expect(latency).toBeLessThan(50);
  });

  test('should load mobile touch gestures within 50ms', async ({ page, request }) => {
    const startTime = Date.now();
    
    const response = await request.get('/api/ui-os/mobile-touch-gestures');
    const endTime = Date.now();
    
    const latency = endTime - startTime;
    console.log(`Mobile touch gestures lookup: ${latency}ms`);
    
    expect(response.ok()).toBeTruthy();
    expect(latency).toBeLessThan(50);
  });

  test('should load complete mobile runtime within 200ms', async ({ page, request }) => {
    const startTime = Date.now();
    
    const response = await request.get('/api/ui-os/workspace-runtime');
    const endTime = Date.now();
    
    const latency = endTime - startTime;
    console.log(`Complete mobile runtime load: ${latency}ms`);
    
    expect(response.ok()).toBeTruthy();
    expect(latency).toBeLessThan(200);
  });
});
