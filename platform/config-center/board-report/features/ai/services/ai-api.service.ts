import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '@env/environment';

export interface AgentDto {
  agent_id: string;
  name: string;
  code: string;
  status: string;
  model: string;
  autonomy_level: number;
  created_at: string;
}

export interface ProcessDto {
  pid: string;
  agent_id: string;
  status: string;
  started_at: string;
  cpu_percent: number;
  memory_mb: number;
}

export interface KernelStatusDto {
  uptime_seconds: number;
  total_agents: number;
  active_agents: number;
  total_processes: number;
}

export interface AlertDto {
  alert_id: string;
  severity: string;
  message: string;
  agent_id: string;
  acknowledged: boolean;
  created_at: string;
}

export interface TokenUsageDto {
  total_tokens: number;
  prompt_tokens: number;
  completion_tokens: number;
  cost_usd: number;
  period: string;
}

export interface HealthStatusDto {
  agent_id: string;
  status: string;
  latency_ms: number;
  error_rate: number;
  last_heartbeat: string;
}

@Injectable({ providedIn: 'root' })
export class AiApiService {
  private http = inject(HttpClient);
  private base = environment.apiUrl;

  getProcessTable(): Observable<ProcessDto[]> {
    return this.http.get<ProcessDto[]>(`${this.base}/ai/kernel/processes`);
  }

  getKernelStatus(): Observable<KernelStatusDto> {
    return this.http.get<KernelStatusDto>(`${this.base}/ai/kernel/status`);
  }

  getSchedulerTable(): Observable<Record<string, unknown>[]> {
    return this.http.get<Record<string, unknown>[]>(`${this.base}/ai/kernel/scheduler`);
  }

  getKernelLog(limit = 100): Observable<Record<string, unknown>[]> {
    return this.http.get<Record<string, unknown>[]>(`${this.base}/ai/kernel/log`, { params: { limit } });
  }

  killProcess(runId: string): Observable<{ killed: boolean }> {
    return this.http.delete<{ killed: boolean }>(`${this.base}/ai/kernel/processes/${runId}`);
  }

  rebootAgent(agentId: string): Observable<Record<string, unknown>> {
    return this.http.post<Record<string, unknown>>(`${this.base}/ai/agents/${agentId}/reboot`, {});
  }

  adjustAutonomy(agentId: string, level: number): Observable<Record<string, unknown>> {
    return this.http.patch<Record<string, unknown>>(`${this.base}/ai/agents/${agentId}/autonomy`, { level });
  }

  getTokenUsage(): Observable<TokenUsageDto> {
    return this.http.get<TokenUsageDto>(`${this.base}/ai/kernel/tokens`);
  }

  setGlobalAutonomy(level: number): Observable<Record<string, unknown>> {
    return this.http.post<Record<string, unknown>>(`${this.base}/ai/kernel/autonomy`, { level });
  }

  getAgentDetail(agentId: string): Observable<AgentDto> {
    return this.http.get<AgentDto>(`${this.base}/ai/agents/${agentId}`);
  }

  pauseAgent(agentId: string): Observable<{ paused: boolean }> {
    return this.http.post<{ paused: boolean }>(`${this.base}/ai/agents/${agentId}/pause`, {});
  }

  resumeAgent(agentId: string): Observable<{ resumed: boolean }> {
    return this.http.post<{ resumed: boolean }>(`${this.base}/ai/agents/${agentId}/resume`, {});
  }

  getKernelHealth(): Observable<Record<string, unknown>> {
    return this.http.get<Record<string, unknown>>(`${this.base}/ai/kernel/health`);
  }

  saveSnapshot(): Observable<{ snapshotId: string }> {
    return this.http.post<{ snapshotId: string }>(`${this.base}/ai/kernel/snapshots`, {});
  }

  listSnapshots(limit = 20): Observable<Record<string, unknown>[]> {
    return this.http.get<Record<string, unknown>[]>(`${this.base}/ai/kernel/snapshots`, { params: { limit } });
  }

  getHealthDashboard(): Observable<HealthStatusDto[]> {
    return this.http.get<HealthStatusDto[]>(`${this.base}/ai/health/dashboard`);
  }

  getActiveAlerts(severity?: string): Observable<AlertDto[]> {
    const params: Record<string, string> = {};
    if (severity) params['severity'] = severity;
    return this.http.get<AlertDto[]>(`${this.base}/ai/alerts`, { params });
  }

  acknowledgeAlert(alertId: string): Observable<Record<string, unknown>> {
    return this.http.post<Record<string, unknown>>(`${this.base}/ai/alerts/${alertId}/acknowledge`, {});
  }

  getActivityFeed(): Observable<Record<string, unknown>[]> {
    return this.http.get<Record<string, unknown>[]>(`${this.base}/ai/activity/feed`);
  }

  getPerformanceStats(): Observable<Record<string, unknown>> {
    return this.http.get<Record<string, unknown>>(`${this.base}/ai/activity/stats`);
  }

  getRbacAnalysis(): Observable<Record<string, unknown>> {
    return this.http.get<Record<string, unknown>>(`${this.base}/ai/rbac/analysis`);
  }

  getAgentAssignments(): Observable<Record<string, unknown>[]> {
    return this.http.get<Record<string, unknown>[]>(`${this.base}/ai/assignments`);
  }
}
