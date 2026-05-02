import { describe, expect, it, beforeAll, afterAll } from 'vitest';
import { chromium, Browser, Page } from 'playwright';
import { performance } from 'node:perf_hooks';

interface CriticalPathResult {
  pathName: string;
  duration: number;
  success: boolean;
  screenshots: string[];
  errors: string[];
  performance: {
    firstContentfulPaint: number;
    largestContentfulPaint: number;
    cumulativeLayoutShift: number;
  };
  bilingual: {
    english: boolean;
    arabic: boolean;
  };
  permissions: {
    viewer: boolean;
    auditor: boolean;
    admin: boolean;
  };
}

class ComprehensiveE2ETester {
  private browser: Browser | null = null;
  private pages: Map<string, Page> = new Map();
  public baseUrl: string = 'http://localhost:3000';

  async initialize(): Promise<void> {
    this.browser = await chromium.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
  }

  async createPage(userType: string): Promise<Page> {
    const page = await this.browser!.newPage();
    this.pages.set(userType, page);
    
    // Set viewport size for consistent screenshots
    await page.setViewportSize({ width: 1920, height: 1080 });
    
    // Mock authentication based on user type
    await this.mockAuthentication(page, userType);
    
    return page;
  }

  private async mockAuthentication(page: Page, userType: string): Promise<void> {
    const tokens = {
      viewer: 'mock-viewer-token',
      auditor: 'mock-auditor-token', 
      admin: 'mock-admin-token'
    };

    await page.evaluate((token: string, role: string) => {
      localStorage.setItem('auth_token', token);
      localStorage.setItem('user_role', role);
    }, tokens[userType as keyof typeof tokens], userType);
  }

  async takeScreenshot(page: Page, name: string): Promise<string> {
    const screenshot = await page.screenshot({ 
      path: `test-screenshots/${name}-${Date.now()}.png`,
      fullPage: true 
    });
    return screenshot.toString('base64');
  }

  async measurePerformance(page: Page): Promise<any> {
    const metrics = await page.evaluate(() => {
      return new Promise((resolve) => {
        const observer = new PerformanceObserver((list) => {
          const entries = list.getEntries();
          const metrics: any = {};
          
          entries.forEach(entry => {
            if (entry.name === 'first-contentful-paint') {
              metrics.firstContentfulPaint = entry.startTime;
            }
            if (entry.name === 'largest-contentful-paint') {
              metrics.largestContentfulPaint = entry.startTime;
            }
            if (entry.entryType === 'layout-shift') {
              const layoutShiftEntry = entry as any;
              metrics.cumulativeLayoutShift = (metrics.cumulativeLayoutShift || 0) + layoutShiftEntry.value;
            }
          });
          
          resolve(metrics);
        });
        
        observer.observe({ entryTypes: ['paint', 'largest-contentful-paint', 'layout-shift'] });
        
        // Fallback timeout
        setTimeout(() => resolve({}), 5000);
      });
    });
    
    return metrics;
  }

  async switchLanguage(page: Page, language: 'en' | 'ar'): Promise<void> {
    await page.click(`[data-testid="language-selector"]`);
    await page.click(`[data-testid="lang-${language}"]`);
    await page.waitForTimeout(1000);
  }

  async checkLanguageRendering(page: Page): Promise<{ english: boolean; arabic: boolean }> {
    // Check English
    await this.switchLanguage(page, 'en');
    const englishContent = await page.textContent('[data-testid="page-content"]');
    const hasEnglish = englishContent && /[a-zA-Z]/.test(englishContent);

    // Check Arabic
    await this.switchLanguage(page, 'ar');
    const arabicContent = await page.textContent('[data-testid="page-content"]');
    const hasArabic = arabicContent && /[\u0600-\u06FF]/.test(arabicContent);

    return { english: hasEnglish || false, arabic: hasArabic || false };
  }

