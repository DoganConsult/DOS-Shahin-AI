/**
 * @dos/types — policy and regulation management extended types
 * Covers policy lifecycle, regulatory register, obligations tracking
 */
export type PolicyStatus = 'draft' | 'consultation' | 'legal_review' | 'approved' | 'published' | 'outdated' | 'archived' | 'retired';
export type PolicyType = 'organizational_policy' | 'security_policy' | 'privacy_policy' | 'acceptable_use' | 'access_control' | 'incident_response' | 'change_management' | 'risk_management' | 'compliance_policy' | 'supplier_policy' | 'data_governance' | 'byod' | 'remote_work' | 'social_media' | 'code_of_conduct' | 'anti_bribery' | 'whistleblowing' | 'custom';
export interface PolicyDocument {
    policyDocId: string;
    tenantId: string;
    workspaceId?: string;
    title: string;
    titleAr?: string;
    summary?: string;
    summaryAr?: string;
    type: PolicyType;
    status: PolicyStatus;
    version: string;
    revision: number;
    language?: string;
    ownerId: string;
    authorIds?: string[];
    reviewers?: PolicyReviewer[];
    approvers?: PolicyApprover[];
    parentPolicyId?: string;
    childPolicyIds?: string[];
    relatedPolicyIds?: string[];
    frameworks?: string[];
    regulations?: string[];
    controlIds?: string[];
    scope?: PolicyScope;
    mandatory?: boolean;
    mandatoryForRoles?: string[];
    attestationRequired?: boolean;
    attestationFrequency?: 'monthly' | 'quarterly' | 'annually';
    lastAttestedCount?: number;
    totalAttesteesRequired?: number;
    effectiveDate?: string;
    reviewDate?: string;
    expiryDate?: string;
    publishedAt?: string;
    archivedAt?: string;
    contentFileId?: string;
    searchableText?: string;
    tags?: string[];
    classificationLevel?: string;
    exceptions?: PolicyException[];
    changeLog?: PolicyChangeEntry[];
    metadata?: Record<string, unknown>;
    createdAt: string;
    updatedAt: string;
}
export interface PolicyReviewer {
    userId: string;
    status: 'pending' | 'approved' | 'rejected' | 'changes_requested';
    reviewedAt?: string;
    comment?: string;
}
export interface PolicyApprover {
    userId: string;
    level: number;
    status: 'pending' | 'approved' | 'rejected';
    decidedAt?: string;
    comment?: string;
}
export interface PolicyScope {
    allUsers?: boolean;
    roles?: string[];
    departments?: string[];
    orgUnitIds?: string[];
    teamIds?: string[];
    workspaceIds?: string[];
    excludedUserIds?: string[];
    geographies?: string[];
}
export interface PolicyException {
    exceptionId: string;
    requestedBy: string;
    reason: string;
    approvedBy?: string;
    approvedAt?: string;
    validUntil?: string;
    status: 'pending' | 'approved' | 'rejected' | 'expired';
    conditions?: string;
}
export interface PolicyChangeEntry {
    changeId: string;
    fromVersion?: string;
    toVersion: string;
    changedBy: string;
    changedAt: string;
    summary: string;
    type: 'major' | 'minor' | 'administrative';
}
export interface PolicyAttestationCycle {
    cycleId: string;
    tenantId: string;
    policyDocId: string;
    policyVersion: string;
    status: 'pending' | 'in_progress' | 'completed' | 'expired';
    startDate: string;
    dueDate: string;
    completedAt?: string;
    targetUsers: string[];
    targetRoles?: string[];
    completionCount: number;
    totalRequired: number;
    completionRate: number;
    reminderDates?: string[];
    createdAt: string;
    updatedAt: string;
}
export interface PolicyAttestation {
    attestationId: string;
    cycleId: string;
    policyDocId: string;
    tenantId: string;
    userId: string;
    status: 'pending' | 'acknowledged' | 'completed' | 'skipped' | 'delegated';
    completedAt?: string;
    ipAddress?: string;
    userAgent?: string;
    quizScore?: number;
    passed?: boolean;
    exceptions?: string;
    delegatedTo?: string;
    createdAt: string;
}
export type RegulationStatus = 'proposed' | 'enacted' | 'amended' | 'repealed' | 'under_review';
export type RegulationJurisdiction = 'international' | 'regional' | 'national' | 'local' | 'sector_specific';
export interface Regulation {
    regulationId: string;
    tenantId?: string;
    title: string;
    titleAr?: string;
    acronym?: string;
    description?: string;
    type: 'law' | 'regulation' | 'decree' | 'standard' | 'directive' | 'guideline' | 'circular';
    status: RegulationStatus;
    jurisdiction: RegulationJurisdiction;
    countryCode?: string;
    issuingAuthority?: string;
    issueDate?: string;
    effectiveDate?: string;
    amendedDate?: string;
    repealedDate?: string;
    referenceNumber?: string;
    officialUrl?: string;
    industries?: string[];
    dataPersonalScope?: boolean;
    penaltyScope?: string;
    linkedFrameworks?: string[];
    linkedControls?: string[];
    isGlobal?: boolean;
    createdAt: string;
    updatedAt: string;
}
export interface RegulatoryObligation {
    obligationId: string;
    tenantId: string;
    regulationId: string;
    code?: string;
    title: string;
    titleAr?: string;
    description?: string;
    article?: string;
    category?: string;
    complianceStatus: 'compliant' | 'non_compliant' | 'partial' | 'not_applicable' | 'pending';
    gapNotes?: string;
    controlIds?: string[];
    policyDocIds?: string[];
    taskIds?: string[];
    ownerId?: string;
    dueDate?: string;
    lastAssessedAt?: string;
    nextAssessmentDate?: string;
    evidenceIds?: string[];
    createdAt: string;
    updatedAt: string;
}
export interface RegulatoryProfile {
    tenantId: string;
    profileId: string;
    name?: string;
    industries?: string[];
    countries?: string[];
    regulations?: string[];
    frameworks?: string[];
    assessedAt?: string;
    nextReviewDate?: string;
    applicableObligations?: number;
    compliantObligations?: number;
    nonCompliantObligations?: number;
    complianceScore?: number;
    createdAt: string;
    updatedAt: string;
}
export type RegulatoryChangeType = 'new_regulation' | 'amendment' | 'repeal' | 'guidance' | 'enforcement_action' | 'interpretation';
export type RegulatoryChangeImpact = 'high' | 'medium' | 'low' | 'not_applicable';
export interface RegulatoryChange {
    changeId: string;
    tenantId?: string;
    regulationId?: string;
    title: string;
    description?: string;
    type: RegulatoryChangeType;
    impact: RegulatoryChangeImpact;
    publishedDate?: string;
    effectiveDate?: string;
    commentDeadline?: string;
    issuingAuthority?: string;
    sourceUrl?: string;
    impactedAreas?: string[];
    impactedControlIds?: string[];
    impactedPolicyIds?: string[];
    assignedTo?: string;
    actionRequired?: boolean;
    actionDescription?: string;
    status: 'new' | 'under_review' | 'actions_planned' | 'implemented' | 'no_action';
    reviewedBy?: string;
    reviewedAt?: string;
    taskIds?: string[];
    isGlobal?: boolean;
    createdAt: string;
    updatedAt: string;
}
export interface PolicyGapAnalysis {
    analysisId: string;
    tenantId: string;
    workspaceId?: string;
    title?: string;
    status: 'draft' | 'completed' | 'approved';
    performedBy?: string;
    performedAt?: string;
    frameworkId?: string;
    regulationId?: string;
    targetState?: string;
    gaps?: PolicyGap[];
    summary?: PolicyGapSummary;
    approvedBy?: string;
    approvedAt?: string;
    createdAt: string;
    updatedAt: string;
}
export interface PolicyGap {
    gapId: string;
    analysisId: string;
    requirementRef: string;
    description: string;
    impact: 'critical' | 'high' | 'medium' | 'low';
    currentState?: string;
    targetState?: string;
    remediation?: string;
    ownerId?: string;
    dueDate?: string;
    status: 'open' | 'in_progress' | 'resolved';
    policyDocId?: string;
    controlId?: string;
    taskId?: string;
}
export interface PolicyGapSummary {
    totalGaps: number;
    critical: number;
    high: number;
    medium: number;
    low: number;
    open: number;
    resolved: number;
}
