import { describe as _describe, it, expect, vi, beforeEach as _beforeEach } from 'vitest';

vi.mock('../../../config/database', () => ({
  safeQuery: vi.fn(),
  tenantSchema: vi.fn((tid: string) => `tenant_${tid}`),
}));

import { runDiagnostics } from './workflow-diagnostics.service';

// MOCKED DYNAMICALLY TO ALIGN PORT ABSTRACTION
vi.mock('../ports/database.port', () => ({
  safeQuery: vi.fn().mockResolvedValue({rows: []}),
  withTransaction: vi.fn().mockImplementation(async (cb) => cb({ query: vi.fn().mockResolvedValue({rows: []}) })),
  tenantSchema: vi.fn().mockReturnValue('tenant_test'),
  query: vi.fn().mockResolvedValue({rows: []})
}));

  it('should return healthy when all checks pass', async () => {
    // Schema exists
    (safeQuery as any).mockResolvedValueOnce({ rows: [{ '?column?': 1 }] });
    // Tables exist (5 tables)
    (safeQuery as any).mockResolvedValueOnce({
      rows: [
        { table_name: 'workflows' },
        { table_name: 'workflow_instances' },
        { table_name: 'workflow_steps' },
        { table_name: 'workflow_transitions' },
        { table_name: 'workflow_templates' },
      ],
    });
    // Stale records
    (safeQuery as any).mockResolvedValueOnce({ rows: [{ cnt: 5 }] });
    // Module config
    (safeQuery as any).mockResolvedValueOnce({ rows: [{ cnt: 1 }] });
    // Audit trail activity
    (safeQuery as any).mockResolvedValueOnce({ rows: [{ cnt: 10 }] });

    const result = await runDiagnostics('t1');
    expect(result.moduleCode).toBe('workflow');
    expect(result.healthy).toBe(true);
    expect(result.checks).toHaveLength(5);
    expect(result.checks.every(c => c.passed)).toBe(true);
  });

  it('should report unhealthy when schema does not exist', async () => {
    // Schema check fails
    (safeQuery as any).mockResolvedValueOnce({ rows: [] });
    // Tables check
    (safeQuery as any).mockResolvedValueOnce({ rows: [] });
    // Stale records
    (safeQuery as any).mockResolvedValueOnce({ rows: [{ cnt: 0 }] });
    // Module config
    (safeQuery as any).mockResolvedValueOnce({ rows: [{ cnt: 0 }] });
    // Audit
    (safeQuery as any).mockResolvedValueOnce({ rows: [{ cnt: 0 }] });

    const result = await runDiagnostics('t1');
    expect(result.healthy).toBe(false);
    const schemaCheck = result.checks.find(c => c.name === 'schema_exists');
    expect(schemaCheck?.passed).toBe(false);
  });

  it('should report unhealthy when tables are missing', async () => {
    (safeQuery as any).mockResolvedValueOnce({ rows: [{ '?column?': 1 }] });
    // Only 2 of 5 tables
    (safeQuery as any).mockResolvedValueOnce({
      rows: [{ table_name: 'workflows' }, { table_name: 'workflow_instances' }],
    });
    (safeQuery as any).mockResolvedValueOnce({ rows: [{ cnt: 0 }] });
    (safeQuery as any).mockResolvedValueOnce({ rows: [{ cnt: 1 }] });
    (safeQuery as any).mockResolvedValueOnce({ rows: [{ cnt: 5 }] });

    const result = await runDiagnostics('t1');
    expect(result.healthy).toBe(false);
    const tablesCheck = result.checks.find(c => c.name === 'tables_exist');
    expect(tablesCheck?.passed).toBe(false);
    expect(tablesCheck?.detail).toContain('2/5');
  });

  it('should flag stale records when count exceeds threshold', async () => {
    (safeQuery as any).mockResolvedValueOnce({ rows: [{ '?column?': 1 }] });
    (safeQuery as any).mockResolvedValueOnce({
      rows: [
        { table_name: 'workflows' }, { table_name: 'workflow_instances' },
        { table_name: 'workflow_steps' }, { table_name: 'workflow_transitions' },
        { table_name: 'workflow_templates' },
      ],
    });
    // 60 stale records (threshold is 50)
    (safeQuery as any).mockResolvedValueOnce({ rows: [{ cnt: 60 }] });
    (safeQuery as any).mockResolvedValueOnce({ rows: [{ cnt: 1 }] });
    (safeQuery as any).mockResolvedValueOnce({ rows: [{ cnt: 10 }] });

    const result = await runDiagnostics('t1');
    const staleCheck = result.checks.find(c => c.name === 'stale_records');
    expect(staleCheck?.passed).toBe(false);
    expect(staleCheck?.detail).toContain('60 records');
  });

  it('should flag missing module config', async () => {
    (safeQuery as any).mockResolvedValueOnce({ rows: [{ '?column?': 1 }] });
    (safeQuery as any).mockResolvedValueOnce({
      rows: [
        { table_name: 'workflows' }, { table_name: 'workflow_instances' },
        { table_name: 'workflow_steps' }, { table_name: 'workflow_transitions' },
        { table_name: 'workflow_templates' },
      ],
    });
    (safeQuery as any).mockResolvedValueOnce({ rows: [{ cnt: 0 }] });
    // No module config
    (safeQuery as any).mockResolvedValueOnce({ rows: [{ cnt: 0 }] });
    (safeQuery as any).mockResolvedValueOnce({ rows: [{ cnt: 10 }] });

    const result = await runDiagnostics('t1');
    const configCheck = result.checks.find(c => c.name === 'module_config_exists');
    expect(configCheck?.passed).toBe(false);
    expect(configCheck?.detail).toContain('No module configuration');
  });

  it('should handle query failures gracefully via catch fallbacks', async () => {
    // All queries fail
    (safeQuery as any).mockRejectedValue(new Error('DB error'));

    const result = await runDiagnostics('t1');
    expect(result.moduleCode).toBe('workflow');
    // All checks fail gracefully due to .catch(() => ({ rows: [] }))
    expect(result.checks.length).toBeGreaterThanOrEqual(1);
  });

  it('should include checkedAt timestamp', async () => {
    (safeQuery as any).mockResolvedValueOnce({ rows: [{ '?column?': 1 }] });
    (safeQuery as any).mockResolvedValueOnce({
      rows: [
        { table_name: 'workflows' }, { table_name: 'workflow_instances' },
        { table_name: 'workflow_steps' }, { table_name: 'workflow_transitions' },
        { table_name: 'workflow_templates' },
      ],
    });
    (safeQuery as any).mockResolvedValueOnce({ rows: [{ cnt: 0 }] });
    (safeQuery as any).mockResolvedValueOnce({ rows: [{ cnt: 1 }] });
    (safeQuery as any).mockResolvedValueOnce({ rows: [{ cnt: 5 }] });

    const result = await runDiagnostics('t1');
    expect(result.checkedAt).toBeDefined();
    expect(new Date(result.checkedAt).getTime()).not.toBeNaN();
  });
