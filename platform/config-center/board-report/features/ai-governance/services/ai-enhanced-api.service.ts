import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, map } from 'rxjs';
import { environment } from '@env/environment';
import type {
  DecisionApiRow,
  DecisionsListResponse,
  TraceResponse,
  ExplainabilityResponse,
  ModelConfigItem,
  UsageSummary,
  BudgetStatus,
  CacheStats,
} from '@app/core/models/ai-api.types';
import type {
  EvalSloStatusDto,
  FeedbackSummaryDto,
} from './ai-enhanced-api.types';

// ── Helper: build HttpParams from a flat object, skipping undefined/null values ──
function toParams(obj?: Record<string, unknown>): HttpParams {
  let params = new HttpParams();
  if (!obj) return params;
  for (const [key, value] of Object.entries(obj)) {
    if (value !== undefined && value !== null) {
      params = params.set(key, String(value));
    }
  }
  return params;
}

/**
 * Angular service wrapping all AI Enhanced backend endpoints.
 * Covers: Model Config, Usage & Budget, Prompts, Cache, Streaming Chat,
 *         Traces, Evals, Injection Stats, Memory, Self-Improve,
 *         Bilingual Prompts, Feedback, and Admin.
 */
@Injectable({ providedIn: 'root' })
export class AiEnhancedApiService {
  private readonly http = inject(HttpClient);
  private readonly base = `${environment.apiUrl}/ai-enhanced`;

  // ════════════════════════════════════════════════════════════════════════════
  // Model Config
  // ════════════════════════════════════════════════════════════════════════════

  /** Get all model configurations. */
  getModelConfigs(): Observable<ModelConfigItem[]> {
    return this.http.get<{ configs: ModelConfigItem[] }>(`${this.base}/model-config`).pipe(
      map((r) => r?.configs || [])
    );
  }

  /** Update model configuration for a specific agent. */
  updateModelConfig(agentId: string, data: any): Observable<any> {
    return this.http.put(`${this.base}/model-config/${agentId}`, data);
  }

  // ════════════════════════════════════════════════════════════════════════════
  // Usage & Budget
  // ════════════════════════════════════════════════════════════════════════════

  /** Get usage summary, optionally filtered by number of days. */
  getUsageSummary(days?: number): Observable<UsageSummary> {
    return this.http.get<UsageSummary>(`${this.base}/usage`, { params: toParams({ days }) });
  }

  /** Get current budget status. */
  getBudgetStatus(): Observable<BudgetStatus> {
    return this.http.get<BudgetStatus>(`${this.base}/budget`);
  }

  /** Update budget limits and thresholds. */
  updateBudget(data: {
    monthlyTokenLimit?: number;
    monthlyCostLimit?: number;
    softLimitPct?: number;
    hardLimitAction?: string;
  }): Observable<any> {
    return this.http.put(`${this.base}/budget`, data);
  }

  // ════════════════════════════════════════════════════════════════════════════
  // Prompts
  // ════════════════════════════════════════════════════════════════════════════

  /** List prompt versions for a specific asset. */
  listPromptVersions(assetId: string): Observable<any> {
    return this.http.get(`${this.base}/prompts/${assetId}`);
  }

  /** Create a new prompt version for a specific asset. */
  createPromptVersion(assetId: string, data: {
    systemPrompt?: string;
    template_text?: string;
    description?: string;
  }): Observable<any> {
    return this.http.post(`${this.base}/prompts/${assetId}`, data);
  }

  /** Activate a specific prompt version for an asset. */
  activatePromptVersion(assetId: string, versionId: string): Observable<any> {
    return this.http.post(`${this.base}/prompts/${assetId}/activate/${versionId}`, {});
  }

  // ════════════════════════════════════════════════════════════════════════════
  // Cache
  // ════════════════════════════════════════════════════════════════════════════

  /** Get cache statistics. */
  getCacheStats(): Observable<CacheStats> {
    return this.http.get<CacheStats>(`${this.base}/cache/stats`);
  }

  // ════════════════════════════════════════════════════════════════════════════
  // Streaming Chat
  // ════════════════════════════════════════════════════════════════════════════

  /** Send a streaming chat message. */
  streamChat(message: string, opts?: {
    systemPrompt?: string;
    agentId?: string;
  }): Observable<any> {
    return this.http.post(`${this.base}/stream/chat`, { message, ...opts });
  }

  // ════════════════════════════════════════════════════════════════════════════
  // Traces
  // ════════════════════════════════════════════════════════════════════════════

  /** Get traces with optional filters and pagination. */
  getTraces(params?: {
    agentId?: string;
    runId?: string;
    status?: string;
    limit?: number;
    offset?: number;
  }): Observable<any> {
    return this.http.get(`${this.base}/traces`, { params: toParams(params) });
  }

  /** Get a single trace by run ID (for drill-down). Uses ai-os API. */
  getTraceByRunId(runId: string): Observable<TraceResponse> {
    const base = this.base.replace(/\/ai-enhanced$/, '');
    return this.http.get<TraceResponse>(`${base}/ai-os/runs/${encodeURIComponent(runId)}/trace`);
  }

  /** Get trace statistics, optionally filtered by number of days. */
  getTraceStats(days?: number): Observable<any> {
    return this.http.get(`${this.base}/traces/stats`, { params: toParams({ days }) });
  }

  // ════════════════════════════════════════════════════════════════════════════
  // Evals
  // ════════════════════════════════════════════════════════════════════════════

