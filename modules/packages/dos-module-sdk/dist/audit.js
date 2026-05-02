"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.buildAuditEntry = buildAuditEntry;
function buildAuditEntry(ctx, entityType, entityId, action, changes) {
    return {
        tenantId: ctx.tenantId,
        actor: ctx.userId,
        actorType: 'user',
        moduleCode: ctx.moduleCode,
        entityType,
        entityId,
        action,
        before: changes?.before,
        after: changes?.after,
        correlationId: ctx.correlationId,
        source: 'api',
        timestamp: new Date().toISOString(),
    };
}
//# sourceMappingURL=audit.js.map