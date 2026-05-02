import { describe, it, expect, beforeAll } from 'vitest';

// Phase 10A regression guard (audit §6.3 and commit 2b3f65ee):
// The aggregator `src/routes/index.ts` declares loadModuleRoute(...) calls
// whose second argument is the compiled-dist path of a module route file.
// If that path is wrong or the compiled JS is missing, loadModuleRoute
// silently falls back to an empty Router and the FE hits a live 404.
//
// The runtime already records every load attempt via
// @dos/service-bootstrap/getModuleLoadResults, so this test forces the
// aggregator to be imported in Node and then asserts every required
// route loaded. It fails loudly whenever a path breaks or a dist file
// disappears — which previously took pm2 + a /api/compliance-controls/modules
// probe to catch.
//
// Required route names are the exact `name` values passed to
// loadModuleRoute in src/routes/index.ts. This list is the authoritative
// contract for the compliance-controls aggregator; adding or removing a
// mount MUST update this list so the test stays load-bearing.

const REQUIRED_ROUTES = [
  // compliance/compliance/*
  'compliance/compliance/compliance-admin',
  'compliance/compliance/compliance-advanced',
  'compliance/compliance/compliance-as-code',
  'compliance/compliance/compliance-assertions',
  'compliance/compliance/compliance-attestation',
  'compliance/compliance/compliance-drift',
  'compliance/compliance/compliance-extended',
  'compliance/compliance/compliance-gaps',
  'compliance/compliance/compliance-workspace',
  'compliance/compliance/compliance',
  // compliance/* (root-level)
  'compliance/compliance-diagnostics',
  'compliance/compliance-obligations',
  'compliance/control-lifecycle',
  // compliance/cws/*
  'compliance/cws/cws-assessments-audit',
  'compliance/cws/cws-controls-findings',
  'compliance/cws/cws-frameworks',
  'compliance/cws/cws-gaps-roadmap',
  'compliance/cws/cws-overview',
  'compliance/cws/cws-posture-foundation',
  'compliance/cws/cws-regulatory',
  // compliance/ksa/*
  'compliance/ksa/ksa-cross-framework-mapping',
  'compliance/ksa/ksa-regulatory-changes',
  'compliance/ksa/ksa-regulatory-reports',
  'compliance/ksa/ksa-sector-maturity',
  // compliance/misc/assessment/*
  'compliance/misc/assessment/continuous-attestation',
  'compliance/misc/assessment/nca-assessment',
  'compliance/misc/assessment/nca-export',
  'compliance/misc/assessment/rcsa',
  'compliance/misc/assessment/sama-assessment',
  // compliance/misc/controls/*
  'compliance/misc/controls/ccm-cloud',
  'compliance/misc/controls/compensating-controls',
  'compliance/misc/controls/control-process-cycle',
  'compliance/misc/controls/controls',
  'compliance/misc/controls/csa',
  // compliance/misc/frameworks/*
  'compliance/misc/frameworks/framework-harmonization',
  'compliance/misc/frameworks/framework-mapping',
  'compliance/misc/frameworks/frameworks',
  'compliance/misc/frameworks/ucf',
  // compliance/misc/regulatory/*
  'compliance/misc/regulatory/jurisdiction',
  'compliance/misc/regulatory/knowledge-hub',
  'compliance/misc/regulatory/regulatory-content',
  'compliance/misc/regulatory/regulatory-delta',
  'compliance/misc/regulatory/requirement-normalization',
  // compliance/misc/scoring/*
  'compliance/misc/scoring/saudi-regulatory-score',
  'compliance/misc/scoring/scoring-policies',
  'compliance/misc/scoring/scoring-policy-engine',
  // compliance/regulator/*
  'compliance/regulator/regulator-heatmap',
  'compliance/regulator/regulator-portal',
  'compliance/regulator/regulator-registry',
  // compliance/admin
  'compliance/admin/compliance-admin',
  // controls/*
  'controls/control-admin',
  'controls/control-certification',
  'controls/control-deficiency',
  'controls/control-detail',
  'controls/control-home',
  'controls/control-mapping',
  'controls/control-monitoring-admin',
  'controls/control-reports',
  'controls/control-work-queue',
  'controls/control-workflow',
  'controls/controls-diagnostics',
  'controls/admin/controls-admin',
];

describe('compliance aggregator route load (Phase 10A §6.3 guard)', () => {
  let results: { name: string; path: string; loaded: boolean; error?: string }[];

  beforeAll(async () => {
    // Importing the aggregator triggers every loadModuleRoute call.
    await import('../routes/index');
    const { getModuleLoadResults } = await import('@dos/service-bootstrap');
    results = getModuleLoadResults().modules;
  });

  it('records at least every required route', () => {
    const recorded = new Set(results.map((m) => m.name));
    const missing = REQUIRED_ROUTES.filter((n) => !recorded.has(n));
    expect(missing, `aggregator missing these required mounts: ${missing.join(', ')}`).toEqual([]);
  });

  it('loaded every required route successfully', () => {
    const byName = new Map(results.map((m) => [m.name, m]));
    const failures = REQUIRED_ROUTES
      .map((n) => byName.get(n))
      .filter((m) => m && !m.loaded)
      .map((m) => `${m!.name}: ${m!.error ?? 'unknown error'}`);
    expect(failures, `these aggregator routes failed to load:\n  ${failures.join('\n  ')}`).toEqual([]);
  });
});
