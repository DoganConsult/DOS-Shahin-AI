import { describe, it, expect, beforeAll } from 'vitest';

// Phase 11 regression guard (mirrors services/compliance-controls-service
// /src/__tests__/aggregator-load.test.ts from M4).
// Importing the aggregator triggers every loadModuleRoute call so any
// subsequent regression (wrong path depth, missing dist, non-Router
// default) surfaces here instead of as a silent live 404.

const REQUIRED_ROUTES = [
  'evidence/collection/evidence-collectors',
  'evidence/collection/evidence-freshness',
  'evidence/collection/evidence-schedules',
  'evidence/collection/pipeline-webhook',
  'evidence/core/evidence-admin',
  'evidence/core/evidence-analysis',
  'evidence/core/evidence-attachments',
  'evidence/core/evidence-catalog',
  'evidence/core/evidence-core-service',
  'evidence/core/evidence-core',
  'evidence/core/evidence-entity-integration',
  'evidence/core/evidence-files',
  'evidence/core/evidence-health',
  'evidence/core/evidence',
  'evidence/evidence-diagnostics',
  'evidence/reporting/evidence-dashboard',
  'evidence/reporting/evidence-packages',
  'evidence/reporting/evidence-reports',
  'evidence/reporting/evidence-reuse',
  'evidence/workflow/evidence-requests',
  'evidence/workflow/evidence-requirements',
  'evidence/workflow/evidence-reviews',
  'evidence/workflow/evidence-tasks',
  'evidence/admin/evidence-admin',
  'reporting/misc/board-reports',
  'reporting/report/report-center',
  'reporting/report/report-ext',
  'reporting/report/report-generator',
  'reporting/report/report-hub',
  'reporting/report/report-scenario',
  'reporting/report/report-stream',
  'reporting/report/report',
  'reporting/reporting/reporting-admin',
  'reporting/reporting/reporting-advanced',
  'reporting/reporting/reporting-document-advanced',
  'reporting/reporting-diagnostics',
  'reporting/sample/sample-reports',
  'reporting/admin/reporting-admin',
];

describe('evidence-audit-reporting aggregator load', () => {
  let results: { name: string; path: string; loaded: boolean; error?: string }[];

  beforeAll(async () => {
    await import('../routes/index');
    const { getModuleLoadResults } = await import('@dos/service-bootstrap');
    results = getModuleLoadResults().modules;
  });

  it('records every required route', () => {
    const recorded = new Set(results.map((m) => m.name));
    const missing = REQUIRED_ROUTES.filter((n) => !recorded.has(n));
    expect(missing, `aggregator missing these required mounts: ${missing.join(', ')}`).toEqual([]);
  });

  it('loaded every required route successfully', () => {
    const byName = new Map(results.map((m) => [m.name, m]));
    const failures = REQUIRED_ROUTES
      .map((n) => byName.get(n))
      .filter((m) => m && !m.loaded)
      .map((m) => `${m!.name}: ${m!.error ?? 'unknown'}`);
    expect(failures, `these aggregator routes failed to load:\n  ${failures.join('\n  ')}`).toEqual([]);
  });
});
