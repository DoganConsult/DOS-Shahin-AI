import { publishEvent, logger, toErrorMessage } from '@dos/module-sdk';
import type { PlatformEvent } from '@dos/types';

/**
 * Fire-and-forget publish with logged failures. The caller's request/response
 * is not blocked on event delivery, but delivery failures MUST be surfaced in
 * logs (and therefore metrics via pino pipeline) so silent drops don't happen.
 */
function emit(event: PlatformEvent): void {
  publishEvent(event).catch((err: unknown) => {
    logger.error('[user-service.publisher] publishEvent failed', {
      eventType: event.eventType,
      tenantId: event.tenantId,
      entityId: event.entityId,
      error: toErrorMessage(err),
    });
  });
}

function now(): string {
  return new Date().toISOString();
}

export function publishUserCreated(tenantId: string, userId: string, data: Record<string, unknown>): void {
  emit({
    module: 'user', event: 'user.created', eventType: 'user.created',
    tenantId, entityType: 'user', entityId: userId, userId,
    data, occurredAt: now(),
  });
}

export function publishUserUpdated(tenantId: string, userId: string, data: Record<string, unknown>): void {
  emit({
    module: 'user', event: 'user.updated', eventType: 'user.updated',
    tenantId, entityType: 'user', entityId: userId, userId,
    data, occurredAt: now(),
  });
}

export function publishUserDeactivated(tenantId: string, userId: string, data: Record<string, unknown>): void {
  emit({
    module: 'user', event: 'user.deactivated', eventType: 'user.deactivated',
    tenantId, entityType: 'user', entityId: userId, userId,
    data, occurredAt: now(),
  });
}

export function publishTeamMemberAdded(
  tenantId: string, teamId: string, userId: string, actorId: string,
): void {
  emit({
    module: 'user', event: 'team.member_added', eventType: 'team.member_added',
    tenantId, entityType: 'team_member', entityId: teamId, userId: actorId,
    data: { teamId, memberId: userId }, occurredAt: now(),
  });
}

export function publishTeamMemberRemoved(
  tenantId: string, teamId: string, userId: string, actorId: string,
): void {
  emit({
    module: 'user', event: 'team.member_removed', eventType: 'team.member_removed',
    tenantId, entityType: 'team_member', entityId: teamId, userId: actorId,
    data: { teamId, memberId: userId }, occurredAt: now(),
  });
}

export function publishRoleAssigned(
  tenantId: string, userId: string, roleCode: string, actorId: string,
): void {
  emit({
    module: 'user', event: 'user.role_assigned', eventType: 'user.role_assigned',
    tenantId, entityType: 'user', entityId: userId, userId: actorId,
    data: { userId, roleCode }, occurredAt: now(),
  });
}

export function publishRoleRevoked(
  tenantId: string, userId: string, roleCode: string, actorId: string,
): void {
  emit({
    module: 'user', event: 'user.role_revoked', eventType: 'user.role_revoked',
    tenantId, entityType: 'user', entityId: userId, userId: actorId,
    data: { userId, roleCode }, occurredAt: now(),
  });
}
