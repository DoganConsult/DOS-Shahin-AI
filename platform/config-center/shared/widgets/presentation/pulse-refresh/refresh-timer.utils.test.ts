// ============================================
// Refresh Timer Utils — Unit Tests
// Feature: premium-dashboard-overhaul, Task 4.3
// ============================================
//
// Tests getDefaultRefreshInterval and computeJitter pure functions.
// Run: pnpm exec tsx src/app/shared/widgets/refresh-timer.utils.test.ts

import { getDefaultRefreshInterval, computeJitter } from './refresh-timer.utils';

function assert(condition: boolean, message: string) {
  if (!condition) throw new Error(`FAIL: ${message}`);
  console.log(`  ✓ ${message}`);
}

// ============================================
// getDefaultRefreshInterval
// ============================================
console.log('--- getDefaultRefreshInterval ---');

assert(getDefaultRefreshInterval('risk') === 60, 'risk → 60s');
assert(getDefaultRefreshInterval('compliance') === 300, 'compliance → 300s');
assert(getDefaultRefreshInterval('ai') === 600, 'ai → 600s');
assert(getDefaultRefreshInterval('evidence') === 180, 'evidence → 180s');

const otherCategories = [
  'security', 'monitoring', 'overview', 'reality',
  'memory', 'lifecycle', 'assessment', 'external', 'change', 'landing',
] as const;
for (const cat of otherCategories) {
  assert(getDefaultRefreshInterval(cat) === 300, `${cat} → 300s (fallback)`);
}

// All categories return a positive number
const allCategories = [
  'risk', 'compliance', 'ai', 'security', 'monitoring', 'evidence',
  'overview', 'reality', 'memory', 'lifecycle', 'assessment', 'external',
  'change', 'landing',
] as const;
for (const cat of allCategories) {
  assert(getDefaultRefreshInterval(cat) > 0, `${cat} returns positive interval`);
}

console.log('getDefaultRefreshInterval: PASSED\n');

// ============================================
// computeJitter
// ============================================
console.log('--- computeJitter ---');

assert(computeJitter(0) === 0, 'random=0 → jitter=0');
assert(computeJitter(1) === 5, 'random=1 → jitter=5');
assert(computeJitter(0.5) === 2.5, 'random=0.5 → jitter=2.5');

// Without argument, result is in [0, 5]
const noArgResult = computeJitter();
assert(noArgResult >= 0 && noArgResult <= 5, 'no-arg result in [0, 5]');

// Boundary values
assert(computeJitter(0.001) > 0, 'small random produces positive jitter');
assert(computeJitter(0.999) < 5, 'near-1 random produces jitter < 5');

console.log('computeJitter: PASSED\n');

// ============================================
console.log('=== All refresh-timer.utils unit tests PASSED ===');
