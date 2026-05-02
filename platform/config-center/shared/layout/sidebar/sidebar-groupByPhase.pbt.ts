// ============================================
// Sidebar Lifecycle Phase Grouping — Property-Based Test (Property 6)
// Feature: ux-journey-evaluation, Property 6: Sidebar lifecycle phase grouping correctness
// **Validates: Requirements 6.1**
// ============================================
//
// Standalone PBT file — no test runner required.
// Run: pnpm exec tsx src/app/shared/layout/sidebar-groupByPhase.pbt.ts

import * as fc from 'fast-check';

// ============================================
// Types — mirrors sidebar.component.ts
// ============================================

type LifecyclePhase = 'plan' | 'assess' | 'design' | 'implement' | 'operate' | 'assure' | 'improve';

interface NavItem {
  icon: string;
  labelKey: string;
  route: string;
  requiredPermission: string;
  section?: string;
  lifecyclePhase: LifecyclePhase | 'account';
}

// ============================================
// groupByPhase — copied from sidebar.component.ts (pure function under test)
// ============================================

function groupByPhase(items: NavItem[]): { phase: string; items: NavItem[] }[] {
  const groups: { phase: string; items: NavItem[] }[] = [];
  let currentPhase: string | null = null;
  for (const item of items) {
    if (item.lifecyclePhase !== currentPhase) {
      currentPhase = item.lifecyclePhase;
      groups.push({ phase: currentPhase, items: [item] });
    } else {
      groups[groups.length - 1].items.push(item);
    }
  }
  return groups;
}

// ============================================
// Arbitraries — smart generators for NavItem
// ============================================

const ALL_PHASES: (LifecyclePhase | 'account')[] = [
  'plan', 'assess', 'design', 'implement', 'operate', 'assure', 'improve', 'account',
];

const phaseArb = fc.constantFrom<LifecyclePhase | 'account'>(...ALL_PHASES);

const navItemArb: fc.Arbitrary<NavItem> = fc.record({
  icon: fc.constantFrom('dashboard', 'risks', 'policies', 'audit', 'profile', 'workflows'),
  labelKey: fc.string({ minLength: 1, maxLength: 30 }),
  route: fc.string({ minLength: 1, maxLength: 30 }).map(s => '/' + s),
  requiredPermission: fc.constantFrom('analytics.report.read', 'policy.document.read', 'risk.record.read', 'audit.record.read', 'framework.record.read'),
  section: fc.constantFrom('main', 'grc', 'operations', 'intelligence', 'account'),
  lifecyclePhase: phaseArb,
});

const navItemArrayArb = fc.array(navItemArb, { minLength: 0, maxLength: 50 });

// ============================================
// Property 6: Sidebar lifecycle phase grouping correctness
// ============================================

console.log('--- Property 6: Sidebar lifecycle phase grouping correctness ---');

// 6a: Every item within a group has the same lifecyclePhase as the group's phase
fc.assert(
  fc.property(navItemArrayArb, (items) => {
    const groups = groupByPhase(items);
    return groups.every(g => g.items.every(item => item.lifecyclePhase === g.phase));
  }),
  { numRuns: 200 }
);
console.log('  ✓ 6a: every item in a group has the same lifecyclePhase as the group phase');

// 6b: No items are lost — total items across all groups equals input length
fc.assert(
  fc.property(navItemArrayArb, (items) => {
    const groups = groupByPhase(items);
    const totalItems = groups.reduce((sum, g) => sum + g.items.length, 0);
    return totalItems === items.length;
  }),
  { numRuns: 200 }
);
console.log('  ✓ 6b: no items lost — total grouped items equals input length');

// 6c: All groups are non-empty
fc.assert(
  fc.property(navItemArrayArb, (items) => {
    const groups = groupByPhase(items);
    return groups.every(g => g.items.length > 0);
  }),
  { numRuns: 200 }
);
console.log('  ✓ 6c: all groups are non-empty');

// 6d: Flattening groups preserves original item order
fc.assert(
  fc.property(navItemArrayArb, (items) => {
    const groups = groupByPhase(items);
    const flattened = groups.flatMap(g => g.items);
    if (flattened.length !== items.length) return false;
    return flattened.every((item, idx) => item === items[idx]);
  }),
  { numRuns: 200 }
);
console.log('  ✓ 6d: flattening groups preserves original input order');

// 6e: Adjacent groups have different phases (consecutive groups are distinct)
fc.assert(
  fc.property(navItemArrayArb, (items) => {
    const groups = groupByPhase(items);
    for (let i = 1; i < groups.length; i++) {
      if (groups[i].phase === groups[i - 1].phase) return false;
    }
    return true;
  }),
  { numRuns: 200 }
);
console.log('  ✓ 6e: adjacent groups have different phases');

// 6f: Empty input produces empty groups
fc.assert(
  fc.property(fc.constant([] as NavItem[]), (items: NavItem[]) => {
    const groups = groupByPhase(items);
    return groups.length === 0;
  }),
  { numRuns: 10 }
);
console.log('  ✓ 6f: empty input produces empty groups');

// 6g: Single-phase input produces exactly one group
fc.assert(
  fc.property(
    phaseArb,
    fc.array(navItemArb, { minLength: 1, maxLength: 20 }),
    (phase, items) => {
      const samePhaseItems = items.map(item => ({ ...item, lifecyclePhase: phase }));
      const groups = groupByPhase(samePhaseItems);
      return groups.length === 1 && groups[0].phase === phase && groups[0].items.length === samePhaseItems.length;
    }
  ),
  { numRuns: 200 }
);
console.log('  ✓ 6g: all items with same phase produce exactly one group');

console.log('\nProperty 6: PASSED');
console.log('=== Sidebar groupByPhase property tests PASSED ===');
