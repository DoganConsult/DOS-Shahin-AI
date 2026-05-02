export type ProcessTaskType =
  | 'human' | 'system' | 'agent'
  | 'evidence_request' | 'control_review' | 'risk_assessment'
  | 'policy_creation' | 'audit_response' | 'incident_response'
  | 'remediation' | 'approval' | 'verification'
  | 'vendor_risk_propagation' | 'vendor_gap_remediation' | 'vendor_evidence_review'
  | 'vendor_audit_finding' | 'vendor_framework_sync' | 'training_assignment'
  | 'workflow_task' | 'workflow_approval' | 'asset_review' | 'exception_review'
  | 'training_review' | 'training_content_review' | 'training_content_creation'
  | 'issue_triage' | 'qiyas_reassessment' | 'qiyas_score_review'
  | 'ai_governance_review' | 'foundation_review' | 'report_regeneration'
  | 'report_generation' | 'ai_analysis' | 'ai_classification' | 'ai_execution'
  | 'integration_health_check' | 'admin_review' | 'workflow_trigger' | 'portal_review'
  | 'records_review' | 'records_retention_review' | 'records_archival'
  | 'privacy_breach_response' | 'privacy_review' | 'privacy_impact_assessment'
  | 'privacy_notice_review' | 'team_review' | 'team_reassignment' | 'action_tracking'
  | 'bcp_review' | 'dora_obligation_review'
  | (string & {});
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
export const EMPTY_RESOLUTION: RoutingResolution = {};
export const SLA_DEFAULTS: Record<string, number> = {
  low: 72,
  medium: 48,
  high: 24,
  critical: 4,
};

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

let _workflows: PlatformWorkflows | null = null;

export function setWorkflowEngine(impl: PlatformWorkflows): void {
  _workflows = impl;
}

function getWorkflows(): PlatformWorkflows {
  if (!_workflows) {
    throw new Error('PlatformWorkflows not initialized. Call setWorkflowEngine() first.');
  }
  return _workflows;
}

export function createProcessTask(tenantId: string, input: any): Promise<any> {
  return getWorkflows().createProcessTask(tenantId, input);
}

export function completeProcessTask(tenantId: string, taskId: string, outcome: any): Promise<void> {
  return getWorkflows().completeProcessTask(tenantId, taskId, outcome);
}

export function createAutomationRule(tenantId: string, input: any): Promise<any> {
  return getWorkflows().createAutomationRule(tenantId, input);
}

export function getAutomationRule(tenantId: string, ruleId: string): Promise<any> {
  return getWorkflows().getAutomationRule(tenantId, ruleId);
}

export function getAutomationRules(tenantId: string, moduleCode?: string): Promise<any> {
  return getWorkflows().getAutomationRules(tenantId, moduleCode);
}

export function updateAutomationRule(tenantId: string, ruleId: string, updates: any): Promise<any> {
  return getWorkflows().updateAutomationRule(tenantId, ruleId, updates);
}

export function deleteAutomationRule(tenantId: string, ruleId: string): Promise<void> {
  return getWorkflows().deleteAutomationRule(tenantId, ruleId);
}

export function getAutomationLog(tenantId: string, ruleId: string): Promise<any> {
  return getWorkflows().getAutomationLog(tenantId, ruleId);
}

export function advanceStep(tenantId: string, stepId: string): Promise<void> {
  return getWorkflows().advanceStep(tenantId, stepId);
}

export function completeStep(tenantId: string, stepId: string): Promise<void> {
  return getWorkflows().completeStep(tenantId, stepId);
}

export function startWorkflowExecution(tenantId: string, definitionId: string, entityId: string, opts?: any): Promise<StartResult> {
  const impl = getWorkflows();
  if (!impl.startWorkflowExecution) throw new Error('startWorkflowExecution() not supported.');
  return impl.startWorkflowExecution(tenantId, definitionId, entityId, opts);
}

export function cancelExecution(tenantId: string, instanceId: string, reason?: string): Promise<void> {
  const impl = getWorkflows();
  if (!impl.cancelExecution) throw new Error('cancelExecution() not supported.');
  return impl.cancelExecution(tenantId, instanceId, reason);
}

export function getInstanceStatus(tenantId: string, instanceId: string): Promise<any> {
  const impl = getWorkflows();
  if (!impl.getInstanceStatus) throw new Error('getInstanceStatus() not supported.');
  return impl.getInstanceStatus(tenantId, instanceId);
}

export function getFailurePath(tenantId: string, instanceId: string): Promise<any> {
  const impl = getWorkflows();
  if (!impl.getFailurePath) throw new Error('getFailurePath() not supported.');
  return impl.getFailurePath(tenantId, instanceId);
}

export function emitWorkflowEvent(tenantId: string, event: WorkflowEventData): Promise<void> {
  const impl = getWorkflows();
  if (!impl.emitWorkflowEvent) throw new Error('emitWorkflowEvent() not supported.');
  return impl.emitWorkflowEvent(tenantId, event);
}

export function emitWorkflowEntityEvent(opts: WorkflowEntityEventOptions): void {
  const impl = getWorkflows();
  if (!impl.emitWorkflowEntityEvent) throw new Error('emitWorkflowEntityEvent() not supported.');
  impl.emitWorkflowEntityEvent(opts);
}

export function executeNotificationStep(tenantId: string, stepId: string, context: any): Promise<void> {
  const impl = getWorkflows();
  if (!impl.executeNotificationStep) throw new Error('executeNotificationStep() not supported.');
  return impl.executeNotificationStep(tenantId, stepId, context);
}

export function executeApiCallNode(tenantId: string, stepId: string, context: any): Promise<any> {
  const impl = getWorkflows();
  if (!impl.executeApiCallNode) throw new Error('executeApiCallNode() not supported.');
  return impl.executeApiCallNode(tenantId, stepId, context);
}

export function executeSendEmailNode(tenantId: string, stepId: string, context: any): Promise<void> {
  const impl = getWorkflows();
  if (!impl.executeSendEmailNode) throw new Error('executeSendEmailNode() not supported.');
  return impl.executeSendEmailNode(tenantId, stepId, context);
}

export function executeWebhookNode(tenantId: string, stepId: string, context: any): Promise<any> {
  const impl = getWorkflows();
  if (!impl.executeWebhookNode) throw new Error('executeWebhookNode() not supported.');
  return impl.executeWebhookNode(tenantId, stepId, context);
}
