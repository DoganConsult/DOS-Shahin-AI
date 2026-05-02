/**
 * @dos/types — business continuity (BC/DR) and resilience types
 * Covers BIA, BCP, DRP, tests, and continuity plans
 */
export type BIAStatus = 'draft' | 'in_review' | 'approved' | 'outdated';
export type RecoveryTier = 'tier1' | 'tier2' | 'tier3' | 'tier4';
export type BusinessProcessCriticality = 'critical' | 'high' | 'medium' | 'low';
export interface BusinessImpactAnalysis {
    biaId: string;
    tenantId: string;
    workspaceId?: string;
    title: string;
    description?: string;
    status: BIAStatus;
    scope?: string;
    ownerId: string;
    reviewers?: string[];
    approvers?: string[];
    effectiveDate?: string;
    lastReviewedAt?: string;
    nextReviewDate?: string;
    businessProcesses?: BusinessProcess[];
    summary?: BIASummary;
    metadata?: Record<string, unknown>;
    createdAt: string;
    updatedAt: string;
}
export interface BusinessProcess {
    processId: string;
    biaId: string;
    tenantId: string;
    name: string;
    nameAr?: string;
    description?: string;
    department?: string;
    orgUnitId?: string;
    ownerId?: string;
    criticality: BusinessProcessCriticality;
    recoveryTier?: RecoveryTier;
    rto?: number;
    rpo?: number;
    mtpd?: number;
    rta?: number;
    wrt?: number;
    dependencies?: ProcessDependency[];
    regulatoryRequirements?: string[];
    revenueImpactPerHour?: number;
    reputationalImpact?: 'critical' | 'high' | 'medium' | 'low';
    regulatoryImpact?: 'critical' | 'high' | 'medium' | 'low';
    operationalImpact?: 'critical' | 'high' | 'medium' | 'low';
    humanLifeImpact?: boolean;
    manualWorkarounds?: string;
    minimumResourcesRequired?: string;
    linkedAssetIds?: string[];
    linkedVendorIds?: string[];
    notes?: string;
}
export interface ProcessDependency {
    dependencyId: string;
    processId: string;
    type: 'process' | 'system' | 'vendor' | 'staff' | 'data' | 'facility';
    entityId?: string;
    name: string;
    criticality: BusinessProcessCriticality;
    internalDependency?: boolean;
    notes?: string;
}
export interface BIASummary {
    totalProcesses: number;
    byTier: Record<RecoveryTier, number>;
    byCriticality: Record<BusinessProcessCriticality, number>;
    averageRTO?: number;
    averageRPO?: number;
    criticalSystemsCount?: number;
    singlePointsOfFailure?: number;
}
export type BCPStatus = 'draft' | 'review' | 'approved' | 'activated' | 'deactivated' | 'archived';
export interface BusinessContinuityPlan {
    bcpId: string;
    tenantId: string;
    workspaceId?: string;
    title: string;
    titleAr?: string;
    version: string;
    status: BCPStatus;
    scope?: string;
    objectives?: string;
    ownerId: string;
    biaId?: string;
    criticalProcessIds?: string[];
    scenarios?: BCPScenario[];
    contacts?: EmergencyContact[];
    communications?: CommunicationPlan;
    response?: ResponseProcedure[];
    recovery?: RecoveryProcedure[];
    restoration?: RestorationProcedure[];
    testHistory?: BCPTest[];
    approvedBy?: string;
    approvedAt?: string;
    activatedAt?: string;
    deactivatedAt?: string;
    lastTestedAt?: string;
    nextTestDate?: string;
    fileId?: string;
    metadata?: Record<string, unknown>;
    createdAt: string;
    updatedAt: string;
}
export interface BCPScenario {
    scenarioId: string;
    name: string;
    description?: string;
    type: 'natural_disaster' | 'cyber_attack' | 'pandemic' | 'power_outage' | 'supply_chain' | 'key_person' | 'facility_loss' | 'data_loss' | 'other';
    probability?: 'high' | 'medium' | 'low';
    impact?: 'critical' | 'high' | 'medium' | 'low';
    triggerCriteria?: string;
}
export interface EmergencyContact {
    contactId?: string;
    name: string;
    role: string;
    email?: string;
    phone?: string;
    alternatePhone?: string;
    available24x7?: boolean;
    isPrimary?: boolean;
    order?: number;
}
export interface CommunicationPlan {
    internalChannels?: string[];
    externalChannels?: string[];
    stakeholderGroups?: CommunicationGroup[];
    escalationMatrix?: EscalationLevel[];
}
export interface CommunicationGroup {
    groupId?: string;
    name: string;
    contacts?: string[];
    channels?: string[];
    frequency?: string;
    template?: string;
}
export interface EscalationLevel {
    level: number;
    triggerTime?: number;
    escalateTo?: string[];
    channels?: string[];
    message?: string;
}
export interface ResponseProcedure {
    procedureId: string;
    title: string;
    phase: 'detection' | 'notification' | 'assessment' | 'activation';
    steps?: ProcedureStep[];
    raci?: RACIMatrix;
}
export interface RecoveryProcedure {
    procedureId: string;
    title: string;
    processId?: string;
    scenarioId?: string;
    rto?: number;
    rpo?: number;
    steps?: ProcedureStep[];
    alternateLocations?: string[];
    alternateVendors?: string[];
    workarounds?: string;
    raci?: RACIMatrix;
}
export interface RestorationProcedure {
    procedureId: string;
    title: string;
    processId?: string;
    steps?: ProcedureStep[];
    successCriteria?: string;
    raci?: RACIMatrix;
}
export interface ProcedureStep {
    stepId: string;
    order: number;
    action: string;
    responsible?: string[];
    timeframe?: string;
    checklistItems?: string[];
    notes?: string;
}
export interface RACIMatrix {
    responsible?: string[];
    accountable?: string[];
    consulted?: string[];
    informed?: string[];
}
export type DRPStatus = 'draft' | 'approved' | 'activated' | 'deactivated';
export interface DisasterRecoveryPlan {
    drpId: string;
    tenantId: string;
    title: string;
    version: string;
    status: DRPStatus;
    scope?: string;
    ownerId: string;
    bcpId?: string;
    rto: number;
    rpo: number;
    systems?: DRSystemConfig[];
    runbooks?: DRRunbook[];
    testHistory?: BCPTest[];
    approvedBy?: string;
    approvedAt?: string;
    lastTestedAt?: string;
    nextTestDate?: string;
    fileId?: string;
    createdAt: string;
    updatedAt: string;
}
export interface DRSystemConfig {
    systemId: string;
    name: string;
    tier: RecoveryTier;
    rto?: number;
    rpo?: number;
    primarySite?: string;
    drSite?: string;
    replicationMethod?: 'sync' | 'async' | 'backup_restore' | 'none';
    backupFrequency?: string;
    lastBackupAt?: string;
    failoverType?: 'automatic' | 'manual' | 'semi_automatic';
    lastTestedAt?: string;
    testResult?: 'pass' | 'fail' | 'partial';
}
export interface DRRunbook {
    runbookId: string;
    name: string;
    systemId?: string;
    type: 'failover' | 'failback' | 'data_recovery' | 'communication';
    steps: ProcedureStep[];
    estimatedDurationMinutes?: number;
    lastVerifiedAt?: string;
}
export type BCPTestType = 'tabletop' | 'walkthrough' | 'simulation' | 'full_interruption' | 'parallel_test' | 'drill';
export type BCPTestStatus = 'planned' | 'in_progress' | 'completed' | 'cancelled' | 'failed';
export interface BCPTest {
    testId: string;
    tenantId: string;
    bcpId?: string;
    drpId?: string;
    type: BCPTestType;
    status: BCPTestStatus;
    name: string;
    description?: string;
    scenario?: string;
    objectives?: string[];
    plannedDate: string;
    startedAt?: string;
    completedAt?: string;
    duration?: number;
    participants?: string[];
    facilitator?: string;
    result?: 'pass' | 'pass_with_gaps' | 'fail' | 'inconclusive';
    rtoAchieved?: number;
    rpoAchieved?: number;
    successCriteriamet?: boolean;
    gaps?: BCPTestGap[];
    improvements?: string[];
    evidenceFileIds?: string[];
    reportId?: string;
    createdAt: string;
    updatedAt: string;
}
export interface BCPTestGap {
    gapId: string;
    description: string;
    severity: 'critical' | 'high' | 'medium' | 'low';
    owner?: string;
    dueDate?: string;
    status: 'open' | 'in_progress' | 'resolved';
    resolvedAt?: string;
    taskId?: string;
}
export interface ResilienceMetrics {
    tenantId: string;
    period?: string;
    overallScore?: number;
    biaCompleteness?: number;
    bcpCoverage?: number;
    drpCoverage?: number;
    testComplianceRate?: number;
    criticalProcessesCovered?: number;
    totalCriticalProcesses?: number;
    activeBCP?: number;
    activeDRP?: number;
    lastTestDate?: string;
    nextTestDue?: string;
    openGaps?: number;
    criticalGaps?: number;
    calculatedAt: string;
}
