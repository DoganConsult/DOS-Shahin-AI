"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.publishUserCreated = publishUserCreated;
exports.publishUserUpdated = publishUserUpdated;
exports.publishUserDeactivated = publishUserDeactivated;
exports.publishTeamMemberAdded = publishTeamMemberAdded;
exports.publishTeamMemberRemoved = publishTeamMemberRemoved;
exports.publishRoleAssigned = publishRoleAssigned;
exports.publishRoleRevoked = publishRoleRevoked;
const module_sdk_1 = require("@dos/module-sdk");
/**
 * Fire-and-forget publish with logged failures. The caller's request/response
 * is not blocked on event delivery, but delivery failures MUST be surfaced in
 * logs (and therefore metrics via pino pipeline) so silent drops don't happen.
 */
function emit(event) {
    (0, module_sdk_1.publishEvent)(event).catch((err) => {
        module_sdk_1.logger.error('[user-service.publisher] publishEvent failed', {
            eventType: event.eventType,
            tenantId: event.tenantId,
            entityId: event.entityId,
            error: (0, module_sdk_1.toErrorMessage)(err),
        });
    });
}
function now() {
    return new Date().toISOString();
}
function publishUserCreated(tenantId, userId, data) {
    emit({
        module: 'user', event: 'user.created', eventType: 'user.created',
        tenantId, entityType: 'user', entityId: userId, userId,
        data, occurredAt: now(),
    });
}
function publishUserUpdated(tenantId, userId, data) {
    emit({
        module: 'user', event: 'user.updated', eventType: 'user.updated',
        tenantId, entityType: 'user', entityId: userId, userId,
        data, occurredAt: now(),
    });
}
function publishUserDeactivated(tenantId, userId, data) {
    emit({
        module: 'user', event: 'user.deactivated', eventType: 'user.deactivated',
        tenantId, entityType: 'user', entityId: userId, userId,
        data, occurredAt: now(),
    });
}
function publishTeamMemberAdded(tenantId, teamId, userId, actorId) {
    emit({
        module: 'user', event: 'team.member_added', eventType: 'team.member_added',
        tenantId, entityType: 'team_member', entityId: teamId, userId: actorId,
        data: { teamId, memberId: userId }, occurredAt: now(),
    });
}
function publishTeamMemberRemoved(tenantId, teamId, userId, actorId) {
    emit({
        module: 'user', event: 'team.member_removed', eventType: 'team.member_removed',
        tenantId, entityType: 'team_member', entityId: teamId, userId: actorId,
        data: { teamId, memberId: userId }, occurredAt: now(),
    });
}
function publishRoleAssigned(tenantId, userId, roleCode, actorId) {
    emit({
        module: 'user', event: 'user.role_assigned', eventType: 'user.role_assigned',
        tenantId, entityType: 'user', entityId: userId, userId: actorId,
        data: { userId, roleCode }, occurredAt: now(),
    });
}
function publishRoleRevoked(tenantId, userId, roleCode, actorId) {
    emit({
        module: 'user', event: 'user.role_revoked', eventType: 'user.role_revoked',
        tenantId, entityType: 'user', entityId: userId, userId: actorId,
        data: { userId, roleCode }, occurredAt: now(),
    });
}
//# sourceMappingURL=publisher.js.map