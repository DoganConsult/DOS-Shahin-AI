export interface TrainingCertificationRequirement {
    requirement_id: string;
    action_token: string;
    required_catalog_id: string | null;
    certification_code: string;
    description: string | null;
    mandatory: boolean;
    grace_period_days: number;
    enabled: boolean;
}
export interface CertificationCheckResult {
    authorized: boolean;
    reason: string;
    missingCertifications: string[];
    expiringSoon: string[];
    gracePeriodActive: boolean;
}
export interface TrainingRecommendation {
    campaignId: string;
    title: string;
    matchScore: number;
    tags: string[];
}
export interface TrainingComplianceMetrics {
    totalUsers: number;
    certifiedUsers: number;
    expiredCertifications: number;
    expiringSoon: number;
    complianceRate: number;
    topMissingCertifications: Array<{
        certification_code: string;
        missing_count: number;
    }>;
    recentCompletions: Array<{
        user_id: string;
        certification_code: string;
        completed_at: string;
    }>;
}
export declare function syncCertificationAuthZState(tenantId: string, userId: string, certificationCode: string, isActive: boolean): Promise<void>;
export declare function checkCertificationForAction(tenantId: string, userId: string, actionToken: string): Promise<CertificationCheckResult>;
export declare function recommendTrainingForGap(tenantId: string, gapDescription: string, limit?: number): Promise<TrainingRecommendation[]>;
export declare function batchSyncCertifications(tenantId: string): Promise<{
    synced: number;
    revoked: number;
    errors: number;
}>;
export declare function getExpiringCertifications(tenantId: string, withinDays?: number): Promise<Array<{
    user_id: string;
    certification_code: string;
    expires_at: string;
    days_remaining: number;
}>>;
export declare function autoRevokeExpiredCertifications(tenantId: string): Promise<number>;
export declare function getMandatoryRequirements(tenantId: string, actionToken?: string): Promise<TrainingCertificationRequirement[]>;
export declare function getTrainingComplianceMetrics(tenantId: string): Promise<TrainingComplianceMetrics>;
export declare function autoAssignTrainingForGap(tenantId: string, userId: string, gapDescription: string): Promise<{
    assigned: boolean;
    campaignId: string | null;
    reason: string;
}>;
