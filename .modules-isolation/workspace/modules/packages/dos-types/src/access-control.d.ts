/**
 * @dos/types — access control and identity governance types
 * Covers IAM, PAM, access reviews, zero-trust, certificate management
 */
export type IdentityType = 'human' | 'service_account' | 'bot' | 'shared_account' | 'system_account' | 'contractor' | 'privileged';
export type IdentityStatus = 'active' | 'inactive' | 'suspended' | 'pending_approval' | 'locked' | 'deprovisioned';
export interface IdentityRecord {
    identityId: string;
    tenantId: string;
    externalId?: string;
    type: IdentityType;
    status: IdentityStatus;
    displayName: string;
    email?: string;
    employeeId?: string;
    managerId?: string;
    department?: string;
    jobTitle?: string;
    costCenter?: string;
    location?: string;
    startDate?: string;
    endDate?: string;
    riskScore?: number;
    riskLevel?: 'critical' | 'high' | 'medium' | 'low';
    isoSponsor?: string;
    sources?: string[];
    labels?: string[];
    attributes?: Record<string, unknown>;
    createdAt: string;
    updatedAt: string;
    lastReviewedAt?: string;
}
export type EntitlementType = 'role' | 'group' | 'permission' | 'resource_access' | 'application_access' | 'data_access';
export type EntitlementStatus = 'active' | 'pending' | 'expired' | 'revoked';
export interface Entitlement {
    entitlementId: string;
    tenantId: string;
    identityId?: string;
    name: string;
    displayName?: string;
    type: EntitlementType;
    status: EntitlementStatus;
    systemId?: string;
    systemName?: string;
    scopeType?: string;
    scopeId?: string;
    permissions?: string[];
    grantedBy?: string;
    grantedAt?: string;
    expiresAt?: string;
    revokedBy?: string;
    revokedAt?: string;
    isCritical?: boolean;
    isSoD?: boolean;
    reviewRequired?: boolean;
    justification?: string;
    requestId?: string;
    metadata?: Record<string, unknown>;
    createdAt: string;
    updatedAt: string;
}
export type AccessRequestStatus = 'draft' | 'submitted' | 'pending_approval' | 'approved' | 'provisioned' | 'rejected' | 'cancelled' | 'expired';
export type AccessRequestType = 'new_access' | 'modify_access' | 'remove_access' | 'extension' | 'emergency';
export interface AccessRequest {
    requestId: string;
    tenantId: string;
    requestType: AccessRequestType;
    status: AccessRequestStatus;
    requestedBy?: string;
    requestedFor?: string;
    requestedForType?: 'user' | 'group' | 'service_account';
    entitlements?: string[];
    systems?: string[];
    justification?: string;
    businessJustification?: string;
    duration?: number;
    durationUnit?: 'hours' | 'days' | 'months' | 'permanent';
    approvalSteps?: AccessApprovalStep[];
    currentStep?: number;
    provisioningJobId?: string;
    fulfillmentNote?: string;
    riskAssessment?: AccessRiskAssessment;
    ticketRef?: string;
    requestedAt?: string;
    completedAt?: string;
    expiresAt?: string;
    metadata?: Record<string, unknown>;
    createdAt: string;
    updatedAt: string;
}
export interface AccessApprovalStep {
    stepId: string;
    order: number;
    approverType: 'manager' | 'owner' | 'security' | 'it' | 'custom';
    approverId?: string;
    approverGroupId?: string;
    status: 'pending' | 'approved' | 'rejected' | 'delegated' | 'skipped';
    decidedAt?: string;
    comments?: string;
    delegatedTo?: string;
}
export interface AccessRiskAssessment {
    overallRisk?: 'critical' | 'high' | 'medium' | 'low';
    sodConflicts?: SoDConflict[];
    sensitiveDataAccess?: boolean;
    privilegedAccess?: boolean;
    externalAccess?: boolean;
    mitigations?: string[];
    riskAccepted?: boolean;
    acceptedBy?: string;
    assessedAt?: string;
}
export interface SoDConflict {
    conflictId: string;
    tenantId?: string;
    identityId?: string;
    ruleId: string;
    ruleName?: string;
    riskLevel?: 'critical' | 'high' | 'medium' | 'low';
    conflictingEntitlement1: string;
    conflictingEntitlement2: string;
    detectedAt?: string;
    status?: 'open' | 'mitigated' | 'accepted' | 'resolved';
    mitigationControl?: string;
    mitigationNote?: string;
    acceptedBy?: string;
    resolvedAt?: string;
}
export interface SoDRule {
    ruleId: string;
    tenantId?: string;
    name: string;
    description?: string;
    riskLevel: 'critical' | 'high' | 'medium' | 'low';
    businessProcess?: string;
    permission1?: string[];
    permission2?: string[];
    mitigatingControls?: string[];
    isActive?: boolean;
    createdBy?: string;
    createdAt: string;
    updatedAt?: string;
}
export type ReviewCampaignType = 'user_access' | 'privileged_access' | 'application_access' | 'role_membership' | 'service_account' | 'guest_access';
export type ReviewCampaignStatus = 'draft' | 'active' | 'paused' | 'completed' | 'cancelled';
export interface AccessReviewCampaign {
    campaignId: string;
    tenantId: string;
    name: string;
    type: ReviewCampaignType;
    status: ReviewCampaignStatus;
    description?: string;
    scope?: AccessReviewScope;
    reviewers?: AccessReviewer[];
    startDate?: string;
    dueDate?: string;
    gracePeriodDays?: number;
    completedAt?: string;
    totalItems?: number;
    reviewedItems?: number;
    approvedCount?: number;
    revokedCount?: number;
    delegatedCount?: number;
    pendingCount?: number;
    completionPct?: number;
    autoRevoke?: boolean;
    autoRevokeAfterDays?: number;
    reminderFrequency?: number;
    certifiedBy?: string;
    certifiedAt?: string;
    createdBy?: string;
    metadata?: Record<string, unknown>;
    createdAt: string;
    updatedAt: string;
}
export interface AccessReviewScope {
    includeRiskLevels?: string[];
    includeSystems?: string[];
    includeEntitlementTypes?: string[];
    includeDepartments?: string[];
    includeJobTitles?: string[];
    includePrivilegedOnly?: boolean;
    includeExternalUsers?: boolean;
    includeServiceAccounts?: boolean;
}
export interface AccessReviewer {
    reviewerId: string;
    type: 'manager' | 'owner' | 'security_team' | 'custom';
    userId?: string;
    groupId?: string;
    scope?: string;
}
export interface AccessReviewItem {
    itemId: string;
    campaignId: string;
    tenantId: string;
    identityId?: string;
    identityName?: string;
    entitlementId?: string;
    entitlementName?: string;
    systemName?: string;
    riskLevel?: 'critical' | 'high' | 'medium' | 'low';
    reviewerId?: string;
    decision?: 'approve' | 'revoke' | 'modify' | 'delegate';
    decisionReason?: string;
    decisionBy?: string;
    decisionAt?: string;
    previousDecision?: string;
    delegatedTo?: string;
    remediationStatus?: 'pending' | 'in_progress' | 'completed' | 'failed';
    remediationNote?: string;
    status: 'pending' | 'decided' | 'overdue';
    dueDate?: string;
}
export type SessionType = 'ssh' | 'rdp' | 'web' | 'db' | 'api' | 'console';
export interface PrivilegedSession {
    sessionId: string;
    tenantId: string;
    identityId?: string;
    targetSystem?: string;
    targetAddress?: string;
    sessionType: SessionType;
    startedAt: string;
    endedAt?: string;
    durationSeconds?: number;
    protocolType?: string;
    isRecorded?: boolean;
    recordingUrl?: string;
    checkoutId?: string;
    keystrokesCount?: number;
    commandsCount?: number;
    alertsCount?: number;
    riskScore?: number;
    terminatedBy?: 'user' | 'system' | 'admin';
    terminationReason?: string;
    metadata?: Record<string, unknown>;
}
export interface CredentialVault {
    vaultId: string;
    tenantId: string;
    name: string;
    description?: string;
    type: 'password' | 'ssh_key' | 'api_key' | 'certificate' | 'token' | 'secret';
    systemId?: string;
    ownerId?: string;
    checkoutEnabled?: boolean;
    checkoutDurationMins?: number;
    autoRotationEnabled?: boolean;
    rotationIntervalDays?: number;
    lastRotatedAt?: string;
    nextRotationAt?: string;
    rotationPolicy?: string;
    vaultProvider?: 'hashicorp' | 'azure_kv' | 'aws_secrets' | 'cyberark' | 'internal';
    externalRef?: string;
    isActive?: boolean;
    checkouts?: CredentialCheckout[];
    metadata?: Record<string, unknown>;
    createdAt: string;
    updatedAt: string;
}
export interface CredentialCheckout {
    checkoutId: string;
    vaultId?: string;
    checkedOutBy?: string;
    approvedBy?: string;
    purpose?: string;
    checkedOutAt: string;
    returnedAt?: string;
    durationMins?: number;
    sessionId?: string;
    status: 'active' | 'returned' | 'expired';
}
export interface ZeroTrustPolicy {
    policyId: string;
    tenantId: string;
    name: string;
    description?: string;
    isActive?: boolean;
    conditions?: ZeroTrustCondition[];
    actions?: ZeroTrustAction[];
    priority?: number;
    scope?: string[];
    lastTriggeredAt?: string;
    triggerCount?: number;
    createdBy?: string;
    createdAt: string;
    updatedAt: string;
}
export interface ZeroTrustCondition {
    field: string;
    operator: 'eq' | 'neq' | 'in' | 'not_in' | 'gt' | 'lt' | 'contains';
    value: unknown;
    logicalOp?: 'AND' | 'OR';
}
export interface ZeroTrustAction {
    actionType: 'deny' | 'allow' | 'challenge_mfa' | 'limit_access' | 'alert' | 'log';
    parameters?: Record<string, unknown>;
}
export type CertificateStatus = 'valid' | 'expired' | 'expiring_soon' | 'revoked' | 'pending';
export type CertificateType = 'ssl_tls' | 'code_signing' | 'client_auth' | 'ca' | 'device' | 'document';
export interface CertificateRecord {
    certId: string;
    tenantId: string;
    commonName: string;
    subjectAltNames?: string[];
    type: CertificateType;
    status: CertificateStatus;
    issuer?: string;
    serialNumber?: string;
    thumbprint?: string;
    algorithm?: string;
    keySize?: number;
    issuedAt?: string;
    expiresAt?: string;
    daysToExpiry?: number;
    ownerId?: string;
    systemId?: string;
    autoRenew?: boolean;
    renewalLeadDays?: number;
    caProvider?: string;
    caRef?: string;
    storeLocation?: string;
    lastCheckedAt?: string;
    revokedAt?: string;
    revocationReason?: string;
    notes?: string;
    metadata?: Record<string, unknown>;
    createdAt: string;
    updatedAt: string;
}
export interface CertificateAlert {
    alertId: string;
    certId?: string;
    commonName?: string;
    alertType: 'expiry_warning' | 'already_expired' | 'revoked' | 'weak_algorithm' | 'short_key';
    severity: 'critical' | 'high' | 'medium' | 'low';
    daysToExpiry?: number;
    triggeredAt: string;
    acknowledgedAt?: string;
    acknowledgedBy?: string;
    resolvedAt?: string;
}
export interface AccessControlDashboard {
    tenantId: string;
    asOf: string;
    totalIdentities?: number;
    activeIdentities?: number;
    inactiveIdentities?: number;
    privilegedAccounts?: number;
    orphanedAccounts?: number;
    sodViolations?: number;
    openSodConflicts?: number;
    accessRequestsPending?: number;
    openReviewCampaigns?: number;
    overdueReviewItems?: number;
    expiringCertificates?: number;
    expiredCertificates?: number;
    credentialRotationOverdue?: number;
    activePamSessions?: number;
    riskDistribution?: Record<string, number>;
    recentActivity?: AccessControlActivity[];
}
export interface AccessControlActivity {
    activityId: string;
    type: 'access_granted' | 'access_revoked' | 'policy_change' | 'cert_expiry' | 'sod_violation' | 'review_completed';
    description?: string;
    identityId?: string;
    performedBy?: string;
    severity?: 'critical' | 'high' | 'medium' | 'low' | 'info';
    occurredAt: string;
}
