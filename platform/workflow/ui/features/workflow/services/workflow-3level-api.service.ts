import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '@env/environment';

export interface AINoteDto {
  note_id: string;
  instance_id: string;
  step_id: string | null;
  agent_id: string;
  note_type: 'guidance' | 'autofill' | 'recommendation' | 'summary' | 'coaching' | 'warning';
  content: Record<string, unknown>;
  confidence: number | null;
  trust_level: 'assistive' | 'advisory' | 'authoritative';
  disclaimer: string;
  review_required: boolean;
  reviewed_by: string | null;
  reviewed_at: string | null;
  review_decision: 'accepted' | 'rejected' | 'modified' | null;
  context_sources: string[];
  created_at: string;
}

export interface DraftActionDto {
  draft_id: string;
  instance_id: string;
  step_id: string | null;
  agent_id: string;
  draft_type: 'task' | 'email' | 'response' | 'approval' | 'entity_update' | 'escalation';
  title: string;
  draft_content: Record<string, unknown>;
  confidence: number | null;
  recommendation_id: string | null;
  status: 'pending' | 'accepted' | 'rejected' | 'modified' | 'expired' | 'converted';
  accepted_by: string | null;
  accepted_at: string | null;
  converted_entity_type: string | null;
  converted_entity_id: string | null;
  rejection_reason: string | null;
  expires_at: string | null;
  created_at: string;
}

export interface RecommendationCatalogDto {
  catalog_id: string;
  recommendation_type: string;
  display_name_en: string;
  display_name_ar: string;
  category: string;
  applicable_step_types: string[];
  requires_human_review: boolean;
  max_confidence_for_auto: number;
  is_active: boolean;
}

export interface ForbiddenBoundaryDto {
  boundary_id: string;
  module_code: string | null;
  entity_type: string | null;
  step_type: string | null;
  forbidden_action: string;
  reason: string;
  severity: 'block' | 'warn' | 'audit_only';
  is_active: boolean;
  created_at: string;
}

export interface AIPolicyDto {
  policy_id: string;
  workflow_id: string;
  ai_enabled: boolean;
  autonomy_level: number;
  allowed_ai_actions: string[];
  forbidden_actions: string[];
  max_confidence_auto: number;
  require_human_review: boolean;
  override_tenant_config: boolean;
}

export interface MandatoryReviewPointDto {
  review_point_id: string;
  step_type: string;
  step_sub_type: string | null;
  requires_human_review: boolean;
  min_confidence_to_skip: number;
  review_role: string | null;
  reason: string | null;
  is_active: boolean;
}

export interface KillSwitchDto {
  switch_id: string;
  tenant_id: string;
  activated_by: string;
  scope: 'all_autonomous' | 'workflow_specific' | 'step_type' | 'agent_specific';
  scope_filter: Record<string, unknown>;
  reason: string;
  is_active: boolean;
  activated_at: string;
  deactivated_at: string | null;
  deactivated_by: string | null;
}

export interface RollbackLogDto {
  rollback_id: string;
  instance_id: string;
  step_id: string | null;
  original_action_id: string | null;
  original_action_type: string;
  original_state: Record<string, unknown>;
  compensating_action_type: string | null;
  compensating_state: Record<string, unknown>;
  rollback_reason: string;
  rollback_status: 'pending' | 'in_progress' | 'completed' | 'failed';
  initiated_by: string;
  completed_at: string | null;
  created_at: string;
}

export interface AIBudgetDto {
  budget_id: string;
  tenant_id: string;
  period_type: 'hourly' | 'daily' | 'weekly' | 'monthly';
  max_executions: number;
  max_cost_units: number;
  current_executions: number;
  current_cost_units: number;
  period_start: string;
  period_end: string | null;
  is_active: boolean;
}

export interface BudgetCheckDto {
  allowed: boolean;
  reason?: string;
  remaining_executions: number;
  remaining_cost_units: number;
  utilization_pct: number;
}

export interface StepAutonomyDto {
  scope_id: string;
  workflow_id: string | null;
  step_type: string;
  step_sub_type: string | null;
  allowed_ai_actions: string[];
  max_autonomy_level: number;
  mandatory_human_review: boolean;
  max_confidence_required: number;
  is_active: boolean;
}

export interface InterventionLogDto {
  intervention_id: string;
  instance_id: string | null;
  step_id: string | null;
  intervention_type: string;
  agent_id: string | null;
  details: Record<string, unknown>;
  notified_users: string[];
  acknowledged_by: string | null;
  acknowledged_at: string | null;
  created_at: string;
}

