/**
 * Agent Audit API Service — AGRC-OS
 * Frontend service for consuming /api/agents/audit endpoints.
 * Provides typed access to agent audit history, actions, tool calls, decisions, handoffs, and memory.
 */

import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '@env/environment';

// ── Response wrapper ──

export interface ApiResponse<T> {
  success: boolean;
  data: T;
  error?: string;
}

// ── Pagination ──

export interface PaginatedResult<T> {
  total: number;
  limit: number;
  offset: number;
  [key: string]: T[] | number;
}

// ── DTOs ──

export interface AuditEntryDto {
  entryId: string;
  timestamp: string;
  agentId?: string;
  module: string;
  action: string;
  entityType?: string;
  entityId?: string;
  beforeState?: Record<string, unknown>;
  afterState?: Record<string, unknown>;
  entryHash?: string;
}

export interface AgentActionDto {
  entryId: string;
  timestamp: string;
  actionType: 'proposed' | 'executed' | 'verified';
  action: string;
  entityType?: string;
  entityId?: string;
  payload?: Record<string, unknown>;
  result?: Record<string, unknown>;
  error?: string;
  verificationResult?: Record<string, unknown>;
  evidence?: Record<string, unknown>;
  runId?: string;
}

export interface AgentPredictionDto {
  entryId: string;
  timestamp: string;
  signalType: string;
  predictedValue: unknown;
  confidence: number;
  actualValue?: unknown;
  accuracy?: number;
  runId?: string;
}

export interface AgentToolCallDto {
  entryId: string;
  timestamp: string;
  toolName: string;
  params?: Record<string, unknown>;
  result?: unknown;
  durationMs?: number;
  error?: string;
  runId?: string;
  langsmithRunId?: string;
}

export interface AgentDecisionDto {
  entryId: string;
  timestamp: string;
  reasoning: string;
  alternativesConsidered?: string[];
  chosenAction: string;
  confidence: number;
  runId?: string;
  langsmithRunId?: string;
}

export interface AgentHandoffDto {
  entryId: string;
  timestamp: string;
  direction: 'sent' | 'received';
  toAgent?: string;
  fromAgent?: string;
  payload?: Record<string, unknown>;
  processed?: boolean;
  result?: Record<string, unknown>;
  runId?: string;
}

export interface AgentMemoryEntryDto {
  entryId: string;
  timestamp: string;
  memoryType: 'fact' | 'pattern' | 'lesson' | 'preference';
  content: string;
  importance: number;
  relatedEntityType?: string;
  relatedEntityId?: string;
  runId?: string;
}

export interface RunAuditDto {
  runId: string;
  entries: AuditEntryDto[];
  total: number;
}

// ── Date range filter ──

interface DateRangeFilter {
  startDate?: string;
  endDate?: string;
  limit?: number;
  offset?: number;
}

@Injectable({ providedIn: 'root' })
export class AgentAuditApiService {
  private http = inject(HttpClient);
  private base = `${environment.apiUrl}/agents/audit`;

  /** GET /api/agents/audit/history — audit log for all agents */
  getHistory(opts?: DateRangeFilter & { agentId?: string; action?: string }): Observable<ApiResponse<PaginatedResult<AuditEntryDto>>> {
    let params = new HttpParams();
    if (opts?.agentId) params = params.set('agentId', opts.agentId);
    if (opts?.action) params = params.set('action', opts.action);
    if (opts?.startDate) params = params.set('startDate', opts.startDate);
    if (opts?.endDate) params = params.set('endDate', opts.endDate);
    if (opts?.limit) params = params.set('limit', opts.limit.toString());
    if (opts?.offset) params = params.set('offset', opts.offset.toString());
    return this.http.get<ApiResponse<PaginatedResult<AuditEntryDto>>>(`${this.base}/history`, { params });
  }

  /** GET /api/agents/audit/run/:runId — all entries for a single run */
  getRunDetail(runId: string): Observable<ApiResponse<RunAuditDto>> {
    return this.http.get<ApiResponse<RunAuditDto>>(`${this.base}/run/${runId}`);
  }

  /** GET /api/agents/audit/:agentId/actions */
  getAgentActions(
    agentId: string,
    opts?: DateRangeFilter & { actionType?: 'proposed' | 'executed' | 'verified' },
  ): Observable<ApiResponse<PaginatedResult<AgentActionDto>>> {
    let params = this.buildDateParams(opts);
    if (opts?.actionType) params = params.set('actionType', opts.actionType);
    return this.http.get<ApiResponse<PaginatedResult<AgentActionDto>>>(`${this.base}/${agentId}/actions`, { params });
  }

  /** GET /api/agents/audit/:agentId/predictions */
  getPredictions(agentId: string, opts?: DateRangeFilter): Observable<ApiResponse<PaginatedResult<AgentPredictionDto>>> {
    return this.http.get<ApiResponse<PaginatedResult<AgentPredictionDto>>>(`${this.base}/${agentId}/predictions`, { params: this.buildDateParams(opts) });
  }

  /** GET /api/agents/audit/:agentId/tool-calls */
  getToolCalls(
    agentId: string,
    opts?: DateRangeFilter & { toolName?: string },
  ): Observable<ApiResponse<PaginatedResult<AgentToolCallDto>>> {
    let params = this.buildDateParams(opts);
    if (opts?.toolName) params = params.set('toolName', opts.toolName);
    return this.http.get<ApiResponse<PaginatedResult<AgentToolCallDto>>>(`${this.base}/${agentId}/tool-calls`, { params });
  }

  /** GET /api/agents/audit/:agentId/decisions */
  getDecisions(agentId: string, opts?: DateRangeFilter): Observable<ApiResponse<PaginatedResult<AgentDecisionDto>>> {
    return this.http.get<ApiResponse<PaginatedResult<AgentDecisionDto>>>(`${this.base}/${agentId}/decisions`, { params: this.buildDateParams(opts) });
  }

  /** GET /api/agents/audit/:agentId/handoffs */
  getHandoffs(
    agentId: string,
    opts?: DateRangeFilter & { direction?: 'sent' | 'received' },
  ): Observable<ApiResponse<PaginatedResult<AgentHandoffDto>>> {
    let params = this.buildDateParams(opts);
    if (opts?.direction) params = params.set('direction', opts.direction);
    return this.http.get<ApiResponse<PaginatedResult<AgentHandoffDto>>>(`${this.base}/${agentId}/handoffs`, { params });
  }

  /** GET /api/agents/audit/:agentId/memory */
  getMemory(
    agentId: string,
    opts?: DateRangeFilter & { memoryType?: 'fact' | 'pattern' | 'lesson' | 'preference' },
  ): Observable<ApiResponse<PaginatedResult<AgentMemoryEntryDto>>> {
    let params = this.buildDateParams(opts);
    if (opts?.memoryType) params = params.set('memoryType', opts.memoryType);
    return this.http.get<ApiResponse<PaginatedResult<AgentMemoryEntryDto>>>(`${this.base}/${agentId}/memory`, { params });
  }

  // ── Helper ──

  private buildDateParams(opts?: DateRangeFilter): HttpParams {
    let params = new HttpParams();
    if (opts?.startDate) params = params.set('startDate', opts.startDate);
    if (opts?.endDate) params = params.set('endDate', opts.endDate);
    if (opts?.limit) params = params.set('limit', opts.limit.toString());
    if (opts?.offset) params = params.set('offset', opts.offset.toString());
    return params;
  }
}
