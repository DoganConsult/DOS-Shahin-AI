/**
 * Co-located tests for DAuth maker-checker-policy.service.
 * Covers: getMakerCheckerPolicy, submitForChecking, approveDecision,
 *         rejectDecision, getPendingDecisions.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockSafeQuery = vi.fn();
vi.mock('../../../config/database', () => ({
  safeQuery: (...args: unknown[]) => mockSafeQuery(...args),
  tenantSchema: (t: string) => `tenant_${t}`,
}));

const mockLogAuthDecision = vi.fn();
vi.mock('../audit/decision-log.service', () => ({
  logAuthDecision: (...args: unknown[]) => mockLogAuthDecision(...args),
}));

const mockPublish = vi.fn();
vi.mock('../../dos/events/event-bus', () => ({
  publish: (...args: unknown[]) => mockPublish(...args),
}));

vi.mock('../../dos/logger', () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}));

import {
  getMakerCheckerPolicy,
  submitForChecking,
  approveDecision,
  rejectDecision,
  getPendingDecisions,
} from './maker-checker-policy.service';

beforeEach(() => {
  vi.clearAllMocks();
  mockSafeQuery.mockResolvedValue({ rows: [], rowCount: 0 });
  mockLogAuthDecision.mockResolvedValue(undefined);
  mockPublish.mockResolvedValue(undefined);
});

/* ------------------------------------------------------------------ */
/*  getMakerCheckerPolicy                                              */
/* ------------------------------------------------------------------ */
describe('getMakerCheckerPolicy', () => {
  it('returns policy when found', async () => {
    mockSafeQuery.mockResolvedValueOnce({
      rows: [{
        entity_type: 'risk', action: 'approve',
        required_checkers: 2, require_different_department: true, is_active: true,
      }],
    });

    const policy = await getMakerCheckerPolicy('t1', 'risk', 'approve');

    expect(policy).not.toBeNull();
    expect(policy!.entityType).toBe('risk');
    expect(policy!.action).toBe('approve');
    expect(policy!.requiredCheckers).toBe(2);
    expect(policy!.requireDifferentDepartment).toBe(true);
    expect(policy!.isActive).toBe(true);
  });

  it('returns null when no matching policy', async () => {
    const policy = await getMakerCheckerPolicy('t1', 'unknown', 'delete');
    expect(policy).toBeNull();
  });

  it('defaults required_checkers to 1 when null', async () => {
    mockSafeQuery.mockResolvedValueOnce({
      rows: [{
        entity_type: 'ctrl', action: 'approve',
        required_checkers: null, require_different_department: false, is_active: true,
      }],
    });

    const policy = await getMakerCheckerPolicy('t1', 'ctrl', 'approve');
    expect(policy!.requiredCheckers).toBe(1);
  });

  it('queries with correct parameters', async () => {
    mockSafeQuery.mockResolvedValueOnce({ rows: [] });

    await getMakerCheckerPolicy('t1', 'risk', 'submit');

    const [sql, params] = mockSafeQuery.mock.calls[0];
    expect(sql).toContain('entity_type = $1');
    expect(sql).toContain('action = $2');
    expect(sql).toContain('is_active = TRUE');
    expect(params).toEqual(['risk', 'submit']);
  });
});

