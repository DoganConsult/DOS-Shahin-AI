export type ProcessTaskType = 'human' | 'system' | 'agent' | 'evidence_request' | 'control_review' | 'risk_assessment' | 'policy_creation' | 'audit_response' | 'incident_response' | 'remediation' | 'approval' | 'verification' | 'vendor_risk_propagation' | 'vendor_gap_remediation' | 'vendor_evidence_review' | 'vendor_audit_finding' | 'vendor_framework_sync' | 'training_assignment' | 'workflow_task' | 'workflow_approval' | 'asset_review' | 'exception_review' | 'training_review' | 'training_content_review' | 'training_content_creation' | 'issue_triage' | 'qiyas_reassessment' | 'qiyas_score_review' | 'ai_governance_review' | 'foundation_review' | 'report_regeneration' | 'report_generation' | 'ai_analysis' | 'ai_classification' | 'ai_execution' | 'integration_health_check' | 'admin_review' | 'workflow_trigger' | 'portal_review' | 'records_review' | 'records_retention_review' | 'records_archival' | 'privacy_breach_response' | 'privacy_review' | 'privacy_impact_assessment' | 'privacy_notice_review' | 'team_review' | 'team_reassignment' | 'action_tracking' | 'bcp_review' | 'dora_obligation_review' | (string & {});
export interface ProcessTaskInput {
    title: string;
    type: ProcessTaskType;
    ownerId?: string;
    metadata?: Record<string, unknown>;
}
export interface ProcessTask {
    id: string;
    title: string;
    type: ProcessTaskType;
    status: string;
    tenantId: string;
    ownerId?: string;
    metadata?: Record<string, unknown>;
    createdAt: string;
}
export interface RoutingResolution {
    assigneeId?: string;
    assigneeType?: string;
    reason?: string;
    metadata?: Record<string, unknown>;
}
export declare const EMPTY_RESOLUTION: RoutingResolution;
export declare const SLA_DEFAULTS: Record<string, number>;
export interface StartResult {
    instanceId: string;
    status: string;
    startedAt: string;
}
export interface AdvanceResult {
    instanceId: string;
    stepId: string;
    status: string;
    nextSteps?: string[];
}
export interface EngineStep {
    id: string;
    name: string;
    type: string;
    status?: string;
    assigneeId?: string;
    metadata?: Record<string, unknown>;
}
export type WorkflowEventType = string;
export interface WorkflowEventPayload {
    instanceId: string;
    tenantId: string;
    eventType: WorkflowEventType;
    metadata?: Record<string, unknown>;
}
export type WorkflowEntityType = string;
export type WorkflowAction = string;
export interface WorkflowEventData {
    workflowCode: string;
    instanceId: string;
    action: string;
    fromState: string;
    toState: string;
    actorId: string;
    entityType?: string;
    entityId?: string;
    metadata?: Record<string, unknown>;
}
export interface WorkflowEntityEventOptions {
    tenantId: string;
    entityType: string;
    entityId: string;
    action: string;
    triggeredBy: string;
    previousState?: string;
    newState?: string;
    correlationId?: string;
    workflowType?: string;
    priority?: string;
    stepCode?: string;
    assigneeId?: string;
    automationCode?: string;
    slaHoursRemaining?: number;
    slaBreachHours?: number;
    data?: Record<string, unknown>;
}
export interface PlatformWorkflows {
    createProcessTask(tenantId: string, input: any): Promise<any>;
    completeProcessTask(tenantId: string, taskId: string, outcome: any): Promise<void>;
    createAutomationRule(tenantId: string, input: any): Promise<any>;
    getAutomationRule(tenantId: string, ruleId: string): Promise<any>;
    getAutomationRules(tenantId: string, moduleCode?: string): Promise<any>;
    updateAutomationRule(tenantId: string, ruleId: string, updates: any): Promise<any>;
    deleteAutomationRule(tenantId: string, ruleId: string): Promise<void>;
    getAutomationLog(tenantId: string, ruleId: string): Promise<any>;
    advanceStep(tenantId: string, stepId: string): Promise<void>;
    completeStep(tenantId: string, stepId: string): Promise<void>;
    startWorkflowExecution?(tenantId: string, definitionId: string, entityId: string, opts?: any): Promise<StartResult>;
    cancelExecution?(tenantId: string, instanceId: string, reason?: string): Promise<void>;
    getInstanceStatus?(tenantId: string, instanceId: string): Promise<any>;
    getFailurePath?(tenantId: string, instanceId: string): Promise<any>;
    emitWorkflowEvent?(tenantId: string, event: WorkflowEventData): Promise<void>;
    emitWorkflowEntityEvent?(opts: WorkflowEntityEventOptions): void;
    executeNotificationStep?(tenantId: string, stepId: string, context: any): Promise<void>;
    executeApiCallNode?(tenantId: string, stepId: string, context: any): Promise<any>;
    executeSendEmailNode?(tenantId: string, stepId: string, context: any): Promise<void>;
    executeWebhookNode?(tenantId: string, stepId: string, context: any): Promise<any>;
}
export declare function setWorkflowEngine(impl: PlatformWorkflows): void;
export declare function createProcessTask(tenantId: string, input: any): Promise<any>;
export declare function completeProcessTask(tenantId: string, taskId: string, outcome: any): Promise<void>;
export declare function createAutomationRule(tenantId: string, input: any): Promise<any>;
export declare function getAutomationRule(tenantId: string, ruleId: string): Promise<any>;
export declare function getAutomationRules(tenantId: string, moduleCode?: string): Promise<any>;
export declare function updateAutomationRule(tenantId: string, ruleId: string, updates: any): Promise<any>;
export declare function deleteAutomationRule(tenantId: string, ruleId: string): Promise<void>;
export declare function getAutomationLog(tenantId: string, ruleId: string): Promise<any>;
export declare function advanceStep(tenantId: string, stepId: string): Promise<void>;
export declare function completeStep(tenantId: string, stepId: string): Promise<void>;
export declare function startWorkflowExecution(tenantId: string, definitionId: string, entityId: string, opts?: any): Promise<StartResult>;
export declare function cancelExecution(tenantId: string, instanceId: string, reason?: string): Promise<void>;
export declare function getInstanceStatus(tenantId: string, instanceId: string): Promise<any>;
export declare function getFailurePath(tenantId: string, instanceId: string): Promise<any>;
export declare function emitWorkflowEvent(tenantId: string, event: WorkflowEventData): Promise<void>;
export declare function emitWorkflowEntityEvent(opts: WorkflowEntityEventOptions): void;
export declare function executeNotificationStep(tenantId: string, stepId: string, context: any): Promise<void>;
export declare function executeApiCallNode(tenantId: string, stepId: string, context: any): Promise<any>;
export declare function executeSendEmailNode(tenantId: string, stepId: string, context: any): Promise<void>;
export declare function executeWebhookNode(tenantId: string, stepId: string, context: any): Promise<any>;