export interface WorkflowHealthDto {
  totalInstances: number;
  activeInstances: number;
  completedInstances: number;
  failedInstances: number;
  stalledInstances: number;
  avgCompletionMs: number;
  slaCompliance: number;
  aiExecutionCount: number;
  killSwitchActive: boolean;
  budgetUtilization: number;
  pendingReviews: number;
  pendingDrafts: number;
  pendingRollbacks: number;
  interventionsToday: number;
}

export interface WorkflowAnalyticsDto {
  period: { days: number; since: string };
  instances: { total: number; active: number; completed: number; failed: number; stalled: number; recent: number; avgCompletionMs: number };
  stepBreakdown: Array<{ stepType: string; count: number; avgDurationSec: number }>;
  aiExecution: { totalExecutions: number; autoApproved: number; autoRejected: number; pendingReview: number; avgConfidence: number };
  sla: { total: number; breached: number; met: number; compliancePct: number };
  approvals: { total: number; pending: number; approved: number; rejected: number; avgResolutionHours: number };
  aiNotes: Array<{ noteType: string; count: number; accepted: number; rejected: number }>;
  draftActions: Array<{ draftType: string; count: number; accepted: number; rejected: number; converted: number }>;
}

export interface TraceEventDto {
  timestamp: string;
  eventType: string;
  source: string;
  stepId?: string;
  details: Record<string, unknown>;
}

export interface ExecutionTraceDto {
  instanceId: string;
  traceCount: number;
  events: TraceEventDto[];
}

export interface NextBestActionDto {
  instanceId: string;
  workflowStatus: string;
  currentStep: { stepId: string; stepType: string; status: string } | null;
  recommendations: Array<{ priority: number; action: string; label: string; description: string; confidence: number; category: string }>;
  generatedAt: string;
}

export interface BatchResultDto {
  action: string;
  total: number;
  succeeded: number;
  failed: number;
  results: Array<{ id: string; success: boolean; error?: string }>;
}

export interface SupervisorActionResultDto {
  instanceId: string;
  action: string;
  status: string;
  reason: string;
  timestamp: string;
}

export interface GuardrailStatusDto {
  killSwitch: { active: boolean; count: number; switches: KillSwitchDto[] };
  boundaries: { total: number; blocking: number; warning: number };
  reviewPoints: { total: number; active: number };
  budget: { configured: boolean; allowed: boolean; utilization: number; remaining: number };
  autonomy: { total: number; active: number };
  overallHealth: 'healthy' | 'halted' | 'degraded';
  timestamp: string;
}

export interface WorkflowInstanceListDto {
  items: Array<Record<string, unknown>>;
  total: number;
  limit: number;
  offset: number;
}

export interface SLARecordDto {
  sla_id: string;
  instance_id: string;
  due_at: string;
  breached_at: string | null;
  resolved_at: string | null;
  created_at: string;
}

export interface AIConfidenceDto {
  period: { days: number; since: string };
  distribution: { high: number; medium: number; low: number; veryLow: number };
  overall: { avg: number; min: number; max: number };
  byAgent: Array<{ agentId: string; executions: number; avgConfidence: number; approved: number; rejected: number }>;
  byStepType: Array<{ stepType: string; executions: number; avgConfidence: number }>;
  trend: Array<{ day: string; avgConfidence: number; count: number }>;
}

export interface AgentToolPolicyDto {
  policy_id: string;
  agent_id: string;
  tool_name: string;
  allowed: boolean;
  max_calls_per_execution: number;
  requires_approval: boolean;
  context_restrictions: Record<string, unknown>;
  is_active: boolean;
  created_at: string;
}

export interface ApprovalChainDto {
  instanceId: string;
  totalSteps: number;
  pending: number;
  approved: number;
  rejected: number;
  isComplete: boolean;
  chain: Array<Record<string, unknown>>;
}

export interface WorkflowExportDto {
  exportedAt: string;
  instanceId: string;
  instance: Record<string, unknown>;
  steps: Array<Record<string, unknown>>;
  approvals: Array<Record<string, unknown>>;
  comments: Array<Record<string, unknown>>;
  aiNotes: Array<Record<string, unknown>>;
  draftActions: Array<Record<string, unknown>>;
  interventions: Array<Record<string, unknown>>;
  rollbacks: Array<Record<string, unknown>>;
  slaRecords: Array<Record<string, unknown>>;
  summary: Record<string, number>;
}

@Injectable({ providedIn: 'root' })
export class Workflow3LevelApiService {
  private http = inject(HttpClient);
  private base = `${environment.apiUrl}/workflow-3level`;

