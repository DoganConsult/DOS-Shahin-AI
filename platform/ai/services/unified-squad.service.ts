import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class UnifiedSquadService {
  private http = inject(HttpClient);
  private base = '/api/unified-squad';

  // ── Participants ─────────────────────────────────────────────────────────
  getParticipants(filters?: { deploymentMode?: string; role?: string; isAgent?: boolean; status?: string }): Promise<any[]> {
    const params: Record<string, string> = {};
    if (filters?.deploymentMode) params.deploymentMode = filters.deploymentMode;
    if (filters?.role) params.role = filters.role;
    if (filters?.isAgent !== undefined) params.isAgent = String(filters.isAgent);
    if (filters?.status) params.status = filters.status;
    return firstValueFrom(this.http.get<unknown[]>(`${this.base}/participants`, { params }));
  }

  registerParticipant(data: any): Promise<unknown> {
    return firstValueFrom(this.http.post(`${this.base}/participants`, data));
  }

  updateParticipantStatus(userId: string, status: string): Promise<unknown> {
    return firstValueFrom(this.http.put(`${this.base}/participants/${userId}/status`, { status }));
  }

  syncRoster(instanceId: string, roster: unknown[]): Promise<unknown> {
    return firstValueFrom(this.http.post(`${this.base}/sync`, { instanceId, roster }));
  }

  assignTask(taskId: string, assigneeUserId: string): Promise<unknown> {
    return firstValueFrom(this.http.post(`${this.base}/assign`, { taskId, assigneeUserId }));
  }

  // ── Intervention ─────────────────────────────────────────────────────────
  executeIntervention(data: any): Promise<unknown> {
    return firstValueFrom(this.http.post(`${this.base}/intervene`, data));
  }

  getInterventions(filters?: Record<string, string>): Promise<any[]> {
    return firstValueFrom(this.http.get<unknown[]>(`${this.base}/interventions`, { params: filters }));
  }

  initiateHandoff(data: any): Promise<unknown> {
    return firstValueFrom(this.http.post(`${this.base}/handoff`, data));
  }

  // ── ERP ──────────────────────────────────────────────────────────────────
  getERPConnections(): Promise<any[]> {
    return firstValueFrom(this.http.get<unknown[]>(`${this.base}/erp/connections`));
  }

  createERPConnection(data: any): Promise<unknown> {
    return firstValueFrom(this.http.post(`${this.base}/erp/connections`, data));
  }

  updateERPConnection(id: string, data: any): Promise<unknown> {
    return firstValueFrom(this.http.put(`${this.base}/erp/connections/${id}`, data));
  }

  validateERPConnection(id: string): Promise<unknown> {
    return firstValueFrom(this.http.post(`${this.base}/erp/connections/${id}/validate`, {}));
  }

  getFieldMappings(connectionId: string): Promise<any[]> {
    return firstValueFrom(this.http.get<unknown[]>(`${this.base}/erp/connections/${connectionId}/mappings`));
  }

  saveFieldMapping(connectionId: string, mapping: any): Promise<unknown> {
    return firstValueFrom(this.http.post(`${this.base}/erp/connections/${connectionId}/mappings`, mapping));
  }

  triggerERPSync(connectionId: string): Promise<unknown> {
    return firstValueFrom(this.http.post(`${this.base}/erp/connections/${connectionId}/sync`, {}));
  }

  getERPSyncHistory(connectionId: string): Promise<any[]> {
    return firstValueFrom(this.http.get<unknown[]>(`${this.base}/erp/connections/${connectionId}/history`));
  }

  // ── Agents ───────────────────────────────────────────────────────────────
  getAgents(): Promise<any[]> {
    return firstValueFrom(this.http.get<unknown[]>(`${this.base}/agents`));
  }

  seedAgents(): Promise<unknown> {
    return firstValueFrom(this.http.post(`${this.base}/agents/seed`, {}));
  }

  updateAgentStatus(agentId: string, status: string): Promise<unknown> {
    return firstValueFrom(this.http.put(`${this.base}/agents/${agentId}/status`, { status }));
  }

  getAgentMetrics(agentId: string): Promise<any[]> {
    return firstValueFrom(this.http.get<unknown[]>(`${this.base}/agents/${agentId}/metrics`));
  }

  // ── Dashboard & Timeline ─────────────────────────────────────────────────
  getDashboard(): Promise<unknown> {
    return firstValueFrom(this.http.get(`${this.base}/dashboard`));
  }

  getWorkflowTimeline(filters?: { workflowType?: string; status?: string; participantId?: string }): Promise<any[]> {
    const params: Record<string, string> = {};
    if (filters?.workflowType) params.workflowType = filters.workflowType;
    if (filters?.status) params.status = filters.status;
    if (filters?.participantId) params.participantId = filters.participantId;
    return firstValueFrom(this.http.get<unknown[]>(`${this.base}/workflow-timeline`, { params }));
  }

  // ── Agent Monitoring (Tenant Admin only) ─────────────────────────────────────
  getAgentMonitoring(): Promise<{ agents: unknown[]; totalAgents: number; timestamp: string }> {
    return firstValueFrom(this.http.get<{ agents: unknown[]; totalAgents: number; timestamp: string }>(`${this.base}/agents/monitoring`));
  }
}
