import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@dos/db', () => ({
  withTenantClient: vi.fn(),
  getFirstRow: vi.fn((r: { rows?: unknown[] } | undefined) => r?.rows?.[0]),
}));

import {
  executeWorkflowAutomation,
  getAutomationStatus,
} from './workflow-automation.service';
import { withTenantClient } from '@dos/db';

const mockedWithTenantClient = withTenantClient as unknown as ReturnType<typeof vi.fn>;

beforeEach(() => {
  vi.clearAllMocks();
});

describe('workflow-automation.service: executeWorkflowAutomation', () => {
  it('bootstraps 3 default templates when none exist', async () => {
    const insertCalls: string[] = [];
    const client = {
      query: vi.fn((sql: string, _params?: unknown[]) => {
        if (sql.includes('SELECT COUNT')) return Promise.resolve({ rows: [{ count: 0 }] });
        if (sql.includes('INSERT INTO workflow_templates')) {
          insertCalls.push(sql);
          return Promise.resolve({ rows: [{ template_key: 'k' }], rowCount: 1 });
        }
        return Promise.resolve({ rows: [] });
      }),
    };
    mockedWithTenantClient.mockImplementation((_t: string, fn: (c: unknown) => unknown) => fn(client));
    const result = await executeWorkflowAutomation('t1', 'u1');
    expect(result.success).toBe(true);
    expect(result.actionId).toBe('workflow-automation');
    expect(result.message).toMatch(/Created 3 workflow definitions/);
    expect(insertCalls).toHaveLength(3);
  });

  it('activates up to 5 instances when templates exist', async () => {
    const client = {
      query: vi.fn((sql: string) => {
        if (sql.includes('SELECT COUNT')) return Promise.resolve({ rows: [{ count: 7 }] });
        if (sql.includes('INSERT INTO workflow_instances')) {
          return Promise.resolve({ rows: [{ instance_id: 'i1' }, { instance_id: 'i2' }, { instance_id: 'i3' }, { instance_id: 'i4' }, { instance_id: 'i5' }], rowCount: 5 });
        }
        return Promise.resolve({ rows: [] });
      }),
    };
    mockedWithTenantClient.mockImplementation((_t: string, fn: (c: unknown) => unknown) => fn(client));
    const result = await executeWorkflowAutomation('t1', 'u1');
    expect(result.success).toBe(true);
    expect(result.message).toMatch(/Activated 5 workflow templates/);
    expect(result.details).toEqual({ activated: 5, totalTemplates: 7 });
  });

  it('continues despite individual template insert failures during bootstrap', async () => {
    let insertCount = 0;
    const client = {
      query: vi.fn((sql: string) => {
        if (sql.includes('SELECT COUNT')) return Promise.resolve({ rows: [{ count: 0 }] });
        if (sql.includes('INSERT INTO workflow_templates')) {
          insertCount++;
          if (insertCount === 2) return Promise.reject(new Error('unique_violation'));
          return Promise.resolve({ rows: [], rowCount: 1 });
        }
        return Promise.resolve({ rows: [] });
      }),
    };
    mockedWithTenantClient.mockImplementation((_t: string, fn: (c: unknown) => unknown) => fn(client));
    const result = await executeWorkflowAutomation('t1', 'u1');
    expect(result.success).toBe(true);
    expect(result.message).toMatch(/Created 2 workflow definitions/);
  });
});

describe('workflow-automation.service: getAutomationStatus', () => {
  it('returns templates and instances counts', async () => {
    const client = {
      query: vi.fn((sql: string) => {
        if (sql.includes('FROM workflow_templates')) return Promise.resolve({ rows: [{ count: 3 }] });
        if (sql.includes('FROM workflow_instances')) return Promise.resolve({ rows: [{ count: 12 }] });
        return Promise.resolve({ rows: [] });
      }),
    };
    mockedWithTenantClient.mockImplementation((_t: string, fn: (c: unknown) => unknown) => fn(client));
    const status = await getAutomationStatus('t1');
    expect(status).toEqual({ templatesCount: 3, instancesCount: 12 });
  });

  it('handles zero counts', async () => {
    const client = {
      query: vi.fn(() => Promise.resolve({ rows: [{ count: 0 }] })),
    };
    mockedWithTenantClient.mockImplementation((_t: string, fn: (c: unknown) => unknown) => fn(client));
    const status = await getAutomationStatus('t1');
    expect(status).toEqual({ templatesCount: 0, instancesCount: 0 });
  });
});
