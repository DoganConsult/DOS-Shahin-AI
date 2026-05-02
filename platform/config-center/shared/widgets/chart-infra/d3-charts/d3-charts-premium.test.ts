/**
 * Unit tests for D3 chart premium rendering.
 * Validates that all chart components include the required premium visual
 * elements: gradient definitions, glow filters, corner radius values,
 * pulse endpoints, and tooltip content patterns.
 *
 * Since we run without a DOM/Angular environment, we verify by parsing
 * the component source files to confirm premium rendering elements are present.
 *
 * Validates: Requirements 3.2, 3.3, 3.4, 3.5, 3.6, 3.7, 3.8
 */
import { describe, it, expect } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';

const chartsDir = path.resolve(__dirname);

function readChart(filename: string): string {
  return fs.readFileSync(path.join(chartsDir, filename), 'utf-8');
}

// ── Gauge Chart: gradient arc + glow filter (Req 3.5) ──────────────────────

describe('Gauge chart premium rendering', () => {
  const src = readChart('gauge-chart.component.ts');

  it('should define an SVG linearGradient for the value arc', () => {
    expect(src).toContain("defs.append('linearGradient')");
    // Gradient uses primary → primaryLight stops
    expect(src).toMatch(/\.attr\('stop-color',\s*t\.primary\)/);
    expect(src).toMatch(/\.attr\('stop-color',\s*t\.primaryLight\)/);
  });

  it('should apply the gradient fill to the value arc path', () => {
    expect(src).toMatch(/\.attr\('fill',\s*`url\(#\$\{gradientId\}\)`\)/);
  });

  it('should define a feDropShadow glow filter', () => {
    expect(src).toContain("filter.append('feDropShadow')");
    expect(src).toMatch(/\.attr\('stdDeviation',\s*'3'\)/);
    expect(src).toMatch(/\.attr\('flood-color',\s*t\.primary\)/);
  });

  it('should apply the glow filter to the value arc path', () => {
    expect(src).toMatch(/\.attr\('filter',\s*`url\(#\$\{glowId\}\)`\)/);
  });

  it('should have animated number counting with easing', () => {
    expect(src).toContain('d3.interpolateRound');
    expect(src).toContain('d3.easeCubicInOut');
  });

  it('tooltip should contain data value and label', () => {
    // Tooltip html includes label and value/max with percentage
    expect(src).toMatch(/tooltip\.html\(.*label.*value.*max/s);
  });
});


// ── Sparkline Chart: pulse endpoint (Req 3.6) ──────────────────────────────

describe('Sparkline chart premium rendering', () => {
  const src = readChart('sparkline-chart.component.ts');

  it('should define an area gradient with 0.4 initial opacity', () => {
    expect(src).toContain("defs.append('linearGradient')");
    expect(src).toMatch(/\.attr\('stop-opacity',\s*0\.4\)/);
  });

  it('should define a line glow filter via feDropShadow', () => {
    expect(src).toContain("defs.append('filter')");
    expect(src).toContain("filter.append('feDropShadow')");
  });

  it('should apply glow filter to the line path', () => {
    expect(src).toMatch(/\.attr\('filter',\s*`url\(#\$\{glowId\}\)`\)/);
  });

  it('should use Catmull-Rom curve interpolation', () => {
    expect(src).toContain('d3.curveCatmullRom');
  });

  it('should render a pulse ring circle for the endpoint', () => {
    // The pulse ring is an animated expanding circle
    expect(src).toContain('pulseRing');
    expect(src).toMatch(/svg\.append\('circle'\)/);
    // Pulse ring animates radius from 3 to 8
    expect(src).toMatch(/\.attr\('r',\s*3\)/);
    expect(src).toMatch(/\.attr\('r',\s*8\)/);
  });

  it('should render a solid endpoint dot', () => {
    // Second circle append for the solid dot
    const circleAppends = src.match(/svg\.append\('circle'\)/g);
    expect(circleAppends).not.toBeNull();
    expect(circleAppends!.length).toBeGreaterThanOrEqual(2);
  });

  it('should skip pulse ring animation when reduced motion is preferred', () => {
    expect(src).toContain('prefersReducedMotion');
    expect(src).toMatch(/if\s*\(\s*!prefersReducedMotion\s*\)/);
  });

  it('tooltip should contain data value', () => {
    expect(src).toMatch(/tooltip\.html\(.*data\[clampedIdx\]/s);
  });
});

// ── Donut Chart: gradient segments (Req 3.7) ───────────────────────────────

describe('Donut chart premium rendering', () => {
  const src = readChart('animated-donut-chart.component.ts');

  it('should define per-segment SVG linearGradients', () => {
    expect(src).toContain("defs.append('linearGradient')");
    // Gradient IDs are per-segment: donut-{instId}-seg-{i}
    expect(src).toMatch(/`donut-\$\{instId\}-seg-\$\{i\}`/);
  });

  it('should use lightenColor for gradient end stop', () => {
    expect(src).toContain('this.lightenColor(seg.color)');
  });

  it('should apply gradient fill to each segment path', () => {
    expect(src).toMatch(/\.attr\('fill',\s*\(_d,\s*i\)\s*=>\s*`url\(#donut-\$\{instId\}-seg-\$\{i\}\)`\)/);
  });

  it('should have hover expansion with outerRadius + 10', () => {
    // hoverArc has outerRadius = radius + 10
    expect(src).toMatch(/\.outerRadius\(radius\s*\+\s*10\)/);
  });

  it('should apply drop-shadow filter on center value text', () => {
    expect(src).toContain("'filter', 'drop-shadow(0 1px 2px rgba(var(--color-black-rgb), 0.3))'");
  });

  it('should have animated value counting in center', () => {
    expect(src).toContain('d3.interpolateRound');
  });

  it('tooltip should contain segment label and value with percentage', () => {
    // Tooltip html includes label, value, and percentage
    expect(src).toMatch(/tooltip\.html\(.*d\.data\.label.*d\.data\.value.*pct/s);
  });
});

// ── Bar Chart: gradient bars + corner radius (Req 3.8) ─────────────────────

describe('Bar chart premium rendering', () => {
  const src = readChart('animated-bar-chart.component.ts');

  it('should define per-bar SVG linearGradients', () => {
    expect(src).toContain("defs.append('linearGradient')");
    // Gradient IDs are per-bar: bar-{instId}-{i}
    expect(src).toMatch(/`bar-\$\{instId\}-\$\{i\}`/);
  });

  it('should use lightenColor for gradient start stop', () => {
    expect(src).toContain('this.lightenColor(item.color)');
  });

  it('should apply gradient fill to bar rects', () => {
    expect(src).toMatch(/\.attr\('fill',\s*\(_d.*i.*\)\s*=>\s*`url\(#bar-\$\{instId\}-\$\{i\}\)`\)/);
  });

  it('should use rx: 6 for increased corner radius', () => {
    // Both horizontal and vertical bars use rx: 6
    const rxMatches = src.match(/\.attr\('rx',\s*6\)/g);
    expect(rxMatches).not.toBeNull();
    expect(rxMatches!.length).toBeGreaterThanOrEqual(2); // horizontal + vertical
  });

  it('should have a brightness filter for hover state', () => {
    expect(src).toContain(`bar-bright-`);
    expect(src).toContain('feComponentTransfer');
    expect(src).toMatch(/\.attr\('slope',\s*'1\.15'\)/);
  });

  it('should have hover value labels that fade in', () => {
    expect(src).toContain('bar-hover-val');
    // Labels start at opacity 0 and transition to 1 on hover
    expect(src).toMatch(/\.attr\('opacity',\s*0\)/);
    expect(src).toMatch(/\.attr\('opacity',\s*1\)/);
  });

  it('should have staggered entrance animation per bar', () => {
    expect(src).toMatch(/\.delay\(.*i\s*\*\s*barDelay/);
  });

  it('tooltip should contain bar label and value', () => {
    // Tooltip html includes d.label and d.value
    expect(src).toMatch(/tooltip\.html\(.*d\.label.*d\.value/s);
  });
});

// ── Cross-cutting: all charts use createPremiumTooltip (Req 3.4) ────────────

describe('All premium charts use glass-styled tooltips', () => {
  const chartFiles = [
    'gauge-chart.component.ts',
    'sparkline-chart.component.ts',
    'animated-donut-chart.component.ts',
    'animated-bar-chart.component.ts',
  ];

  chartFiles.forEach((file) => {
    it(`${file} should use createPremiumTooltip from theme-bridge`, () => {
      const src = readChart(file);
      expect(src).toContain('createPremiumTooltip');
      expect(src).toMatch(/import\s*\{[^}]*createPremiumTooltip[^}]*\}\s*from\s*'\.\/theme-bridge'/);
    });
  });
});

// ── Cross-cutting: reduced motion support (Req 7.6) ────────────────────────

describe('All premium charts respect reduced motion', () => {
  const chartFiles = [
    'gauge-chart.component.ts',
    'sparkline-chart.component.ts',
    'animated-donut-chart.component.ts',
    'animated-bar-chart.component.ts',
  ];

  chartFiles.forEach((file) => {
    it(`${file} should check prefers-reduced-motion`, () => {
      const src = readChart(file);
      expect(src).toContain('prefers-reduced-motion');
      expect(src).toContain('prefersReducedMotion');
    });
  });
});
