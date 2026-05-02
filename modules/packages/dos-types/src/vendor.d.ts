/**
 * @dos/types — vendor, supplier, and third-party risk management types
 * Covers vendor onboarding, assessments, contracts, risk ratings
 */
export type VendorStatus = 'active' | 'archived' | 'inactive' | 'offboarded' | 'onboarding' | 'pending_review' | 'prospect' | 'suspended' | 'under_review';
export type VendorTier = 'critical' | 'high' | 'medium' | 'low';
export type VendorCategory = 'cloud_service' | 'software' | 'hardware' | 'professional_services' | 'managed_service' | 'outsourcing' | 'subprocessor' | 'financial' | 'logistics' | 'utilities' | 'other';
export interface Vendor {
    vendorId: string;
    tenantId: string;
    workspaceId?: string;
    name: string;
    nameAr?: string;
    code?: string;
    description?: string;
    category: VendorCategory;
    tier: VendorTier;
    status: VendorStatus;
    website?: string;
    countryCode?: string;
    address?: VendorAddress;
    primaryContact?: VendorContact;
    contacts?: VendorContact[];
    riskRating?: VendorRiskRating;
    contractIds?: string[];
    assessmentIds?: string[];
    certifications?: VendorCertification[];
    subprocessor?: boolean;
    processingActivities?: string[];
    dataTypes?: string[];
    ownerId?: string;
    tags?: string[];
    notes?: string;
    onboardedAt?: string;
    offboardedAt?: string;
    nextReviewDate?: string;
    metadata?: Record<string, unknown>;
    createdAt: string;
    updatedAt: string;
}
export interface VendorAddress {
    street?: string;
    city?: string;
    state?: string;
    postalCode?: string;
    country: string;
}
export interface VendorContact {
    contactId?: string;
    name: string;
    email?: string;
    phone?: string;
    role?: string;
    isPrimary?: boolean;
    language?: 'en' | 'ar';
}
export interface VendorCertification {
    certificationId?: string;
    name: string;
    issuer?: string;
    certificateNumber?: string;
    issuedAt?: string;
    expiresAt?: string;
    fileId?: string;
    verificationUrl?: string;
    status?: 'valid' | 'expired' | 'pending_renewal';
}
export interface VendorRiskRating {
    ratingId?: string;
    vendorId: string;
    tenantId: string;
    inherentRisk: 'critical' | 'high' | 'medium' | 'low';
    residualRisk: 'critical' | 'high' | 'medium' | 'low';
    riskScore?: number;
    financialRisk?: 'high' | 'medium' | 'low';
    operationalRisk?: 'high' | 'medium' | 'low';
    informationSecurityRisk?: 'high' | 'medium' | 'low';
    complianceRisk?: 'high' | 'medium' | 'low';
    geopoliticalRisk?: 'high' | 'medium' | 'low';
    concentrationRisk?: 'high' | 'medium' | 'low';
    ratedBy?: string;
    ratedAt?: string;
    nextRatingDate?: string;
    justification?: string;
}
export type AssessmentStatus = 'draft' | 'sent' | 'in_progress' | 'submitted' | 'in_review' | 'completed' | 'cancelled' | 'overdue';
export type AssessmentType = 'questionnaire' | 'onsite_audit' | 'document_review' | 'automated_scan' | 'hybrid';
export interface VendorAssessment {
    assessmentId: string;
    tenantId: string;
    vendorId: string;
    type: AssessmentType;
    category?: string;
    frameworkId?: string;
    questionnaireId?: string;
    status: AssessmentStatus;
    title?: string;
    description?: string;
    requestedBy?: string;
    assignedVendorContact?: string;
    internalReviewers?: string[];
    dueDate?: string;
    startedAt?: string;
    submittedAt?: string;
    completedAt?: string;
    score?: number;
    maxScore?: number;
    scorePercent?: number;
    riskLevel?: 'critical' | 'high' | 'medium' | 'low';
    findings?: VendorAssessmentFinding[];
    remediationItems?: VendorRemediationItem[];
    evidenceIds?: string[];
    reportId?: string;
    nextAssessmentDate?: string;
    recurrence?: string;
    createdAt: string;
    updatedAt: string;
}
export interface VendorAssessmentFinding {
    findingId: string;
    assessmentId: string;
    categoryName?: string;
    title: string;
    description?: string;
    severity: 'critical' | 'high' | 'medium' | 'low';
    status: 'open' | 'accepted' | 'in_remediation' | 'resolved';
    obligation?: string;
    recommendation?: string;
    vendorResponse?: string;
    dueDate?: string;
    resolvedAt?: string;
}
export interface VendorRemediationItem {
    itemId: string;
    findingId: string;
    description: string;
    owner?: string;
    dueDate?: string;
    status: 'open' | 'in_progress' | 'completed' | 'accepted';
    completedAt?: string;
    taskId?: string;
}
export interface AssessmentQuestionnaire {
    questionnaireId: string;
    tenantId?: string;
    name: string;
    description?: string;
    category?: string;
    frameworkRefs?: string[];
    sections: QuestionnaireSection[];
    maxScore?: number;
    scoringMethod?: 'weighted' | 'percentage' | 'count' | 'custom';
    passThreshold?: number;
    isGlobal: boolean;
    version: number;
    isActive: boolean;
    createdBy?: string;
    createdAt: string;
    updatedAt: string;
}
export interface QuestionnaireSection {
    sectionId: string;
    title: string;
    titleAr?: string;
    description?: string;
    order: number;
    weight?: number;
    questions: QuestionnaireQuestion[];
}
export interface QuestionnaireQuestion {
    questionId: string;
    sectionId: string;
    type: 'yes_no' | 'single_choice' | 'multiple_choice' | 'text' | 'scale' | 'file_upload' | 'date';
    text: string;
    textAr?: string;
    weight?: number;
    required: boolean;
    options?: QuestionOption[];
    scoreMap?: Record<string, number>;
    evidenceRequired?: boolean;
    guidance?: string;
    frameworkRef?: string;
    controlRef?: string;
    conditionalOn?: QuestionCondition;
}
export interface QuestionOption {
    optionId: string;
    label: string;
    labelAr?: string;
    value: string;
    score?: number;
    riskLevel?: 'critical' | 'high' | 'medium' | 'low';
    triggersEsclation?: boolean;
}
export interface QuestionCondition {
    questionId: string;
    expectedValue: string | string[];
}
export type ContractStatus = 'draft' | 'negotiation' | 'active' | 'expired' | 'terminated' | 'renewed';
export type ContractType = 'service_agreement' | 'dpa' | 'nda' | 'sla' | 'msa' | 'subprocessor' | 'license';
export interface VendorContract {
    contractId: string;
    tenantId: string;
    vendorId: string;
    type: ContractType;
    title: string;
    description?: string;
    status: ContractStatus;
    ownerId?: string;
    legalReviewerId?: string;
    contractNumber?: string;
    currency?: string;
    value?: number;
    billingCycle?: 'monthly' | 'quarterly' | 'annual' | 'one_time';
    startDate?: string;
    endDate?: string;
    renewalDate?: string;
    terminationDate?: string;
    noticePeriodDays?: number;
    autoRenew?: boolean;
    slaRefs?: string[];
    governingLaw?: string;
    dataResidency?: string[];
    dataProcessing?: boolean;
    subprocessors?: string[];
    fileId?: string;
    signatories?: ContractSignatory[];
    tags?: string[];
    notes?: string;
    createdAt: string;
    updatedAt: string;
}
export interface ContractSignatory {
    signatoryId?: string;
    name: string;
    role?: string;
    organization?: string;
    signedAt?: string;
    isTenant: boolean;
}
export interface TPRMDashboard {
    tenantId: string;
    totalVendors: number;
    activeVendors: number;
    criticalVendors: number;
    vendorsByRisk: Record<VendorTier, number>;
    pendingAssessments: number;
    overdueAssessments: number;
    expiringContracts: number;
    expiringCertifications: number;
    openFindings: number;
    criticalFindings: number;
    recentAssessments: VendorAssessment[];
    lastUpdatedAt: string;
}
export interface VendorRow {
    vendor_id: string;
    tenant_id: string;
    name: string;
    description?: string;
    tier: string;
    status: string;
    risk_rating?: string;
    contact_email?: string;
    contract_end_date?: string;
    created_at: string;
    updated_at: string;
    created_by: string;
    updated_by?: string;
    deleted_at?: string | null;
}
export interface VendorCreateInput {
    tenant_id: string;
    name: string;
    description?: string;
    tier: string;
    status: string;
    risk_rating?: string;
    contact_email?: string;
    contract_end_date?: string;
    created_by: string;
}
export interface VendorUpdateInput {
    name: string;
    description?: string;
    tier: string;
    status: string;
    risk_rating?: string;
    contact_email?: string;
    contract_end_date?: string;
    updated_by: string;
}
export interface VendorListFilter {
    status?: string;
    search?: string;
    page?: number;
    pageSize?: number;
    sortBy?: string;
    sortDir?: 'ASC' | 'DESC';
}
export interface VendorListResult {
    rows: Vendor[];
    total: number;
}
export declare const VENDOR_STATUSES: readonly VendorStatus[];
export type VendorSource = 'manual' | 'import' | 'api' | 'workflow' | 'ai_agent' | 'system';
export declare const VENDOR_SOURCES: readonly VendorSource[];
export type VendorStatusReason = 'initial_creation' | 'user_action' | 'workflow_transition' | 'auto_escalation' | 'sla_breach' | 'approval_granted' | 'approval_denied' | 'system_rule';
export interface VendorEventPayload {
    tenantId: string;
    entityType: string;
    entityId: string;
    moduleCode: 'vendor';
    triggeredBy: string;
    timestamp: string;
    correlationId: string;
    eventVersion: number;
    previousState?: VendorStatus;
    newState?: VendorStatus;
    data: Record<string, unknown>;
}
