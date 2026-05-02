import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockSafeQuery = vi.fn();
vi.mock('../../../config/database', () => ({
  safeQuery: (...args: unknown[]) => mockSafeQuery(...args),
  tenantSchema: (t: string) => `tenant_${t}`,
}));

const mockPublish = vi.fn();
vi.mock('../../dos/events/event-bus', () => ({
  publish: (...args: unknown[]) => mockPublish(...args),
}));

vi.mock('../../dos/logger', () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}));

import {
  getSodPolicies,
  createSodPolicy,
  deactivateSodPolicy,
  grantSodWaiver,
} from './sod-policy.service';

beforeEach(() => {
  vi.clearAllMocks();
  mockSafeQuery.mockResolvedValue({ rows: [], rowCount: 0 });
  mockPublish.mockResolvedValue(undefined);
});

describe('DAuth SodPolicyService', () => {
  describe('getSodPolicies', () => {
    it('returns mapped SoD policies for tenant', async () => {
      mockSafeQuery.mockResolvedValue({
        rows: [{
          policy_id: 'p-1',
          rule_code: 'SOD001',
          role_code_a: 'admin',
          role_code_b: 'auditor',
          conflict_level: 'critical',
          enforcement: 'block',
          module_code: 'risk',
          description: 'Admin-Auditor conflict',
          is_active: true,
          temporary_waiver_allowed: true,
          waiver_max_days: 30,
        }],
      });
      const policies = await getSodPolicies('t-1');
      expect(policies).toHaveLength(1);
      expect(policies[0].policyId).toBe('p-1');
      expect(policies[0].ruleCode).toBe('SOD001');
      expect(policies[0].conflictLevel).toBe('critical');
      expect(policies[0].enforcement).toBe('block');
      expect(policies[0].temporaryWaiverAllowed).toBe(true);
    });

    it('returns empty array when no active policies exist', async () => {
      mockSafeQuery.mockResolvedValue({ rows: [] });
      const policies = await getSodPolicies('t-empty');
      expect(policies).toEqual([]);
    });

    it('filters by moduleCode when provided', async () => {
      mockSafeQuery.mockResolvedValue({ rows: [] });
      await getSodPolicies('t-1', 'compliance');
      const [sql, params] = mockSafeQuery.mock.calls[0];
      expect(sql).toContain('module_code');
      expect(params[0]).toBe('compliance');
    });

    it('does not filter by module when moduleCode is omitted', async () => {
      mockSafeQuery.mockResolvedValue({ rows: [] });
      await getSodPolicies('t-1');
      const [, params] = mockSafeQuery.mock.calls[0];
      expect(params).toEqual([]);
    });

    it('defaults enforcement to block when null', async () => {
      mockSafeQuery.mockResolvedValue({
        rows: [{
          rule_code: 'SOD002', role_code_a: 'a', role_code_b: 'b',
          conflict_level: 'high', enforcement: null, module_code: null,
          description: null, temporary_waiver_allowed: false, waiver_max_days: null,
        }],
      });
      const policies = await getSodPolicies('t-1');
      expect(policies[0].enforcement).toBe('block');
      expect(policies[0].description).toBe('');
    });
  });

  describe('createSodPolicy', () => {
    it('inserts policy and publishes creation event', async () => {
      await createSodPolicy('t-1', {
        ruleCode: 'SOD003',
        roleCodeA: 'approver',
        roleCodeB: 'requester',
        conflictLevel: 'high',
        enforcement: 'warn',
        moduleCode: null,
        description: 'Approver-Requester separation',
        temporaryWaiverAllowed: false,
        waiverMaxDays: null,
      }, 'admin-1');

      const [sql, params] = mockSafeQuery.mock.calls[0];
      expect(sql).toContain('INSERT INTO');
      expect(sql).toContain('sod_rules');
      expect(params[0]).toBe('SOD003');
      expect(mockPublish).toHaveBeenCalledWith(
        'dauth.sod.policy_created',
        't-1',
        expect.objectContaining({ ruleCode: 'SOD003', createdBy: 'admin-1' }),
      );
    });

    it('uses correct tenant schema', async () => {
      await createSodPolicy('tenant-abc', {
        ruleCode: 'SOD004', roleCodeA: 'a', roleCodeB: 'b',
        conflictLevel: 'medium', enforcement: 'log', moduleCode: null,
        description: '', temporaryWaiverAllowed: false, waiverMaxDays: null,
      }, 'admin');
      const [sql] = mockSafeQuery.mock.calls[0];
      expect(sql).toContain('tenant_tenant-abc');
    });

    it('propagates DB errors', async () => {
      mockSafeQuery.mockRejectedValue(new Error('duplicate key'));
      await expect(createSodPolicy('t-1', {
        ruleCode: 'SOD_DUP', roleCodeA: 'a', roleCodeB: 'b',
        conflictLevel: 'medium', enforcement: 'block', moduleCode: null,
        description: '', temporaryWaiverAllowed: false, waiverMaxDays: null,
      }, 'admin')).rejects.toThrow('duplicate key');
    });
  });

  describe('deactivateSodPolicy', () => {
    it('returns true and publishes event when policy deactivated', async () => {
      mockSafeQuery.mockResolvedValue({ rowCount: 1 });
      const result = await deactivateSodPolicy('t-1', 'SOD001', 'admin-1');
      expect(result).toBe(true);
      expect(mockPublish).toHaveBeenCalledWith(
        'dauth.sod.policy_deactivated',
        't-1',
        expect.objectContaining({ ruleCode: 'SOD001', deactivatedBy: 'admin-1' }),
      );
    });

    it('returns false when policy not found or already inactive', async () => {
      mockSafeQuery.mockResolvedValue({ rowCount: 0 });
      const result = await deactivateSodPolicy('t-1', 'SOD_MISSING', 'admin-1');
      expect(result).toBe(false);
      expect(mockPublish).not.toHaveBeenCalled();
    });

    it('sets is_active to FALSE for the matching rule_code', async () => {
      mockSafeQuery.mockResolvedValue({ rowCount: 1 });
      await deactivateSodPolicy('t-1', 'SOD005', 'admin');
      const [sql, params] = mockSafeQuery.mock.calls[0];
      expect(sql).toContain('is_active = FALSE');
      expect(params[0]).toBe('SOD005');
    });
  });

  describe('grantSodWaiver', () => {
    it('grants waiver when policy allows temporary waivers', async () => {
      // First call: getSodPolicies returns a policy with waiver allowed
      mockSafeQuery
        .mockResolvedValueOnce({
          rows: [{
            policy_id: 'p-1', rule_code: 'SOD001', role_code_a: 'admin', role_code_b: 'auditor',
            conflict_level: 'critical', enforcement: 'block', module_code: null,
            description: 'test', temporary_waiver_allowed: true, waiver_max_days: 30,
          }],
        })
        // Second call: INSERT waiver
        .mockResolvedValueOnce({ rowCount: 1 });

      const result = await grantSodWaiver('t-1', 'u-1', 'SOD001', 14, 'admin-1', 'Justified need');
      expect(result).toBe(true);
      expect(mockPublish).toHaveBeenCalledWith(
        'dauth.sod.waiver_granted',
        't-1',
        expect.objectContaining({ userId: 'u-1', ruleCode: 'SOD001', durationDays: 14 }),
      );
    });

    it('returns false when policy does not allow waivers', async () => {
      mockSafeQuery.mockResolvedValueOnce({
        rows: [{
          rule_code: 'SOD002', role_code_a: 'a', role_code_b: 'b',
          conflict_level: 'high', enforcement: 'block', module_code: null,
          description: '', temporary_waiver_allowed: false, waiver_max_days: null,
        }],
      });
      const result = await grantSodWaiver('t-1', 'u-1', 'SOD002', 7, 'admin', 'reason');
      expect(result).toBe(false);
      expect(mockPublish).not.toHaveBeenCalled();
    });

    it('returns false when duration exceeds max waiver days', async () => {
      mockSafeQuery.mockResolvedValueOnce({
        rows: [{
          rule_code: 'SOD001', role_code_a: 'admin', role_code_b: 'auditor',
          conflict_level: 'critical', enforcement: 'block', module_code: null,
          description: '', temporary_waiver_allowed: true, waiver_max_days: 7,
        }],
      });
      const result = await grantSodWaiver('t-1', 'u-1', 'SOD001', 30, 'admin', 'reason');
      expect(result).toBe(false);
    });

    it('returns false when policy not found', async () => {
      mockSafeQuery.mockResolvedValueOnce({ rows: [] });
      const result = await grantSodWaiver('t-1', 'u-1', 'NONEXISTENT', 7, 'admin', 'reason');
      expect(result).toBe(false);
    });
  });
});
