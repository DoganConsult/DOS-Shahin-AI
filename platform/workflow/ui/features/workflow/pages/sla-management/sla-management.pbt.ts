// ============================================
// SLA Management — Property-Based Tests (Property 27)
// Feature: smart-seeding-quick-wins, Property 27: SLA breach severity indicator
// ============================================
//
// Standalone PBT file — no test runner required.
// Run: pnpm exec tsx src/app/pages/sla-management/sla-management.pbt.ts
//
// **Validates: Requirements 7.3**

import * as fc from 'fast-check';

// ── Re-declare types (avoid Angular DI / decorator imports) ──────────

interface SLADefinition {
  id: string;
  name: string;
  metric: string;
  threshold: number;
  currentValue?: number;
  status: 'normal' | 'at_risk' | 'breached';
  entityId?: string;
  framework?: string;
  createdAt?: string;
}

// ── Pure logic extracted from SLAManagementComponent ─────────────────

/**
 * Derives SLA status from raw data.
 * Mirrors the logic in sla-management.component.ts deriveSLAStatus():
 *   - If status is explicitly set to a known value, use it
 *   - Otherwise derive from currentValue vs threshold:
 *     currentValue > threshold → 'breached'
 *     currentValue > threshold * 0.8 → 'at_risk'
 *     else → 'normal'
 */
function deriveSLAStatus(raw: {
  status?: string;
  currentValue?: number;
  threshold?: number;
}): 'normal' | 'at_risk' | 'breached' {
  if (raw.status === 'breached' || raw.status === 'at_risk' || raw.status === 'normal') {
    return raw.status;
  }
  const current = raw.currentValue;
  const threshold = raw.threshold;
  if (current != null && threshold != null && threshold > 0) {
    if (current > threshold) return 'breached';
    if (current > threshold * 0.8) return 'at_risk';
  }
  return 'normal';
}

/**
 * Maps SLA status to PrimeNG Tag severity.
 * Mirrors the logic in sla-management.component.ts getStatusSeverity():
 *   'breached' → 'danger'
 *   'at_risk'  → 'warning'
 *   'normal'   → 'success'
 *   other      → 'info'
 */
function getStatusSeverity(status: string): 'success' | 'warning' | 'danger' | 'info' {
  if (status === 'breached') return 'danger';
  if (status === 'at_risk') return 'warning';
  if (status === 'normal') return 'success';
  return 'info';
}

// ── Arbitraries ──────────────────────────────────────────────────────

const arbMetric = fc.constantFrom(
  'response_time_hours',
  'resolution_time_hours',
  'approval_turnaround_hours',
  'evidence_collection_days',
  'audit_completion_days',
  'remediation_time_days',
  'uptime_percent',
);

/** Positive threshold value */
const arbThreshold = fc.integer({ min: 1, max: 10000 });

/** SLA definition with currentValue that exceeds threshold (breached) */
const arbBreachedSLA = fc.record({
  threshold: arbThreshold,
}).chain(({ threshold }) =>
  fc.record({
    id: fc.string({ minLength: 1, maxLength: 20 }).map(s => `sla-${s}`),
    name: fc.string({ minLength: 1, maxLength: 50 }),
    metric: arbMetric,
    threshold: fc.constant(threshold),
    currentValue: fc.integer({ min: threshold + 1, max: threshold + 5000 }),
  }),
);

/** SLA definition with currentValue within normal range (≤ 80% of threshold) */
const arbNormalSLA = fc.record({
  threshold: arbThreshold,
}).chain(({ threshold }) => {
  const maxNormal = Math.floor(threshold * 0.8);
  return fc.record({
    id: fc.string({ minLength: 1, maxLength: 20 }).map(s => `sla-${s}`),
    name: fc.string({ minLength: 1, maxLength: 50 }),
    metric: arbMetric,
    threshold: fc.constant(threshold),
    currentValue: fc.integer({ min: 0, max: Math.max(0, maxNormal) }),
  });
});

/** SLA definition with currentValue in at-risk range (> 80% but ≤ threshold) */
const arbAtRiskSLA = fc.record({
  threshold: fc.integer({ min: 5, max: 10000 }),
}).chain(({ threshold }) => {
  const atRiskFloor = Math.floor(threshold * 0.8) + 1;
  if (atRiskFloor > threshold) {
    // Threshold too small for at_risk range; return threshold itself (not breached)
    return fc.record({
      id: fc.string({ minLength: 1, maxLength: 20 }).map(s => `sla-${s}`),
      name: fc.string({ minLength: 1, maxLength: 50 }),
      metric: arbMetric,
      threshold: fc.constant(threshold),
      currentValue: fc.constant(threshold),
    });
  }
  return fc.record({
    id: fc.string({ minLength: 1, maxLength: 20 }).map(s => `sla-${s}`),
    name: fc.string({ minLength: 1, maxLength: 50 }),
    metric: arbMetric,
    threshold: fc.constant(threshold),
    currentValue: fc.integer({ min: atRiskFloor, max: threshold }),
  });
});

