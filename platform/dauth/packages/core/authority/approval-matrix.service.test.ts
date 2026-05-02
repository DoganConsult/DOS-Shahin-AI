/**
 * Co-located tests for approval-matrix.service.ts
 * @owner DAuth
 */
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
  getApprovalRules,
  getApprovalRule,
  createApprovalRule,
  deactivateApprovalRule,
  isApprovalRequired,
  getRequiredApprovers,
} from './approval-matrix.service';

beforeEach(() => {
  vi.clearAllMocks();
  mockSafeQuery.mockResolvedValue({ rows: [], rowCount: 0 });
});

const sampleRow = {
  rule_id: 'rule-1',
  action_code: 'risk.approve',
  module_code: 'risk',
  required_authority_code: 'risk_approver',
  min_approvals: 2,
  value_threshold: 10000,
  is_active: true,
};

describe('getApprovalRules', () => {
  it('returns all active rules when no moduleCode filter', async () => {
    mockSafeQuery.mockResolvedValueOnce({
      rows: [sampleRow],
      rowCount: 1,
    });
    const result = await getApprovalRules('t1');
    expect(result).toHaveLength(1);
    expect(result[0]).toMatchObject({
      ruleId: 'rule-1',
      actionCode: 'risk.approve',
      moduleCode: 'risk',
      minApprovals: 2,
      valueThreshold: 10000,
    });
    // No module filter params
    expect(mockSafeQuery).toHaveBeenCalledWith(expect.any(String), []);
  });

  it('applies module filter when moduleCode is provided', async () => {
    mockSafeQuery.mockResolvedValueOnce({ rows: [], rowCount: 0 });
    await getApprovalRules('t1', 'compliance');
    expect(mockSafeQuery).toHaveBeenCalledWith(
      expect.stringContaining('module_code = $1'),
      ['compliance'],
    );
  });

  it('returns empty array when no rules exist', async () => {
    const result = await getApprovalRules('t1');
    expect(result).toEqual([]);
  });

  it('maps value_threshold null correctly', async () => {
    mockSafeQuery.mockResolvedValueOnce({
      rows: [{ ...sampleRow, value_threshold: null }],
      rowCount: 1,
    });
    const result = await getApprovalRules('t1');
    expect(result[0].valueThreshold).toBeNull();
  });
});

describe('getApprovalRule', () => {
  it('returns a single rule by ID', async () => {
    mockSafeQuery.mockResolvedValueOnce({
      rows: [sampleRow],
      rowCount: 1,
    });
    const result = await getApprovalRule('t1', 'rule-1');
    expect(result).not.toBeNull();
    expect(result!.ruleId).toBe('rule-1');
    expect(mockSafeQuery).toHaveBeenCalledWith(
      expect.stringContaining('rule_id = $1'),
      ['rule-1'],
    );
  });

  it('returns null when rule does not exist', async () => {
    const result = await getApprovalRule('t1', 'nonexistent');
    expect(result).toBeNull();
  });

  it('queries the correct tenant schema', async () => {
    await getApprovalRule('acme', 'rule-1');
    expect(mockSafeQuery).toHaveBeenCalledWith(
      expect.stringContaining('"tenant_acme"'),
      expect.any(Array),
    );
  });
});

describe('createApprovalRule', () => {
  it('inserts a new rule and publishes created event', async () => {
    mockSafeQuery.mockResolvedValueOnce({
      rows: [sampleRow],
      rowCount: 1,
    });
    const result = await createApprovalRule(
      't1',
      {
        actionCode: 'risk.approve',
        moduleCode: 'risk',
        requiredAuthorityCode: 'risk_approver',
        minApprovals: 2,
        valueThreshold: 10000,
      },
      'admin-1',
    );
    expect(result.ruleId).toBe('rule-1');
    expect(mockSafeQuery).toHaveBeenCalledWith(
      expect.stringContaining('INSERT INTO'),
      ['risk.approve', 'risk', 'risk_approver', 2, 10000, 'admin-1'],
    );
    expect(mockPublish).toHaveBeenCalledWith(
      'dauth.approval-rule.created', 't1',
      expect.objectContaining({ ruleId: 'rule-1', actionCode: 'risk.approve' }),
    );
  });

  it('throws when minApprovals is less than 1', async () => {
    await expect(
      createApprovalRule(
        't1',
        {
          actionCode: 'risk.approve',
          moduleCode: 'risk',
          requiredAuthorityCode: 'risk_approver',
          minApprovals: 0,
        },
        'admin-1',
      ),
    ).rejects.toThrow('minApprovals must be at least 1');
  });

  it('defaults valueThreshold to null when not provided', async () => {
    mockSafeQuery.mockResolvedValueOnce({
      rows: [{ ...sampleRow, value_threshold: null }],
      rowCount: 1,
    });
    await createApprovalRule(
      't1',
      {
        actionCode: 'control.validate',
        moduleCode: 'control',
        requiredAuthorityCode: 'ctrl_validator',
        minApprovals: 1,
      },
      'admin-1',
    );
    expect(mockSafeQuery).toHaveBeenCalledWith(
      expect.stringContaining('INSERT INTO'),
      ['control.validate', 'control', 'ctrl_validator', 1, null, 'admin-1'],
    );
  });
});