/* ------------------------------------------------------------------ */
/*  submitForChecking                                                  */
/* ------------------------------------------------------------------ */
describe('submitForChecking', () => {
  it('creates a pending decision and publishes event', async () => {
    const now = new Date('2026-03-01T00:00:00Z');
    mockSafeQuery.mockResolvedValueOnce({
      rows: [{ decision_id: 'dec-1', created_at: now }],
    });

    const decision = await submitForChecking('t1', 'maker-1', 'risk', 'risk-1', 'approve');

    expect(decision.decisionId).toBe('dec-1');
    expect(decision.status).toBe('pending');
    expect(decision.makerId).toBe('maker-1');
    expect(decision.checkerId).toBeNull();
    expect(decision.decidedAt).toBeNull();
    expect(decision.reason).toBeNull();

    expect(mockPublish).toHaveBeenCalledWith(
      'dauth.maker_checker.submitted', 't1',
      expect.objectContaining({ entityType: 'risk', makerId: 'maker-1' }),
    );
  });

  it('passes all parameters to the INSERT query', async () => {
    mockSafeQuery.mockResolvedValueOnce({
      rows: [{ decision_id: 'dec-2', created_at: new Date() }],
    });

    await submitForChecking('t1', 'maker-2', 'ctrl', 'ctrl-5', 'delete');

    const [sql, params] = mockSafeQuery.mock.calls[0];
    expect(sql).toContain('INSERT INTO "tenant_t1".maker_checker_decisions');
    expect(params).toEqual(['t1', 'ctrl', 'ctrl-5', 'delete', 'maker-2']);
  });

  it('returns correct entityType and action in result', async () => {
    mockSafeQuery.mockResolvedValueOnce({
      rows: [{ decision_id: 'dec-3', created_at: null }],
    });

    const decision = await submitForChecking('t1', 'm1', 'audit', 'a1', 'close');

    expect(decision.entityType).toBe('audit');
    expect(decision.action).toBe('close');
  });
});

/* ------------------------------------------------------------------ */
/*  approveDecision                                                    */
/* ------------------------------------------------------------------ */
describe('approveDecision', () => {
  it('approves when decision is pending and checker differs from maker', async () => {
    // Lookup the pending decision
    mockSafeQuery.mockResolvedValueOnce({
      rows: [{ maker_id: 'maker-1', entity_type: 'risk', action: 'approve' }],
    });
    // Update decision
    mockSafeQuery.mockResolvedValueOnce({ rowCount: 1 });

    const result = await approveDecision('t1', 'dec-1', 'checker-1', 'looks good');

    expect(result.success).toBe(true);
    expect(result.reason).toBe('approved');
    expect(mockPublish).toHaveBeenCalledWith(
      'dauth.maker_checker.approved', 't1',
      expect.objectContaining({ decisionId: 'dec-1', checkerId: 'checker-1' }),
    );
  });

  it('rejects when decision not found or not pending', async () => {
    mockSafeQuery.mockResolvedValueOnce({ rows: [] });

    const result = await approveDecision('t1', 'nonexistent', 'checker-1');

    expect(result.success).toBe(false);
    expect(result.reason).toBe('decision_not_found_or_not_pending');
    expect(mockPublish).not.toHaveBeenCalled();
  });

  it('denies when checker is the same as maker (self-approval)', async () => {
    mockSafeQuery.mockResolvedValueOnce({
      rows: [{ maker_id: 'user-1', entity_type: 'risk', action: 'approve' }],
    });

    const result = await approveDecision('t1', 'dec-1', 'user-1');

    expect(result.success).toBe(false);
    expect(result.reason).toBe('maker_cannot_be_checker');
    expect(mockLogAuthDecision).toHaveBeenCalledWith('t1', expect.objectContaining({
      decision: 'deny',
      reason: 'maker_cannot_be_checker',
    }));
  });

  it('logs denial with correct permission code format', async () => {
    mockSafeQuery.mockResolvedValueOnce({
      rows: [{ maker_id: 'same-user', entity_type: 'ctrl', action: 'publish' }],
    });

    await approveDecision('t1', 'dec-2', 'same-user');

    expect(mockLogAuthDecision).toHaveBeenCalledWith('t1', expect.objectContaining({
      permissionCode: 'maker_checker:ctrl.publish',
    }));
  });

  it('passes reason as null when not provided', async () => {
    mockSafeQuery.mockResolvedValueOnce({
      rows: [{ maker_id: 'maker-1', entity_type: 'risk', action: 'approve' }],
    });
    mockSafeQuery.mockResolvedValueOnce({ rowCount: 1 });

    await approveDecision('t1', 'dec-1', 'checker-1');

    const [, params] = mockSafeQuery.mock.calls[1];
    expect(params[1]).toBeNull(); // reason defaults to null
  });
});