  // ═══ L2: AI Notes ═══
  createNote(data: Partial<AINoteDto>): Observable<AINoteDto> {
    return this.http.post<AINoteDto>(`${this.base}/workflows/ai-notes`, data);
  }
  getNotesByInstance(instanceId: string, opts?: { stepId?: string; noteType?: string; limit?: number; offset?: number }): Observable<{ items: AINoteDto[]; count: number }> {
    let params = new HttpParams();
    if (opts?.stepId) params = params.set('stepId', opts.stepId);
    if (opts?.noteType) params = params.set('noteType', opts.noteType);
    if (opts?.limit) params = params.set('limit', String(opts.limit));
    if (opts?.offset) params = params.set('offset', String(opts.offset));
    return this.http.get<{ items: AINoteDto[]; count: number }>(`${this.base}/workflows/${instanceId}/ai-notes`, { params });
  }
  reviewNote(noteId: string, decision: 'accepted' | 'rejected' | 'modified'): Observable<AINoteDto> {
    return this.http.post<AINoteDto>(`${this.base}/workflows/ai-notes/${noteId}/review`, { decision });
  }
  getPendingNotes(): Observable<{ items: AINoteDto[]; count: number }> {
    return this.http.get<{ items: AINoteDto[]; count: number }>(`${this.base}/workflows/ai-notes/pending`);
  }

  // ═══ L2: Draft Actions ═══
  createDraft(data: Partial<DraftActionDto>): Observable<DraftActionDto> {
    return this.http.post<DraftActionDto>(`${this.base}/workflows/draft-actions`, data);
  }
  getDraftsByInstance(instanceId: string, opts?: { status?: string; draftType?: string; limit?: number }): Observable<{ items: DraftActionDto[]; count: number }> {
    let params = new HttpParams();
    if (opts?.status) params = params.set('status', opts.status);
    if (opts?.draftType) params = params.set('draftType', opts.draftType);
    if (opts?.limit) params = params.set('limit', String(opts.limit));
    return this.http.get<{ items: DraftActionDto[]; count: number }>(`${this.base}/workflows/${instanceId}/draft-actions`, { params });
  }
  acceptDraft(draftId: string): Observable<DraftActionDto> {
    return this.http.post<DraftActionDto>(`${this.base}/workflows/draft-actions/${draftId}/accept`, {});
  }
  rejectDraft(draftId: string, reason: string): Observable<DraftActionDto> {
    return this.http.post<DraftActionDto>(`${this.base}/workflows/draft-actions/${draftId}/reject`, { reason });
  }
  convertDraft(draftId: string, data: Record<string, unknown>): Observable<DraftActionDto> {
    return this.http.post<DraftActionDto>(`${this.base}/workflows/draft-actions/${draftId}/convert`, data);
  }
  getPendingDrafts(): Observable<{ items: DraftActionDto[]; count: number }> {
    return this.http.get<{ items: DraftActionDto[]; count: number }>(`${this.base}/workflows/draft-actions/pending`);
  }

  // ═══ L2: Recommendation Catalog ═══
  getCatalog(): Observable<RecommendationCatalogDto[]> {
    return this.http.get<RecommendationCatalogDto[]>(`${this.base}/workflows/recommendation-catalog`);
  }
  upsertCatalogEntry(data: Partial<RecommendationCatalogDto>): Observable<RecommendationCatalogDto> {
    return this.http.put<RecommendationCatalogDto>(`${this.base}/workflows/recommendation-catalog`, data);
  }
  getApplicableRecommendations(stepType: string): Observable<RecommendationCatalogDto[]> {
    return this.http.get<RecommendationCatalogDto[]>(`${this.base}/workflows/recommendation-catalog/applicable/${stepType}`);
  }

  // ═══ L2: Forbidden Boundaries ═══
  getBoundaries(opts?: { moduleCode?: string; stepType?: string }): Observable<ForbiddenBoundaryDto[]> {
    let params = new HttpParams();
    if (opts?.moduleCode) params = params.set('moduleCode', opts.moduleCode);
    if (opts?.stepType) params = params.set('stepType', opts.stepType);
    return this.http.get<ForbiddenBoundaryDto[]>(`${this.base}/workflows/forbidden-boundaries`, { params });
  }
  createBoundary(data: Partial<ForbiddenBoundaryDto>): Observable<ForbiddenBoundaryDto> {
    return this.http.post<ForbiddenBoundaryDto>(`${this.base}/workflows/forbidden-boundaries`, data);
  }
  deactivateBoundary(boundaryId: string): Observable<{ deactivated: boolean }> {
    return this.http.delete<{ deactivated: boolean }>(`${this.base}/workflows/forbidden-boundaries/${boundaryId}`);
  }

