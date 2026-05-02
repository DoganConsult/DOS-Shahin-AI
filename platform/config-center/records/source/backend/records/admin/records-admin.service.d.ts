import type { RecordsStatus } from '../types/records.types';
export interface StuckRecordEntry {
    recordId: string;
    title: string;
    status: RecordsStatus;
    stuckSinceDays: number;
    hasActiveWorkflow: boolean;
    hasLegalHold: boolean;
}
export interface RecordsAdminSummary {
    tenantId: string;
    generatedAt: string;
    totalRecords: number;
    byStatus: Record<string, number>;
    stuckDisposalPendingCount: number;
    recordsOnHoldCount: number;
    orphanedRecordsCount: number;
}
export interface BulkStatusOverrideResult {
    updated: number;
    failed: number;
    recordIds: string[];
}
export declare function getAdminSummary(tenantId: string): Promise<RecordsAdminSummary>;
export declare function listStuckRecords(tenantId: string, status: RecordsStatus, olderThanDays?: number): Promise<StuckRecordEntry[]>;
export declare function forceReleaseHold(tenantId: string, recordId: string, actorId: string, reason: string): Promise<{
    released: boolean;
    recordId: string;
}>;
export declare function bulkOverrideStatus(tenantId: string, recordIds: string[], targetStatus: RecordsStatus, actorId: string, reason: string): Promise<BulkStatusOverrideResult>;
export declare function purgeDisposedRecords(tenantId: string, actorId: string, olderThanDays?: number): Promise<{
    purged: number;
}>;
export declare function getRetentionPolicyAdminList(tenantId: string, includeInactive?: boolean): Promise<Array<{
    policyId: string;
    name: string;
    recordType: string;
    retentionDays: number;
    isActive: boolean;
    createdAt: string;
}>>;
export declare function toggleRetentionPolicy(tenantId: string, policyId: string, activate: boolean, actorId: string): Promise<{
    policyId: string;
    isActive: boolean;
}>;
