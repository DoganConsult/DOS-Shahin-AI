/**
 * Unit tests for the shared createPremiumTooltip helper.
 * Validates that all D3 chart tooltips use consistent premium glass styling
 * via the shared helper from theme-bridge.ts.
 *
 * Since we run without a DOM environment, we verify by parsing the source
 * to confirm the helper applies the required glass styling properties,
 * and that all chart components use the shared helper.
 *
 * Validates: Requirements 3.4
 */
import { describe, it, expect } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';

const chartsDir = path.resolve(__dirname);
const themeBridgeSrc = fs.readFileSync(path.join(chartsDir, 'theme-bridge.ts'), 'utf-8');

describe('createPremiumTooltip shared helper', () => {
  it('should be exported from theme-bridge.ts', () => {
    expect(themeBridgeSrc).toContain('export function createPremiumTooltip');
  });

  it('should apply backdrop-filter: blur(12px)', () => {
    expect(themeBridgeSrc).toContain("'backdrop-filter', 'blur(12px)'");
  });

  it('should apply -webkit-backdrop-filter: blur(12px)', () => {
    expect(themeBridgeSrc).toContain("'-webkit-backdrop-filter', 'blur(12px)'");
  });

  it('should apply glass border using theme.glassIconBorder', () => {
    expect(themeBridgeSrc).toMatch(/\.style\('border'.*glassIconBorder/);
  });

  it('should apply premium box-shadow', () => {
    expect(themeBridgeSrc).toMatch(/\.style\('box-shadow'.*rgba\(0,0,0/);
  });

  it('should use theme.tooltipBg for background', () => {
    expect(themeBridgeSrc).toMatch(/\.style\('background',\s*theme\.tooltipBg\)/);
  });

  it('should use theme.tooltipText for color', () => {
    expect(themeBridgeSrc).toMatch(/\.style\('color',\s*theme\.tooltipText\)/);
  });

  it('should use theme.radiusSm for border-radius', () => {
    expect(themeBridgeSrc).toMatch(/\.style\('border-radius',\s*theme\.radiusSm\)/);
  });

  it('should use theme.fontBold for font-weight', () => {
    expect(themeBridgeSrc).toMatch(/\.style\('font-weight',\s*theme\.fontBold\)/);
  });

  it('should set font-size to 12px', () => {
    expect(themeBridgeSrc).toContain("'font-size', '12px'");
  });

  it('should set padding to 6px 12px', () => {
    expect(themeBridgeSrc).toContain("'padding', '6px 12px'");
  });

  it('should start hidden with opacity 0', () => {
    expect(themeBridgeSrc).toContain("'opacity', '0'");
  });

  it('should have pointer-events: none', () => {
    expect(themeBridgeSrc).toContain("'pointer-events', 'none'");
  });
});

describe('All chart components use shared createPremiumTooltip', () => {
  const chartFiles = [
    'gauge-chart.component.ts',
    'sparkline-chart.component.ts',
    'animated-donut-chart.component.ts',
    'animated-bar-chart.component.ts',
    'radar-chart.component.ts',
    'risk-heatmap-chart.component.ts',
    'progress-ring-chart.component.ts',
  ];

  chartFiles.forEach((file) => {
    it(`${file} should import createPremiumTooltip from theme-bridge`, () => {
      const src = fs.readFileSync(path.join(chartsDir, file), 'utf-8');
      expect(src).toContain('createPremiumTooltip');
      expect(src).toMatch(/import\s*\{[^}]*createPremiumTooltip[^}]*\}\s*from\s*'\.\/theme-bridge'/);
    });

    it(`${file} should call createPremiumTooltip (not inline tooltip creation)`, () => {
      const src = fs.readFileSync(path.join(chartsDir, file), 'utf-8');
      expect(src).toContain('createPremiumTooltip(');
    });

    it(`${file} should not have inline tooltip styling with hardcoded backdrop-filter`, () => {
      const src = fs.readFileSync(path.join(chartsDir, file), 'utf-8');
      // The only backdrop-filter references should be in the import, not inline
      // Count occurrences of backdrop-filter in the file
      const matches = src.match(/backdrop-filter/g) || [];
      // Chart files should NOT have inline backdrop-filter styling
      // (only the theme-bridge helper should have it)
      expect(matches.length).toBe(0);
    });
  });
});
