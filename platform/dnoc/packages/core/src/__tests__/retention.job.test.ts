import { describe, expect, it, vi } from 'vitest';
import { runDNOCRetention, startDNOCRetentionLoop } from '../retention.job';

describe('runDNOCRetention', () => {
  it('issues a DELETE on metrics + logs + traces with the configured retention', async () => {
    const calls: Array<{ sql: string; params: unknown[] }> = [];
    const query = vi.fn(async (sql: string, params: unknown[]) => {
      calls.push({ sql, params });
      return { rows: Array.from({ length: 5 }, () => ({})) as any[] };
    });
    const result = await runDNOCRetention({ query }, { metricsDays: 30, logsDays: 14, tracesDays: 7 });
    expect(result).toEqual({ metricsDeleted: 5, logsDeleted: 5, tracesDeleted: 5 });
    expect(calls[0].sql).toMatch(/DELETE FROM platform_dnoc\.metrics/);
    expect(calls[0].params).toEqual(['30']);
    expect(calls[1].sql).toMatch(/DELETE FROM platform_dnoc\.logs/);
    expect(calls[1].params).toEqual(['14']);
    expect(calls[2].sql).toMatch(/DELETE FROM platform_dnoc\.traces/);
    expect(calls[2].params).toEqual(['7']);
  });

  it('throws on non-positive retention days', async () => {
    const query = vi.fn(async () => ({ rows: [] as any[] }));
    await expect(runDNOCRetention({ query }, { metricsDays: 0, logsDays: 1, tracesDays: 1 })).rejects.toThrow(/must be positive/);
  });
});

describe('startDNOCRetentionLoop', () => {
  it('runs an immediate tick and returns a dispose function', async () => {
    const query = vi.fn(async () => ({ rows: [] as any[] }));
    const dispose = startDNOCRetentionLoop(
      { query },
      { metricsDays: 30, logsDays: 14, tracesDays: 7, intervalMs: 60_000 },
    );
    // Immediate tick — 3 DELETEs.
    await new Promise((r) => setTimeout(r, 10));
    expect(query).toHaveBeenCalledTimes(3);
    dispose();
  });
});
