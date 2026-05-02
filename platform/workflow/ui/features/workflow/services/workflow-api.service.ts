import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '@env/environment';
import type {
  WorkflowDiagnosticsContract,
  WorkflowDefinitionContract,
  SlaStatusContract,
  SlaMetrics,
  EscalationRecord,
  ExecutionHistoryContract,
  WorkflowVersionContract,
  VersionRolloutResult,
  TransitionRule,
} from '../contracts/workflow.contracts';

// ── DTOs ──

export interface WorkflowDto {
  id: string;
  name: string;
  status: string;
  description?: string;
}

export interface WorkflowAnalyticsDto {
  executionCount: number;
  avgDuration: number;
  successRate: number;
  recentExecutions: Array<{ id: string; status: string; duration: number }>;
}

export interface AutomationRuleDto {
  id: string;
  name: string;
  module?: string;
  trigger: string;
  condition: string;
  action: string;
  enabled: boolean;
}

export interface AutomationLogEntryDto {
  id: string;
  ruleId: string;
  module?: string;
  status: string;
  executedAt: string;
}

export interface WorkflowTemplateDto {
  id: string;
  name: string;
  description?: string;
  steps: Array<{ id: string; type: string; name: string }>;
}

@Injectable({ providedIn: 'root' })
export class WorkflowApiService {
  private http = inject(HttpClient);
  private base = environment.apiUrl;

  // ═══ Workflows ═══
  getWorkflows(): Observable<WorkflowDto[]> {
    return this.http.get<WorkflowDto[]>(`${this.base}/workflows`);
  }

  createWorkflow(data: Partial<WorkflowDto>): Observable<WorkflowDto> {
    return this.http.post<WorkflowDto>(`${this.base}/workflows`, data);
  }

  executeWorkflow(id: string, data: Record<string, unknown>): Observable<{ executionId: string; status: string }> {
    return this.http.post<{ executionId: string; status: string }>(`${this.base}/workflows/${id}/execute`, data);
  }

  simulateWorkflow(id: string, testData?: Record<string, any>): Observable<{ result: unknown }> {
    return this.http.post<{ result: unknown }>(`${this.base}/workflows/${id}/simulate`, { testData: testData || {} });
  }

  resumeWorkflow(id: string, executionId: string): Observable<{ message: string }> {
    return this.http.post<{ message: string }>(`${this.base}/workflows/${id}/resume`, { executionId });
  }

  updateWorkflowStatus(id: string, status: string): Observable<{ message: string }> {
    return this.http.put<{ message: string }>(`${this.base}/workflows/${id}/status`, { status });
  }

  getWorkflowAnalytics(id: string): Observable<WorkflowAnalyticsDto> {
    return this.http.get<WorkflowAnalyticsDto>(`${this.base}/workflows/${id}/analytics`);
  }

  // ═══ Automation Rules ═══
  getAutomationRules(module?: string): Observable<AutomationRuleDto[]> {
    const qs = module ? `?module=${module}` : '';
    return this.http.get<AutomationRuleDto[]>(`${this.base}/automation/rules${qs}`);
  }

  createAutomationRule(data: Partial<AutomationRuleDto>): Observable<AutomationRuleDto> {
    return this.http.post<AutomationRuleDto>(`${this.base}/automation/rules`, data);
  }

  updateAutomationRule(id: string, data: Partial<AutomationRuleDto>): Observable<AutomationRuleDto> {
    return this.http.put<AutomationRuleDto>(`${this.base}/automation/rules/${id}`, data);
  }

  deleteAutomationRule(id: string): Observable<{ message: string }> {
    return this.http.delete<{ message: string }>(`${this.base}/automation/rules/${id}`);
  }

  getAutomationLog(opts?: { module?: string; limit?: number; offset?: number }): Observable<AutomationLogEntryDto[]> {
    const parts: string[] = [];
    if (opts?.module) parts.push(`module=${opts.module}`);
    if (opts?.limit) parts.push(`limit=${opts.limit}`);
    if (opts?.offset) parts.push(`offset=${opts.offset}`);
    const qs = parts.length ? '?' + parts.join('&') : '';
    return this.http.get<AutomationLogEntryDto[]>(`${this.base}/automation/log${qs}`);
  }

  seedAutomationRules(): Observable<{ message: string }> {
    return this.http.post<{ message: string }>(`${this.base}/automation/seed`, {});
  }

  // ═══ Workflow Templates ═══
  getWorkflowTemplates(): Observable<WorkflowTemplateDto[]> {
    return this.http.get<WorkflowTemplateDto[]>(`${this.base}/workflow-templates`);
  }

  instantiateWorkflowFromTemplate(data: { templateId: string; name?: string }): Observable<WorkflowDto> {
    return this.http.post<WorkflowDto>(`${this.base}/workflow-templates/instantiate`, data);
  }

  seedWorkflowTemplates(): Observable<{ message: string }> {
    return this.http.post<{ message: string }>(`${this.base}/workflows/templates/seed`, {});
  }

  // ═══ Workflow Executions ═══
  getExecutions(opts?: { limit?: number }): Observable<{ executions: Array<{ id: string; status: string; workflowId: string; startedAt: string; completedAt?: string }> }> {
    const qs = opts?.limit ? `?limit=${opts.limit}` : '?limit=20';
    return this.http.get<{ executions: Array<{ id: string; status: string; workflowId: string; startedAt: string; completedAt?: string }> }>(`${this.base}/workflow-executions${qs}`);
  }

  // ═══ Workflow Extended ═══
  getWorkflowExtTemplates(): Observable<WorkflowTemplateDto[]> {
    return this.http.get<WorkflowTemplateDto[]>(`${this.base}/workflow-ext/workflow-templates`);
  }

