// ============================================
// StatusBadgeComponent — Unit Tests
// Feature: modern-ui-overhaul, Task 2.1
// ============================================
//
// Standalone test file — no test runner required.
// Run: pnpm exec tsx src/app/shared/components/status-badge.test.ts

import { getStatusSeverity, PrimeSeverity } from '../../../utils/status-colors';

// The StatusBadgeComponent delegates severity to getStatusSeverity(status).
// We test the severity logic directly since the component is a thin wrapper.

function assert(condition: boolean, message: string) {
  if (!condition) throw new Error(`FAIL: ${message}`);
  console.log(`  ✓ ${message}`);
}

console.log('--- StatusBadgeComponent unit tests ---\n');

// Known status mappings
console.log('Known statuses:');
assert(getStatusSeverity('approved') === 'success', 'approved → success');
assert(getStatusSeverity('active') === 'success', 'active → success');
assert(getStatusSeverity('resolved') === 'success', 'resolved → success');
assert(getStatusSeverity('completed') === 'success', 'completed → success');
assert(getStatusSeverity('closed') === 'success', 'closed → success');
assert(getStatusSeverity('low') === 'success', 'low → success');
assert(getStatusSeverity('critical') === 'danger', 'critical → danger');
assert(getStatusSeverity('high') === 'danger', 'high → danger');
assert(getStatusSeverity('pending') === 'warning', 'pending → warning');
assert(getStatusSeverity('draft') === 'warning', 'draft → warning');
assert(getStatusSeverity('medium') === 'warning', 'medium → warning');
assert(getStatusSeverity('mitigating') === 'warning', 'mitigating → warning');
assert(getStatusSeverity('investigating') === 'warning', 'investigating → warning');
assert(getStatusSeverity('in_progress') === 'warning', 'in_progress → warning');
assert(getStatusSeverity('reported') === 'info', 'reported → info');
assert(getStatusSeverity('open') === 'info', 'open → info');
assert(getStatusSeverity('unrated') === 'secondary', 'unrated → secondary');

// Case insensitivity
console.log('\nCase insensitivity:');
assert(getStatusSeverity('APPROVED') === 'success', 'APPROVED (uppercase) → success');
assert(getStatusSeverity('Critical') === 'danger', 'Critical (mixed case) → danger');
assert(getStatusSeverity('PENDING') === 'warning', 'PENDING (uppercase) → warning');

// Unknown status fallback
console.log('\nUnknown status fallback:');
assert(getStatusSeverity('unknown_xyz') === 'info', 'unknown_xyz → info fallback');
assert(getStatusSeverity('') === 'info', 'empty string → info fallback');
assert(getStatusSeverity('random') === 'info', 'random → info fallback');

console.log('\n=== All StatusBadgeComponent unit tests PASSED ===');
