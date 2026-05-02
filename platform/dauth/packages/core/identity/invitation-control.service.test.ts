import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockQuery = vi.fn();
vi.mock('../../../config/database', () => ({
  query: (...args: unknown[]) => mockQuery(...args),
  safeQuery: vi.fn(),
  tenantSchema: (t: string) => `tenant_${t}`,
}));

const mockPublish = vi.fn();
vi.mock('../../dos/events/event-bus', () => ({
  publish: (...args: unknown[]) => mockPublish(...args),
}));

vi.mock('../policies/tenant-security-policy.service', () => ({
  getTenantSecurityPolicy: vi.fn().mockResolvedValue({
    invitationExpiryHours: 72,
  }),
}));

import {
  createInvitation,
  validateInvitation,
  acceptInvitation,
  revokeInvitation,
  getPendingInvitations,
  expireStaleInvitations,
} from './invitation-control.service';

beforeEach(() => {
  vi.clearAllMocks();
  mockQuery.mockResolvedValue({ rows: [], rowCount: 0 });
  mockPublish.mockResolvedValue(undefined);
});

describe('DAuth InvitationControl — createInvitation', () => {
  it('creates invitation with correct fields and returns Invitation object', async () => {
    mockQuery.mockResolvedValueOnce({
      rows: [{
        invitation_id: 'inv-001',
        created_at: new Date('2026-03-29T00:00:00Z'),
      }],
      rowCount: 1,
    });

    const result = await createInvitation('t-1', 'new@user.com', 'editor', 'admin-001');
    expect(result.invitationId).toBe('inv-001');
    expect(result.tenantId).toBe('t-1');
    expect(result.email).toBe('new@user.com');
    expect(result.roleCode).toBe('editor');
    expect(result.invitedBy).toBe('admin-001');
    expect(result.status).toBe('pending');
    expect(result.token.length).toBe(64); // 32 bytes hex
    expect(result.acceptedAt).toBeNull();
  });

  it('publishes invitation.created event', async () => {
    mockQuery.mockResolvedValueOnce({
      rows: [{ invitation_id: 'inv-002', created_at: new Date() }],
      rowCount: 1,
    });

    await createInvitation('t-1', 'user@test.com', 'viewer', 'admin-001');
    expect(mockPublish).toHaveBeenCalledWith(
      'dauth.invitation.created',
      't-1',
      expect.objectContaining({ email: 'user@test.com', roleCode: 'viewer' }),
    );
  });

  it('uses tenant security policy for expiry calculation', async () => {
    mockQuery.mockResolvedValueOnce({
      rows: [{ invitation_id: 'inv-003', created_at: new Date() }],
      rowCount: 1,
    });

    const result = await createInvitation('t-1', 'a@b.com', 'admin', 'admin-001');
    // 72 hours expiry from policy
    const expiresAt = new Date(result.expiresAt);
    const diffHours = (expiresAt.getTime() - Date.now()) / (60 * 60_000);
    expect(diffHours).toBeGreaterThan(71);
    expect(diffHours).toBeLessThanOrEqual(72);
  });

  it('inserts into invitations table', async () => {
    mockQuery.mockResolvedValueOnce({
      rows: [{ invitation_id: 'inv-004', created_at: new Date() }],
    });

    await createInvitation('t-1', 'user@test.com', 'editor', 'admin-001');
    const [sql, params] = mockQuery.mock.calls[0];
    expect(sql).toContain('INSERT INTO invitations');
    expect(sql).toContain('RETURNING invitation_id');
    expect(params[0]).toBe('t-1');
    expect(params[1]).toBe('user@test.com');
    expect(params[2]).toBe('editor');
  });
});

describe('DAuth InvitationControl — validateInvitation', () => {
  it('returns null for invalid or expired token', async () => {
    mockQuery.mockResolvedValue({ rows: [] });
    const result = await validateInvitation('bad-token');
    expect(result).toBeNull();
  });

  it('returns Invitation object for valid pending token', async () => {
    mockQuery.mockResolvedValue({
      rows: [{
        invitation_id: 'inv-001',
        tenant_id: 't-1',
        email: 'user@test.com',
        role_code: 'editor',
        invited_by: 'admin-001',
        status: 'pending',
        token: 'valid-token',
        expires_at: new Date('2026-04-01T00:00:00Z'),
        created_at: new Date('2026-03-29T00:00:00Z'),
        accepted_at: null,
      }],
    });

    const result = await validateInvitation('valid-token');
    expect(result).not.toBeNull();
    expect(result!.invitationId).toBe('inv-001');
    expect(result!.email).toBe('user@test.com');
    expect(result!.status).toBe('pending');
  });

  it('only matches pending invitations that have not expired', async () => {
    mockQuery.mockResolvedValue({ rows: [] });
    await validateInvitation('some-token');
    const [sql] = mockQuery.mock.calls[0];
    expect(sql).toContain("status = 'pending'");
    expect(sql).toContain('expires_at > NOW()');
  });
});

