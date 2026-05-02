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
export interface FieldDenialAuditEntry {
    timestamp: string;
    actor: string;
    tenantId: string;
    module: string;
    action: string;
    fieldsRedacted: string[];
    fieldsDenied: string[];
    sensitivityLevels: Record<string, string>;
    requestPath?: string;
    requestId?: string;
    isSuperAdminOverride?: boolean;
}
/**
 * Log field-level access denial or redaction.
 * MUST NOT log the actual field values — only field names and metadata.
 */
export declare function logFieldDenial(entry: FieldDenialAuditEntry): void;
/**
 * Log super-admin access bypass with explicit differentiation.
 * Called when a super-admin accesses fields that would otherwise be denied.
 */
export declare function logSuperAdminFieldAccess(entry: Omit<FieldDenialAuditEntry, 'fieldsDenied' | 'fieldsRedacted'> & {
    fieldsAccessed: string[];
}): void;
