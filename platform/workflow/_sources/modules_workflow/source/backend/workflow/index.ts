// ── Workflow Module — Barrel Export ──────────────────────────────
// Runtime exports
export { WORKFLOW_POLICY } from './policies/workflow.policies';
export { WORKFLOW_STATUSES, WORKFLOW_DEFAULT_STATUS, WORKFLOW_LIMITS, WORKFLOW_TIMEOUTS, WORKFLOW_SLA_DEFAULTS } from './data/workflow-constants';
export { getWorkflowSeedData, seedWorkflowModule } from './data/workflow-seed';
export { emitWorkflowEvent, emitWorkflowStatusChange } from './ports/lifecycle.port';
export { WORKFLOW_AI_CONFIG, isWorkflowAiActionAllowed, isWorkflowAiActionBlocked, summarize as workflowAISummarize, classify as workflowAIClassify, recommendActions as workflowAIRecommendActions, generateReport as workflowAIGenerateReport } from './services/ai/workflow-ai.service';
export { getWorkflowJobs } from './jobs/workflow-monitor.job';
export { onWorkflowTriggered, onTaskCreated, onApprovalRequired, onEscalation, onClosure, onFailure } from './services/ops/workflow-workflow.service';
export * as workflowQuery from './repositories/workflow-query.repo';
export { default as workflowAdminRoutes } from './routes/workflow/workflow-admin.routes';
export { WORKFLOW_EVENT_CONTRACT, WORKFLOW_PUBLISHED_EVENTS, WORKFLOW_CONSUMED_EVENTS, WORKFLOW_EVENT_LEGACY_ALIASES, WORKFLOW_EVENT_ORDERING, WORKFLOW_EVENT_SECURITY, WORKFLOW_EVENT_CORRELATION } from './events/workflow.events';
export { toAudienceShaped, toAdminResponse, toListItem, redactForAudit, stripFieldsForExport, toImportEntity } from './mappers/workflow.mapper';
export { workflowResponseSchema, workflowListResponseSchema, workflowEventPayloadSchema, workflowStatusTransitionSchema, workflowImportRowSchema, workflowImportBatchSchema, workflowExportRequestSchema, workflowAdminConfigSchema, workflowBulkUpdateSchema, workflowBulkStatusChangeSchema } from './schemas/workflow.schemas';

// MP-02 §3.1 — Definition and registry
export { createDefinition, getDefinitionById, getDefinitionByCode, listDefinitions, updateDefinitionStatus, deleteDefinition } from './services/core/workflow-definition.service';
export { getTransitionRulesForStep, getTransitionRulesForDefinition, resolveNextStep, executeTransition, validateTransitionGraph } from './services/core/transition-registry.service';

// MP-02 §3.1 — Execution: SLA and escalation
export { getSlaStatusForExecution, getBreachedSlaTimers, getWarningSlaTimers, processSlaBreach, emitSlaWarning, getSlaMetrics } from './services/core/workflow-sla.service';
export { triggerEscalation, acknowledgeEscalation, resolveEscalation, checkSlaBreaches, getOpenEscalations } from './services/core/workflow-escalation.service';

// MP-02 §3.1 — Diagnostics/admin
export { getExecutionHistory, getAuditTrailForExecution, getApprovalAuditForExecution, getTransitionAuditForExecution } from './services/diagnostics/execution-audit-viewer.service';
export { promoteVersion, deprecateVersion, rolloutVersion, getVersionHistory, getActiveVersionSummary } from './services/admin/version-rollout-admin.service';

// Type exports
export type { WorkflowStatus, WorkflowEventPayload, WorkflowSource, WorkflowStatusReason } from './types/workflow.types';
export type { WorkflowCreateDTO, WorkflowUpdateDTO, WorkflowResponseDTO, WorkflowListItemDTO, WorkflowDetailDTO, WorkflowAdminDTO, WorkflowImportDTO, WorkflowExportDTO, WorkflowSearchResultDTO, WorkflowAuditDTO, WorkflowBulkOperationDTO } from './types/workflow.dto';
export type { WorkflowWorkflowContext } from './services/ops/workflow-workflow.service';
export type { TransitionRule } from './services/core/transition-registry.service';
export type { SlaTimerRecord } from './services/core/workflow-sla.service';
export type { EscalationRule } from './services/core/workflow-escalation.service';
export type { AuditTrailEntry, ApprovalAuditEntry, TransitionAuditEntry } from './services/diagnostics/execution-audit-viewer.service';
export type { ActiveVersionSummary } from './services/admin/version-rollout-admin.service';

// MP-02 §3.1 — Dashboard analytics
export { getSummary as getWorkflowDashboardSummary, getHealthScore as getWorkflowHealthScore, getApprovalBottlenecks as getWorkflowApprovalBottlenecks, getSLACompliance as getWorkflowSLACompliance, getTaskDistribution as getWorkflowTaskDistribution, getTrendData as getWorkflowTrendData, getExecutionMetrics as getWorkflowExecutionMetrics, getAIInsightsSummary as getWorkflowAIInsightsSummary, getFullDashboard as getWorkflowFullDashboard } from './services/dashboard/workflow-dashboard.service';

// Dashboard types
export type { WorkflowDashboardSummary, WorkflowHealthScore, WorkflowApprovalBottleneck, WorkflowSLACompliance, WorkflowTaskDistribution, WorkflowTrendDataPoint, WorkflowExecutionMetrics, WorkflowAIInsightsSummary } from './services/dashboard/workflow-dashboard.service';
