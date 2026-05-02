/**
 * @dos/types — compliance extended types
 * Covers controls, frameworks, obligations, audit programs
 */
export type ControlStatus = 'active' | 'inactive' | 'draft' | 'deprecated';
export type ControlType = 'preventive' | 'detective' | 'corrective' | 'compensating' | 'directive';
export type ControlFrequency = 'continuous' | 'daily' | 'weekly' | 'monthly' | 'quarterly' | 'annually' | 'ad_hoc';
export type ControlNature = 'manual' | 'automated' | 'semi_automated';
export type ControlTestStatus = 'not_tested' | 'effective' | 'partially_effective' | 'ineffective' | 'test_in_progress';
export interface Control {
    controlId: string;
    tenantId: string;
    workspaceId?: string;
    code: string;
    title: string;
    titleAr?: string;
    description?: string;
    objective?: string;
    type: ControlType;
    nature: ControlNature;
    frequency: ControlFrequency;
    status: ControlStatus;
    ownerId?: string;
    ownerTeamId?: string;
    operatorIds?: string[];
    frameworkRefs?: ControlFrameworkRef[];
    relatedControlIds?: string[];
    assetIds?: string[];
    riskIds?: string[];
    attestationRequired?: boolean;
    testingRequired?: boolean;
    testingFrequency?: ControlFrequency;
    lastTestedAt?: string;
    testStatus?: ControlTestStatus;
    testFindings?: ControlFinding[];
    evidenceRequired?: boolean;
    evidenceItems?: string[];
    automationTooling?: string;
    implementationNotes?: string;
    tags?: string[];
    isTemplate?: boolean;
    parentControlId?: string;
    childControlIds?: string[];
    metadata?: Record<string, unknown>;
    createdAt: string;
    updatedAt: string;
}
export interface ControlFrameworkRef {
    frameworkId: string;
    frameworkName: string;
    controlRef: string;
    controlName?: string;
    domain?: string;
}
export interface ControlFinding {
    findingId: string;
    controlId: string;
    tenantId: string;
    testedBy: string;
    testedAt: string;
    result: 'effective' | 'partially_effective' | 'ineffective';
    evidence?: string[];
    observations?: string;
    exceptions?: ControlException[];
    remediationRequired?: boolean;
    remediationTaskId?: string;
}
export interface ControlException {
    exceptionId: string;
    description: string;
    severity: 'critical' | 'high' | 'medium' | 'low';
    raisedAt: string;
    dueDate?: string;
    resolvedAt?: string;
}
export type FrameworkType = 'regulatory' | 'standards' | 'best_practice' | 'internal' | 'industry';
export type FrameworkStatus = 'active' | 'draft' | 'archived';
export interface ComplianceFramework {
    frameworkId: string;
    tenantId?: string;
    code: string;
    name: string;
    nameAr?: string;
    description?: string;
    type: FrameworkType;
    version?: string;
    issuer?: string;
    issuedDate?: string;
    effectiveDate?: string;
    expiryDate?: string;
    jurisdictions?: string[];
    industries?: string[];
    status: FrameworkStatus;
    isGlobal: boolean;
    domains?: FrameworkDomain[];
    controlCount?: number;
    requirementCount?: number;
    relatedFrameworks?: string[];
    sourceUrl?: string;
    metadata?: Record<string, unknown>;
    createdAt: string;
    updatedAt: string;
}
export interface FrameworkDomain {
    domainId: string;
    frameworkId: string;
    code: string;
    name: string;
    nameAr?: string;
    description?: string;
    parentDomainId?: string;
    order?: number;
    controlCount?: number;
    requirementCount?: number;
}
export type ObligationType = 'requirement' | 'standard_clause' | 'policy_statement' | 'legal_provision';
export type ObligationStatus = 'compliant' | 'non_compliant' | 'partially_compliant' | 'not_applicable' | 'pending_review';
export interface ComplianceObligation {
    obligationId: string;
    tenantId: string;
    frameworkId: string;
    domainId?: string;
    code: string;
    title: string;
    titleAr?: string;
    description?: string;
    type: ObligationType;
    status?: ObligationStatus;
    applicability?: 'mandatory' | 'recommended' | 'optional';
    ownerId?: string;
    controlIds?: string[];
    evidenceIds?: string[];
    lastAssessedAt?: string;
    nextAssessmentDate?: string;
    gapNotes?: string;
    remediationTaskIds?: string[];
    order?: number;
    parentObligationId?: string;
    childObligationIds?: string[];
    metadata?: Record<string, unknown>;
    createdAt: string;
    updatedAt: string;
}
export type AuditType = 'internal' | 'external' | 'regulatory' | 'supplier' | 'certification' | 'self_assessment';
export type AuditStatus = 'planned' | 'in_progress' | 'completed' | 'cancelled' | 'on_hold';
export interface AuditProgram {
    programId: string;
    tenantId: string;
    name: string;
    nameAr?: string;
    description?: string;
    type: AuditType;
    status: AuditStatus;
    ownerId: string;
    auditors?: string[];
    auditeeIds?: string[];
    frameworkIds?: string[];
    scope?: string[];
    plannedStartDate?: string;
    plannedEndDate?: string;
    actualStartDate?: string;
    actualEndDate?: string;
    objectives?: string[];
    criteria?: string[];
    auditUnits?: AuditUnit[];
    findingCount?: number;
    criticalFindings?: number;
    closedFindings?: number;
    reportId?: string;
    certificationBody?: string;
    auditStandard?: string;
    outcome?: 'pass' | 'pass_with_findings' | 'fail' | 'inconclusive';
    metadata?: Record<string, unknown>;
    createdAt: string;
    updatedAt: string;
}
export interface AuditUnit {
    unitId: string;
    programId: string;
    name: string;
    entityType?: string;
    entityId?: string;
    leadAuditor?: string;
    status?: AuditStatus;
    scheduledDate?: string;
}
export interface AuditFinding {
    findingId: string;
    tenantId: string;
    programId: string;
    auditUnitId?: string;
    title: string;
    description?: string;
    category?: string;
    severity: 'critical' | 'high' | 'medium' | 'low' | 'observation';
    status: 'open' | 'remediation_in_progress' | 'remediated' | 'closed' | 'accepted';
    controlIds?: string[];
    obligationIds?: string[];
    rootCause?: string;
    recommendation?: string;
    managementResponse?: string;
    remediationTaskIds?: string[];
    dueDate?: string;
    closedAt?: string;
    closedBy?: string;
    raisedBy: string;
    raisedAt: string;
    evidence?: string[];
    createdAt: string;
    updatedAt: string;
}
export interface ComplianceScore {
    tenantId: string;
    workspaceId?: string;
    frameworkId?: string;
    period?: string;
    overallScore: number;
    maxScore: number;
    percent: number;
    level: 'compliant' | 'partially_compliant' | 'non_compliant';
    totalObligations: number;
    compliantCount: number;
    partialCount: number;
    nonCompliantCount: number;
    notApplicableCount: number;
    byDomain?: FrameworkDomainScore[];
    trend?: ScoreTrend[];
    calculatedAt: string;
}
export interface FrameworkDomainScore {
    domainId: string;
    domainName: string;
    score: number;
    maxScore: number;
    percent: number;
    obligationCount: number;
    compliantCount: number;
}
export interface ScoreTrend {
    date: string;
    score: number;
    percent: number;
}
