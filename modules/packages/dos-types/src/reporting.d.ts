/**
 * @dos/types — reporting, exports, and sign-off types
 * Covers compliance reports, sign-off cycles, SLA reports, export jobs
 */
export type ReportStatus = 'draft' | 'generating' | 'ready' | 'published' | 'archived' | 'failed';
export type ReportFormat = 'pdf' | 'xlsx' | 'csv' | 'json' | 'html' | 'docx' | 'pptx';
export type ReportScope = 'tenant' | 'workspace' | 'module' | 'entity' | 'custom';
export type ReportCategory = 'compliance' | 'risk' | 'audit' | 'executive' | 'operational' | 'incident' | 'vulnerability' | 'asset' | 'analytics' | 'custom';
export interface Report {
    reportId: string;
    tenantId: string;
    workspaceId?: string;
    name: string;
    nameAr?: string;
    description?: string;
    category: ReportCategory;
    scope: ReportScope;
    scopeEntityId?: string;
    status: ReportStatus;
    format: ReportFormat;
    language?: 'en' | 'ar' | 'both';
    templateId?: string;
    parameters?: ReportParameters;
    generatedAt?: string;
    generatedBy?: string;
    fileId?: string;
    fileUrl?: string;
    expiresAt?: string;
    size?: number;
    pageCount?: number;
    scheduled?: boolean;
    scheduleId?: string;
    publishedAt?: string;
    distributionListIds?: string[];
    errorMessage?: string;
    metadata?: Record<string, unknown>;
    createdAt: string;
    updatedAt: string;
}
export interface ReportParameters {
    dateFrom?: string;
    dateTo?: string;
    period?: string;
    frameworkIds?: string[];
    workspaceIds?: string[];
    entityTypes?: string[];
    entityIds?: string[];
    includeCharts?: boolean;
    includeSummary?: boolean;
    includeDetails?: boolean;
    includeEvidence?: boolean;
    includeRecommendations?: boolean;
    language?: 'en' | 'ar';
    customParams?: Record<string, unknown>;
}
export interface ReportSchedule {
    scheduleId: string;
    tenantId: string;
    reportTemplateId: string;
    name: string;
    frequency: 'daily' | 'weekly' | 'monthly' | 'quarterly' | 'annually';
    nextRunAt?: string;
    lastRunAt?: string;
    timeOfDay?: string;
    dayOfWeek?: number;
    dayOfMonth?: number;
    timezone: string;
    recipients: string[];
    distributionListIds?: string[];
    format: ReportFormat;
    parameters?: ReportParameters;
    isActive: boolean;
    createdBy: string;
    createdAt: string;
    updatedAt: string;
}
export interface ReportTemplate {
    templateId: string;
    tenantId?: string;
    name: string;
    nameAr?: string;
    category: ReportCategory;
    scope: ReportScope;
    description?: string;
    supportedFormats: ReportFormat[];
    defaultParameters?: ReportParameters;
    requiredParameters?: string[];
    sections?: ReportSection[];
    thumbnailUrl?: string;
    isGlobal: boolean;
    isActive: boolean;
    createdBy?: string;
    createdAt: string;
    updatedAt: string;
}
export interface ReportSection {
    sectionId: string;
    title: string;
    titleAr?: string;
    type: 'summary' | 'table' | 'chart' | 'narrative' | 'list' | 'signature';
    order: number;
    optional?: boolean;
    dataSource?: string;
    chartType?: 'bar' | 'pie' | 'line' | 'gauge' | 'heatmap';
}
export type SignOffStatus = 'pending' | 'in_progress' | 'completed' | 'overdue' | 'expired' | 'rejected';
export type SignOffType = 'control_attestation' | 'policy_acceptance' | 'risk_review' | 'compliance_certification' | 'report_approval';
export interface SignOffCycle {
    cycleId: string;
    tenantId: string;
    workspaceId?: string;
    type: SignOffType;
    title: string;
    titleAr?: string;
    description?: string;
    entityType?: string;
    entityId?: string;
    status: SignOffStatus;
    ownerId: string;
    dueDate: string;
    startDate?: string;
    completedAt?: string;
    participants: SignOffParticipant[];
    requiredPercent?: number;
    completedCount: number;
    totalRequired: number;
    reminderSentAt?: string;
    escalatedAt?: string;
    nextCycleDate?: string;
    cadenceId?: string;
    metadata?: Record<string, unknown>;
    createdAt: string;
    updatedAt: string;
}
export interface SignOffParticipant {
    participantId: string;
    cycleId: string;
    userId: string;
    role: 'signer' | 'reviewer' | 'observer';
    status: 'pending' | 'acknowledged' | 'signed' | 'rejected' | 'delegated';
    signedAt?: string;
    rejectedAt?: string;
    rejectionReason?: string;
    delegatedTo?: string;
    delegatedAt?: string;
    ipAddress?: string;
    userAgent?: string;
    signature?: SignatureData;
}
export interface SignatureData {
    type: 'click_to_accept' | 'drawn' | 'digital_certificate';
    timestamp: string;
    hash?: string;
    certificateId?: string;
}
export type ExportStatus = 'queued' | 'processing' | 'ready' | 'failed' | 'expired';
export interface ExportJob {
    exportId: string;
    tenantId: string;
    requestedBy: string;
    entityType: string;
    format: ReportFormat;
    status: ExportStatus;
    filterParams?: Record<string, unknown>;
    fileId?: string;
    fileUrl?: string;
    rowCount?: number;
    sizeBytes?: number;
    errorMessage?: string;
    startedAt?: string;
    completedAt?: string;
    expiresAt?: string;
    createdAt: string;
}
export interface DistributionList {
    listId: string;
    tenantId: string;
    name: string;
    description?: string;
    userIds?: string[];
    teamIds?: string[];
    externalEmails?: string[];
    categories?: ReportCategory[];
    reportTemplateIds?: string[];
    isActive: boolean;
    createdBy: string;
    createdAt: string;
    updatedAt: string;
}
export interface ComplianceCertificate {
    certificateId: string;
    tenantId: string;
    workspaceId?: string;
    frameworkId: string;
    frameworkName: string;
    type: 'certification' | 'attestation' | 'self_assessment';
    status: 'valid' | 'expired' | 'revoked' | 'pending';
    issuedBy?: string;
    certificationBody?: string;
    issuedAt?: string;
    expiresAt?: string;
    revokedAt?: string;
    revocationReason?: string;
    scope?: string;
    fileId?: string;
    fileUrl?: string;
    evidenceIds?: string[];
    auditProgramId?: string;
    metadata?: Record<string, unknown>;
    createdAt: string;
    updatedAt: string;
}
export interface ReportRow {
    report_id: string;
    tenant_id: string;
    title: string;
    report_type: string;
    status: string;
    format: string;
    generated_by?: string;
    schedule_cron?: string;
    created_at: string;
    updated_at: string;
    created_by: string;
    updated_by?: string;
    deleted_at?: string | null;
}
export interface ReportCreateInput {
    tenant_id: string;
    title: string;
    report_type: string;
    status: string;
    format: string;
    generated_by?: string;
    schedule_cron?: string;
    created_by: string;
}
export interface ReportUpdateInput {
    title: string;
    report_type: string;
    status: string;
    format: string;
    generated_by?: string;
    schedule_cron?: string;
    updated_by: string;
}
export interface ReportListFilter {
    status?: string;
    search?: string;
    page?: number;
    pageSize?: number;
    sortBy?: string;
    sortDir?: 'ASC' | 'DESC';
}
export interface ReportListResult {
    rows: Report[];
    total: number;
}
export type ReportingStatus = 'draft' | 'generating' | 'generated' | 'published' | 'distributed' | 'archived';
export declare const REPORTING_STATUSES: readonly ReportingStatus[];
export type ReportingSource = 'manual' | 'import' | 'api' | 'workflow' | 'ai_agent' | 'system';
export declare const REPORTING_SOURCES: readonly ReportingSource[];
export type ReportingStatusReason = 'initial_creation' | 'user_action' | 'workflow_transition' | 'auto_escalation' | 'sla_breach' | 'approval_granted' | 'approval_denied' | 'system_rule';
export interface ReportingEventPayload {
    tenantId: string;
    entityType: string;
    entityId: string;
    moduleCode: 'reporting';
    triggeredBy: string;
    timestamp: string;
    correlationId: string;
    eventVersion: number;
    previousState?: ReportingStatus;
    newState?: ReportingStatus;
    data: Record<string, unknown>;
}
