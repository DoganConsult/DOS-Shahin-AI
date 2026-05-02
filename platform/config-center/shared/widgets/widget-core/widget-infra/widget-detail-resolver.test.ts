// ============================================
// Widget Detail Resolver — Unit Tests
// Feature: premium-dashboard-overhaul, Task 5.3
// ============================================
//
// Tests resolveWidgetDetail, hasWidgetDetail, getAllDetailWidgetIds.
// Run: pnpm exec tsx src/app/shared/widgets/widget-detail-resolver.test.ts

import { WidgetRegistryService } from './core/services/widget-registry.service';
import { resolveWidgetDetail, hasWidgetDetail, getAllDetailWidgetIds } from './widget-detail-resolver';

function assert(condition: boolean, message: string) {
  if (!condition) throw new Error(`FAIL: ${message}`);
  console.log(`  ✓ ${message}`);
}

// Minimal stub component classes for testing
class StubComponentA { static ɵcmp = true; }
class StubComponentB { static ɵcmp = true; }

function createTestRegistry(): WidgetRegistryService {
  const registry = new WidgetRegistryService();
  registry.register({
    id: 'test-widget-a',
    key: 'test_widget_a',
    title: 'Widget A',
    titleAr: 'ودجت أ',
    category: 'risk',
    engine: 'angular',
    component: StubComponentA as unknown,
    defaultSize: { cols: 4, rows: 2 },
    schemaVersion: 1,
  });
  registry.register({
    id: 'test-widget-b',
    key: 'test_widget_b',
    title: 'Widget B',
    titleAr: 'ودجت ب',
    category: 'compliance',
    engine: 'angular',
    component: StubComponentB as unknown,
    defaultSize: { cols: 6, rows: 2 },
    schemaVersion: 1,
  });
  return registry;
}

// ============================================
// resolveWidgetDetail
// ============================================
console.log('--- resolveWidgetDetail ---');

{
  const registry = createTestRegistry();

  const resultA = resolveWidgetDetail('test-widget-a', registry);
  assert(resultA === StubComponentA, 'resolves widget A to StubComponentA');

  const resultB = resolveWidgetDetail('test-widget-b', registry);
  assert(resultB === StubComponentB, 'resolves widget B to StubComponentB');

  const resultUnknown = resolveWidgetDetail('nonexistent', registry);
  assert(resultUnknown === null, 'returns null for unregistered widget ID');

  const resultEmpty = resolveWidgetDetail('', registry);
  assert(resultEmpty === null, 'returns null for empty widget ID');
}

console.log('resolveWidgetDetail: PASSED\n');

// ============================================
// hasWidgetDetail
// ============================================
console.log('--- hasWidgetDetail ---');

{
  const registry = createTestRegistry();

  assert(hasWidgetDetail('test-widget-a', registry) === true, 'returns true for registered widget');
  assert(hasWidgetDetail('nonexistent', registry) === false, 'returns false for unregistered widget');
}

console.log('hasWidgetDetail: PASSED\n');

// ============================================
// getAllDetailWidgetIds
// ============================================
console.log('--- getAllDetailWidgetIds ---');

{
  const registry = createTestRegistry();
  const ids = getAllDetailWidgetIds(registry);

  assert(ids.length === 2, 'returns correct count of widget IDs');
  assert(ids.includes('test-widget-a'), 'includes widget A');
  assert(ids.includes('test-widget-b'), 'includes widget B');
}

{
  const emptyRegistry = new WidgetRegistryService();
  const ids = getAllDetailWidgetIds(emptyRegistry);
  assert(ids.length === 0, 'returns empty array for empty registry');
}

console.log('getAllDetailWidgetIds: PASSED\n');

// ============================================
// Coverage: every registered widget has a detail
// ============================================
console.log('--- Every registered widget has a detail (Property 8 unit check) ---');

{
  const registry = createTestRegistry();
  const allWidgets = registry.list();
  for (const w of allWidgets) {
    const detail = resolveWidgetDetail(w.id, registry);
    assert(detail !== null, `widget "${w.id}" has a detail component`);
  }
}

console.log('all-widgets-have-detail: PASSED\n');

// ============================================
console.log('=== All widget-detail-resolver unit tests PASSED ===');