  /** Get evaluation summary, optionally filtered by agent and days. */
  getEvalSummary(agentId?: string, days?: number): Observable<any> {
    return this.http.get(`${this.base}/evals`, { params: toParams({ agentId, days }) });
  }

  /** Run evaluations with an optional sample size. */
  runEvals(sampleSize?: number): Observable<any> {
    return this.http.post(`${this.base}/evals/run`, {}, { params: toParams({ sampleSize }) });
  }

  /** Get evaluation SLO status, optionally filtered by number of days. */
  getEvalSloStatus(days?: number): Observable<EvalSloStatusDto> {
    return this.http.get<EvalSloStatusDto>(`${this.base}/evals/slo-status`, { params: toParams({ days }) });
  }

  // ════════════════════════════════════════════════════════════════════════════
  // Injection Stats
  // ════════════════════════════════════════════════════════════════════════════

  /** Get injection detection statistics, optionally filtered by number of days. */
  getInjectionStats(days?: number): Observable<any> {
    return this.http.get(`${this.base}/injection/stats`, { params: toParams({ days }) });
  }

  // ════════════════════════════════════════════════════════════════════════════
  // Memory
  // ════════════════════════════════════════════════════════════════════════════

  /** Get memory subsystem health status. */
  getMemoryHealth(): Observable<any> {
    return this.http.get(`${this.base}/memory/health`);
  }

  /** Trigger memory compaction process. */
  runMemoryCompaction(): Observable<any> {
    return this.http.post(`${this.base}/memory/compact`, {});
  }

  /** Get cycle memory IDs with an optional limit. */
  getCycleMemoryIds(limit?: number): Observable<any> {
    return this.http.get(`${this.base}/memory/cycles`, { params: toParams({ limit }) });
  }

  /** Get cycle memory for a specific cycle, optionally filtered by agent. */
  getCycleMemory(cycleId: string, agentId?: string): Observable<any> {
    return this.http.get(`${this.base}/memory/cycles/${cycleId}`, { params: toParams({ agentId }) });
  }

  /** Get shared memory, optionally filtered by agent and limited. */
  getSharedMemory(agentId?: string, limit?: number): Observable<any> {
    return this.http.get(`${this.base}/memory/shared`, { params: toParams({ agentId, limit }) });
  }

  // ════════════════════════════════════════════════════════════════════════════
  // Self-Improve
  // ════════════════════════════════════════════════════════════════════════════

  /** Trigger a self-improvement cycle. */
  runSelfImprovement(): Observable<any> {
    return this.http.post(`${this.base}/self-improve/run`, {});
  }

  // ════════════════════════════════════════════════════════════════════════════
  // Bilingual Prompts
  // ════════════════════════════════════════════════════════════════════════════

  /** Get all bilingual prompt configurations. */
  getBilingualPrompts(): Observable<any> {
    return this.http.get(`${this.base}/prompts/bilingual`);
  }

  // ════════════════════════════════════════════════════════════════════════════
  // Feedback
  // ════════════════════════════════════════════════════════════════════════════

  /** Submit feedback for an agent run. */
  submitFeedback(data: {
    agentId: string;
    runId?: string;
    rating: number;
    comment?: string;
  }): Observable<any> {
    return this.http.post(`${this.base}/feedback`, data);
  }

  /** Get feedback summary, optionally filtered by agent. */
  getFeedbackSummary(agentId?: string): Observable<FeedbackSummaryDto> {
    return this.http.get<FeedbackSummaryDto>(`${this.base}/feedback/summary`, { params: toParams({ agentId }) });
  }

  /** Get feedback-performance correlation, optionally filtered by days. */
  getFeedbackCorrelation(days?: number): Observable<any> {
    return this.http.get(`${this.base}/feedback/correlation`, { params: toParams({ days }) });
  }

  // ════════════════════════════════════════════════════════════════════════════
  // Admin
  // ════════════════════════════════════════════════════════════════════════════

  /** Get AI gateway health status. */
  getGatewayHealth(): Observable<any> {
    return this.http.get(`${this.base}/gateway/health`);
  }

  /** Get guard decision statistics, optionally filtered by number of days. */
  getGuardDecisionStats(days?: number): Observable<any> {
    return this.http.get(`${this.base}/guard-decisions/stats`, { params: toParams({ days }) });
  }

  // ════════════════════════════════════════════════════════════════════════════
  // AI OS decisions (drill-down; uses ai-os API)
  // ════════════════════════════════════════════════════════════════════════════

  /** List decisions with optional filters. */
  getDecisions(params?: {
    agentId?: string;
    entityType?: string;
    limit?: number;
    offset?: number;
  }): Observable<DecisionsListResponse> {
    const base = this.base.replace(/\/ai-enhanced$/, '');
    return this.http.get<DecisionsListResponse>(`${base}/ai-os/decisions`, { params: toParams(params) });
  }

  /** Get a single decision by ID (for drill-down). */
  getDecisionById(decisionId: string): Observable<DecisionApiRow> {
    const base = this.base.replace(/\/ai-enhanced$/, '');
    return this.http.get<DecisionApiRow>(`${base}/ai-os/decisions/${encodeURIComponent(decisionId)}`);
  }

  /** Get explainability chain for a decision (signals, related decisions, reasons). */
  getDecisionExplain(decisionId: string): Observable<ExplainabilityResponse> {
    const base = this.base.replace(/\/ai-enhanced$/, '');
    return this.http.get<ExplainabilityResponse>(
      `${base}/ai-os/decisions/${encodeURIComponent(decisionId)}/explain`
    );
  }
}