  instantiateWorkflowTemplate(data: { templateId: string; name?: string }): Observable<WorkflowDto> {
    return this.http.post<WorkflowDto>(`${this.base}/workflow-ext/instantiate`, data);
  }

  // ═══ Admin & Diagnostics ═══
  getHealth(): Observable<{ healthy: boolean; checks: any[] }> {
    return this.http.get<{ healthy: boolean; checks: any[] }>(`${this.base}/workflow/admin/health`);
  }

  getDiagnostics(): Observable<WorkflowDiagnosticsContract> {
    return this.http.get<WorkflowDiagnosticsContract>(`${this.base}/workflow/diagnostics`);
  }

  getAdminSettings(): Observable<{ success: boolean; data: any[] }> {
    return this.http.get<{ success: boolean; data: any[] }>(`${this.base}/workflow/admin/settings`);
  }

  // ═══ Definition Registry (MP-02 §3.1) ═══
  getDefinitions(opts?: { moduleCode?: string; status?: string; page?: number; pageSize?: number }): Observable<{ definitions: WorkflowDefinitionContract[]; total: number }> {
    const parts: string[] = [];
    if (opts?.moduleCode) parts.push(`moduleCode=${opts.moduleCode}`);
    if (opts?.status) parts.push(`status=${opts.status}`);
    if (opts?.page) parts.push(`page=${opts.page}`);
    if (opts?.pageSize) parts.push(`pageSize=${opts.pageSize}`);
    const qs = parts.length ? '?' + parts.join('&') : '';
    return this.http.get<{ definitions: WorkflowDefinitionContract[]; total: number }>(`${this.base}/workflow/definitions${qs}`);
  }

  getDefinitionById(id: string): Observable<WorkflowDefinitionContract> {
    return this.http.get<WorkflowDefinitionContract>(`${this.base}/workflow/definitions/${id}`);
  }

  getTransitionRules(definitionId: string): Observable<TransitionRule[]> {
    return this.http.get<TransitionRule[]>(`${this.base}/workflow/definitions/${definitionId}/transitions`);
  }

  validateDefinitionGraph(definitionId: string): Observable<{ valid: boolean; errors: string[] }> {
    return this.http.get<{ valid: boolean; errors: string[] }>(`${this.base}/workflow/definitions/${definitionId}/validate`);
  }

  // ═══ SLA (MP-02 §3.1) ═══
  getSlaStatus(instanceId: string): Observable<SlaStatusContract[]> {
    return this.http.get<SlaStatusContract[]>(`${this.base}/workflow/executions/${instanceId}/sla`);
  }

  getSlaMetrics(): Observable<SlaMetrics> {
    return this.http.get<SlaMetrics>(`${this.base}/workflow/sla/metrics`);
  }

  getBreachedTimers(): Observable<{ timers: unknown[] }> {
    return this.http.get<{ timers: unknown[] }>(`${this.base}/workflow/sla/breached`);
  }

  // ═══ Escalation (MP-02 §3.1) ═══
  getEscalations(instanceId: string): Observable<EscalationRecord[]> {
    return this.http.get<EscalationRecord[]>(`${this.base}/workflow/executions/${instanceId}/escalations`);
  }

  getPendingEscalations(): Observable<EscalationRecord[]> {
    return this.http.get<EscalationRecord[]>(`${this.base}/workflow/escalations/pending`);
  }

  escalateStep(instanceId: string, stepId: string, reason: string): Observable<EscalationRecord> {
    return this.http.post<EscalationRecord>(`${this.base}/workflow/executions/${instanceId}/escalate`, { stepId, reason });
  }

  resolveEscalation(escalationId: string, resolution: 'acknowledged' | 'resolved', notes?: string): Observable<EscalationRecord> {
    return this.http.put<EscalationRecord>(`${this.base}/workflow/escalations/${escalationId}/resolve`, { resolution, notes });
  }

  // ═══ Execution Audit (MP-02 §3.1) ═══
  getExecutionHistory(instanceId: string, opts?: { limit?: number; offset?: number }): Observable<ExecutionHistoryContract> {
    const parts: string[] = [];
    if (opts?.limit) parts.push(`limit=${opts.limit}`);
    if (opts?.offset) parts.push(`offset=${opts.offset}`);
    const qs = parts.length ? '?' + parts.join('&') : '';
    return this.http.get<ExecutionHistoryContract>(`${this.base}/workflow/executions/${instanceId}/history${qs}`);
  }

  // ═══ Version Rollout Admin (MP-02 §3.1) ═══
  getVersionHistory(code: string): Observable<WorkflowVersionContract[]> {
    return this.http.get<WorkflowVersionContract[]>(`${this.base}/workflow/versions/${code}`);
  }

  promoteVersion(definitionId: string, notes?: string): Observable<WorkflowVersionContract> {
    return this.http.post<WorkflowVersionContract>(`${this.base}/workflow/versions/${definitionId}/promote`, { notes });
  }

  deprecateVersion(definitionId: string, notes?: string): Observable<WorkflowVersionContract> {
    return this.http.post<WorkflowVersionContract>(`${this.base}/workflow/versions/${definitionId}/deprecate`, { notes });
  }

  rolloutVersion(definitionId: string, targetVersion: number, migrateActive: boolean, notes?: string): Observable<VersionRolloutResult> {
    return this.http.post<VersionRolloutResult>(`${this.base}/workflow/versions/${definitionId}/rollout`, { targetVersion, migrateActiveInstances: migrateActive, notes });
  }
}