describe('DAuth InvitationControl — acceptInvitation', () => {
  it('returns false when token is invalid or already accepted', async () => {
    mockQuery.mockResolvedValue({ rows: [], rowCount: 0 });
    const result = await acceptInvitation('bad-token');
    expect(result).toBe(false);
  });

  it('returns true when invitation is accepted', async () => {
    mockQuery.mockResolvedValue({ rows: [], rowCount: 1 });
    const result = await acceptInvitation('valid-token');
    expect(result).toBe(true);
  });

  it('updates status to accepted with timestamp', async () => {
    mockQuery.mockResolvedValue({ rows: [], rowCount: 1 });
    await acceptInvitation('valid-token');
    const [sql, params] = mockQuery.mock.calls[0];
    expect(sql).toContain("status = 'accepted'");
    expect(sql).toContain('accepted_at = NOW()');
    expect(params).toEqual(['valid-token']);
  });

  it('only accepts pending non-expired invitations', async () => {
    mockQuery.mockResolvedValue({ rows: [], rowCount: 0 });
    await acceptInvitation('token');
    const [sql] = mockQuery.mock.calls[0];
    expect(sql).toContain("status = 'pending'");
    expect(sql).toContain('expires_at > NOW()');
  });
});

describe('DAuth InvitationControl — revokeInvitation', () => {
  it('returns false when invitation not found or already non-pending', async () => {
    mockQuery.mockResolvedValue({ rows: [], rowCount: 0 });
    const result = await revokeInvitation('inv-999', 'admin-001');
    expect(result).toBe(false);
  });

  it('returns true when invitation is revoked', async () => {
    mockQuery.mockResolvedValue({ rows: [], rowCount: 1 });
    const result = await revokeInvitation('inv-001', 'admin-001');
    expect(result).toBe(true);
  });

  it('only revokes pending invitations', async () => {
    mockQuery.mockResolvedValue({ rows: [], rowCount: 1 });
    await revokeInvitation('inv-001', 'admin-001');
    const [sql] = mockQuery.mock.calls[0];
    expect(sql).toContain("status = 'revoked'");
    expect(sql).toContain("status = 'pending'");
  });
});

describe('DAuth InvitationControl — getPendingInvitations', () => {
  it('returns empty array when no pending invitations', async () => {
    mockQuery.mockResolvedValue({ rows: [] });
    const result = await getPendingInvitations('t-1');
    expect(result).toEqual([]);
  });

  it('returns mapped Invitation array for tenant', async () => {
    mockQuery.mockResolvedValue({
      rows: [
        {
          invitation_id: 'inv-001',
          tenant_id: 't-1',
          email: 'a@b.com',
          role_code: 'editor',
          invited_by: 'admin-001',
          status: 'pending',
          token: 'tok-1',
          expires_at: new Date('2026-04-01'),
          created_at: new Date('2026-03-29'),
          accepted_at: null,
        },
        {
          invitation_id: 'inv-002',
          tenant_id: 't-1',
          email: 'c@d.com',
          role_code: 'viewer',
          invited_by: 'admin-001',
          status: 'pending',
          token: 'tok-2',
          expires_at: new Date('2026-04-01'),
          created_at: new Date('2026-03-28'),
          accepted_at: null,
        },
      ],
    });

    const result = await getPendingInvitations('t-1');
    expect(result).toHaveLength(2);
    expect(result[0].invitationId).toBe('inv-001');
    expect(result[1].email).toBe('c@d.com');
  });

  it('filters by tenantId, pending status, and non-expired', async () => {
    mockQuery.mockResolvedValue({ rows: [] });
    await getPendingInvitations('t-5');
    const [sql, params] = mockQuery.mock.calls[0];
    expect(sql).toContain("status = 'pending'");
    expect(sql).toContain('expires_at > NOW()');
    expect(params).toEqual(['t-5']);
  });
});

describe('DAuth InvitationControl — expireStaleInvitations', () => {
  it('returns 0 when no stale invitations', async () => {
    mockQuery.mockResolvedValue({ rows: [], rowCount: 0 });
    const count = await expireStaleInvitations();
    expect(count).toBe(0);
  });

  it('returns count of expired invitations', async () => {
    mockQuery.mockResolvedValue({ rows: [], rowCount: 5 });
    const count = await expireStaleInvitations();
    expect(count).toBe(5);
  });

  it('updates pending invitations past their expiry', async () => {
    mockQuery.mockResolvedValue({ rows: [], rowCount: 0 });
    await expireStaleInvitations();
    const [sql] = mockQuery.mock.calls[0];
    expect(sql).toContain("status = 'expired'");
    expect(sql).toContain("status = 'pending'");
    expect(sql).toContain('expires_at < NOW()');
  });
});
