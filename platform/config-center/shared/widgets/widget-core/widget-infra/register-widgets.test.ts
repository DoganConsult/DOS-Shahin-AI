import { describe, it, expect, beforeAll } from 'vitest';
import { WidgetRegistryService } from './core/services/widget-registry.service';
import { ALL_WIDGET_MANIFESTS, LEGACY_ID_MAP } from '../catalog';
import { WidgetManifest } from '../core/models/widget-manifest.model';

/**
 * Unit tests for widget registrations (manifest-based).
 *
 * Validates:
 *  - All 19 new ECharts widget IDs are present (Req 13.1)
 *  - Total widget count ≥ 65 (Req 13.5)
 *  - Specific widget categories and sizes match design spec
 */

let registry: WidgetRegistryService;

beforeAll(() => {
  registry = new WidgetRegistryService();
  registry.registerMany(ALL_WIDGET_MANIFESTS);
  for (const [legacyId, dottedId] of Object.entries(LEGACY_ID_MAP)) {
    registry.registerLegacyId(legacyId, dottedId);
  }
});

const NEW_ECHART_IDS = [
  'risk-heatmap-echart',
  'audit-readiness-gauge',
  'evidence-locker',
  'framework-radar',
  'control-progress',
  'red-team-board',
  'framework-compliance',
  'comment-activity',
  'ai-insights-echart',
  'maturity-radar-echart',
  'vendor-bubble-echart',
  'trend-line-echart',
  'top-risks-echart',
  'kpi-card-echart',
  'findings-bar-echart',
  'evidence-donut-echart',
  'compliance-gauge-echart',
  'sparkline-echart',
  'risk-heatmap',
];

describe('register-widgets — ECharts widget registrations', () => {
  it('all 19 ECharts widget IDs are present (via legacy ID lookup)', () => {
    for (const id of NEW_ECHART_IDS) {
      expect(registry.has(id)).toBe(true);
    }
  });

  it('total widget count is at least 65', () => {
    expect(registry.list().length).toBeGreaterThanOrEqual(65);
  });

  it('no duplicate widget IDs', () => {
    const allIds = registry.list().map(w => w.id);
    expect(allIds.length).toBe(new Set(allIds).size);
  });

  it('risk-heatmap-echart resolves and has category risk', () => {
    const w = registry.get('risk-heatmap-echart');
    expect(w).not.toBeNull();
    expect(w!.category).toBe('risk');
  });

  it('all widgets have valid categories', () => {
    const validCategories = [
      'executive', 'governance', 'risk', 'compliance', 'audit', 'evidence',
      'incidents', 'vendors', 'bcp', 'assets', 'workflow', 'reporting', 'platform', 'ai',
    ];
    for (const w of registry.list()) {
      expect(validCategories).toContain(w.category);
    }
  });

  it('all widgets have defaultSize.cols between 1 and 12', () => {
    for (const w of registry.list()) {
      expect(w.defaultSize.cols).toBeGreaterThanOrEqual(1);
      expect(w.defaultSize.cols).toBeLessThanOrEqual(12);
    }
  });

  it('all widgets have defaultSize.rows between 1 and 6', () => {
    for (const w of registry.list()) {
      expect(w.defaultSize.rows).toBeGreaterThanOrEqual(1);
      expect(w.defaultSize.rows).toBeLessThanOrEqual(6);
    }
  });
});
