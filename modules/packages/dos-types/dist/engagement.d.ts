export interface VendorScoreSummary {
    vendorId?: string;
    overallScore?: number;
    riskLevel?: string;
    lastAssessedAt?: string;
    complianceScore?: number;
    [k: string]: unknown;
}
export interface QuestionnaireStats {
    total?: number;
    completed?: number;
    pending?: number;
    averageScore?: number;
    [k: string]: unknown;
}
export interface RegulatorRequestSummary {
    regulatorId?: string;
    requestCount?: number;
    pendingCount?: number;
    overdueCount?: number;
    [k: string]: unknown;
}
export interface PortfolioMetrics {
    totalClients?: number;
    avgComplianceScore?: number;
    avgRiskLevel?: string;
    criticalCount?: number;
    [k: string]: unknown;
}
export interface SLABreachTrend {
    period?: string;
    breachCount?: number;
    totalItems?: number;
    breachRate?: number;
    [k: string]: unknown;
}
export interface EngagementCycleResult {
    cycleId?: string;
    status?: string;
    startedAt?: string;
    completedAt?: string;
    score?: number;
    [k: string]: unknown;
}
export interface OverdueItem {
    id?: string;
    entityType?: string;
    title?: string;
    dueDate?: string;
    assignee?: string;
    daysOverdue?: number;
    [k: string]: unknown;
}
export interface EngagementScoreBreakdown {
    overall?: number;
    compliance?: number;
    risk?: number;
    evidence?: number;
    [k: string]: unknown;
}
export interface AutoEvalResult {
    passed?: boolean;
    score?: number;
    findings?: string[];
    evaluatedAt?: string;
    [k: string]: unknown;
}
export interface AutoTaskConfig {
    taskType?: string;
    schedule?: string;
    enabled?: boolean;
    parameters?: Record<string, unknown>;
    [k: string]: unknown;
}
export interface AutoTaskResult {
    taskId?: string;
    status?: string;
    completedAt?: string;
    output?: Record<string, unknown>;
    [k: string]: unknown;
}
export interface AutoTaskStats {
    total?: number;
    completed?: number;
    failed?: number;
    pending?: number;
    [k: string]: unknown;
}
export interface ExternalRole {
    roleId?: string;
    roleName?: string;
    source?: string;
    permissions?: string[];
    [k: string]: unknown;
}
export interface InvitationRecord {
    invitationId?: string;
    email?: string;
    role?: string;
    status?: string;
    createdAt?: string;
    expiresAt?: string;
    [k: string]: unknown;
}
export interface InvitationFilters {
    status?: string;
    role?: string;
    email?: string;
    since?: string;
    [k: string]: unknown;
}
export interface EngagementHistorySummary {
    totalCycles?: number;
    averageScore?: number;
    trend?: string;
    lastCycleAt?: string;
    [k: string]: unknown;
}
export interface Questionnaire {
    questionnaireId?: string;
    title?: string;
    status?: string;
    questionCount?: number;
    responseCount?: number;
    [k: string]: unknown;
}
export interface ActionItem {
    id?: string;
    title?: string;
    status?: string;
    priority?: string;
    assignee?: string;
    dueDate?: string;
    moduleCode?: string;
    [k: string]: unknown;
}
export interface EvaluationResult {
    score?: number;
    passed?: boolean;
    findings?: string[];
    recommendations?: string[];
    evaluatedAt?: string;
    [k: string]: unknown;
}
export interface Gap {
    gapId?: string;
    title?: string;
    severity?: string;
    status?: string;
    moduleCode?: string;
    controlId?: string;
    recommendation?: string;
    [k: string]: unknown;
}
export interface Client {
    id?: string;
    tenantId?: string;
    status?: string;
    riskLevel?: string;
    complianceScore?: number;
    engagementScore?: number;
    name?: string;
    [k: string]: unknown;
}
export interface PortfolioHealth {
    clientCount: number;
    averageComplianceScore: number;
    averageRiskLevel: string;
    averageEngagementScore: number;
    criticalFindings: number;
    [k: string]: unknown;
}
export interface Finding {
    findingId?: string;
    title?: string;
    severity?: string;
    status?: string;
    entityType?: string;
    entityId?: string;
    recommendation?: string;
    [k: string]: unknown;
}
export interface FindingInput {
    title?: string;
    severity?: string;
    description?: string;
    entityType?: string;
    entityId?: string;
    [k: string]: unknown;
}
export interface Benchmark {
    benchmarkId?: string;
    name?: string;
    score?: number;
    industry?: string;
    region?: string;
    [k: string]: unknown;
}
export interface TimelineEvent {
    eventId?: string;
    timestamp?: string;
    action?: string;
    actor?: string;
    entityType?: string;
    entityId?: string;
    summary?: string;
    [k: string]: unknown;
}
export interface Organization {
    orgId?: string;
    name?: string;
    sector?: string;
    country?: string;
    size?: string;
    [k: string]: unknown;
}
export interface ComplianceData {
    frameworkCode?: string;
    score?: number;
    controlsTotal?: number;
    controlsPassing?: number;
    lastAssessedAt?: string;
    [k: string]: unknown;
}
export interface Evidence {
    evidenceId?: string;
    title?: string;
    type?: string;
    status?: string;
    controlId?: string;
    uploadedAt?: string;
    uploadedBy?: string;
    [k: string]: unknown;
}
export interface InquiryInput {
    subject?: string;
    body?: string;
    priority?: string;
    entityType?: string;
    entityId?: string;
    [k: string]: unknown;
}
export interface Inquiry {
    inquiryId?: string;
    subject?: string;
    status?: string;
    priority?: string;
    createdAt?: string;
    respondedAt?: string;
    [k: string]: unknown;
}
export interface AuditEntry {
    auditId?: string;
    action?: string;
    actor?: string;
    entityType?: string;
    entityId?: string;
    timestamp?: string;
    module?: string;
    [k: string]: unknown;
}
export interface Framework {
    frameworkCode?: string;
    name?: string;
    version?: string;
    regulatorCode?: string;
    controlCount?: number;
    status?: string;
    [k: string]: unknown;
}
export interface ComplianceSyncResult {
    synced?: number;
    failed?: number;
    skipped?: number;
    syncedAt?: string;
    [k: string]: unknown;
}
export interface ApprovalRequest {
    approvalId?: string;
    entityType?: string;
    entityId?: string;
    requestedBy?: string;
    approverRole?: string;
    status?: string;
    createdAt?: string;
    [k: string]: unknown;
}
