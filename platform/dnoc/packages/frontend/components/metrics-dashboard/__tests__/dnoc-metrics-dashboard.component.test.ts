import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const SRC = readFileSync(
  join(process.cwd(), 'platform/dnoc/packages/frontend/components/metrics-dashboard/dnoc-metrics-dashboard.component.ts'),
  'utf8',
);

describe('DnocMetricsDashboardComponent — file surface', () => {
  it('is a standalone Angular component with the expected selector', () => {
    expect(SRC).toMatch(/standalone:\s*true/);
    expect(SRC).toMatch(/selector:\s*['"]dnoc-metrics-dashboard['"]/);
    expect(SRC).toMatch(/export class DnocMetricsDashboardComponent/);
  });

  it('uses OnPush change detection', () => {
    expect(SRC).toMatch(/changeDetection:\s*ChangeDetectionStrategy\.OnPush/);
  });

  it('declares metricName as a required input', () => {
    expect(SRC).toMatch(/@Input\(\{\s*required:\s*true\s*\}\)\s+metricName/);
  });

  it('injects DNOC_METRICS_FEED_PORT (no direct DNOC core import)', () => {
    expect(SRC).toMatch(/inject<DNOCMetricsFeedPort>\(DNOC_METRICS_FEED_PORT\)/);
    expect(SRC).not.toMatch(/from ['"]@dos\/dnoc-core/);
  });

  it('computes min / max / avg via signals', () => {
    expect(SRC).toMatch(/readonly min = computed/);
    expect(SRC).toMatch(/readonly max = computed/);
    expect(SRC).toMatch(/readonly avg = computed/);
  });

  it('renders a pure-SVG sparkline (no chart library)', () => {
    expect(SRC).toMatch(/<svg[^>]*dnoc-metrics__sparkline/);
    expect(SRC).toMatch(/<polyline\s+\[attr\.points\]="sparklinePath\(\)"/);
    expect(SRC).not.toMatch(/chart\.js|d3|ng2-charts/i);
  });

  it('handles loading + error + empty states distinctly', () => {
    expect(SRC).toMatch(/loading\(\)/);
    expect(SRC).toMatch(/error\(\)\s+as\s+err/);
    expect(SRC).toMatch(/dnoc-metrics__empty/);
  });

  it('refresh() catches errors and surfaces them via the error signal', () => {
    expect(SRC).toMatch(/async refresh\(\)/);
    expect(SRC).toMatch(/this\.error\.set\(err instanceof Error \? err\.message/);
  });
});
