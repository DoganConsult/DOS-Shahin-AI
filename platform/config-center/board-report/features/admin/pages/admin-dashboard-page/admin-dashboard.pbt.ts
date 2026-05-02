// ============================================
// Admin Dashboard — Property-Based Tests (Property 3)
// Feature: grc-frontend-integration, Property 3: Admin tenant summary counts are correct
// ============================================
//
// Standalone PBT file — no test runner required.
// Run: pnpm exec tsx src/app/pages/admin/admin-dashboard.pbt.ts

import * as fc from 'fast-check';

// --- Replicate pure logic from admin-dashboard.component.ts ---

interface Tenant {
  tenant_id: string;
  org_name: string;
  industry: string;
  org_size: string;
  plan: string;
  status: string;
  created_at: string;
}

function computeTenantStats(tenants: Tenant[]): { total: number; active: number; suspended: number } {
  const total = tenants.length;
  const suspended = tenants.filter(t => t.status === 'suspended').length;
  const active = tenants.filter(t => !t.status || t.status === 'active').length;
  return { total, active, suspended };
}

// ============================================
// Arbitraries
// ============================================

const statusArb = fc.constantFrom('active', 'suspended', 'pending', 'deleted', '');

const tenantArb = fc.record({
  tenant_id: fc.uuid(),
  org_name: fc.string({ minLength: 1, maxLength: 50 }),
  industry: fc.constantFrom('finance', 'healthcare', 'technology', 'government', 'energy'),
  org_size: fc.constantFrom('small', 'medium', 'large', 'enterprise'),
  plan: fc.constantFrom('free', 'starter', 'professional', 'enterprise'),
  status: statusArb,
  created_at: fc.integer({ min: 1577836800000, max: 1893456000000 }).map(ts => new Date(ts).toISOString()),
});

const tenantListArb = fc.array(tenantArb, { minLength: 0, maxLength: 50 });

// ============================================
// Property 3: Admin tenant summary counts are correct
// **Validates: Requirements 4.1**
//
// For any list of tenants, the computed summary statistics (total count,
// active count, suspended count) match the actual counts derived by
// filtering the tenant list by status.
// ============================================

console.log('--- Property 3: Admin tenant summary counts are correct ---');

// 3a: Total count equals the length of the tenant list
fc.assert(
  fc.property(tenantListArb, (tenants) => {
    const stats = computeTenantStats(tenants);
    return stats.total === tenants.length;
  }),
  { numRuns: 100 }
);
console.log('  ✓ 3a: total count equals the length of the tenant list');

// 3b: Suspended count equals the number of tenants with status "suspended"
fc.assert(
  fc.property(tenantListArb, (tenants) => {
    const stats = computeTenantStats(tenants);
    const expected = tenants.filter(t => t.status === 'suspended').length;
    return stats.suspended === expected;
  }),
  { numRuns: 100 }
);
console.log('  ✓ 3b: suspended count matches tenants with status "suspended"');

// 3c: Active count equals tenants with status "active" or empty/falsy status
fc.assert(
  fc.property(tenantListArb, (tenants) => {
    const stats = computeTenantStats(tenants);
    const expected = tenants.filter(t => !t.status || t.status === 'active').length;
    return stats.active === expected;
  }),
  { numRuns: 100 }
);
console.log('  ✓ 3c: active count matches tenants with status "active" or empty');

// 3d: Counts are non-negative
fc.assert(
  fc.property(tenantListArb, (tenants) => {
    const stats = computeTenantStats(tenants);
    return stats.total >= 0 && stats.active >= 0 && stats.suspended >= 0;
  }),
  { numRuns: 100 }
);
console.log('  ✓ 3d: all counts are non-negative');

// 3e: Active + suspended <= total (other statuses like pending/deleted exist)
fc.assert(
  fc.property(tenantListArb, (tenants) => {
    const stats = computeTenantStats(tenants);
    return stats.active + stats.suspended <= stats.total;
  }),
  { numRuns: 100 }
);
console.log('  ✓ 3e: active + suspended <= total');

// 3f: Empty tenant list yields all zeros
fc.assert(
  fc.property(fc.constant([] as Tenant[]), (tenants: Tenant[]) => {
    const stats = computeTenantStats(tenants);
    return stats.total === 0 && stats.active === 0 && stats.suspended === 0;
  }),
  { numRuns: 100 }
);
console.log('  ✓ 3f: empty tenant list yields all zeros');

// 3g: All-active list has active === total and suspended === 0
fc.assert(
  fc.property(
    fc.array(tenantArb.map(t => ({ ...t, status: 'active' })), { minLength: 1, maxLength: 30 }),
    (tenants) => {
      const stats = computeTenantStats(tenants);
      return stats.active === stats.total && stats.suspended === 0;
    }
  ),
  { numRuns: 100 }
);
console.log('  ✓ 3g: all-active list has active === total and suspended === 0');

// 3h: All-suspended list has suspended === total and active === 0
fc.assert(
  fc.property(
    fc.array(tenantArb.map(t => ({ ...t, status: 'suspended' })), { minLength: 1, maxLength: 30 }),
    (tenants) => {
      const stats = computeTenantStats(tenants);
      return stats.suspended === stats.total && stats.active === 0;
    }
  ),
  { numRuns: 100 }
);
console.log('  ✓ 3h: all-suspended list has suspended === total and active === 0');

console.log('Property 3: PASSED\n');

console.log('=== All admin dashboard property tests PASSED ===');