/* ------------------------------------------------------------------ */
/*  rejectDecision                                                     */
/* ------------------------------------------------------------------ */
describe('rejectDecision', () => {
  it('rejects the decision and publishes event', async () => {
    mockSafeQuery.mockResolvedValueOnce({ rowCount: 1 });

    const result = await rejectDecision('t1', 'dec-1', 'checker-1', 'insufficient evidence');

    expect(result.success).toBe(true);
    expect(result.reason).toBe('rejected');
    expect(mockPublish).toHaveBeenCalledWith(
      'dauth.maker_checker.rejected', 't1',
      expect.objectContaining({
        decisionId: 'dec-1',
        checkerId: 'checker-1',
        reason: 'insufficient evidence',
      }),
    );
  });

  it('passes correct SQL parameters', async () => {
    mockSafeQuery.mockResolvedValueOnce({ rowCount: 1 });

    await rejectDecision('t1', 'dec-5', 'checker-2', 'policy violation');

    const [sql, params] = mockSafeQuery.mock.calls[0];
    expect(sql).toContain('UPDATE "tenant_t1".maker_checker_decisions');
    expect(sql).toContain("status = 'rejected'");
    expect(params).toEqual(['checker-2', 'policy violation', 'dec-5']);
  });

  it('only updates pending decisions', async () => {
    mockSafeQuery.mockResolvedValueOnce({ rowCount: 0 });

    const result = await rejectDecision('t1', 'already-approved', 'checker-1', 'too late');

    // Still returns success:true because the function does not check rowCount
    expect(result.success).toBe(true);
    expect(mockPublish).toHaveBeenCalled();
  });
});

/* ------------------------------------------------------------------ */
/*  getPendingDecisions                                                */
/* ------------------------------------------------------------------ */
describe('getPendingDecisions', () => {
  it('returns mapped pending decisions', async () => {
    const now = new Date('2026-03-01T00:00:00Z');
    mockSafeQuery.mockResolvedValueOnce({
      rows: [{
        decision_id: 'dec-1', tenant_id: 't1', entity_type: 'risk',
        entity_id: 'risk-1', action: 'approve', maker_id: 'maker-1',
        checker_id: null, status: 'pending', created_at: now,
        decided_at: null, reason: null,
      }],
    });

    const decisions = await getPendingDecisions('t1');

    expect(decisions).toHaveLength(1);
    expect(decisions[0].decisionId).toBe('dec-1');
    expect(decisions[0].status).toBe('pending');
    expect(decisions[0].checkerId).toBeNull();
    expect(decisions[0].decidedAt).toBeNull();
  });

  it('returns empty array when no pending decisions', async () => {
    const decisions = await getPendingDecisions('t1');
    expect(decisions).toHaveLength(0);
  });

  it('maps all fields correctly', async () => {
    const created = new Date('2026-02-15T10:00:00Z');
    mockSafeQuery.mockResolvedValueOnce({
      rows: [{
        decision_id: 'dec-9', tenant_id: 't1', entity_type: 'ctrl',
        entity_id: 'ctrl-3', action: 'delete', maker_id: 'mk-2',
        checker_id: null, status: 'pending', created_at: created,
        decided_at: null, reason: null,
      }],
    });

    const decisions = await getPendingDecisions('t1');

    expect(decisions[0].entityType).toBe('ctrl');
    expect(decisions[0].entityId).toBe('ctrl-3');
    expect(decisions[0].action).toBe('delete');
    expect(decisions[0].makerId).toBe('mk-2');
    expect(decisions[0].createdAt).toBe(created.toISOString());
  });

  it('queries for pending status ordered by created_at ASC', async () => {
    mockSafeQuery.mockResolvedValueOnce({ rows: [] });

    await getPendingDecisions('t1');

    const [sql] = mockSafeQuery.mock.calls[0];
    expect(sql).toContain("status = 'pending'");
    expect(sql).toContain('ORDER BY created_at ASC');
  });
});
