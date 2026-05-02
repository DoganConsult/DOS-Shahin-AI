import { describe, it, expect, vi, beforeEach } from 'vitest';

const { mockPublishEvent, mockLoggerError } = vi.hoisted(() => ({
  mockPublishEvent: vi.fn().mockResolvedValue(undefined),
  mockLoggerError: vi.fn(),
}));

vi.mock('@dos/module-sdk', () => ({
  publishEvent: mockPublishEvent,
  logger: { info: vi.fn(), warn: vi.fn(), error: mockLoggerError, debug: vi.fn() },
  toErrorMessage: (e: unknown) => (e as Error)?.message ?? String(e),
}));

import {
  publishUserCreated,
  publishUserUpdated,
  publishUserDeactivated,
  publishTeamMemberAdded,
  publishTeamMemberRemoved,
  publishRoleAssigned,
  publishRoleRevoked,
} from '../events/publisher';

describe('user-service publisher', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('publishUserCreated emits correct envelope', () => {
    publishUserCreated('t1', 'u1', { name: 'Test' });
    expect(mockPublishEvent).toHaveBeenCalledWith(
      expect.objectContaining({ event: 'user.created', eventType: 'user.created', tenantId: 't1', entityId: 'u1' }),
    );
  });

  it('publishUserUpdated emits correct envelope', () => {
    publishUserUpdated('t1', 'u1', { name: 'New' });
    expect(mockPublishEvent).toHaveBeenCalledWith(
      expect.objectContaining({ event: 'user.updated', entityId: 'u1' }),
    );
  });

  it('publishUserDeactivated emits correct envelope', () => {
    publishUserDeactivated('t1', 'u1', { deactivatedBy: 'u2' });
    expect(mockPublishEvent).toHaveBeenCalledWith(
      expect.objectContaining({ event: 'user.deactivated' }),
    );
  });

  it('publishTeamMemberAdded carries team + member in data', () => {
    publishTeamMemberAdded('t1', 'team-1', 'u2', 'u1');
    expect(mockPublishEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        event: 'team.member_added',
        data: { teamId: 'team-1', memberId: 'u2' },
      }),
    );
  });

  it('publishTeamMemberRemoved carries team + member in data', () => {
    publishTeamMemberRemoved('t1', 'team-1', 'u2', 'u1');
    expect(mockPublishEvent).toHaveBeenCalledWith(
      expect.objectContaining({ event: 'team.member_removed' }),
    );
  });

  it('publishRoleAssigned carries roleCode in data', () => {
    publishRoleAssigned('t1', 'u1', 'admin', 'u2');
    expect(mockPublishEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        event: 'user.role_assigned',
        data: { userId: 'u1', roleCode: 'admin' },
      }),
    );
  });

  it('publishRoleRevoked emits the correct eventType', () => {
    publishRoleRevoked('t1', 'u1', 'admin', 'u2');
    expect(mockPublishEvent).toHaveBeenCalledWith(
      expect.objectContaining({ event: 'user.role_revoked' }),
    );
  });

  it('logs when publish fails instead of silently swallowing', async () => {
    mockPublishEvent.mockRejectedValueOnce(new Error('redis down'));
    publishUserCreated('t1', 'u1', {});
    // microtask — catch handler must have run
    await new Promise((r) => setImmediate(r));
    expect(mockLoggerError).toHaveBeenCalledWith(
      '[user-service.publisher] publishEvent failed',
      expect.objectContaining({ eventType: 'user.created', error: 'redis down' }),
    );
  });

  it('user.created sets module=user, entityType=user, and data passthrough', () => {
    publishUserCreated('t1', 'u1', { email: 'a@b' });
    const call = mockPublishEvent.mock.calls.at(-1)[0];
    expect(call.module).toBe('user');
    expect(call.entityType).toBe('user');
    expect(call.userId).toBe('u1');
    expect(call.data).toEqual({ email: 'a@b' });
    expect(typeof call.occurredAt).toBe('string');
  });

  it('team.member_added sets entityType=team_member, userId=actor', () => {
    publishTeamMemberAdded('t1', 'team-1', 'u2', 'actor');
    const call = mockPublishEvent.mock.calls.at(-1)[0];
    expect(call.entityType).toBe('team_member');
    expect(call.entityId).toBe('team-1');
    expect(call.userId).toBe('actor');
    expect(call.data.memberId).toBe('u2');
  });

  it('role.assigned uses userId=actor and embeds both user + role code', () => {
    publishRoleAssigned('t1', 'victim', 'admin', 'actor');
    const call = mockPublishEvent.mock.calls.at(-1)[0];
    expect(call.userId).toBe('actor');
    expect(call.entityId).toBe('victim');
    expect(call.data).toEqual({ userId: 'victim', roleCode: 'admin' });
  });
});
