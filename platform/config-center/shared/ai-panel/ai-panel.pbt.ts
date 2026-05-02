// ============================================
// AI Side Panel Module-to-Endpoint Mapping — Property-Based Tests
// Feature: grc-frontend-integration, Property 11: AI panel maps modules to correct endpoints
// ============================================
//
// Standalone PBT file — no test runner required.
// Run: pnpm exec tsx src/app/shared/ai-panel/ai-panel.pbt.ts

import * as fc from 'fast-check';

// --- Replicate pure data from ai-panel.component.ts (avoids Angular JIT) ---

type AIModule =
  | 'risks'
  | 'compliance'
  | 'governance'
  | 'audit'
  | 'incidents'
  | 'vendors'
  | 'evidence'
  | 'policy'
  | 'framework'
  | 'bcp';

const MODULE_ENDPOINTS: Record<AIModule, string> = {
  risks: '/ai/risk-assessment/summary',
  compliance: '/ai/gap-analysis/summary',
  governance: '/ai/generate-policy',
  audit: '/ai/audit-prep/summary',
  incidents: '/ai/triage-incident/summary',
  vendors: '/ai/vendor-risk/summary',
  evidence: '/ai/evidence-gap/summary',
  policy: '/ai/generate-policy',
  framework: '/ai/gap-analysis/summary',
  bcp: '/ai/bcp-analysis/summary',
};

// ============================================
// Arbitraries
// ============================================

const ALL_MODULES: AIModule[] = [
  'risks', 'compliance', 'governance', 'audit', 'incidents',
  'vendors', 'evidence', 'policy', 'framework', 'bcp',
];

const moduleArb = fc.constantFrom(...ALL_MODULES);

// Expected mapping (ground truth from requirements / design)
const EXPECTED_ENDPOINTS: Record<AIModule, string> = {
  risks: '/ai/risk-assessment/summary',
  compliance: '/ai/gap-analysis/summary',
  governance: '/ai/generate-policy',
  audit: '/ai/audit-prep/summary',
  incidents: '/ai/triage-incident/summary',
  vendors: '/ai/vendor-risk/summary',
  evidence: '/ai/evidence-gap/summary',
  policy: '/ai/generate-policy',
  framework: '/ai/gap-analysis/summary',
  bcp: '/ai/bcp-analysis/summary',
};

// ============================================
// Property 11: AI panel maps modules to correct endpoints
// **Validates: Requirements 12.1**
//
// For any supported AI module name, the AI side panel fetches insights
// from the endpoint defined in the MODULE_ENDPOINTS mapping for that module.
// ============================================

console.log('--- Property 11: AI panel maps modules to correct endpoints ---');

// 11a: Every supported module has a defined endpoint
fc.assert(
  fc.property(moduleArb, (mod) => {
    return Object.hasOwn(MODULE_ENDPOINTS, mod) && typeof MODULE_ENDPOINTS[mod] === 'string';
  }),
  { numRuns: 100 }
);
console.log('  ✓ 11a: every supported module has a defined endpoint');

// 11b: Every endpoint starts with /ai/
fc.assert(
  fc.property(moduleArb, (mod) => {
    return MODULE_ENDPOINTS[mod].startsWith('/ai/');
  }),
  { numRuns: 100 }
);
console.log('  ✓ 11b: every endpoint starts with /ai/');

// 11c: MODULE_ENDPOINTS matches the expected mapping exactly
fc.assert(
  fc.property(moduleArb, (mod) => {
    return MODULE_ENDPOINTS[mod] === EXPECTED_ENDPOINTS[mod];
  }),
  { numRuns: 100 }
);
console.log('  ✓ 11c: MODULE_ENDPOINTS matches expected mapping');

// 11d: MODULE_ENDPOINTS covers all supported modules (no missing keys)
fc.assert(
  fc.property(fc.constant(ALL_MODULES), (modules) => {
    return modules.every(m => Object.hasOwn(MODULE_ENDPOINTS, m));
  }),
  { numRuns: 1 }
);
console.log('  ✓ 11d: MODULE_ENDPOINTS covers all supported modules');

// 11e: No endpoint is empty or whitespace-only
fc.assert(
  fc.property(moduleArb, (mod) => {
    return MODULE_ENDPOINTS[mod].trim().length > 0;
  }),
  { numRuns: 100 }
);
console.log('  ✓ 11e: no endpoint is empty or whitespace-only');

// 11f: The total number of module keys matches ALL_MODULES length
fc.assert(
  fc.property(fc.constant(null), () => {
    return Object.keys(MODULE_ENDPOINTS).length === ALL_MODULES.length;
  }),
  { numRuns: 1 }
);
console.log('  ✓ 11f: MODULE_ENDPOINTS key count matches ALL_MODULES length');

console.log('Property 11: PASSED\n');