describe('deactivateApprovalRule', () => {
  it('deactivates an existing rule and publishes event', async () => {
    // getApprovalRule lookup
    mockSafeQuery.mockResolvedValueOnce({
      rows: [sampleRow],
      rowCount: 1,
    });
    // UPDATE query
    mockSafeQuery.mockResolvedValueOnce({ rows: [], rowCount: 1 });
    await deactivateApprovalRule('t1', 'rule-1', 'admin-1');
    expect(mockSafeQuery).toHaveBeenCalledTimes(2);
    expect(mockPublish).toHaveBeenCalledWith(
      'dauth.approval-rule.deactivated', 't1',
      expect.objectContaining({ ruleId: 'rule-1', deactivatedBy: 'admin-1' }),
    );
  });

  it('throws when rule does not exist', async () => {
    // getApprovalRule returns null
    mockSafeQuery.mockResolvedValueOnce({ rows: [], rowCount: 0 });
    await expect(
      deactivateApprovalRule('t1', 'nonexistent', 'admin-1'),
    ).rejects.toThrow('Approval rule "nonexistent" not found');
  });

  it('sets is_active = FALSE in the UPDATE statement', async () => {
    mockSafeQuery.mockResolvedValueOnce({ rows: [sampleRow], rowCount: 1 });
    mockSafeQuery.mockResolvedValueOnce({ rows: [], rowCount: 1 });
    await deactivateApprovalRule('t1', 'rule-1', 'admin-1');
    // Second call is the UPDATE
    expect(mockSafeQuery.mock.calls[1][0]).toContain('is_active = FALSE');
  });
});

describe('isApprovalRequired', () => {
  it('returns true when a matching active rule exists', async () => {
    mockSafeQuery.mockResolvedValueOnce({ rows: [{ '?column?': 1 }], rowCount: 1 });
    const result = await isApprovalRequired('t1', 'risk.approve', 'risk');
    expect(result).toBe(true);
  });

  it('returns false when no matching rule exists', async () => {
    const result = await isApprovalRequired('t1', 'risk.delete', 'risk');
    expect(result).toBe(false);
  });

  it('filters by action_code and module_code', async () => {
    await isApprovalRequired('t1', 'control.validate', 'control');
    expect(mockSafeQuery).toHaveBeenCalledWith(
      expect.stringContaining('action_code = $1'),
      ['control.validate', 'control'],
    );
  });
});

describe('getRequiredApprovers', () => {
  it('returns matching approval requirements', async () => {
    mockSafeQuery.mockResolvedValueOnce({
      rows: [
        { required_authority_code: 'risk_approver', min_approvals: 2, value_threshold: 10000 },
      ],
      rowCount: 1,
    });
    const result = await getRequiredApprovers('t1', 'risk.approve', 'risk');
    expect(result).toEqual([
      { authorityCode: 'risk_approver', minApprovals: 2, valueThreshold: 10000 },
    ]);
  });

  it('returns empty array when no rules match', async () => {
    const result = await getRequiredApprovers('t1', 'nonexistent', 'risk');
    expect(result).toEqual([]);
  });

  it('applies value threshold filter when entityValue is provided', async () => {
    mockSafeQuery.mockResolvedValueOnce({ rows: [], rowCount: 0 });
    await getRequiredApprovers('t1', 'risk.approve', 'risk', 50000);
    expect(mockSafeQuery).toHaveBeenCalledWith(
      expect.stringContaining('value_threshold <= $3'),
      ['risk.approve', 'risk', 50000],
    );
  });

  it('omits threshold filter when entityValue is not provided', async () => {
    await getRequiredApprovers('t1', 'risk.approve', 'risk');
    expect(mockSafeQuery).toHaveBeenCalledWith(
      expect.not.stringContaining('value_threshold <= $3'),
      ['risk.approve', 'risk'],
    );
  });

  it('maps null value_threshold correctly', async () => {
    mockSafeQuery.mockResolvedValueOnce({
      rows: [
        { required_authority_code: 'generic_approver', min_approvals: 1, value_threshold: null },
      ],
      rowCount: 1,
    });
    const result = await getRequiredApprovers('t1', 'risk.approve', 'risk');
    expect(result[0].valueThreshold).toBeNull();
  });
});