  // ═══ L2: AI Policy ═══
  getAIPolicy(workflowId: string): Observable<AIPolicyDto | null> {
    return this.http.get<AIPolicyDto | null>(`${this.base}/workflows/${workflowId}/ai-policy`);
  }
  upsertAIPolicy(workflowId: string, data: Partial<AIPolicyDto>): Observable<AIPolicyDto> {
    return this.http.put<AIPolicyDto>(`${this.base}/workflows/${workflowId}/ai-policy`, data);
  }
  resolveEffectivePolicy(workflowId: string): Observable<AIPolicyDto> {
    return this.http.get<AIPolicyDto>(`${this.base}/workflows/${workflowId}/ai-policy/effective`);
  }

  // ═══ L2: Mandatory Review Points ═══
  getReviewPoints(): Observable<MandatoryReviewPointDto[]> {
    return this.http.get<MandatoryReviewPointDto[]>(`${this.base}/workflows/mandatory-review-points`);
  }
  upsertReviewPoint(data: Partial<MandatoryReviewPointDto>): Observable<MandatoryReviewPointDto> {
    return this.http.put<MandatoryReviewPointDto>(`${this.base}/workflows/mandatory-review-points`, data);
  }

  // ═══ L3: Kill Switch ═══
  getActiveKillSwitches(): Observable<KillSwitchDto[]> {
    return this.http.get<KillSwitchDto[]>(`${this.base}/workflows/kill-switch`);
  }
  activateKillSwitch(data: { scope: string; scopeFilter?: Record<string, unknown>; reason: string; notifyUsers?: string[] }): Observable<KillSwitchDto> {
    return this.http.post<KillSwitchDto>(`${this.base}/workflows/kill-switch`, data);
  }
  deactivateKillSwitch(switchId: string): Observable<KillSwitchDto> {
    return this.http.post<KillSwitchDto>(`${this.base}/workflows/kill-switch/${switchId}/deactivate`, {});
  }

  // ═══ L3: Rollback ═══
  initiateRollback(data: { instanceId: string; stepId?: string; originalActionType: string; originalState: Record<string, unknown>; reason: string }): Observable<RollbackLogDto> {
    return this.http.post<RollbackLogDto>(`${this.base}/workflows/rollback`, data);
  }
  executeRollback(rollbackId: string): Observable<RollbackLogDto> {
    return this.http.post<RollbackLogDto>(`${this.base}/workflows/rollback/${rollbackId}/execute`, {});
  }
  getRollbacksByInstance(instanceId: string): Observable<RollbackLogDto[]> {
    return this.http.get<RollbackLogDto[]>(`${this.base}/workflows/${instanceId}/rollbacks`);
  }
  getPendingRollbacks(): Observable<RollbackLogDto[]> {
    return this.http.get<RollbackLogDto[]>(`${this.base}/workflows/rollback/pending`);
  }

  // ═══ L3: AI Budget ═══
  getBudget(periodType?: string): Observable<AIBudgetDto | null> {
    let params = new HttpParams();
    if (periodType) params = params.set('periodType', periodType);
    return this.http.get<AIBudgetDto | null>(`${this.base}/workflows/ai-budget`, { params });
  }
  checkBudget(): Observable<BudgetCheckDto> {
    return this.http.get<BudgetCheckDto>(`${this.base}/workflows/ai-budget/check`);
  }
  upsertBudget(data: Partial<AIBudgetDto>): Observable<AIBudgetDto> {
    return this.http.put<AIBudgetDto>(`${this.base}/workflows/ai-budget`, data);
  }

  // ═══ L3: Step Autonomy ═══
  getStepAutonomyScopes(opts?: { workflowId?: string; stepType?: string }): Observable<StepAutonomyDto[]> {
    let params = new HttpParams();
    if (opts?.workflowId) params = params.set('workflowId', opts.workflowId);
    if (opts?.stepType) params = params.set('stepType', opts.stepType);
    return this.http.get<StepAutonomyDto[]>(`${this.base}/workflows/step-autonomy`, { params });
  }
  upsertStepAutonomy(data: Partial<StepAutonomyDto>): Observable<StepAutonomyDto> {
    return this.http.put<StepAutonomyDto>(`${this.base}/workflows/step-autonomy`, data);
  }
  deactivateStepAutonomy(scopeId: string): Observable<{ deactivated: boolean }> {
    return this.http.delete<{ deactivated: boolean }>(`${this.base}/workflows/step-autonomy/${scopeId}`);
  }

