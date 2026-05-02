/**
 * WidgetDiagnosticsService -- Unit Tests
 *
 * Validates the five parallel infrastructure checks (runDiagnostics),
 * render-health checks (runRenderDiagnostics), and publication-health
 * checks (runPublicationDiagnostics).
 *
 * All database access is mocked via safeQuery / tenantSchema from
 * ../../../config/database.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockSafeQuery = vi.fn();
vi.mock('../../../config/database', () => ({
  safeQuery: (...args: unknown[]) => mockSafeQuery(...args),
  tenantSchema: (tenantId: string) => `tenant_${tenantId}`,
}));

import { WidgetDiagnosticsService, runDiagnostics } from './widgets-diagnostics.service';

describe('WidgetDiagnosticsService', () => {
  let service: WidgetDiagnosticsService;

  beforeEach(() => {
    mockSafeQuery.mockReset();
    service = new WidgetDiagnosticsService('test-tenant');
  });

  // ---------------------------------------------------------------------------
  // runDiagnostics -- infrastructure checks
  // ---------------------------------------------------------------------------
  describe('runDiagnostics', () => {
    /**
     * Helper that sets up mockSafeQuery to simulate all 5 initial checks plus
     * the 6 dependency-table checks passing. The method runs the first 4 checks
     * via Promise.all, then checkDependencyTables loops over 6 tables serially.
     * However, since Promise.all fires them at the same time, we need to handle
     * the call ordering carefully.
     *
     * Call order (based on Promise.all + sequential deps):
     *   1. checkSchemaExists         -> information_schema.schemata
     *   2. checkRegistryTable        -> information_schema.tables (widgets_registry)
     *   3. checkBundleTable          -> information_schema.tables (widgets_bundles)
     *   4. checkRenderLogTable       -> information_schema.tables (widgets_render_log)
     *   5. checkDependencyTables     -> 6 sequential queries for dep tables
     * Total calls: 4 + 6 = 10
     */
    function mockAllChecksPassing(): void {
      mockSafeQuery.mockResolvedValue({ rows: [{ '?column?': 1 }] });
    }

    function mockSchemaCheckFails(): void {
      // First call is checkSchemaExists -- return empty rows
      // The remaining calls return rows so the rest "pass"
      mockSafeQuery
        .mockResolvedValueOnce({ rows: [] })                     // schema_exists: FAIL
        .mockResolvedValue({ rows: [{ '?column?': 1 }] });      // everything else: pass
    }

    it('returns healthy when all checks pass', async () => {
      mockAllChecksPassing();

      const result = await service.runDiagnostics();

      expect(result.moduleCode).toBe('widgets');
      expect(result.healthy).toBe(true);
      expect(result.checkedAt).toBeTruthy();
      // 4 core checks + 6 dependency tables = 10
      expect(result.checks.length).toBe(10);
      expect(result.checks.every(c => c.passed)).toBe(true);

      // Verify named checks are present
      const names = result.checks.map(c => c.name);
      expect(names).toContain('schema_exists');
      expect(names).toContain('registry_table_exists');
      expect(names).toContain('bundle_table_exists');
      expect(names).toContain('render_log_table_exists');
      expect(names).toContain('dep_risks');
      expect(names).toContain('dep_controls');
      expect(names).toContain('dep_findings');
      expect(names).toContain('dep_evidence');
      expect(names).toContain('dep_action_items');
      expect(names).toContain('dep_policies');
    });

    it('returns unhealthy when schema is missing', async () => {
      mockSchemaCheckFails();

      const result = await service.runDiagnostics();

      expect(result.healthy).toBe(false);
      const schemaCheck = result.checks.find(c => c.name === 'schema_exists');
      expect(schemaCheck).toBeDefined();
      expect(schemaCheck!.passed).toBe(false);
    });

    it('returns unhealthy when a table is missing', async () => {
      // Schema check passes, registry check fails, rest pass
      mockSafeQuery
        .mockResolvedValueOnce({ rows: [{ '?column?': 1 }] })   // schema: pass
        .mockResolvedValueOnce({ rows: [] })                     // registry: FAIL
        .mockResolvedValue({ rows: [{ '?column?': 1 }] });      // rest: pass

      const result = await service.runDiagnostics();

      expect(result.healthy).toBe(false);
      const registryCheck = result.checks.find(c => c.name === 'registry_table_exists');
      expect(registryCheck).toBeDefined();
      expect(registryCheck!.passed).toBe(false);
    });

    it('returns unhealthy when a dependency table is missing', async () => {
      // First 4 checks pass, then first dep (risks) fails
      mockSafeQuery
        .mockResolvedValueOnce({ rows: [{ '?column?': 1 }] })   // schema
        .mockResolvedValueOnce({ rows: [{ '?column?': 1 }] })   // registry
        .mockResolvedValueOnce({ rows: [{ '?column?': 1 }] })   // bundles
        .mockResolvedValueOnce({ rows: [{ '?column?': 1 }] })   // render_log
        .mockResolvedValueOnce({ rows: [] })                     // dep_risks: FAIL
        .mockResolvedValue({ rows: [{ '?column?': 1 }] });      // rest pass

      const result = await service.runDiagnostics();

      expect(result.healthy).toBe(false);
      const risksCheck = result.checks.find(c => c.name === 'dep_risks');
      expect(risksCheck).toBeDefined();
      expect(risksCheck!.passed).toBe(false);
    });

    it('handles query errors gracefully via catch fallback', async () => {
      // All queries reject -- .catch() in the service converts to { rows: [] }
      mockSafeQuery.mockRejectedValue(new Error('Connection refused'));

      const result = await service.runDiagnostics();

      // Should not throw; every check reports passed=false
      expect(result.moduleCode).toBe('widgets');
      expect(result.healthy).toBe(false);
      expect(result.checks.every(c => !c.passed)).toBe(true);
    });

    it('exported runDiagnostics function creates a service and delegates', async () => {
      mockAllChecksPassing();

      const result = await runDiagnostics('test-tenant');

      expect(result.moduleCode).toBe('widgets');
      expect(result.healthy).toBe(true);
    });
  });

  // ---------------------------------------------------------------------------
  // runRenderDiagnostics -- render health
  // ---------------------------------------------------------------------------
  describe('runRenderDiagnostics', () => {
    it('passes when error rate is low and latency is acceptable', async () => {
      mockSafeQuery.mockResolvedValueOnce({
        rows: [{
          total_renders: 1000,
          failed_renders: 5,       // 0.5% < 10%
          avg_duration_ms: 300,    // < 2000ms
          max_duration_ms: 900,
        }],
      });

      const checks = await service.runRenderDiagnostics();

      expect(checks).toHaveLength(2);

      const errorCheck = checks.find(c => c.name === 'render_error_rate')!;
      expect(errorCheck.passed).toBe(true);
      expect(errorCheck.detail).toContain('0.5%');

      const latencyCheck = checks.find(c => c.name === 'render_latency')!;
      expect(latencyCheck.passed).toBe(true);
      expect(latencyCheck.detail).toContain('avg=300ms');
    });

    it('fails when error rate exceeds 10%', async () => {
      mockSafeQuery.mockResolvedValueOnce({
        rows: [{
          total_renders: 100,
          failed_renders: 15,      // 15% > 10%
          avg_duration_ms: 200,
          max_duration_ms: 500,
        }],
      });

      const checks = await service.runRenderDiagnostics();

      const errorCheck = checks.find(c => c.name === 'render_error_rate')!;
      expect(errorCheck.passed).toBe(false);
      expect(errorCheck.detail).toContain('15.0%');
    });

    it('fails when average latency exceeds 2000ms', async () => {
      mockSafeQuery.mockResolvedValueOnce({
        rows: [{
          total_renders: 50,
          failed_renders: 1,       // 2% < 10% -- fine
          avg_duration_ms: 2500,   // > 2000ms -- fails
          max_duration_ms: 5000,
        }],
      });

      const checks = await service.runRenderDiagnostics();

      const latencyCheck = checks.find(c => c.name === 'render_latency')!;
      expect(latencyCheck.passed).toBe(false);
      expect(latencyCheck.detail).toContain('avg=2500ms');
    });

    it('passes when exactly at the 10% error boundary (not exceeded)', async () => {
      // errorRate = 10/100 = 0.1 which is NOT < 0.1, so it should fail
      mockSafeQuery.mockResolvedValueOnce({
        rows: [{
          total_renders: 100,
          failed_renders: 10,
          avg_duration_ms: 100,
          max_duration_ms: 200,
        }],
      });

      const checks = await service.runRenderDiagnostics();

      const errorCheck = checks.find(c => c.name === 'render_error_rate')!;
      // Exactly 10% equals the threshold; < 0.1 is false at 0.1
      expect(errorCheck.passed).toBe(false);
    });

    it('treats zero total renders as 0% error rate (passes)', async () => {
      mockSafeQuery.mockResolvedValueOnce({
        rows: [{
          total_renders: 0,
          failed_renders: 0,
          avg_duration_ms: 0,
          max_duration_ms: 0,
        }],
      });

      const checks = await service.runRenderDiagnostics();

      const errorCheck = checks.find(c => c.name === 'render_error_rate')!;
      expect(errorCheck.passed).toBe(true);
      expect(errorCheck.detail).toContain('0.0%');

      const latencyCheck = checks.find(c => c.name === 'render_latency')!;
      expect(latencyCheck.passed).toBe(true);
    });

    it('handles query error gracefully (catch fallback returns zeros)', async () => {
      mockSafeQuery.mockRejectedValueOnce(new Error('table not found'));

      const checks = await service.runRenderDiagnostics();

      // Fallback: {total_renders:0, failed_renders:0, avg_duration_ms:0, max_duration_ms:0}
      expect(checks).toHaveLength(2);

      const errorCheck = checks.find(c => c.name === 'render_error_rate')!;
      expect(errorCheck.passed).toBe(true); // 0/0 => errorRate=0 => <0.1

      const latencyCheck = checks.find(c => c.name === 'render_latency')!;
      expect(latencyCheck.passed).toBe(true); // 0 < 2000
    });
  });

  // ---------------------------------------------------------------------------
  // runPublicationDiagnostics -- publication health
  // ---------------------------------------------------------------------------
  describe('runPublicationDiagnostics', () => {
    it('passes with few stale drafts and no suspended widgets', async () => {
      mockSafeQuery
        .mockResolvedValueOnce({ rows: [{ cnt: 2 }] })   // stale drafts: 2 < 5
        .mockResolvedValueOnce({ rows: [{ cnt: 0 }] });  // suspended: 0

      const checks = await service.runPublicationDiagnostics();

      expect(checks).toHaveLength(2);

      const staleCheck = checks.find(c => c.name === 'stale_drafts')!;
      expect(staleCheck.passed).toBe(true);
      expect(staleCheck.detail).toContain('2 widgets in draft');

      const suspendedCheck = checks.find(c => c.name === 'suspended_widgets')!;
      expect(suspendedCheck.passed).toBe(true);
      expect(suspendedCheck.detail).toContain('0 suspended');
    });

    it('fails with many stale drafts (>= 5)', async () => {
      mockSafeQuery
        .mockResolvedValueOnce({ rows: [{ cnt: 8 }] })   // stale drafts: 8 >= 5
        .mockResolvedValueOnce({ rows: [{ cnt: 0 }] });  // suspended: 0

      const checks = await service.runPublicationDiagnostics();

      const staleCheck = checks.find(c => c.name === 'stale_drafts')!;
      expect(staleCheck.passed).toBe(false);
      expect(staleCheck.detail).toContain('8 widgets in draft');
    });

    it('fails at exactly 5 stale drafts (boundary)', async () => {
      mockSafeQuery
        .mockResolvedValueOnce({ rows: [{ cnt: 5 }] })   // stale drafts: 5 is NOT < 5
        .mockResolvedValueOnce({ rows: [{ cnt: 0 }] });

      const checks = await service.runPublicationDiagnostics();

      const staleCheck = checks.find(c => c.name === 'stale_drafts')!;
      expect(staleCheck.passed).toBe(false);
    });

    it('flags suspended widgets', async () => {
      mockSafeQuery
        .mockResolvedValueOnce({ rows: [{ cnt: 0 }] })   // stale drafts: 0
        .mockResolvedValueOnce({ rows: [{ cnt: 3 }] });  // suspended: 3

      const checks = await service.runPublicationDiagnostics();

      const suspendedCheck = checks.find(c => c.name === 'suspended_widgets')!;
      expect(suspendedCheck.passed).toBe(false);
      expect(suspendedCheck.detail).toContain('3 suspended');
    });

    it('fails both checks when stale and suspended', async () => {
      mockSafeQuery
        .mockResolvedValueOnce({ rows: [{ cnt: 10 }] })  // stale: 10
        .mockResolvedValueOnce({ rows: [{ cnt: 2 }] });  // suspended: 2

      const checks = await service.runPublicationDiagnostics();

      expect(checks.find(c => c.name === 'stale_drafts')!.passed).toBe(false);
      expect(checks.find(c => c.name === 'suspended_widgets')!.passed).toBe(false);
    });

    it('handles stale-drafts query error gracefully (fallback to 0)', async () => {
      mockSafeQuery
        .mockRejectedValueOnce(new Error('query failed'))  // stale drafts: error -> { rows: [{ cnt: 0 }] }
        .mockResolvedValueOnce({ rows: [{ cnt: 0 }] });   // suspended: 0

      const checks = await service.runPublicationDiagnostics();

      // Fallback sets cnt=0, which is < 5 -> passes
      const staleCheck = checks.find(c => c.name === 'stale_drafts')!;
      expect(staleCheck.passed).toBe(true);
    });

    it('handles suspended-widgets query error gracefully (fallback to 0)', async () => {
      mockSafeQuery
        .mockResolvedValueOnce({ rows: [{ cnt: 1 }] })    // stale: 1
        .mockRejectedValueOnce(new Error('query failed')); // suspended: error -> { rows: [{ cnt: 0 }] }

      const checks = await service.runPublicationDiagnostics();

      const suspendedCheck = checks.find(c => c.name === 'suspended_widgets')!;
      // Fallback sets cnt=0, which equals 0 -> passes
      expect(suspendedCheck.passed).toBe(true);
    });

    it('handles null row data via nullish coalescing', async () => {
      // Simulate a query returning rows with undefined cnt
      mockSafeQuery
        .mockResolvedValueOnce({ rows: [{}] })   // cnt is undefined
        .mockResolvedValueOnce({ rows: [{}] });

      const checks = await service.runPublicationDiagnostics();

      // undefined ?? 0 -> 0 < 5 -> passes
      const staleCheck = checks.find(c => c.name === 'stale_drafts')!;
      expect(staleCheck.passed).toBe(true);

      // undefined ?? 0 -> 0 === 0 -> passes
      const suspendedCheck = checks.find(c => c.name === 'suspended_widgets')!;
      expect(suspendedCheck.passed).toBe(true);
    });
  });

  // ---------------------------------------------------------------------------
  // Constructor & schema resolution
  // ---------------------------------------------------------------------------
  describe('constructor', () => {
    it('resolves tenantId to schema via tenantSchema()', () => {
      // tenantSchema mock returns `tenant_{id}`
      const svc = new WidgetDiagnosticsService('acme-corp');
      // We cannot directly access private schema, but we can verify it is used
      // in queries by checking the mock call args after a method call.
      mockSafeQuery.mockResolvedValue({ rows: [{ cnt: 0 }] });

      // Trigger a method that uses this.schema and verify the SQL includes it
      return svc.runPublicationDiagnostics().then(() => {
        const firstCallSql = mockSafeQuery.mock.calls[0][0] as string;
        expect(firstCallSql).toContain('"tenant_acme-corp"');
      });
    });
  });
});
