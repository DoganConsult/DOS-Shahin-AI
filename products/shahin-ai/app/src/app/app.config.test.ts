import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { resolve } from 'path';

describe('appConfig — PrimeNG theme integration', () => {
  const src = readFileSync(resolve(__dirname, 'app.config.ts'), 'utf-8');

  it('should import providePrimeNG from primeng/config', () => {
    expect(src).toContain("providePrimeNG");
    expect(src).toMatch(/import\s*\{[^}]*providePrimeNG[^}]*\}\s*from\s*['"]primeng\/config['"]/);
  });

  it('should import Aura preset from @primeng/themes/aura', () => {
    expect(src).toMatch(/import\s+Aura\s+from\s*['"]@primeng\/themes\/aura['"]/);
  });

  it('should call providePrimeNG with Aura theme preset in providers', () => {
    expect(src).toMatch(/providePrimeNG\(\s*\{[^)]*preset:\s*Aura/);
  });

  it('should configure darkModeSelector matching project convention', () => {
    expect(src).toContain('darkModeSelector');
    expect(src).toContain('[data-theme="dark"]');
  });

  it('should still configure PrimeNG locale via APP_INITIALIZER', () => {
    expect(src).toContain('initPrimeNGLocale');
    expect(src).toContain('PRIMENG_LOCALE_AR');
    expect(src).toContain('PRIMENG_LOCALE_EN');
  });

  it('should not import legacy CSS theme from primeng/resources', () => {
    expect(src).not.toContain('primeng/resources');
    expect(src).not.toContain('primeng.min.css');
  });
});

describe('angular.json — PrimeNG style entries', () => {
  const angularJson = readFileSync(resolve(__dirname, '../../angular.json'), 'utf-8');

  it('should include Carbon icons CSS', () => {
    expect(angularJson).toContain('@carbon/icons');
  });

  it('should include primeng-overrides.css', () => {
    expect(angularJson).toContain('primeng-overrides.css');
  });

  it('should not reference legacy primeng/resources theme CSS', () => {
    expect(angularJson).not.toContain('primeng/resources');
    expect(angularJson).not.toContain('primeng.min.css');
  });
});

describe('primeng-overrides.css — dark mode token mapping', () => {
  const overrides = readFileSync(resolve(__dirname, '../styles/primeng-overrides.css'), 'utf-8');

  it('should define --p-primary-color CSS variable', () => {
    expect(overrides).toContain('--p-primary-color');
  });

  it('should define --p-surface-0 CSS variable', () => {
    expect(overrides).toContain('--p-surface-0');
  });

  it('should define --p-text-color CSS variable', () => {
    expect(overrides).toContain('--p-text-color');
  });

  it('should include dark theme overrides for gray-90 and gray-100', () => {
    expect(overrides).toContain('[data-theme="gray-90"]');
    expect(overrides).toContain('[data-theme="gray-100"]');
  });
});