  // ═══ L3: Intervention Log ═══
  getInterventionLog(opts?: { type?: string; limit?: number }): Observable<InterventionLogDto[]> {
    let params = new HttpParams();
    if (opts?.type) params = params.set('type', opts.type);
    if (opts?.limit) params = params.set('limit', String(opts.limit));
    return this.http.get<InterventionLogDto[]>(`${this.base}/workflows/interventions`, { params });
  }
  acknowledgeIntervention(interventionId: string): Observable<InterventionLogDto> {
    return this.http.post<InterventionLogDto>(`${this.base}/workflows/interventions/${interventionId}/acknowledge`, {});
  }

  // ═══ Aggregated Health ═══
  getWorkflowHealth(): Observable<WorkflowHealthDto> {
    return this.http.get<WorkflowHealthDto>(`${this.base}/workflows/health`);
  }

  // ═══ Analytics / Reporting ═══
  getAnalytics(days?: number): Observable<WorkflowAnalyticsDto> {
    let params = new HttpParams();
    if (days) params = params.set('days', String(days));
    return this.http.get<WorkflowAnalyticsDto>(`${this.base}/workflows/analytics`, { params });
  }

  // ═══ Execution Trace (L3) ═══
  getExecutionTrace(instanceId: string): Observable<ExecutionTraceDto> {
    return this.http.get<ExecutionTraceDto>(`${this.base}/workflows/${instanceId}/execution-trace`);
  }

  // ═══ Next Best Action ═══
  getNextBestAction(instanceId: string): Observable<NextBestActionDto> {
    return this.http.get<NextBestActionDto>(`${this.base}/workflows/${instanceId}/next-best-action`);
  }

  // ═══ Batch Operations ═══
  batchAction(data: { action: string; ids: string[]; reason?: string; decision?: string }): Observable<BatchResultDto> {
    return this.http.post<BatchResultDto>(`${this.base}/workflows/batch`, data);
  }

  // ═══ Supervisor Control ═══
  supervisorAction(instanceId: string, data: { action: string; reason: string; newStatus?: string; escalateTo?: string }): Observable<SupervisorActionResultDto> {
    return this.http.post<SupervisorActionResultDto>(`${this.base}/workflows/${instanceId}/supervisor-action`, data);
  }

  // ═══ Guardrail Status ═══
  getGuardrailStatus(): Observable<GuardrailStatusDto> {
    return this.http.get<GuardrailStatusDto>(`${this.base}/workflows/guardrail-status`);
  }

  // ═══ Workflow Instances Listing ═══
  getInstances(opts?: { status?: string; definitionId?: string; search?: string; sortBy?: string; sortDir?: string; limit?: number; offset?: number }): Observable<WorkflowInstanceListDto> {
    let params = new HttpParams();
    if (opts?.status) params = params.set('status', opts.status);
    if (opts?.definitionId) params = params.set('definitionId', opts.definitionId);
    if (opts?.search) params = params.set('search', opts.search);
    if (opts?.sortBy) params = params.set('sortBy', opts.sortBy);
    if (opts?.sortDir) params = params.set('sortDir', opts.sortDir);
    if (opts?.limit) params = params.set('limit', String(opts.limit));
    if (opts?.offset) params = params.set('offset', String(opts.offset));
    return this.http.get<WorkflowInstanceListDto>(`${this.base}/workflows/instances`, { params });
  }

  // ═══ SLA Monitoring ═══
  getSLARecords(opts?: { status?: string; limit?: number }): Observable<{ items: SLARecordDto[]; count: number }> {
    let params = new HttpParams();
    if (opts?.status) params = params.set('status', opts.status);
    if (opts?.limit) params = params.set('limit', String(opts.limit));
    return this.http.get<{ items: SLARecordDto[]; count: number }>(`${this.base}/workflows/sla-records`, { params });
  }
  extendSLA(instanceId: string, data: { extensionHours: number; reason: string }): Observable<{ extended: number; records: SLARecordDto[] }> {
    return this.http.post<{ extended: number; records: SLARecordDto[] }>(`${this.base}/workflows/${instanceId}/sla-extend`, data);
  }

  // ═══ Task Reassignment ═══
  reassignTask(instanceId: string, data: { stepId?: string; newAssigneeId: string; reason: string }): Observable<{ reassigned: number; steps: Array<Record<string, unknown>> }> {
    return this.http.post<{ reassigned: number; steps: Array<Record<string, unknown>> }>(`${this.base}/workflows/${instanceId}/reassign`, data);
  }

