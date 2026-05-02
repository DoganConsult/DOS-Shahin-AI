import type { RecordsStatus } from '../types/records.types';
export type RecordsEntityType = 'record' | 'retention_policy' | 'retention_schedule' | 'disposal_action' | 'legal_hold' | 'lifecycle_log';
export type RecordsAction = 'created' | 'updated' | 'deleted' | 'status_changed' | 'classified' | 'reclassified' | 'metadata_enriched' | 'retention_assigned' | 'retention_updated' | 'retention_expired' | 'disposal_scheduled' | 'disposal_executed' | 'disposal_cancelled' | 'legal_hold_placed' | 'legal_hold_released' | 'review_started' | 'review_completed' | 'archived' | 'restored' | 'escalated' | 'approved' | 'rejected' | 'bulk_updated' | 'exported' | 'imported';
export interface RecordsEventOptions {
    tenantId: string;
    entityType: RecordsEntityType;
    entityId: string;
    action: RecordsAction;
    triggeredBy: string;
    previousState?: RecordsStatus;
    newState?: RecordsStatus;
    correlationId?: string;
    severity?: string;
    data?: Record<string, unknown>;
}
export declare function emitRecordsEvent(opts: RecordsEventOptions): void;
export declare function emitRecordsStatusChange(tenantId: string, entityType: RecordsEntityType, entityId: string, previousState: RecordsStatus, newState: RecordsStatus, triggeredBy: string, correlationId?: string): void;
export declare function emitLegalHoldPlaced(tenantId: string, recordId: string, reason: string, triggeredBy: string): void;
export declare function emitLegalHoldReleased(tenantId: string, recordId: string, triggeredBy: string): void;
export declare function emitDisposalExecuted(tenantId: string, recordId: string, method: string, triggeredBy: string): void;
export declare function emitRetentionAssigned(tenantId: string, recordId: string, retentionDays: number, policyName: string, triggeredBy: string): void;
export declare function emitRecordClassified(tenantId: string, recordId: string, classification: string, triggeredBy: string): void;
export declare function emitRecordReclassified(tenantId: string, recordId: string, oldClass: string, newClass: string, triggeredBy: string): void;
