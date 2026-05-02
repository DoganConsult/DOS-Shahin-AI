// ============================================
// Scope Filter Bar — Property-Based Tests (Property 15)
// Feature: smart-seeding-quick-wins, Property 15: Scope filter emission and persistence
// ============================================
//
// Standalone PBT file — no test runner required.
// Run: pnpm exec tsx src/app/shared/scope-filter-bar/scope-filter-bar.pbt.ts
//
// **Validates: Requirements 15.2, 15.3**

import * as fc from 'fast-check';

// ── Re-declare interfaces (avoid Angular DI / decorator imports) ─────

interface OrgEntity {
  entityId: string;
  nameEn: string;
  nameAr: string;
  parentId: string | null;
}

interface ScopeFilter {
  entityId: string | null;
  framework: string | null;
  period: 'last-30d' | 'last-90d' | 'last-1y' | 'all';
}

const STORAGE_KEY = 'scope-filter-state';
const VALID_PERIODS: ScopeFilter['period'][] = ['last-30d', 'last-90d', 'last-1y', 'all'];

// ── Pure logic extracted from the component ──────────────────────────

function buildFilter(
  selectedEntityId: string | null,
  selectedFramework: string | null,
  selectedPeriod: ScopeFilter['period'],
): ScopeFilter {
  return {
    entityId: selectedEntityId,
    framework: selectedFramework,
    period: selectedPeriod,
  };
}

function persistState(storage: Map<string, string>, filter: ScopeFilter): void {
  try {
    storage.set(STORAGE_KEY, JSON.stringify(filter));
  } catch { /* graceful degradation */ }
}

function restoreState(storage: Map<string, string>): ScopeFilter {
  const defaults: ScopeFilter = { entityId: null, framework: null, period: 'last-90d' };
  try {
    const raw = storage.get(STORAGE_KEY);
    if (raw) {
      const saved: ScopeFilter = JSON.parse(raw);
      return {
        entityId: saved.entityId ?? null,
        framework: saved.framework ?? null,
        period: VALID_PERIODS.includes(saved.period) ? saved.period : 'last-90d',
      };
    }
  } catch { /* graceful degradation */ }
  return defaults;
}

// ── Arbitraries ──────────────────────────────────────────────────────

const arbEntityId = fc.oneof(
  fc.constant(null),
  fc.string({ minLength: 1, maxLength: 36 }),
);

const arbFramework = fc.oneof(
  fc.constant(null),
  fc.string({ minLength: 1, maxLength: 30 }),
);

const arbPeriod: fc.Arbitrary<ScopeFilter['period']> = fc.constantFrom(
  'last-30d' as const,
  'last-90d' as const,
  'last-1y' as const,
  'all' as const,
);

const arbScopeFilter: fc.Arbitrary<ScopeFilter> = fc.record({
  entityId: arbEntityId,
  framework: arbFramework,
  period: arbPeriod,
});

const arbOrgEntity: fc.Arbitrary<OrgEntity> = fc.record({
  entityId: fc.string({ minLength: 1, maxLength: 36 }),
  nameEn: fc.string({ minLength: 1, maxLength: 40 }),
  nameAr: fc.string({ minLength: 1, maxLength: 40 }),
  parentId: fc.oneof(fc.constant(null), fc.string({ minLength: 1, maxLength: 36 })),
});

const arbEntities = fc.array(arbOrgEntity, { minLength: 0, maxLength: 10 });
const arbFrameworks = fc.array(
  fc.string({ minLength: 1, maxLength: 30 }),
  { minLength: 0, maxLength: 10 },
);

// ============================================
// Property 15a: Emitted ScopeFilter matches selection
// Feature: smart-seeding-quick-wins, Property 15: Scope filter emission and persistence
// **Validates: Requirements 15.2**
//
// For any filter selection (entity, framework, period), the built
// ScopeFilter SHALL contain exactly the selected values.
// ============================================

console.log('--- Property 15a: Emitted ScopeFilter matches selection ---');

fc.assert(
  fc.property(arbEntityId, arbFramework, arbPeriod, (entityId, framework, period) => {
    const filter = buildFilter(entityId, framework, period);

    // Emitted filter must match the selection exactly
    if (filter.entityId !== entityId) return false;
    if (filter.framework !== framework) return false;
    if (filter.period !== period) return false;
    return true;
  }),
  { numRuns: 100 },
);
console.log('  ✓ buildFilter always emits ScopeFilter matching the selection');

