export interface DauthSlaConfig {
    maxLoginLatencyMs: number;
    sessionTimeoutMinutes: number;
    mfaChallengeTimeoutSeconds: number;
    delegationMaxDurationHours: number;
    accessReviewSlaHours: number;
    passwordResetSlaMinutes: number;
    invitationExpiryHours: number;
}
export interface DauthEscalationPolicy {
    lockedAccountEscalation: string;
    sodViolationEscalation: string;
    accessReviewOverdueEscalation: string;
    bruteForceEscalation: string;
}
export interface DauthRunbookLinks {
    accountUnlock: string;
    passwordReset: string;
    mfaRecovery: string;
    delegationManagement: string;
    sodResolution: string;
    accessReviewProcess: string;
    sessionManagement: string;
    roleAssignmentGuide: string;
}
export declare function getDauthSlaConfig(tenantId: string): Promise<DauthSlaConfig>;
export declare function updateDauthSlaConfig(tenantId: string, updates: Partial<DauthSlaConfig>): Promise<DauthSlaConfig>;
export declare function getDauthEscalationPolicy(): DauthEscalationPolicy;
export declare function getDauthRunbookLinks(): DauthRunbookLinks;
export declare function getDauthAdminOverview(tenantId: string): Promise<{
    sla: DauthSlaConfig;
    escalation: DauthEscalationPolicy;
    runbooks: DauthRunbookLinks;
    stats: {
        totalUsers: number;
        activeUsers: number;
        lockedUsers: number;
        mfaEnabledUsers: number;
        activeDelegations: number;
        activeSodRules: number;
    };
}>;
