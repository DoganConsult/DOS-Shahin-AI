import { describe, expect, it, vi } from 'vitest';
import { runDSOCRetention } from '../retention.job';

describe('runDSOCRetention', () => {
  it('issues a DELETE on audit_log and alerts with the configured retention', async () => {
    const calls: Array<{ sql: string; params: unknown[] }> = [];
    const query = vi.fn(async (sql: string, params: unknown[]) => {
      calls.push({ sql, params });
      return { rows: Array.from({ length: 3 }, () => ({})) as any[] };
    });
    const result = await runDSOCRetention({ query }, { auditLogDays: 365, resolvedAlertDays: 90 });
    expect(result.auditLogDeleted).toBe(3);
    expect(result.alertsDeleted).toBe(3);
    expect(calls[0].sql).toMatch(/DELETE FROM platform_dsoc\.audit_log/);
    expect(calls[0].params).toEqual(['365']);
    expect(calls[1].sql).toMatch(/DELETE FROM platform_dsoc\.alerts/);
    expect(calls[1].sql).toMatch(/status = 'resolved'/);
    expect(calls[1].params).toEqual(['90']);
  });

  it('throws on non-positive retention days', async () => {
    const query = vi.fn(async () => ({ rows: [] as any[] }));
    await expect(runDSOCRetention({ query }, { auditLogDays: 0, resolvedAlertDays: 10 })).rejects.toThrow(/must be positive/);
    await expect(runDSOCRetention({ query }, { auditLogDays: -1, resolvedAlertDays: 10 })).rejects.toThrow();
  });
});
