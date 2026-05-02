// ============================================
// Layout Preferences Utils — Unit Tests
// Feature: premium-dashboard-overhaul, Task 2.1
// ============================================
//
// Tests serializeLayoutPreferences and deserializeLayoutPreferences.
// Run: pnpm exec tsx src/app/shared/widgets/layout-preferences.utils.test.ts

import {
  serializeLayoutPreferences,
  deserializeLayoutPreferences,
} from './layout-preferences.utils';
import { LayoutPreferences } from './layout-grid.types';

function assert(condition: boolean, message: string) {
  if (!condition) throw new Error(`FAIL: ${message}`);
  console.log(`  ✓ ${message}`);
}

function assertDeepEqual(actual: unknown, expected: unknown, message: string) {
  if (JSON.stringify(actual) !== JSON.stringify(expected)) {
    throw new Error(
      `FAIL: ${message}\n  Expected: ${JSON.stringify(expected)}\n  Actual:   ${JSON.stringify(actual)}`
    );
  }
  console.log(`  ✓ ${message}`);
}

// ============================================
// Round-trip: deserialize(serialize(prefs)) === prefs
// ============================================
console.log('--- round-trip ---');

{
  const prefs: LayoutPreferences = {
    widgets: [
      { id: 'w1', position: { x: 0, y: 0, w: 2, h: 1 }, visible: true },
      { id: 'w2', position: { x: 2, y: 0, w: 1, h: 2 }, visible: false },
    ],
    displayMode: 'compact',
    version: 2,
  };
  const result = deserializeLayoutPreferences(serializeLayoutPreferences(prefs));
  assertDeepEqual(result, prefs, 'round-trip preserves all fields');
}

{
  const prefs: LayoutPreferences = {
    widgets: [],
    displayMode: 'expanded',
    version: 2,
  };
  const result = deserializeLayoutPreferences(serializeLayoutPreferences(prefs));
  assertDeepEqual(result, prefs, 'round-trip with empty widgets array');
}

console.log('round-trip: PASSED\n');

// ============================================
// serializeLayoutPreferences
// ============================================
console.log('--- serializeLayoutPreferences ---');

{
  const prefs: LayoutPreferences = {
    widgets: [{ id: 'a', position: { x: 0, y: 0, w: 1, h: 1 }, visible: true }],
    displayMode: 'compact',
    version: 2,
  };
  const json = serializeLayoutPreferences(prefs);
  const parsed = JSON.parse(json);
  assert(parsed.version === 2, 'serialized JSON includes version field');
  assert(parsed.displayMode === 'compact', 'serialized JSON includes displayMode');
  assert(Array.isArray(parsed.widgets), 'serialized JSON includes widgets array');
}

console.log('serializeLayoutPreferences: PASSED\n');

// ============================================
// deserializeLayoutPreferences
// ============================================
console.log('--- deserializeLayoutPreferences ---');

{
  const json = JSON.stringify({
    widgets: [{ id: 'x', position: { x: 1, y: 2, w: 3, h: 1 }, visible: true }],
    displayMode: 'expanded',
    version: 2,
  });
  const result = deserializeLayoutPreferences(json);
  assertDeepEqual(result.widgets.length, 1, 'deserializes widgets');
  assertDeepEqual(result.displayMode, 'expanded', 'deserializes displayMode');
  assertDeepEqual(result.version, 2, 'deserializes version');
}

{
  // Missing version field defaults to 2
  const json = JSON.stringify({
    widgets: [],
    displayMode: 'compact',
  });
  const result = deserializeLayoutPreferences(json);
  assert(result.version === 2, 'defaults version to 2 when missing');
}

{
  // Invalid JSON throws
  let threw = false;
  try {
    deserializeLayoutPreferences('not-json');
  } catch {
    threw = true;
  }
  assert(threw, 'throws on invalid JSON');
}

console.log('deserializeLayoutPreferences: PASSED\n');

// ============================================
console.log('=== All layout-preferences.utils unit tests PASSED ===');