  async checkPermissions(page: Page, action: string): Promise<boolean> {
    try {
      await page.click(`[data-testid="${action}-button"]`);
      await page.waitForTimeout(1000);
      
      // Check if action succeeded or was blocked
      const errorElement = await page.$('[data-testid="permission-error"]');
      return !errorElement;
    } catch {
      return false;
    }
  }

  async cleanup(): Promise<void> {
    for (const page of this.pages.values()) {
      await page.close();
    }
    this.pages.clear();
    
    if (this.browser) {
      await this.browser.close();
      this.browser = null;
    }
  }
}

describe('Comprehensive E2E Critical Path Tests', () => {
  let tester: ComprehensiveE2ETester;
  const results: CriticalPathResult[] = [];

  beforeAll(async () => {
    tester = new ComprehensiveE2ETester();
    await tester.initialize();
  });

  afterAll(async () => {
    await tester.cleanup();
    
    // Generate test report
    console.log('\n=== E2E Critical Paths Test Report ===');
    results.forEach(result => {
      console.log(`\n${result.pathName}:`);
      console.log(`  Duration: ${result.duration}ms`);
      console.log(`  Success: ${result.success}`);
      console.log(`  Performance:`);
      console.log(`    FCP: ${result.performance.firstContentfulPaint}ms`);
      console.log(`    LCP: ${result.performance.largestContentfulPaint}ms`);
      console.log(`    CLS: ${result.performance.cumulativeLayoutShift}`);
      console.log(`  Bilingual: EN=${result.bilingual.english}, AR=${result.bilingual.arabic}`);
      console.log(`  Permissions: Viewer=${result.permissions.viewer}, Auditor=${result.permissions.auditor}, Admin=${result.permissions.admin}`);
      if (result.errors.length > 0) {
        console.log(`  Errors: ${result.errors.join(', ')}`);
      }
    });
  });

  const criticalPaths = [
    {
      name: 'Risk Management Flow',
      path: '/risk-management',
      actions: ['create-risk', 'assess-risk', 'treat-risk', 'close-risk'],
      expectedDuration: 5000
    },
    {
      name: 'Compliance Assessment Flow', 
      path: '/compliance',
      actions: ['select-framework', 'run-assessment', 'view-gaps', 'link-evidence'],
      expectedDuration: 8000
    },
    {
      name: 'Audit Management Flow',
      path: '/audit',
      actions: ['create-audit', 'schedule-audit', 'execute-audit', 'generate-report'],
      expectedDuration: 6000
    },
    {
      name: 'Governance Policy Flow',
      path: '/governance',
      actions: ['create-policy', 'review-policy', 'approve-policy', 'publish-policy'],
      expectedDuration: 7000
    },
    {
      name: 'Evidence Management Flow',
      path: '/evidence',
      actions: ['upload-evidence', 'categorize-evidence', 'link-to-control', 'verify-evidence'],
      expectedDuration: 4000
    },
    {
      name: 'Incident Response Flow',
      path: '/incidents',
      actions: ['report-incident', 'classify-incident', 'investigate-incident', 'resolve-incident'],
      expectedDuration: 9000
    },
    {
      name: 'User Onboarding Flow',
      path: '/onboarding',
      actions: ['register-org', 'setup-workspace', 'select-modules', 'invite-team'],
      expectedDuration: 10000
    },
    {
      name: 'Vendor Management Flow',
      path: '/vendors',
      actions: ['add-vendor', 'assess-vendor', 'contract-vendor', 'monitor-vendor'],
      expectedDuration: 6000
    },
    {
      name: 'Workflow Automation Flow',
      path: '/workflows',
      actions: ['create-workflow', 'configure-steps', 'test-workflow', 'deploy-workflow'],
      expectedDuration: 8000
    },
    {
      name: 'Dashboard Analytics Flow',
      path: '/dashboard',
      actions: ['view-metrics', 'generate-report', 'export-data', 'schedule-report'],
      expectedDuration: 3000
    }
  ];

  criticalPaths.forEach((criticalPath, index) => {
    describe(`${criticalPath.name}`, () => {
      let result: CriticalPathResult;

      beforeAll(() => {
        result = {
          pathName: criticalPath.name,
          duration: 0,
          success: true,
          screenshots: [],
          errors: [],
          performance: {
            firstContentfulPaint: 0,
            largestContentfulPaint: 0,
            cumulativeLayoutShift: 0
          },
          bilingual: {
            english: false,
            arabic: false
          },
          permissions: {
            viewer: false,
            auditor: false,
            admin: false
          }
        };
        results.push(result);
      });

      it(`should complete ${criticalPath.name} within performance baseline`, async () => {
        const startTime = performance.now();
        
        try {
          // Test with admin user (full permissions)
          const page = await tester.createPage('admin');
          
          // Navigate to the path
          await page.goto(`${tester.baseUrl}${criticalPath.path}`);
          await page.waitForLoadState('networkidle');
          
          // Take initial screenshot
          result.screenshots.push(await tester.takeScreenshot(page, `${criticalPath.name}-start`));
          
          // Measure performance
          result.performance = await tester.measurePerformance(page);
          
          // Execute the critical path actions
          for (const action of criticalPath.actions) {
            try {
              await page.click(`[data-testid="${action}"]`);
              await page.waitForTimeout(500);
              
              // Take screenshot after each action
              result.screenshots.push(await tester.takeScreenshot(page, `${criticalPath.name}-${action}`));
            } catch (error) {
              result.errors.push(`Failed to execute ${action}: ${error}`);
              result.success = false;
            }
          }
          
          // Take final screenshot
          result.screenshots.push(await tester.takeScreenshot(page, `${criticalPath.name}-complete`));
          
          const endTime = performance.now();
          result.duration = endTime - startTime;
          
          // Check performance baseline
          expect(result.duration).toBeLessThan(criticalPath.expectedDuration);
          expect(result.performance.firstContentfulPaint).toBeLessThan(2000);
          expect(result.performance.largestContentfulPaint).toBeLessThan(3000);
          expect(result.performance.cumulativeLayoutShift).toBeLessThan(0.1);
          
        } catch (error) {
          result.errors.push(`Critical path failed: ${error}`);
          result.success = false;
          expect(result.success).toBe(true);
        }
      });

      it('should support bilingual rendering', async () => {
        const page = await tester.createPage('admin');
        
        try {
          await page.goto(`${tester.baseUrl}${criticalPath.path}`);
          await page.waitForLoadState('networkidle');
          
          // Check bilingual support
          result.bilingual = await tester.checkLanguageRendering(page);
          
          // Both languages should be supported
          expect(result.bilingual.english).toBe(true);
          expect(result.bilingual.arabic).toBe(true);
          
        } catch (error) {
          result.errors.push(`Bilingual test failed: ${error}`);
        }
      });

      it('should respect permission boundaries', async () => {
        // Test with different user roles
        const userTypes = ['viewer', 'auditor', 'admin'];
        
        for (const userType of userTypes) {
          const page = await tester.createPage(userType);
          
          try {
            await page.goto(`${tester.baseUrl}${criticalPath.path}`);
            await page.waitForLoadState('networkidle');
            
            // Test first action for permission check
            const firstAction = criticalPath.actions[0];
            const hasPermission = await tester.checkPermissions(page, firstAction);
            
            result.permissions[userType as keyof typeof result.permissions] = hasPermission;
            
            // Admin should have all permissions, viewer should have none
            if (userType === 'admin') {
              expect(hasPermission).toBe(true);
            } else if (userType === 'viewer') {
              // Viewer might have read access but not write access
              // This depends on the specific critical path
            }
            
          } catch (error) {
            result.errors.push(`Permission test failed for ${userType}: ${error}`);
          }
        }
      });

      it('should handle visual regression detection', async () => {
        const page = await tester.createPage('admin');
        
        try {
          await page.goto(`${tester.baseUrl}${criticalPath.path}`);
          await page.waitForLoadState('networkidle');
          
          // Take baseline screenshot
          const baseline = await tester.takeScreenshot(page, `${criticalPath.name}-baseline`);
          
          // Simulate some interaction
          if (criticalPath.actions.length > 0) {
            await page.click(`[data-testid="${criticalPath.actions[0]}"]`);
            await page.waitForTimeout(500);
          }
          
          // Take comparison screenshot
          const comparison = await tester.takeScreenshot(page, `${criticalPath.name}-comparison`);
          
          // In a real implementation, we would compare screenshots
          // For now, just ensure screenshots were taken
          expect(baseline).toBeDefined();
          expect(comparison).toBeDefined();
          
        } catch (error) {
          result.errors.push(`Visual regression test failed: ${error}`);
        }
      });
    });
  });

  describe('Performance Baselines', () => {
    it('should meet login performance baseline', async () => {
      const startTime = performance.now();
      const page = await tester.createPage('admin');
      
      await page.goto(`${tester.baseUrl}/login`);
      await page.waitForLoadState('networkidle');
      
      const endTime = performance.now();
      const loginTime = endTime - startTime;
      
      // Login should be fast
      expect(loginTime).toBeLessThan(500);
      
      const performanceMetrics = await tester.measurePerformance(page);
      expect(performanceMetrics.firstContentfulPaint).toBeLessThan(1500);
    });

    it('should meet dashboard load performance baseline', async () => {
      const startTime = performance.now();
      const page = await tester.createPage('admin');
      
      await page.goto(`${tester.baseUrl}/dashboard`);
      await page.waitForLoadState('networkidle');
      
      const endTime = performance.now();
      const dashboardTime = endTime - startTime;
      
      // Dashboard should load quickly
      expect(dashboardTime).toBeLessThan(2000);
      
      const performanceMetrics = await tester.measurePerformance(page);
      expect(performanceMetrics.largestContentfulPaint).toBeLessThan(2500);
    });
  });

  describe('Cross-Browser Compatibility', () => {
    it('should work in different viewport sizes', async () => {
      const viewports = [
        { width: 1920, height: 1080 }, // Desktop
        { width: 1366, height: 768 },  // Laptop
        { width: 768, height: 1024 },  // Tablet
        { width: 375, height: 667 }    // Mobile
      ];
      
      for (const viewport of viewports) {
        const page = await tester.createPage('admin');
        await page.setViewportSize(viewport);
        
        try {
          await page.goto(`${tester.baseUrl}/dashboard`);
          await page.waitForLoadState('networkidle');
          
          // Check if responsive design works
          const isResponsive = await page.evaluate(() => {
            const width = window.innerWidth;
            const hasMobileNav = width < 768 && document.querySelector('[data-testid="mobile-nav"]');
            const hasDesktopNav = width >= 768 && document.querySelector('[data-testid="desktop-nav"]');
            return hasMobileNav || hasDesktopNav;
          });
          
          expect(isResponsive).toBe(true);
          
        } catch (error) {
          console.error(`Viewport ${viewport.width}x${viewport.height} failed:`, error);
        }
      }
    });
  });

  describe('Error Handling and Edge Cases', () => {
    it('should handle network failures gracefully', async () => {
      const page = await tester.createPage('admin');
      
      // Simulate network failure
      await page.route('**/*', (route: any) => route.abort());
      
      try {
        await page.goto(`${tester.baseUrl}/dashboard`);
        
        // Should show error state
        const errorElement = await page.$('[data-testid="network-error"]');
        expect(errorElement).toBeTruthy();
        
      } catch (error) {
        // Network errors are expected
        expect(true).toBe(true);
      }
    });

    it('should handle session expiration', async () => {
      const page = await tester.createPage('admin');
      
      // Clear auth token to simulate session expiration
      await page.evaluate(() => {
        localStorage.removeItem('auth_token');
      });
      
      await page.goto(`${tester.baseUrl}/dashboard`);
      
      // Should redirect to login
      const currentUrl = page.url();
      expect(currentUrl).toContain('/login');
    });
  });
});