  // ═══ AI Confidence Analytics ═══
  getAIConfidence(opts?: { days?: number }): Observable<AIConfidenceDto> {
    let params = new HttpParams();
    if (opts?.days) params = params.set('days', String(opts.days));
    return this.http.get<AIConfidenceDto>(`${this.base}/workflows/ai-confidence`, { params });
  }

  // ═══ Agent Tool Policy ═══
  getAgentToolPolicies(opts?: { agentId?: string }): Observable<{ items: AgentToolPolicyDto[]; count: number }> {
    let params = new HttpParams();
    if (opts?.agentId) params = params.set('agentId', opts.agentId);
    return this.http.get<{ items: AgentToolPolicyDto[]; count: number }>(`${this.base}/workflows/agent-tool-policy`, { params });
  }
  upsertAgentToolPolicy(data: Partial<AgentToolPolicyDto>): Observable<AgentToolPolicyDto> {
    return this.http.post<AgentToolPolicyDto>(`${this.base}/workflows/agent-tool-policy`, data);
  }
  deactivateAgentToolPolicy(policyId: string): Observable<{ deactivated: boolean }> {
    return this.http.delete<{ deactivated: boolean }>(`${this.base}/workflows/agent-tool-policy/${policyId}`);
  }

  // ═══ Instance Clone ═══
  cloneInstance(instanceId: string): Observable<Record<string, unknown>> {
    return this.http.post<Record<string, unknown>>(`${this.base}/workflows/${instanceId}/clone`, {});
  }

  // ═══ Approval Chain ═══
  getApprovalChain(instanceId: string): Observable<ApprovalChainDto> {
    return this.http.get<ApprovalChainDto>(`${this.base}/workflows/${instanceId}/approval-chain`);
  }

  // ═══ Notification Dispatch ═══
  dispatchNotification(instanceId: string, data: { recipients: string[]; subject: string; body: string; channel?: string }): Observable<{ dispatched: number; notificationIds: string[] }> {
    return this.http.post<{ dispatched: number; notificationIds: string[] }>(`${this.base}/workflows/${instanceId}/notify`, data);
  }

  // ═══ Data Export ═══
  exportInstance(instanceId: string): Observable<WorkflowExportDto> {
    return this.http.get<WorkflowExportDto>(`${this.base}/workflows/${instanceId}/export`);
  }

  // ═══════════════════════════════════════════════════════════════════
  // ENTERPRISE MODULE INTEGRATION
  // ═══════════════════════════════════════════════════════════════════

  private readonly entBase = `${environment.apiUrl}/workflow-enterprise`;

  // ═══ Module Health ═══
  getModuleHealth(moduleCode: string): Observable<ModuleWorkflowHealthDto> {
    return this.http.get<ModuleWorkflowHealthDto>(`${this.entBase}/workflows/enterprise/modules/${moduleCode}/health`);
  }

  getEnterpriseOverview(): Observable<EnterpriseOverviewDto> {
    return this.http.get<EnterpriseOverviewDto>(`${this.entBase}/workflows/enterprise/overview`);
  }

  // ═══ Module AI Policy ═══
  getModuleAIPolicy(moduleCode: string, workflowId?: string): Observable<ModuleAIPolicyDto> {
    let params = new HttpParams();
    if (workflowId) params = params.set('workflowId', workflowId);
    return this.http.get<ModuleAIPolicyDto>(`${this.entBase}/workflows/enterprise/modules/${moduleCode}/ai-policy`, { params });
  }

  // ═══ Module SLA Config ═══
  getModuleSLAConfig(moduleCode: string): Observable<ModuleSLAConfigDto> {
    return this.http.get<ModuleSLAConfigDto>(`${this.entBase}/workflows/enterprise/modules/${moduleCode}/sla-config`);
  }

  // ═══ Module Recommendations ═══
  getModuleRecommendations(moduleCode: string, stepType?: string): Observable<ModuleRecommendationsDto> {
    let params = new HttpParams();
    if (stepType) params = params.set('stepType', stepType);
    return this.http.get<ModuleRecommendationsDto>(`${this.entBase}/workflows/enterprise/modules/${moduleCode}/recommendations`, { params });
  }

  // ═══ Module Agent Binding ═══
  getModuleAgent(moduleCode: string): Observable<ModuleAgentDto> {
    return this.http.get<ModuleAgentDto>(`${this.entBase}/workflows/enterprise/modules/${moduleCode}/agent`);
  }

