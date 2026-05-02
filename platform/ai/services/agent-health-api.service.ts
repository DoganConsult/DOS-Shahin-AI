/**
 * Agent Health API Service — AGRC-OS
 * Frontend service for consuming /api/agents/health endpoints.
 * Provides typed access to agent health dashboard, learning curves, lessons, tasks, and metrics.
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

// ── DTOs ──

export interface AgentHealthDashboardDto {
  agents: AgentHealthStatusDto[];
  summary: {
    totalAgents: number;
    healthyCount: number;
    warningCount: number;
    criticalCount: number;
  };
}

export interface AgentHealthStatusDto {
  agentId: string;
  status: 'healthy' | 'warning' | 'critical' | 'unknown';
  lastRunAt?: string;
  successRate: number;
  avgDurationMs: number;
  taskCount: number;
  errorCount: number;
}

export interface LearningCurvePointDto {
  period: string;
  value: number;
}

export interface LearningProfileDto {
  agentId: string;
  currentLevel: string;
  improvementRate: number;
  strengths: string[];
  weaknesses: string[];
  recommendations: string[];
}

export interface AgentLessonDto {
  id: string;
  category: string;
  content: string;
  verified: boolean;
  importance: number;
  createdAt: string;
}

export interface AgentTaskDto {
  id: string;
  status: string;
  type: string;
  description: string;
  createdAt: string;
  completedAt?: string;
  durationMs?: number;
}

export interface AgentTaskMetricsDto {
  totalTasks: number;
  completedTasks: number;
  failedTasks: number;
  successRate: number;
  avgDurationMs: number;
}

@Injectable({ providedIn: 'root' })
export class AgentHealthApiService {
  private http = inject(HttpClient);
  private base = `${environment.apiUrl}/agents/health`;

  /** GET /api/agents/health/dashboard — all agents overview */
  getDashboard(days = 30): Observable<ApiResponse<AgentHealthDashboardDto>> {
    const params = new HttpParams().set('days', days.toString());
    return this.http.get<ApiResponse<AgentHealthDashboardDto>>(`${this.base}/dashboard`, { params });
  }

  /** GET /api/agents/health/:agentId — single agent health */
  getAgentHealth(agentId: string): Observable<ApiResponse<AgentHealthStatusDto>> {
    return this.http.get<ApiResponse<AgentHealthStatusDto>>(`${this.base}/${agentId}`);
  }

  /** GET /api/agents/health/:agentId/learning-curve */
  getLearningCurve(
    agentId: string,
    period: 'day' | 'week' | 'month' = 'week',
    metric: 'success_rate' | 'verification_rate' | 'average_duration' | 'task_count' = 'success_rate',
  ): Observable<ApiResponse<LearningCurvePointDto[]>> {
    const params = new HttpParams().set('period', period).set('metric', metric);
    return this.http.get<ApiResponse<LearningCurvePointDto[]>>(`${this.base}/${agentId}/learning-curve`, { params });
  }

  /** GET /api/agents/health/:agentId/learning-profile */
  getLearningProfile(agentId: string): Observable<ApiResponse<LearningProfileDto>> {
    return this.http.get<ApiResponse<LearningProfileDto>>(`${this.base}/${agentId}/learning-profile`);
  }

  /** GET /api/agents/health/:agentId/lessons */
  getLessons(
    agentId: string,
    opts?: { category?: string; verified?: boolean; limit?: number },
  ): Observable<ApiResponse<AgentLessonDto[]>> {
    let params = new HttpParams();
    if (opts?.category) params = params.set('category', opts.category);
    if (opts?.verified !== undefined) params = params.set('verified', String(opts.verified));
    if (opts?.limit) params = params.set('limit', opts.limit.toString());
    return this.http.get<ApiResponse<AgentLessonDto[]>>(`${this.base}/${agentId}/lessons`, { params });
  }

  /** GET /api/agents/health/:agentId/lessons/relevant */
  getRelevantLessons(
    agentId: string,
    scenario: string,
    limit = 5,
  ): Observable<ApiResponse<AgentLessonDto[]>> {
    const params = new HttpParams().set('scenario', scenario).set('limit', limit.toString());
    return this.http.get<ApiResponse<AgentLessonDto[]>>(`${this.base}/${agentId}/lessons/relevant`, { params });
  }

  /** GET /api/agents/health/:agentId/tasks */
  getTasks(
    agentId: string,
    opts?: { status?: string; limit?: number; offset?: number },
  ): Observable<ApiResponse<{ tasks: AgentTaskDto[]; total: number }>> {
    let params = new HttpParams();
    if (opts?.status) params = params.set('status', opts.status);
    if (opts?.limit) params = params.set('limit', opts.limit.toString());
    if (opts?.offset) params = params.set('offset', opts.offset.toString());
    return this.http.get<ApiResponse<{ tasks: AgentTaskDto[]; total: number }>>(`${this.base}/${agentId}/tasks`, { params });
  }

  /** GET /api/agents/health/:agentId/metrics */
  getMetrics(agentId: string, days = 30): Observable<ApiResponse<AgentTaskMetricsDto>> {
    const params = new HttpParams().set('days', days.toString());
    return this.http.get<ApiResponse<AgentTaskMetricsDto>>(`${this.base}/${agentId}/metrics`, { params });
  }
}