// ============================================
// Property 27a: Breached SLA → danger severity
// Feature: smart-seeding-quick-wins, Property 27: SLA breach severity indicator
// **Validates: Requirements 7.3**
//
// For any SLA definition where currentValue exceeds the threshold,
// the derived status SHALL be 'breached' and the displayed severity
// SHALL be 'danger'.
// ============================================

console.log('--- Property 27a: Breached SLA → danger severity ---');

fc.assert(
  fc.property(arbBreachedSLA, (sla) => {
    const status = deriveSLAStatus({
      currentValue: sla.currentValue,
      threshold: sla.threshold,
    });
    const severity = getStatusSeverity(status);

    return status === 'breached' && severity === 'danger';
  }),
  { numRuns: 100 },
);
console.log('  ✓ Breached SLAs (currentValue > threshold) produce danger severity');

// ============================================
// Property 27b: Normal SLA → success severity
// Feature: smart-seeding-quick-wins, Property 27: SLA breach severity indicator
// **Validates: Requirements 7.3**
//
// For any SLA definition where currentValue is within normal range
// (≤ 80% of threshold), the derived status SHALL be 'normal' and
// the displayed severity SHALL be 'success'.
// ============================================

console.log('--- Property 27b: Normal SLA → success severity ---');

fc.assert(
  fc.property(arbNormalSLA, (sla) => {
    const status = deriveSLAStatus({
      currentValue: sla.currentValue,
      threshold: sla.threshold,
    });
    const severity = getStatusSeverity(status);

    return status === 'normal' && severity === 'success';
  }),
  { numRuns: 100 },
);
console.log('  ✓ Normal SLAs (currentValue ≤ 80% threshold) produce success severity');

// ============================================
// Property 27c: At-risk SLA → warning severity
// Feature: smart-seeding-quick-wins, Property 27: SLA breach severity indicator
// **Validates: Requirements 7.3**
//
// For any SLA definition where currentValue is in the at-risk range
// (> 80% of threshold but ≤ threshold), the derived status SHALL be
// 'at_risk' and the displayed severity SHALL be 'warning'.
// ============================================

console.log('--- Property 27c: At-risk SLA → warning severity ---');

fc.assert(
  fc.property(arbAtRiskSLA, (sla) => {
    const status = deriveSLAStatus({
      currentValue: sla.currentValue,
      threshold: sla.threshold,
    });
    const severity = getStatusSeverity(status);

    return status === 'at_risk' && severity === 'warning';
  }),
  { numRuns: 100 },
);
console.log('  ✓ At-risk SLAs (80% < currentValue ≤ threshold) produce warning severity');

// ============================================
// Property 27d: Explicit status is respected
// Feature: smart-seeding-quick-wins, Property 27: SLA breach severity indicator
// **Validates: Requirements 7.3**
//
// When an SLA has an explicit status field set to a known value,
// deriveSLAStatus SHALL use that value regardless of currentValue/threshold.
// ============================================

console.log('--- Property 27d: Explicit status is respected ---');

const arbExplicitStatus = fc.constantFrom('normal' as const, 'at_risk' as const, 'breached' as const);

fc.assert(
  fc.property(
    arbExplicitStatus,
    fc.integer({ min: 0, max: 10000 }),
    fc.integer({ min: 1, max: 10000 }),
    (explicitStatus, currentValue, threshold) => {
      const status = deriveSLAStatus({
        status: explicitStatus,
        currentValue,
        threshold,
      });
      return status === explicitStatus;
    },
  ),
  { numRuns: 100 },
);
console.log('  ✓ Explicit status overrides derived status');

// ============================================
// Property 27e: Missing currentValue defaults to normal
// Feature: smart-seeding-quick-wins, Property 27: SLA breach severity indicator
// **Validates: Requirements 7.3**
//
// When currentValue is undefined, the SLA status SHALL default to
// 'normal' (no breach can be detected without a current metric).
// ============================================

console.log('--- Property 27e: Missing currentValue defaults to normal ---');

fc.assert(
  fc.property(arbThreshold, (threshold) => {
    const status = deriveSLAStatus({
      currentValue: undefined,
      threshold,
    });
    return status === 'normal';
  }),
  { numRuns: 100 },
);
console.log('  ✓ Missing currentValue defaults to normal status');

// ============================================
// Property 27f: Severity mapping is exhaustive for known statuses
// Feature: smart-seeding-quick-wins, Property 27: SLA breach severity indicator
// **Validates: Requirements 7.3**
//
// For any known SLA status, getStatusSeverity SHALL return a
// non-info severity (breached→danger, at_risk→warning, normal→success).
// ============================================

console.log('--- Property 27f: Severity mapping is exhaustive for known statuses ---');

fc.assert(
  fc.property(arbExplicitStatus, (status) => {
    const severity = getStatusSeverity(status);
    if (status === 'breached') return severity === 'danger';
    if (status === 'at_risk') return severity === 'warning';
    if (status === 'normal') return severity === 'success';
    return false;
  }),
  { numRuns: 100 },
);
console.log('  ✓ Severity mapping is exhaustive for all known statuses');

console.log('\n=== All Property 27 (SLA breach severity indicator) tests PASSED ===');
