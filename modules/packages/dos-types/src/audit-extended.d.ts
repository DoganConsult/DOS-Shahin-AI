/**
 * @dos/types — audit management extended types
 * Covers audit universe, audit planning, fieldwork, workpapers, sampling, findings
 */
export type AuditableEntityType = 'process' | 'department' | 'system' | 'product' | 'vendor' | 'location' | 'project' | 'regulation' | 'asset' | 'custom';
export type AuditUniverseCategory = 'financial' | 'operational' | 'compliance' | 'it_general' | 'cyber' | 'strategic' | 'reputational' | 'third_party';
export interface AuditableEntity {
    entityId: string;
    tenantId: string;
    name: string;
    nameAr?: string;
    type: AuditableEntityType;
    category?: AuditUniverseCategory;
    description?: string;
    ownerId?: string;
    ownerName?: string;
    parentEntityId?: string;
    riskRating?: 'critical' | 'high' | 'medium' | 'low';
    inherentRiskScore?: number;
    controlEffectiveness?: 'effective' | 'partially_effective' | 'ineffective' | 'untested';
    lastAuditDate?: string;
    nextAuditDate?: string;
    auditFrequency?: 'annual' | 'biannual' | 'quarterly' | 'ad_hoc';
    auditHistory?: string[];
    tags?: string[];
    isActive?: boolean;
    metadata?: Record<string, unknown>;
    createdAt: string;
    updatedAt: string;
}
export type AuditPlanStatus = 'draft' | 'approved' | 'active' | 'completed' | 'cancelled';
export interface AuditPlan {
    planId: string;
    tenantId: string;
    name: string;
    description?: string;
    planYear: number;
    periodStart?: string;
    periodEnd?: string;
    status: AuditPlanStatus;
    type?: 'annual' | 'rolling' | 'ad_hoc';
    approvedBy?: string;
    approvedAt?: string;
    totalEngagements?: number;
    completedEngagements?: number;
    budgetHours?: number;
    actualHours?: number;
    budgetAmount?: number;
    actualAmount?: number;
    methodology?: string;
    objectives?: string;
    scope?: string;
    riskBasedApproach?: boolean;
    regulatoryAlignment?: string[];
    createdBy?: string;
    metadata?: Record<string, unknown>;
    createdAt: string;
    updatedAt: string;
}
export type EngagementType = 'internal_audit' | 'external_audit' | 'compliance_review' | 'it_audit' | 'forensic' | 'advisory' | 'follow_up' | 'regulatory' | 'pre_audit';
export type EngagementStatus = 'planned' | 'in_preparation' | 'fieldwork' | 'reporting' | 'review' | 'issued' | 'closed' | 'cancelled';
export interface AuditEngagement {
    engagementId: string;
    tenantId: string;
    planId?: string;
    name: string;
    type: EngagementType;
    status: EngagementStatus;
    description?: string;
    objective?: string;
    auditableEntityIds?: string[];
    auditScopeDescription?: string;
    scopeExclusions?: string;
    leadAuditorId?: string;
    teamMemberIds?: string[];
    externalAuditorFirm?: string;
    plannedStartDate?: string;
    plannedEndDate?: string;
    actualStartDate?: string;
    actualEndDate?: string;
    budgetHours?: number;
    actualHours?: number;
    fieldworkCompleted?: boolean;
    draftReportDate?: string;
    issueDate?: string;
    findings?: string[];
    openFindings?: number;
    closedFindings?: number;
    overallOpinion?: 'satisfactory' | 'partially_satisfactory' | 'unsatisfactory' | 'advisory' | 'no_opinion';
    managementResponseDue?: string;
    regulatoryRef?: string;
    riskRating?: 'critical' | 'high' | 'medium' | 'low';
    workpapers?: string[];
    notes?: string;
    metadata?: Record<string, unknown>;
    createdAt: string;
    updatedAt: string;
}
export type WorkpaperType = 'planning_memo' | 'risk_assessment' | 'control_matrix' | 'test_plan' | 'test_results' | 'sampling_memo' | 'walkthrough' | 'summary_memo' | 'issue_brief' | 'evidence' | 'correspondence' | 'other';
export type WorkpaperStatus = 'draft' | 'in_review' | 'reviewed' | 'approved' | 'superseded';
export interface AuditWorkpaper {
    workpaperId: string;
    tenantId: string;
    engagementId?: string;
    name: string;
    type: WorkpaperType;
    status: WorkpaperStatus;
    reference?: string;
    description?: string;
    preparedBy?: string;
    preparedAt?: string;
    reviewedBy?: string;
    reviewedAt?: string;
    approvedBy?: string;
    approvedAt?: string;
    version?: string;
    fileId?: string;
    contentSummary?: string;
    controlRef?: string;
    riskRef?: string;
    sampleRef?: string;
    linkedFindingIds?: string[];
    tags?: string[];
    retentionYears?: number;
    metadata?: Record<string, unknown>;
    createdAt: string;
    updatedAt: string;
}
export type SamplingMethod = 'haphazard' | 'random' | 'systematic' | 'monetary_unit' | 'judgmental' | 'stratified' | 'attribute';
export interface AuditSample {
    sampleId: string;
    tenantId: string;
    workpaperId?: string;
    engagementId?: string;
    controlRef?: string;
    populationDescription?: string;
    populationSize?: number;
    populationValue?: number;
    samplingMethod: SamplingMethod;
    confidenceLevel?: number;
    tolerableErrorRate?: number;
    expectedErrorRate?: number;
    sampleSize?: number;
    sampleItems?: AuditSampleItem[];
    exceptionsFound?: number;
    projectedError?: number;
    conclusion?: string;
    preparedBy?: string;
    preparedAt?: string;
    metadata?: Record<string, unknown>;
    createdAt: string;
    updatedAt: string;
}
export interface AuditSampleItem {
    itemId: string;
    sampleId?: string;
    reference?: string;
    description?: string;
    value?: number;
    testResult?: 'pass' | 'fail' | 'exception' | 'not_applicable';
    exceptionDescription?: string;
    evidenceRef?: string;
    testedBy?: string;
    testedAt?: string;
}
export type FindingSeverity = 'critical' | 'high' | 'medium' | 'low' | 'informational';
export type FindingCategory = 'control_deficiency' | 'material_weakness' | 'significant_deficiency' | 'policy_violation' | 'regulatory_breach' | 'best_practice' | 'process_improvement';
export interface AuditFindingExtended {
    findingId: string;
    tenantId: string;
    engagementId?: string;
    workpaperId?: string;
    reference?: string;
    title: string;
    category?: FindingCategory;
    severity: FindingSeverity;
    condition?: string;
    criteria?: string;
    cause?: string;
    effect?: string;
    recommendation?: string;
    managementResponse?: string;
    managementResponseDate?: string;
    agreedActionPlan?: string;
    responsiblePartyId?: string;
    dueDate?: string;
    remediationStatus?: 'open' | 'in_progress' | 'implemented' | 'closed' | 'accepted_risk' | 'overdue';
    remediationVerified?: boolean;
    verifiedBy?: string;
    verifiedAt?: string;
    closedAt?: string;
    repeatFinding?: boolean;
    previousFindingId?: string;
    riskRef?: string;
    controlRef?: string;
    regulatoryRef?: string;
    tags?: string[];
    metadata?: Record<string, unknown>;
    createdAt: string;
    updatedAt: string;
}
export interface FindingFollowUp {
    followUpId: string;
    findingId?: string;
    tenantId?: string;
    performedBy?: string;
    performedAt: string;
    status: 'open' | 'in_progress' | 'closed' | 'escalated';
    comments?: string;
    evidenceProvided?: string[];
    nextFollowUpDate?: string;
    escalatedTo?: string;
    escalationReason?: string;
}
export type IssueSource = 'internal_audit' | 'external_audit' | 'regulatory' | 'self_identified' | 'complaint' | 'risk_assessment' | 'third_party';
export interface AuditIssue {
    issueId: string;
    tenantId: string;
    findingId?: string;
    source?: IssueSource;
    title: string;
    description?: string;
    severity: FindingSeverity;
    raisedBy?: string;
    raisedAt: string;
    ownerId?: string;
    dueDate?: string;
    status: 'open' | 'in_progress' | 'resolved' | 'verified' | 'closed' | 'overdue';
    plannedActions?: IssueAction[];
    actualActions?: string;
    remediationDate?: string;
    verificationDate?: string;
    verifiedBy?: string;
    isRecurring?: boolean;
    riskRef?: string;
    controlRef?: string;
    regulatoryRef?: string;
    businessImpact?: string;
    tags?: string[];
    metadata?: Record<string, unknown>;
    createdAt: string;
    updatedAt: string;
}
export interface IssueAction {
    actionId: string;
    description?: string;
    ownerId?: string;
    dueDate?: string;
    completedAt?: string;
    status?: 'pending' | 'in_progress' | 'completed';
    comments?: string;
}
export interface AuditAnalytics {
    tenantId: string;
    asOf: string;
    totalEngagements?: number;
    activeEngagements?: number;
    completedEngagements?: number;
    plannedEngagements?: number;
    cancelledEngagements?: number;
    totalFindings?: number;
    openFindings?: number;
    closedFindings?: number;
    overdueFindings?: number;
    findingsBySeverity?: Record<FindingSeverity, number>;
    findingsByCategory?: Record<string, number>;
    repeatFindings?: number;
    auditCoverage?: number;
    planCompletionPct?: number;
    avgDaysToClose?: number;
    avgDaysToRemediate?: number;
    topRiskyEntities?: AuditAuditableEntityRisk[];
    recentEngagements?: Array<{
        engagementId: string;
        name: string;
        status: EngagementStatus;
        issuedAt?: string;
    }>;
}
export interface AuditAuditableEntityRisk {
    entityId: string;
    entityName?: string;
    openFindings?: number;
    criticalFindings?: number;
    lastAuditDate?: string;
    riskRating?: 'critical' | 'high' | 'medium' | 'low';
}