  // ═══ AI Gate Check ═══
  runGateCheck(data: GateCheckRequestDto): Observable<AIGateCheckResultDto> {
    return this.http.post<AIGateCheckResultDto>(`${this.entBase}/workflows/enterprise/gate-check`, data);
  }

  // ═══ Module AI Note ═══
  createModuleAINote(data: ModuleAINoteRequestDto): Observable<{ noteId: string; reviewRequired: boolean }> {
    return this.http.post<{ noteId: string; reviewRequired: boolean }>(`${this.entBase}/workflows/enterprise/ai-note`, data);
  }

  // ═══ Module Draft Action ═══
  createModuleDraftAction(data: ModuleDraftRequestDto): Observable<{ draftId: string; status: string }> {
    return this.http.post<{ draftId: string; status: string }>(`${this.entBase}/workflows/enterprise/draft-action`, data);
  }

  // ═══ Cross-Module Chains ═══
  getCrossModuleChains(): Observable<{ chains: CrossModuleChainDto[] }> {
    return this.http.get<{ chains: CrossModuleChainDto[] }>(`${this.entBase}/workflows/enterprise/chains`);
  }

  getCrossModuleChain(chainCode: string): Observable<CrossModuleChainDto> {
    return this.http.get<CrossModuleChainDto>(`${this.entBase}/workflows/enterprise/chains/${chainCode}`);
  }

  getModuleChains(moduleCode: string): Observable<{ moduleCode: string; chains: CrossModuleChainDto[] }> {
    return this.http.get<{ moduleCode: string; chains: CrossModuleChainDto[] }>(`${this.entBase}/workflows/enterprise/modules/${moduleCode}/chains`);
  }

  // ═══ Compensations ═══
  getCompensations(): Observable<{ compensations: Record<string, string> }> {
    return this.http.get<{ compensations: Record<string, string> }>(`${this.entBase}/workflows/enterprise/compensations`);
  }

  // ═══ Agent Bindings ═══
  getAgentBindings(): Observable<{ bindings: Record<string, string[]> }> {
    return this.http.get<{ bindings: Record<string, string[]> }>(`${this.entBase}/workflows/enterprise/agent-bindings`);
  }

  // ═══════════════════════════════════════════════════════════════════
  // MODULE AI ORCHESTRATOR
  // ═══════════════════════════════════════════════════════════════════

  private readonly aiBase = `${environment.apiUrl}/module-ai`;

  getModuleAIStatus(moduleCode: string): Observable<ModuleAIStatusDto> {
    return this.http.get<ModuleAIStatusDto>(`${this.aiBase}/modules/${moduleCode}/ai-status`);
  }

  getModuleAICapabilities(moduleCode: string): Observable<ModuleAICapabilitiesDto> {
    return this.http.get<ModuleAICapabilitiesDto>(`${this.aiBase}/modules/${moduleCode}/ai-capabilities`);
  }

  getAllAICapabilities(): Observable<AllModuleAICapabilitiesDto> {
    return this.http.get<AllModuleAICapabilitiesDto>(`${this.aiBase}/ai-capabilities`);
  }

  preflightAIOperation(data: AIPreflightRequestDto): Observable<AIPreflightResultDto> {
    return this.http.post<AIPreflightResultDto>(`${this.aiBase}/preflight`, data);
  }

  suggestAIAction(data: AISuggestRequestDto): Observable<{ noteId: string; reviewRequired: boolean }> {
    return this.http.post<{ noteId: string; reviewRequired: boolean }>(`${this.aiBase}/suggest`, data);
  }

  createAIModuleNote(data: AIModuleNoteRequestDto): Observable<{ noteId: string; reviewRequired: boolean }> {
    return this.http.post<{ noteId: string; reviewRequired: boolean }>(`${this.aiBase}/note`, data);
  }

  createAIModuleDraft(data: AIModuleDraftRequestDto): Observable<{ draftId: string; status: string }> {
    return this.http.post<{ draftId: string; status: string }>(`${this.aiBase}/draft`, data);
  }
}

// ═══ Enterprise DTOs ═══

export interface ModuleWorkflowHealthDto {
  module: string;
  killSwitchActive: boolean;
  budgetStatus: { allowed: boolean; utilization: number; remaining: number };
  activeBoundaries: number;
  aiEnabled: boolean;
  health: 'healthy' | 'degraded' | 'halted';
}

export interface EnterpriseOverviewDto {
  modules: ModuleWorkflowHealthDto[];
  summary: { totalModules: number; healthy: number; degraded: number; halted: number };
}

