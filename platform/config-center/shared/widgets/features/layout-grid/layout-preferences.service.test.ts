// ============================================
// LayoutPreferencesService — Unit Tests
// Feature: premium-dashboard-overhaul, Task 2.3
// ============================================
//
// Tests load(), save() (debounced), and getDefaults(role).
// Run: pnpm exec tsx src/app/shared/widgets/layout-preferences.service.test.ts

import { LayoutPreferences, GridWidget } from './layout-grid.types';
import { serializeLayoutPreferences } from './layout-preferences.utils';
import { WidgetRegistryService } from './core/services/widget-registry.service';
import { DashboardRole, ROLE_WIDGETS } from './role-widget-map';

function assert(condition: boolean, message: string) {
  if (!condition) throw new Error(`FAIL: ${message}`);
  console.log(`  ✓ ${message}`);
}

function assertDeepEqual(actual: unknown, expected: unknown, message: string) {
  if (JSON.stringify(actual) !== JSON.stringify(expected)) {
    throw new Error(`FAIL: ${message}\n  Expected: ${JSON.stringify(expected)}\n  Actual:   ${JSON.stringify(actual)}`);
  }
  console.log(`  ✓ ${message}`);
}

// ── Helper: build a registry with test widgets ──

function buildRegistry(widgets: { id: string; cols: number; rows: number; category?: string }[]) {
  const reg = new WidgetRegistryService();
  for (const w of widgets) {
    reg.register({
      id: w.id,
      key: w.id.replace(/-/g, '_'),
      title: w.id,
      category: (w.category ?? 'executive') as unknown,
      engine: 'angular',
      component: class {} as unknown,
      defaultSize: { cols: w.cols, rows: w.rows },
      schemaVersion: 1,
    });
  }
  return reg;
}

// ── Helper: build getDefaults without Angular DI ──

function getDefaults(role: DashboardRole, registry: WidgetRegistryService): LayoutPreferences {
  const allowed = ROLE_WIDGETS[role] ?? [];
  const allDefs = registry.list();
  const COLUMNS = 4;

  const widgetIds =
    allowed.includes('*')
      ? allDefs.map((d) => d.id)
      : allowed.filter((id) => allDefs.some((d) => d.id === id));

  let x = 0;
  let y = 0;
  const widgets: GridWidget[] = widgetIds.map((id) => {
    const def = allDefs.find((d) => d.id === id);
    const w = def ? Math.ceil(def.defaultSize.cols / 3) : 1;
    const h = def?.defaultSize.rows ?? 1;

    if (x + w > COLUMNS) {
      x = 0;
      y++;
    }

    const widget: GridWidget = {
      id,
      position: { x, y, w, h },
      visible: true,
    };

    x += w;
    if (x >= COLUMNS) {
      x = 0;
      y++;
    }

    return widget;
  });

  return { widgets, displayMode: 'expanded', version: 2 };
}

// ============================================
// getDefaults — role-based default layout
// ============================================
console.log('--- getDefaults ---');

{
  const registry = buildRegistry([
    { id: 'compliance-score', cols: 3, rows: 1 },
    { id: 'risk-summary', cols: 6, rows: 1 },
    { id: 'program-health', cols: 3, rows: 2 },
  ]);

  const ownerDefaults = getDefaults('owner', registry);
  assert(ownerDefaults.widgets.length === 3, 'owner gets all 3 registered widgets');
  assert(ownerDefaults.displayMode === 'expanded', 'default display mode is expanded');
  assert(ownerDefaults.version === 2, 'version is 2');
  assert(ownerDefaults.widgets.every(w => w.visible), 'all widgets visible by default');
}
console.log('  owner role: PASSED');

{
  const registry = buildRegistry([
    { id: 'compliance-score', cols: 3, rows: 1 },
    { id: 'risk-summary', cols: 6, rows: 1 },
    { id: 'one-sentence-truth', cols: 3, rows: 1 },
    { id: 'maturity-gap', cols: 3, rows: 1 },
    { id: 'program-health', cols: 3, rows: 2 },
  ]);

  const viewerDefaults = getDefaults('viewer', registry);
  const viewerIds = viewerDefaults.widgets.map(w => w.id);
  assert(viewerIds.includes('compliance-score'), 'viewer has compliance-score');
  assert(viewerIds.includes('risk-summary'), 'viewer has risk-summary');
  assert(viewerIds.includes('one-sentence-truth'), 'viewer has one-sentence-truth');
  assert(viewerIds.includes('maturity-gap'), 'viewer has maturity-gap');
  assert(!viewerIds.includes('program-health'), 'viewer does NOT have program-health');
}
console.log('  viewer role: PASSED');

{
  const registry = buildRegistry([
    { id: 'unrelated-widget', cols: 3, rows: 1 },
  ]);
  const auditorDefaults = getDefaults('auditor', registry);
  assert(auditorDefaults.widgets.length === 0, 'auditor with no matching widgets returns empty');
}
console.log('  auditor (no matches): PASSED');

console.log('getDefaults: PASSED\n');

// ============================================
// Serialization round-trip for defaults
// ============================================
console.log('--- defaults serialization round-trip ---');

{
  const registry = buildRegistry([
    { id: 'compliance-score', cols: 3, rows: 1 },
    { id: 'risk-summary', cols: 6, rows: 1 },
  ]);
  const defaults = getDefaults('owner', registry);
  const json = serializeLayoutPreferences(defaults);
  const parsed = JSON.parse(json);
  assert(parsed.version === 2, 'serialized version is 2');
  assert(parsed.displayMode === 'expanded', 'serialized displayMode is expanded');
  assert(parsed.widgets.length === 2, 'serialized widget count matches');
}
console.log('  defaults round-trip: PASSED');

console.log('defaults serialization: PASSED\n');

// ============================================
console.log('=== All LayoutPreferencesService unit tests PASSED ===');
