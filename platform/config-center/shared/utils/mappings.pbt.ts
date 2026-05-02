// ============================================
// Status & Icon Mappings — Property-Based Tests (Properties 1, 2, 8)
// Feature: modern-ui-overhaul
// ============================================
//
// Standalone PBT file — no test runner required.
// Run: pnpm exec tsx src/app/shared/utils/mappings.pbt.ts

import * as fc from 'fast-check';
import { STATUS_SEVERITY_MAP, getStatusSeverity, PrimeSeverity } from './status-colors';
import { NAV_ICON_MAP, getNavIcon } from './nav-icons';

// ============================================
// Constants
// ============================================

const VALID_SEVERITIES: PrimeSeverity[] = ['success', 'info', 'warning', 'danger', 'secondary'];

const DEFINED_STATUSES = [
  'approved', 'active', 'resolved', 'completed', 'closed', 'low',
  'critical', 'high',
  'pending', 'draft', 'medium', 'mitigating', 'investigating', 'in_progress',
  'reported', 'open',
  'unrated',
];

const REQUIRED_ROUTES = [
  'dashboard', 'governance', 'risks', 'compliance', 'frameworks', 'controls',
  'policies', 'audit', 'incidents', 'vendors', 'bcp', 'registry',
  'ai-hub', 'workflows', 'digital-twin', 'red-team', 'profile',
];

// ============================================
// Arbitraries
// ============================================

const statusArb = fc.constantFrom(...DEFINED_STATUSES);
const routeArb = fc.constantFrom(...REQUIRED_ROUTES);

/** Generates strings that are NOT in the STATUS_SEVERITY_MAP keys. */
const unknownStatusArb = fc.string({ minLength: 1, maxLength: 30 }).filter(
  (s) => !(s.toLowerCase() in STATUS_SEVERITY_MAP)
);

// ============================================
// Property 1: Status severity mapping completeness
// Feature: modern-ui-overhaul, Property 1: Status severity mapping completeness
// **Validates: Requirements 1.3**
//
// For any status string in the defined set, the STATUS_SEVERITY_MAP
// shall return a valid PrimeNG severity value.
// ============================================

console.log('--- Property 1: Status severity mapping completeness ---');

// 1a: Every defined status has a mapping in STATUS_SEVERITY_MAP
fc.assert(
  fc.property(statusArb, (status) => {
    return status in STATUS_SEVERITY_MAP;
  }),
  { numRuns: 200 }
);
console.log('  ✓ 1a: every defined status has a mapping in STATUS_SEVERITY_MAP');

// 1b: Every mapped severity is a valid PrimeNG severity value
fc.assert(
  fc.property(statusArb, (status) => {
    const severity = STATUS_SEVERITY_MAP[status];
    return VALID_SEVERITIES.includes(severity);
  }),
  { numRuns: 200 }
);
console.log('  ✓ 1b: every mapped severity is a valid PrimeNG severity value');

// 1c: getStatusSeverity returns the same value as direct map lookup for defined statuses
fc.assert(
  fc.property(statusArb, (status) => {
    return getStatusSeverity(status) === STATUS_SEVERITY_MAP[status];
  }),
  { numRuns: 200 }
);
console.log('  ✓ 1c: getStatusSeverity matches direct map lookup for defined statuses');

console.log('Property 1: PASSED\n');

// ============================================
// Property 2: Navigation icon mapping completeness
// Feature: modern-ui-overhaul, Property 2: Navigation icon mapping completeness
// **Validates: Requirements 2.1**
//
// For any navigation route name in the required set, the NAV_ICON_MAP
// shall return a non-empty string starting with 'pi-'.
// ============================================

console.log('--- Property 2: Navigation icon mapping completeness ---');

// 2a: Every required route has a mapping in NAV_ICON_MAP
fc.assert(
  fc.property(routeArb, (route) => {
    return route in NAV_ICON_MAP;
  }),
  { numRuns: 200 }
);
console.log('  ✓ 2a: every required route has a mapping in NAV_ICON_MAP');

// 2b: Every mapped icon is a non-empty string starting with 'pi-'
fc.assert(
  fc.property(routeArb, (route) => {
    const icon = NAV_ICON_MAP[route];
    return typeof icon === 'string' && icon.length > 0 && icon.startsWith('pi-');
  }),
  { numRuns: 200 }
);
console.log('  ✓ 2b: every mapped icon is a non-empty string starting with pi-');

// 2c: getNavIcon returns the same value as direct map lookup for required routes
fc.assert(
  fc.property(routeArb, (route) => {
    return getNavIcon(route) === NAV_ICON_MAP[route];
  }),
  { numRuns: 200 }
);
console.log('  ✓ 2c: getNavIcon matches direct map lookup for required routes');

console.log('Property 2: PASSED\n');

// ============================================
// Property 8: Status badge any status fallback
// Feature: modern-ui-overhaul, Property 8: Status badge any status fallback
// **Validates: Requirements 1.3**
//
// For any string not present in the STATUS_SEVERITY_MAP, the
// getStatusSeverity function shall return 'info' as a safe fallback.
// ============================================

console.log('--- Property 8: Status badge any status fallback ---');

// 8a: Unknown statuses always fall back to 'info'
fc.assert(
  fc.property(unknownStatusArb, (status) => {
    return getStatusSeverity(status) === 'info';
  }),
  { numRuns: 200 }
);
console.log('  ✓ 8a: any statuses always fall back to info');

// 8b: The fallback is never null or undefined
fc.assert(
  fc.property(unknownStatusArb, (status) => {
    const result = getStatusSeverity(status);
    return result !== null && result !== undefined;
  }),
  { numRuns: 200 }
);
console.log('  ✓ 8b: fallback is never null or undefined');

// 8c: The fallback is a valid PrimeNG severity
fc.assert(
  fc.property(unknownStatusArb, (status) => {
    const result = getStatusSeverity(status);
    return VALID_SEVERITIES.includes(result);
  }),
  { numRuns: 200 }
);
console.log('  ✓ 8c: fallback is a valid PrimeNG severity');

console.log('Property 8: PASSED\n');

// ============================================
console.log('=== All status & icon mapping property tests PASSED ===');