export interface ModuleAIPolicyDto {
  aiEnabled: boolean;
  autonomyLevel: number;
  requireHumanReview: boolean;
  source: string;
}

export interface ModuleSLAConfigDto {
  moduleCode: string;
  warningPct: number;
  breachAction: string;
  escalationRoles: string[];
  autoReassignOnBreach: boolean;
}

export interface ModuleRecommendationsDto {
  moduleCode: string;
  stepType: string;
  recommendations: Array<{ type: string; name: string; category: string; requiresReview: boolean }>;
}

export interface ModuleAgentDto {
  moduleCode: string;
  agentId: string | null;
  agentModules: string[];
}

export interface GateCheckRequestDto {
  moduleCode: string;
  stepType: string;
  stepSubType?: string;
  instanceId?: string;
  stepId?: string;
  entityType?: string;
  entityId?: string;
  workflowId?: string;
}

export interface AIGateCheckResultDto {
  allowed: boolean;
  killSwitchBlocked: boolean;
  budgetExhausted: boolean;
  boundaryViolation: boolean;
  autonomyDenied: boolean;
  reviewRequired: boolean;
  reasons: string[];
  maxAutonomyLevel: number;
  allowedActions: string[];
}

export interface ModuleAINoteRequestDto {
  moduleCode: string;
  stepType: string;
  agentId: string;
  noteType: 'guidance' | 'autofill' | 'recommendation' | 'summary' | 'coaching' | 'warning';
  content: Record<string, unknown>;
  confidence?: number;
  trustLevel?: 'assistive' | 'advisory' | 'authoritative';
  contextSources?: string[];
  instanceId?: string;
  stepId?: string;
  entityType?: string;
  entityId?: string;
  workflowId?: string;
}

export interface ModuleDraftRequestDto {
  moduleCode: string;
  stepType: string;
  agentId: string;
  draftType: 'task' | 'email' | 'response' | 'approval' | 'entity_update' | 'escalation';
  title: string;
  draftContent: Record<string, unknown>;
  confidence?: number;
  instanceId?: string;
  stepId?: string;
  entityType?: string;
  entityId?: string;
  workflowId?: string;
}

export interface CrossModuleChainDto {
  chainCode: string;
  name_en: string;
  name_ar: string;
  description: string;
  steps: Array<{ order: number; moduleCode: string; stepType: string; label: string }>;
}

// ═══ Module AI Orchestrator DTOs ═══

export interface ModuleAICapabilitiesDto {
  moduleCode: string;
  aiEnabled: boolean;
  agentId: string | null;
  automationLevel: string | null;
  tier: string;
  maxAutonomyLevel: number;
  supportedOperations: string[];
}

export interface AllModuleAICapabilitiesDto {
  modules: ModuleAICapabilitiesDto[];
  summary: { total: number; aiEnabled: number; fullAutonomy: number; semiAutonomy: number; manual: number };
}

export interface ModuleAIStatusDto {
  health: ModuleWorkflowHealthDto;
  policy: ModuleAIPolicyDto;
  agentId: string | null;
  sla: { warningPct: number; breachAction: string; escalationRoles: string[]; autoReassignOnBreach: boolean };
}

export interface AIPreflightRequestDto {
  moduleCode: string;
  stepType: string;
  entityType: string;
  entityId?: string;
  instanceId?: string;
  workflowId?: string;
}

export interface AIPreflightResultDto {
  allowed: boolean;
  gateResult: AIGateCheckResultDto;
  policy: ModuleAIPolicyDto;
  agentId: string | null;
}

export interface AISuggestRequestDto {
  moduleCode: string;
  stepType: string;
  entityType: string;
  entityId?: string;
  instanceId?: string;
  actionDescription: string;
  confidence: number;
}

export interface AIModuleNoteRequestDto {
  moduleCode: string;
  stepType: string;
  entityType: string;
  entityId?: string;
  instanceId?: string;
  noteType: 'guidance' | 'autofill' | 'recommendation' | 'summary' | 'coaching' | 'warning';
  content: Record<string, unknown>;
  confidence?: number;
  trustLevel?: 'assistive' | 'advisory' | 'authoritative';
}

export interface AIModuleDraftRequestDto {
  moduleCode: string;
  stepType: string;
  entityType: string;
  entityId?: string;
  instanceId?: string;
  draftType: 'task' | 'email' | 'response' | 'approval' | 'entity_update' | 'escalation';
  title: string;
  draftContent: Record<string, unknown>;
  confidence?: number;
}
