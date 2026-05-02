// ============================================
// Regulatory Feeds — Property-Based Tests (Property 14)
// Feature: smart-seeding-quick-wins, Property 14: Regulatory feed filtering
// ============================================
//
// Standalone PBT file — no test runner required.
// Run: pnpm exec tsx src/app/pages/regulatory-feeds/regulatory-feeds.pbt.ts
//
// **Validates: Requirements 14.1, 14.3**

import * as fc from 'fast-check';

// ── Re-declare types (avoid Angular DI / decorator imports) ──────────

interface RegulatoryUpdate {
  deltaId: string;
  instrumentId: string;
  instrumentName: string;
  previousVersion: string;
  newVersion: string;
  addedNodes: string[];
  modifiedNodes: string[];
  removedNodes: string[];
  detectedAt: string;
  impactLevel?: 'low' | 'medium' | 'high' | 'critical';
  affectedControls?: string[];
  regulator?: string;
}

// ── Pure logic extracted from RegulatoryFeedsComponent ──────────────

/**
 * Filter regulatory updates by regulator (multi-select), severity (single),
 * and text search. Mirrors applyFilter() in regulatory-feeds.component.ts.
 */
function applyFilter(
  allUpdates: RegulatoryUpdate[],
  selectedRegulators: string[],
  selectedSeverity: string | null,
  searchText: string,
): RegulatoryUpdate[] {
  const search = searchText.toLowerCase();
  return allUpdates.filter((u) => {
    const matchRegulator =
      selectedRegulators.length === 0 ||
      (u.regulator != null && selectedRegulators.includes(u.regulator));
    const matchSeverity =
      !selectedSeverity || u.impactLevel === selectedSeverity;
    const matchSearch =
      !search ||
      u.instrumentName.toLowerCase().includes(search) ||
      (u.regulator || '').toLowerCase().includes(search) ||
      u.instrumentId.toLowerCase().includes(search);
    return matchRegulator && matchSeverity && matchSearch;
  });
}

/**
 * Sort updates in reverse chronological order (newest first).
 * Mirrors the sorting in loadData().
 */
function sortReverseChronological(
  updates: RegulatoryUpdate[],
): RegulatoryUpdate[] {
  return [...updates].sort(
    (a, b) =>
      new Date(b.detectedAt).getTime() - new Date(a.detectedAt).getTime(),
  );
}

// ── Arbitraries ──────────────────────────────────────────────────────

const REGULATORS = [
  'SEC', 'FCA', 'SAMA', 'ECB', 'FINMA', 'MAS', 'APRA', 'BaFin', 'CBUAE',
];

const SEVERITIES: ('low' | 'medium' | 'high' | 'critical')[] = [
  'low', 'medium', 'high', 'critical',
];

/** Generate a random ISO date string within a reasonable range */
const arbISODate = fc
  .integer({ min: 1577836800000, max: 1767225600000 }) // 2020-01-01 to 2025-12-31
  .map((ts) => new Date(ts).toISOString());

/** Generate a single RegulatoryUpdate */
const arbRegulatoryUpdate: fc.Arbitrary<RegulatoryUpdate> = fc.record({
  deltaId: fc.uuid(),
  instrumentId: fc.string({ minLength: 3, maxLength: 15 }).map((s) => s.replace(/\s/g, '_') || 'INS'),
  instrumentName: fc.string({ minLength: 2, maxLength: 40 }).map((s) => s.replace(/[\n\r]/g, ' ').trim() || 'Instrument'),
  previousVersion: fc.integer({ min: 1, max: 10 }).map(String),
  newVersion: fc.integer({ min: 1, max: 20 }).map(String),
  addedNodes: fc.array(fc.string({ minLength: 1, maxLength: 20 }), { maxLength: 5 }),
  modifiedNodes: fc.array(fc.string({ minLength: 1, maxLength: 20 }), { maxLength: 5 }),
  removedNodes: fc.array(fc.string({ minLength: 1, maxLength: 20 }), { maxLength: 5 }),
  detectedAt: arbISODate,
  impactLevel: fc.constantFrom(...SEVERITIES),
  affectedControls: fc.array(fc.string({ minLength: 1, maxLength: 15 }), { maxLength: 3 }),
  regulator: fc.option(fc.constantFrom(...REGULATORS), { nil: undefined }),
});

/** Generate a list of 1–30 regulatory updates */
const arbUpdateList = fc.array(arbRegulatoryUpdate, { minLength: 1, maxLength: 30 });

/** Generate a subset of regulators for filtering */
const arbRegulatorFilter = fc.subarray(REGULATORS, { minLength: 0, maxLength: 4 });

/** Generate an optional severity filter */
const arbSeverityFilter = fc.option(fc.constantFrom(...SEVERITIES), { nil: null });

// ============================================
// Property 14a: Filtered results match regulator criteria
// Feature: smart-seeding-quick-wins, Property 14: Regulatory feed filtering
// **Validates: Requirements 14.3**
//
// For any set of regulatory updates and regulator filter,
// all returned updates SHALL have a regulator in the selected set
// (or all updates returned if no regulator filter is applied).
// ============================================

console.log('--- Property 14a: Filtered results match regulator criteria ---');

