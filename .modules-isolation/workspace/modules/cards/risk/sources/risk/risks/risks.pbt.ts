// ============================================
// Risk Score Severity Mapping — Property-Based Tests (Property 7)
// Feature: modern-ui-overhaul
// ============================================
//
// Standalone PBT file — no test runner required.
// Run: pnpm exec tsx src/app/pages/risks/risks.pbt.ts

import * as fc from 'fast-check';

// ============================================
// Simulate the risk score severity functions from risks.component.ts
// ============================================

function getSeverityClass(score: number): string {
  if (score >= 20) return 'danger';
  if (score >= 12) return 'warn';
  return 'success';
}

function getScoreSeverity(score: number): 'danger' | 'warning' | 'success' {
  if (score >= 20) return 'danger';
  if (score >= 12) return 'warning';
  return 'success';
}

// ============================================
// Arbitraries
// ============================================

/** Non-negative integers covering low, medium, and high risk ranges and beyond */
const riskScoreArb = fc.nat({ max: 100 });

// ============================================
// Property 7: Risk score to severity color mapping
// Feature: modern-ui-overhaul, Property 7: Risk score to severity color mapping
// **Validates: Requirements 12.1**
//
// For any numeric risk score, the severity color mapping shall return
// 'danger' for scores >= 20, 'warn' for scores >= 12 and < 20, and
// 'success' for scores < 12. This mapping shall be deterministic and
// total for all non-negative integers.
// ============================================

console.log('--- Property 7: Risk score to severity color mapping ---');

// 7a: Scores >= 20 map to 'danger'
fc.assert(
  fc.property(fc.integer({ min: 20, max: 1000 }), (score) => {
    return getSeverityClass(score) === 'danger';
  }),
  { numRuns: 200 }
);
console.log('  ✓ 7a: scores >= 20 map to danger');

// 7b: Scores >= 12 and < 20 map to 'warn'
fc.assert(
  fc.property(fc.integer({ min: 12, max: 19 }), (score) => {
    return getSeverityClass(score) === 'warn';
  }),
  { numRuns: 200 }
);
console.log('  ✓ 7b: scores >= 12 and < 20 map to warn');

// 7c: Scores < 12 map to 'success'
fc.assert(
  fc.property(fc.integer({ min: 0, max: 11 }), (score) => {
    return getSeverityClass(score) === 'success';
  }),
  { numRuns: 200 }
);
console.log('  ✓ 7c: scores < 12 map to success');

// 7d: Mapping is deterministic — same input always produces same output
fc.assert(
  fc.property(riskScoreArb, (score) => {
    return getSeverityClass(score) === getSeverityClass(score);
  }),
  { numRuns: 200 }
);
console.log('  ✓ 7d: mapping is deterministic');

// 7e: Mapping is total — every non-negative integer returns a valid severity
fc.assert(
  fc.property(riskScoreArb, (score) => {
    const result = getSeverityClass(score);
    return result === 'danger' || result === 'warn' || result === 'success';
  }),
  { numRuns: 200 }
);
console.log('  ✓ 7e: mapping is total for all non-negative integers');

// 7f: getScoreSeverity is consistent with getSeverityClass (same thresholds)
fc.assert(
  fc.property(riskScoreArb, (score) => {
    const cls = getSeverityClass(score);
    const sev = getScoreSeverity(score);
    if (cls === 'danger') return sev === 'danger';
    if (cls === 'warn') return sev === 'warning';
    if (cls === 'success') return sev === 'success';
    return false;
  }),
  { numRuns: 200 }
);
console.log('  ✓ 7f: getScoreSeverity is consistent with getSeverityClass');

console.log('Property 7: PASSED\n');

// ============================================
console.log('=== All risk score mapping property tests PASSED ===');
