export interface RetentionPolicy {
    policyId: string;
    name: string;
    recordType: string;
    classification: string;
    retentionDays: number;
    legalBasis: string;
    jurisdictions: string[];
    isActive: boolean;
    createdAt: string;
}
export interface RetentionComplianceResult {
    recordId: string;
    title: string;
    recordType: string;
    classification: string;
    currentRetentionDays: number | null;
    requiredRetentionDays: number;
    isCompliant: boolean;
    gapDays: number;
    disposalDate: string | null;
    policyName: string;
}
export interface RetentionScheduleReport {
    tenantId: string;
    generatedAt: string;
    totalRecords: number;
    compliant: number;
    nonCompliant: number;
    dueForDisposal: number;
    upcoming30Days: number;
    byRecordType: Record<string, {
        compliant: number;
        nonCompliant: number;
    }>;
}
export declare function computeRetentionEndDate(createdAt: Date, retentionDays: number): Date;
export declare function isRetentionCompliant(currentRetentionDays: number | null, requiredRetentionDays: number): boolean;
export declare function computeRetentionGap(currentRetentionDays: number | null, requiredRetentionDays: number): number;
export declare function isDueForDisposal(disposalDate: string | null, now?: Date): boolean;
export declare function createRetentionPolicy(tenantId: string, data: {
    name: string;
    recordType: string;
    classification: string;
    retentionDays: number;
    legalBasis?: string;
    jurisdictions?: string[];
}): Promise<RetentionPolicy>;
export declare function getApplicablePolicy(tenantId: string, recordType: string, classification: string): Promise<RetentionPolicy | null>;
export declare function checkCompliance(tenantId: string, recordId: string): Promise<RetentionComplianceResult>;
export declare function enforceRetentionPolicies(tenantId: string): Promise<number>;
export declare function getRetentionScheduleReport(tenantId: string): Promise<RetentionScheduleReport>;