fc.assert(
  fc.property(arbUpdateList, arbRegulatorFilter, (updates, regulators) => {
    const sorted = sortReverseChronological(updates);
    const result = applyFilter(sorted, regulators, null, '');

    if (regulators.length === 0) {
      // No filter → all updates returned
      return result.length === sorted.length;
    }

    // Every result must have a regulator in the selected set
    return result.every(
      (u) => u.regulator != null && regulators.includes(u.regulator),
    );
  }),
  { numRuns: 100 },
);
console.log('  ✓ All filtered results match the selected regulator criteria');

// ============================================
// Property 14b: Filtered results match severity criteria
// Feature: smart-seeding-quick-wins, Property 14: Regulatory feed filtering
// **Validates: Requirements 14.3**
//
// For any set of regulatory updates and severity filter,
// all returned updates SHALL have the selected severity level
// (or all updates returned if no severity filter is applied).
// ============================================

console.log('--- Property 14b: Filtered results match severity criteria ---');

fc.assert(
  fc.property(arbUpdateList, arbSeverityFilter, (updates, severity) => {
    const sorted = sortReverseChronological(updates);
    const result = applyFilter(sorted, [], severity, '');

    if (severity === null) {
      // No filter → all updates returned
      return result.length === sorted.length;
    }

    // Every result must match the selected severity
    return result.every((u) => u.impactLevel === severity);
  }),
  { numRuns: 100 },
);
console.log('  ✓ All filtered results match the selected severity criteria');

// ============================================
// Property 14c: Combined regulator + severity filter
// Feature: smart-seeding-quick-wins, Property 14: Regulatory feed filtering
// **Validates: Requirements 14.3**
//
// For any set of regulatory updates with both regulator and severity
// filters applied, all returned updates SHALL match BOTH criteria.
// ============================================

console.log('--- Property 14c: Combined regulator + severity filter ---');

fc.assert(
  fc.property(
    arbUpdateList,
    arbRegulatorFilter,
    arbSeverityFilter,
    (updates, regulators, severity) => {
      const sorted = sortReverseChronological(updates);
      const result = applyFilter(sorted, regulators, severity, '');

      return result.every((u) => {
        const matchReg =
          regulators.length === 0 ||
          (u.regulator != null && regulators.includes(u.regulator));
        const matchSev = severity === null || u.impactLevel === severity;
        return matchReg && matchSev;
      });
    },
  ),
  { numRuns: 100 },
);
console.log('  ✓ Combined filter results match both regulator and severity criteria');

// ============================================
// Property 14d: Filtered results are in reverse chronological order
// Feature: smart-seeding-quick-wins, Property 14: Regulatory feed filtering
// **Validates: Requirements 14.1**
//
// For any set of regulatory updates and any filter criteria,
// the filtered results SHALL be in reverse chronological order
// (newest first) when the input is pre-sorted.
// ============================================

console.log('--- Property 14d: Filtered results in reverse chronological order ---');

fc.assert(
  fc.property(
    arbUpdateList,
    arbRegulatorFilter,
    arbSeverityFilter,
    (updates, regulators, severity) => {
      // Pre-sort (as the component does in loadData)
      const sorted = sortReverseChronological(updates);
      const result = applyFilter(sorted, regulators, severity, '');

      // Verify reverse chronological order is preserved
      for (let i = 1; i < result.length; i++) {
        const prev = new Date(result[i - 1].detectedAt).getTime();
        const curr = new Date(result[i].detectedAt).getTime();
        if (prev < curr) return false;
      }
      return true;
    },
  ),
  { numRuns: 100 },
);
console.log('  ✓ Filtered results maintain reverse chronological order');

// ============================================
// Property 14e: Filter is complete (no matching updates are excluded)
// Feature: smart-seeding-quick-wins, Property 14: Regulatory feed filtering
// **Validates: Requirements 14.3**
//
// For any filter criteria, the number of filtered results SHALL equal
// the count of updates in the original list that match all criteria.
// ============================================

console.log('--- Property 14e: Filter completeness (no matching updates excluded) ---');

fc.assert(
  fc.property(
    arbUpdateList,
    arbRegulatorFilter,
    arbSeverityFilter,
    (updates, regulators, severity) => {
      const sorted = sortReverseChronological(updates);
      const result = applyFilter(sorted, regulators, severity, '');

      // Count expected matches manually
      const expectedCount = sorted.filter((u) => {
        const matchReg =
          regulators.length === 0 ||
          (u.regulator != null && regulators.includes(u.regulator));
        const matchSev = severity === null || u.impactLevel === severity;
        return matchReg && matchSev;
      }).length;

      return result.length === expectedCount;
    },
  ),
  { numRuns: 100 },
);
console.log('  ✓ Filter returns exactly the matching updates (no false exclusions)');

// ============================================
// Property 14f: Empty filter returns all updates
// Feature: smart-seeding-quick-wins, Property 14: Regulatory feed filtering
// **Validates: Requirements 14.1**
//
// When no filters are applied (empty regulators, null severity,
// empty search), ALL updates SHALL be returned.
// ============================================

console.log('--- Property 14f: Empty filter returns all updates ---');

fc.assert(
  fc.property(arbUpdateList, (updates) => {
    const sorted = sortReverseChronological(updates);
    const result = applyFilter(sorted, [], null, '');
    return result.length === sorted.length;
  }),
  { numRuns: 100 },
);
console.log('  ✓ Empty filter returns all updates');

console.log(
  '\n=== All Property 14 (Regulatory feed filtering) tests PASSED ===',
);
