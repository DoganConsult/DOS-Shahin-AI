"use strict";
/**
 * Field-Level Denial Audit Logger
 *
 * Instruments field-level access denials/redactions so they are observable
 * without exposing the sensitive data itself.
 *
 * Logged to:
 * - structured console (pino) for immediate observability
 * - audit_trail table for forensic trace (fire-and-forget, non-blocking)
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.logFieldDenial = logFieldDenial;
exports.logSuperAdminFieldAccess = logSuperAdminFieldAccess;
let _logger = null;
function getLogger() {
    if (!_logger) {
        try {
            const pino = require('pino');
            _logger = pino({ name: 'field-denial-audit' });
        }
        catch {
            _logger = {
                warn: (obj, msg) => {
                    console.warn(`[field-denial-audit] ${msg}`, JSON.stringify(obj));
                },
            };
        }
    }
    return _logger;
}
/**
 * Log field-level access denial or redaction.
 * MUST NOT log the actual field values — only field names and metadata.
 */
function logFieldDenial(entry) {
    const logger = getLogger();
    logger.warn({
        event: 'field_access_denial',
        actor: entry.actor,
        tenantId: entry.tenantId,
        module: entry.module,
        action: entry.action,
        fieldsRedacted: entry.fieldsRedacted,
        fieldsDenied: entry.fieldsDenied,
        sensitivityLevels: entry.sensitivityLevels,
        requestPath: entry.requestPath,
        requestId: entry.requestId,
        isSuperAdminOverride: entry.isSuperAdminOverride,
        timestamp: entry.timestamp,
    }, `Field access denied: ${entry.fieldsDenied.length} denied, ${entry.fieldsRedacted.length} redacted in ${entry.module}`);
    // Fire-and-forget DB audit trail record
    persistFieldDenialAudit(entry).catch(() => {
        // Audit persistence failure must never break the request
    });
}
async function persistFieldDenialAudit(entry) {
    try {
        const { safeQuery, tenantSchema } = require('@dos/db');
        const schema = tenantSchema(entry.tenantId);
        await safeQuery(`INSERT INTO "${schema}".audit_trail
       (user_id, action, entity_type, module, path, method, metadata)
       VALUES ($1, $2, 'field_access', $3, $4, 'FIELD_RBAC', $5)`, [
            entry.actor,
            'field_access_denial',
            entry.module,
            entry.requestPath || 'unknown',
            JSON.stringify({
                fieldsRedacted: entry.fieldsRedacted,
                fieldsDenied: entry.fieldsDenied,
                sensitivityLevels: entry.sensitivityLevels,
                isSuperAdminOverride: entry.isSuperAdminOverride || false,
                requestId: entry.requestId,
            }),
        ]);
    }
    catch {
        // Best effort — do not propagate audit storage failures
    }
}
/**
 * Log super-admin access bypass with explicit differentiation.
 * Called when a super-admin accesses fields that would otherwise be denied.
 */
function logSuperAdminFieldAccess(entry) {
    const logger = getLogger();
    logger.warn({
        event: 'super_admin_field_access',
        actor: entry.actor,
        tenantId: entry.tenantId,
        module: entry.module,
        action: entry.action,
        fieldsAccessed: entry.fieldsAccessed,
        sensitivityLevels: entry.sensitivityLevels,
        requestPath: entry.requestPath,
        requestId: entry.requestId,
        isSuperAdminOverride: true,
        timestamp: entry.timestamp,
    }, `Super-admin field access override: ${entry.fieldsAccessed.length} sensitive fields in ${entry.module}`);
    // Fire-and-forget DB audit trail record
    persistSuperAdminFieldAudit(entry).catch(() => { });
}
async function persistSuperAdminFieldAudit(entry) {
    try {
        const { safeQuery, tenantSchema } = require('@dos/db');
        const schema = tenantSchema(entry.tenantId);
        await safeQuery(`INSERT INTO "${schema}".audit_trail
       (user_id, action, entity_type, module, path, method, metadata)
       VALUES ($1, $2, 'field_access', $3, $4, 'SUPER_ADMIN_OVERRIDE', $5)`, [
            entry.actor,
            'super_admin_field_override',
            entry.module,
            entry.requestPath || 'unknown',
            JSON.stringify({
                fieldsAccessed: entry.fieldsAccessed,
                sensitivityLevels: entry.sensitivityLevels,
                isSuperAdminOverride: true,
                breakGlass: true,
                elevatedAccessReason: 'super_admin_role',
                requestId: entry.requestId,
            }),
        ]);
    }
    catch {
        // Best effort
    }
}
//# sourceMappingURL=field-denial-audit.js.map