// ============================================
// Property 15b: sessionStorage round-trip preserves filter state
// Feature: smart-seeding-quick-wins, Property 15: Scope filter emission and persistence
// **Validates: Requirements 15.3**
//
// For any valid ScopeFilter, persisting to sessionStorage then
// restoring SHALL return the same filter state.
// ============================================

console.log('--- Property 15b: sessionStorage round-trip preserves filter state ---');

fc.assert(
  fc.property(arbScopeFilter, (filter) => {
    const storage = new Map<string, string>();

    // Persist
    persistState(storage, filter);

    // Restore
    const restored = restoreState(storage);

    // Round-trip must preserve all fields
    if (restored.entityId !== filter.entityId) return false;
    if (restored.framework !== filter.framework) return false;
    if (restored.period !== filter.period) return false;
    return true;
  }),
  { numRuns: 100 },
);
console.log('  ✓ sessionStorage round-trip preserves filter state');

// ============================================
// Property 15c: Filter emission with entity/framework from input lists
// Feature: smart-seeding-quick-wins, Property 15: Scope filter emission and persistence
// **Validates: Requirements 15.2**
//
// For any set of entities and frameworks, selecting an entity from
// the list and a framework from the list SHALL produce a valid
// ScopeFilter with those values.
// ============================================

console.log('--- Property 15c: Filter emission with entity/framework from input lists ---');

fc.assert(
  fc.property(arbEntities, arbFrameworks, arbPeriod, (entities, frameworks, period) => {
    // Pick entity from list or null
    const entityId = entities.length > 0 ? entities[0].entityId : null;
    // Pick framework from list or null
    const framework = frameworks.length > 0 ? frameworks[0] : null;

    const filter = buildFilter(entityId, framework, period);

    // Filter must contain the selected values
    if (filter.entityId !== entityId) return false;
    if (filter.framework !== framework) return false;
    if (filter.period !== period) return false;

    // Persist and restore round-trip
    const storage = new Map<string, string>();
    persistState(storage, filter);
    const restored = restoreState(storage);

    if (restored.entityId !== entityId) return false;
    if (restored.framework !== framework) return false;
    if (restored.period !== period) return false;
    return true;
  }),
  { numRuns: 100 },
);
console.log('  ✓ Filter emission with entity/framework from input lists works correctly');

// ============================================
// Property 15d: Restore from empty storage returns defaults
// Feature: smart-seeding-quick-wins, Property 15: Scope filter emission and persistence
// **Validates: Requirements 15.3**
//
// When sessionStorage has no saved state, restoreState SHALL
// return the default filter (null entity, null framework, 'last-90d').
// ============================================

console.log('--- Property 15d: Restore from empty storage returns defaults ---');

fc.assert(
  fc.property(fc.constant(null), () => {
    const storage = new Map<string, string>();
    const restored = restoreState(storage);

    if (restored.entityId !== null) return false;
    if (restored.framework !== null) return false;
    if (restored.period !== 'last-90d') return false;
    return true;
  }),
  { numRuns: 100 },
);
console.log('  ✓ Empty storage returns default filter state');

// ============================================
// Property 15e: Invalid period in storage falls back to default
// Feature: smart-seeding-quick-wins, Property 15: Scope filter emission and persistence
// **Validates: Requirements 15.3**
//
// When sessionStorage contains a filter with an invalid period,
// restoreState SHALL fall back to 'last-90d'.
// ============================================

console.log('--- Property 15e: Invalid period in storage falls back to default ---');

fc.assert(
  fc.property(
    arbEntityId,
    arbFramework,
    fc.string({ minLength: 1, maxLength: 20 }).filter(s => !VALID_PERIODS.includes(s as unknown)),
    (entityId, framework, badPeriod) => {
      const storage = new Map<string, string>();
      const badFilter = { entityId, framework, period: badPeriod };
      storage.set(STORAGE_KEY, JSON.stringify(badFilter));

      const restored = restoreState(storage);

      // Entity and framework should be restored
      if (restored.entityId !== entityId) return false;
      if (restored.framework !== framework) return false;
      // Invalid period should fall back to default
      if (restored.period !== 'last-90d') return false;
      return true;
    },
  ),
  { numRuns: 100 },
);
console.log('  ✓ Invalid period in storage falls back to last-90d');

console.log('\n=== All scope-filter-bar property tests PASSED ===');
