import { describe, expect, it, vi, beforeEach } from 'vitest';

vi.mock('../../../ports/database.port', () => ({
  safeQuery: vi.fn(),
  safeQueryWithClient: vi.fn(),
  tenantSchema: vi.fn((id: string) => `tenant_${id}`),
  withTransaction: vi.fn(async (fn: any) => fn({ query: vi.fn() })),
}));

vi.mock('../../../../../domain/ai-governance/services/ai/registry/ai-asset-inventory.service', () => ({
  getAssetById: vi.fn(),
  getAssetByKey: vi.fn(),
}));

vi.mock('../../../../../domain/ai-governance/services/ai-governance-lifecycle.service', () => ({
  emitRegistryAudit: vi.fn().mockResolvedValue(undefined),
  nextRegistryVersionNumber: vi.fn().mockResolvedValue(1),
}));

import { safeQuery } from '../../../ports/database.port';
import { getAssetById } from '../../../../../domain/ai-governance/services/ai/registry/ai-asset-inventory.service';
import {
  createDraftAgentVersion,
  submitAgentVersionForApproval,
  approveAgentVersion,
  activateAgentVersion,
  listAgentVersions,
} from './agent-registry.service';

describe('agent-registry.service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (getAssetById as any).mockResolvedValue({
      asset_id: 'asset_1',
      asset_type: 'agent',
      status: 'enabled',
      scope_type: 'tenant',
      source_type: 'manual',
    });
  });

  it('createDraftAgentVersion inserts a draft version', async () => {
    (safeQuery as any).mockImplementation(async (sql: string) => {
      if (sql.includes('INSERT INTO "tenant_t1".ai_agent_registry')) {
        return {
          rows: [{
            agent_version_id: 'v1',
            asset_id: 'asset_1',
            version_number: 1,
            agent_config: { a: 1 },
            linked_prompt_asset_id: null,
            linked_model_asset_id: null,
            capabilities: [],
            approval_status: 'draft',
            deployment_status: 'not_deployed',
            is_active: false,
            rollback_from_version_id: null,
            diff_summary: 'Initial version',
            change_summary: null,
            notes: null,
            created_by: 'u1',
            updated_by: null,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          }],
        };
      }
      return { rows: [] };
    });

    const row = await createDraftAgentVersion('t1', { asset_id: 'asset_1', agent_config: { a: 1 }, created_by: 'u1' });
    expect(row.agent_version_id).toBe('v1');
    expect(row.approval_status).toBe('draft');
  });

  it('submitAgentVersionForApproval transitions draft -> submitted', async () => {
    (safeQuery as any).mockImplementation(async (sql: string) => {
      if (sql.includes('SELECT * FROM "tenant_t1".ai_agent_registry WHERE agent_version_id')) {
        return { rows: [{ agent_version_id: 'v1', approval_status: 'draft', is_active: false, created_by: 'u1' }] };
      }
      if (sql.includes('SET approval_status = \'submitted\'')) {
        return { rows: [{ agent_version_id: 'v1', approval_status: 'submitted', created_by: 'u1' }] };
      }
      return { rows: [] };
    });

    const row = await submitAgentVersionForApproval('t1', 'v1', 'u2');
    expect(row.approval_status).toBe('submitted');
  });

  it('approveAgentVersion enforces creator cannot approve', async () => {
    (safeQuery as any).mockImplementation(async (sql: string) => {
      if (sql.includes('SELECT * FROM "tenant_t1".ai_agent_registry WHERE agent_version_id')) {
        return { rows: [{ agent_version_id: 'v1', approval_status: 'submitted', created_by: 'u1' }] };
      }
      return { rows: [] };
    });
    await expect(approveAgentVersion('t1', 'v1', 'u1')).rejects.toThrow('Creator cannot approve');
  });

  it('activateAgentVersion activates and deactivates prior active version', async () => {
    (safeQuery as any)
      .mockResolvedValueOnce({
        rows: [{
          agent_version_id: 'v2',
          asset_id: 'asset_1',
          approval_status: 'approved',
          is_active: false,
          linked_prompt_asset_id: null,
          linked_model_asset_id: null,
        }],
      });

    const { safeQueryWithClient } = await import('../../../ports/database.port');
    (safeQueryWithClient as any)
      .mockResolvedValueOnce({ rows: [{ agent_version_id: 'v1', asset_id: 'asset_1', is_active: true }] })
      .mockResolvedValueOnce({ rows: [{ agent_version_id: 'v1', is_active: false }] })
      .mockResolvedValueOnce({ rows: [{ agent_version_id: 'v2', is_active: true, deployment_status: 'production' }] });

    const result = await activateAgentVersion('t1', 'v2', 'u3');
    expect(result.activated.agent_version_id).toBe('v2');
    expect(result.activated.is_active).toBe(true);
    expect(result.deactivated?.agent_version_id).toBe('v1');
  });

  it('listAgentVersions returns total and versions', async () => {
    (safeQuery as any)
      .mockResolvedValueOnce({ rows: [{ agent_version_id: 'v1' }] })
      .mockResolvedValueOnce({ rows: [{ total: 1 }] });

    const res = await listAgentVersions('t1', { limit: 10, offset: 0 });
    expect(res.total).toBe(1);
    expect(res.versions).toHaveLength(1);
  });
});
