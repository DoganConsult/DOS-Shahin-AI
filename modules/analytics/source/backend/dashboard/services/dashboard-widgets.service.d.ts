export interface AgeBucket {
    label: string;
    minDays: number;
    maxDays: number;
    count: number;
}
/**
 * Bucket exceptions by age into 4 categories.
 * Pure function — testable without DB.
 * Requirements: 11.1
 */
export declare function bucketExceptionsByAge(items: {
    created_at: string;
}[], now?: Date): AgeBucket[];
export declare function getExceptionsAging(tenantId: string): Promise<AgeBucket[]>;
export interface DriftedControl {
    controlId: string;
    title: string;
    baselineStatus: string;
    currentStatus: string;
    daysSinceDrift: number;
}
/**
 * Detect controls that have drifted from their baseline.
 * Pure function — testable without DB.
 * Requirements: 12.1, 12.2
 */
export declare function detectControlDrift(controls: {
    control_id: string;
    title: string;
    status: string;
    baseline_status?: string;
    last_status_change?: string;
}[], now?: Date): DriftedControl[];
export declare function getControlDrift(tenantId: string): Promise<DriftedControl[]>;
export interface EvidenceQueueItem {
    evidenceId: string;
    title: string;
    dueDate: string;
    isOverdue: boolean;
    daysUntilDue: number;
}
/**
 * Sort evidence queue: overdue first, then by upcoming due date.
 * Pure function — testable without DB.
 * Requirements: 13.2
 */
export declare function sortEvidenceQueue(items: {
    evidence_id: string;
    title: string;
    due_date: string;
    assigned_to?: string;
}[], now?: Date): EvidenceQueueItem[];
export declare function getEvidenceQueue(tenantId: string, userId?: string): Promise<EvidenceQueueItem[]>;
export interface AuditPackProgress {
    assessmentId: string;
    assessmentName: string;
    totalItems: number;
    completedItems: number;
    progressPercent: number;
    outstandingItems: string[];
}
/**
 * Compute audit pack progress per assessment.
 * Pure function — testable without DB.
 * Requirements: 14.1
 */
export declare function computeAuditPackProgress(assessments: {
    assessment_id: string;
    name: string;
    items: {
        title: string;
        status: string;
    }[];
}[]): AuditPackProgress[];
export declare function getAuditPackStatus(tenantId: string): Promise<AuditPackProgress[]>;
export interface RiskPrediction {
    historical: {
        date: string;
        score: number;
    }[];
    projected: {
        date: string;
        score: number;
    }[];
    insufficientData: boolean;
}
/**
 * Simple linear regression for risk prediction.
 * Pure function — testable without DB.
 * Requirements: 15.1, 15.2
 */
export declare function predictRiskTrend(snapshots: {
    snapshot_date: string;
    risk_score: number;
}[]): RiskPrediction;
export declare function getRiskPrediction(tenantId: string): Promise<RiskPrediction>;
export interface AISummary {
    priorities: {
        en: string;
        ar: string;
    }[];
    weeklyChanges: {
        en: string;
        ar: string;
    }[];
    recommendedActions: {
        en: string;
        ar: string;
    }[];
    generatedAt: string;
}
/**
 * Build AI summary structure from KPI data.
 * Pure function — testable without DB.
 * Requirements: 10.1, 10.4
 */
export declare function buildAISummary(kpis: {
    compliance_score?: number;
    risk_score?: number;
    evidence_coverage?: number;
    open_risks?: number;
    open_findings?: number;
    expired_evidence?: number;
    untreated_risks?: number;
}): AISummary;
export declare function getIncidentDashboardWidget(tenantId: string): Promise<Record<string, unknown>>;
export declare function getBcpDashboardWidget(tenantId: string): Promise<Record<string, unknown>>;
export declare function getVendorDashboardWidget(tenantId: string): Promise<Record<string, unknown>>;
export declare function getTrainingDashboardWidget(tenantId: string): Promise<Record<string, unknown>>;
export declare function getAISummary(tenantId: string): Promise<AISummary>;
export declare function getRemediationDashboardWidget(tenantId: string): Promise<any>;
export declare function getActionDashboardWidget(tenantId: string): Promise<any>;
export declare function getWorkflowDashboardWidget(tenantId: string): Promise<any>;
export declare function getAssetDashboardWidget(tenantId: string): Promise<any>;
export declare function getIntegrationsDashboardWidget(tenantId: string): Promise<any>;
export declare function getAdminDashboardWidget(tenantId: string): Promise<{
    active_users: any;
    roles_count: any;
    modules_enabled: any;
}>;
