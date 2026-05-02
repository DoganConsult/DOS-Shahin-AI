import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '@env/environment';

export interface IncidentDto {
  id: string;
  title: string;
  description?: string;
  severity: string;
  status: string;
  reportedBy?: string;
  reportedAt?: string;
  category?: string;
}

export interface CreateIncidentRequest {
  title: string;
  description?: string;
  severity: string;
  category?: string;
}

export interface InvestigateIncidentRequest {
  findings?: string;
  rootCause?: string;
  status?: string;
  assignedTo?: string;
}

export interface GovernancePipeline {
  slaBreaches: Record<string, unknown>[];
  pendingActions: Record<string, unknown>[];
  rootCauses: Record<string, unknown>[];
  severityCounts: Record<string, number>;
  slaConfig: Record<string, number>;
  counts: { breached: number; pendingActions: number; rootCauses: number };
}

@Injectable({ providedIn: 'root' })
export class IncidentApiService {
  private http = inject(HttpClient);
  private base = environment.apiUrl;

  getIncidents(filters?: { status?: string; severity?: string; category?: string }): Observable<{ incidents: IncidentDto[]; count: number }> {
    const params: Record<string, string> = {};
    if (filters?.status) params['status'] = filters.status;
    if (filters?.severity) params['severity'] = filters.severity;
    if (filters?.category) params['category'] = filters.category;
    return this.http.get<{ incidents: IncidentDto[]; count: number }>(`${this.base}/incidents`, { params });
  }

  getIncidentById(id: string): Observable<IncidentDto> {
    return this.http.get<IncidentDto>(`${this.base}/incidents/${id}`);
  }

  reportIncident(data: CreateIncidentRequest): Observable<IncidentDto> {
    return this.http.post<IncidentDto>(`${this.base}/incidents`, data);
  }

  updateIncident(id: string, data: Partial<IncidentDto>): Observable<IncidentDto> {
    return this.http.put<IncidentDto>(`${this.base}/incidents/${id}`, data);
  }

  investigateIncident(id: string, data: InvestigateIncidentRequest): Observable<IncidentDto> {
    return this.http.put<IncidentDto>(`${this.base}/incidents/${id}/investigate`, data);
  }

  updateIncidentStatus(id: string, status: string): Observable<IncidentDto> {
    return this.http.put<IncidentDto>(`${this.base}/incidents/${id}/status`, { status });
  }

  recordLessonsLearned(id: string, data: Record<string, unknown>): Observable<Record<string, unknown>> {
    return this.http.post<any>(`${this.base}/incidents/${id}/lessons-learned`, data);
  }

  getGovernancePipeline(): Observable<GovernancePipeline> {
    return this.http.get<GovernancePipeline>(`${this.base}/incidents/governance-pipeline`);
  }

  getIncidentUpdates(id: string): Observable<{ updates: Record<string, unknown>[]; count: number }> {
    return this.http.get<any>(`${this.base}/incidents/${id}/updates`);
  }

  getResponseActions(id: string): Observable<{ actions: Record<string, unknown>[]; count: number }> {
    return this.http.get<any>(`${this.base}/incidents/${id}/actions`);
  }

  createResponseAction(id: string, data: Record<string, unknown>): Observable<Record<string, unknown>> {
    return this.http.post<any>(`${this.base}/incidents/${id}/actions`, data);
  }

  updateResponseAction(incidentId: string, actionId: string, data: Record<string, unknown>): Observable<Record<string, unknown>> {
    return this.http.put<any>(`${this.base}/incidents/${incidentId}/actions/${actionId}`, data);
  }

  getRootCauses(id: string): Observable<{ rootCauses: Record<string, unknown>[]; count: number }> {
    return this.http.get<any>(`${this.base}/incidents/${id}/root-causes`);
  }

  createRootCause(id: string, data: Record<string, unknown>): Observable<Record<string, unknown>> {
    return this.http.post<any>(`${this.base}/incidents/${id}/root-causes`, data);
  }

  getTaxonomy(parentId?: string): Observable<Record<string, unknown>[]> {
    const params = parentId ? { parent_id: parentId } : {};
    return this.http.get<any[]>(`${this.base}/incidents-advanced/taxonomy`, { params });
  }

  createTaxonomyNode(data: Record<string, unknown>): Observable<Record<string, unknown>> {
    return this.http.post<any>(`${this.base}/incidents-advanced/taxonomy`, data);
  }

  updateTaxonomyNode(nodeId: string, data: Record<string, unknown>): Observable<Record<string, unknown>> {
    return this.http.put<any>(`${this.base}/incidents-advanced/taxonomy/${nodeId}`, data);
  }

  getNearMisses(filters?: { status?: string; severity?: string }): Observable<Record<string, unknown>[]> {
    const params: Record<string, string> = {};
    if (filters?.status) params['status'] = filters.status;
    if (filters?.severity) params['severity'] = filters.severity;
    return this.http.get<any[]>(`${this.base}/incidents-advanced/near-miss`, { params });
  }

  reportNearMiss(data: Record<string, unknown>): Observable<Record<string, unknown>> {
    return this.http.post<any>(`${this.base}/incidents-advanced/near-miss`, data);
  }

  convertNearMissToIncident(nearMissId: string): Observable<IncidentDto> {
    return this.http.post<any>(`${this.base}/incidents-advanced/near-miss/${nearMissId}/convert`, {});
  }

  createPIR(data: Record<string, unknown>): Observable<Record<string, unknown>> {
    return this.http.post<any>(`${this.base}/incidents-advanced/pir`, data);
  }

  getPIRs(incidentId?: string): Observable<Record<string, unknown>[]> {
    const params = incidentId ? { incident_id: incidentId } : {};
    return this.http.get<any[]>(`${this.base}/incidents-advanced/pir`, { params });
  }

  updatePIR(pirId: string, data: Record<string, unknown>): Observable<Record<string, unknown>> {
    return this.http.put<any>(`${this.base}/incidents-advanced/pir/${pirId}`, data);
  }

  signOffPIR(pirId: string, decision: string, comments?: string): Observable<Record<string, unknown>> {
    return this.http.post<any>(`${this.base}/incidents-advanced/pir/${pirId}/sign-off`, { decision, comments });
  }

  generateRegulatoryNotification(incidentId: string, data?: Record<string, unknown>): Observable<Record<string, unknown>> {
    return this.http.post<any>(`${this.base}/incidents-advanced/regulatory-notification`, { incident_id: incidentId, ...data });
  }

  getRegulatoryReportableIncidents(): Observable<Record<string, unknown>[]> {
    return this.http.get<any[]>(`${this.base}/incidents-advanced/regulatory`);
  }

  submitRegulatoryNotification(notificationId: string, referenceNumber?: string): Observable<Record<string, unknown>> {
    return this.http.post<any>(`${this.base}/incidents-advanced/regulatory/${notificationId}/submit`, { reference_number: referenceNumber });
  }

  getTrends(granularity?: string): Observable<Record<string, unknown>> {
    const params = granularity ? { granularity } : {};
    return this.http.get<any>(`${this.base}/incidents-advanced/trends`, { params });
  }

  getRecurringPatterns(): Observable<Record<string, unknown>> {
    return this.http.get<any>(`${this.base}/incidents-advanced/patterns`);
  }

  linkIncidentToRisk(incidentId: string, riskId: string, data?: Record<string, unknown>): Observable<Record<string, unknown>> {
    return this.http.post<any>(`${this.base}/incidents-advanced/risk-link`, { incident_id: incidentId, risk_id: riskId, ...data });
  }

  getIncidentRiskImpact(incidentId: string): Observable<Record<string, unknown>> {
    return this.http.get<any>(`${this.base}/incidents-advanced/risk-impact/${incidentId}`);
  }

  autoUpdateRiskFromIncident(incidentId: string): Observable<Record<string, unknown>> {
    return this.http.post<any>(`${this.base}/incidents-advanced/risk-auto-update/${incidentId}`, {});
  }

  triageIncident(id: string, data: Record<string, unknown>): Observable<Record<string, unknown>> {
    return this.http.post<any>(`${this.base}/incidents/${id}/triage`, data);
  }

  getCases(): Observable<Record<string, unknown>[]> {
    return this.http.get<any[]>(`${this.base}/incidents/cases`);
  }

  createCase(data: Record<string, unknown>): Observable<Record<string, unknown>> {
    return this.http.post<any>(`${this.base}/incidents/cases`, data);
  }

  getCaseById(caseId: string): Observable<Record<string, unknown>> {
    return this.http.get<any>(`${this.base}/incidents/cases/${caseId}`);
  }

  linkIncidentToCase(caseId: string, incidentId: string): Observable<Record<string, unknown>> {
    return this.http.post<any>(`${this.base}/incidents/cases/${caseId}/link`, { incident_id: incidentId });
  }

  getBreachRecords(): Observable<Record<string, unknown>[]> {
    return this.http.get<any[]>(`${this.base}/incidents/breach-records`);
  }

  createBreachRecord(data: Record<string, unknown>): Observable<Record<string, unknown>> {
    return this.http.post<any>(`${this.base}/incidents/breach-records`, data);
  }

  updateBreachStatus(breachId: string, status: string): Observable<Record<string, unknown>> {
    return this.http.put<any>(`${this.base}/incidents/breach-records/${breachId}`, { status });
  }

  getImpacts(): Observable<Record<string, unknown>[]> {
    return this.http.get<any[]>(`${this.base}/incidents/impacts`);
  }

  createImpact(incidentId: string, data: Record<string, unknown>): Observable<Record<string, unknown>> {
    return this.http.post<any>(`${this.base}/incidents/${incidentId}/impacts`, data);
  }

  getEvidence(): Observable<Record<string, unknown>[]> {
    return this.http.get<any[]>(`${this.base}/incidents/evidence`);
  }

  addEvidence(incidentId: string, data: Record<string, unknown>): Observable<Record<string, unknown>> {
    return this.http.post<any>(`${this.base}/incidents/${incidentId}/evidence`, data);
  }

  getCapaActions(): Observable<Record<string, unknown>[]> {
    return this.http.get<any[]>(`${this.base}/incidents/capa`);
  }

  createCapaAction(data: Record<string, unknown>): Observable<Record<string, unknown>> {
    return this.http.post<any>(`${this.base}/incidents/capa`, data);
  }

  updateCapaAction(actionId: string, data: Record<string, unknown>): Observable<Record<string, unknown>> {
    return this.http.put<any>(`${this.base}/incidents/capa/${actionId}`, data);
  }

  getLessonsLearned(incidentId: string): Observable<Record<string, unknown>[]> {
    return this.http.get<any[]>(`${this.base}/incidents/${incidentId}/lessons`);
  }

  getNotificationLog(entityId: string): Observable<Record<string, unknown>[]> {
    return this.http.get<any[]>(`${this.base}/incidents/${entityId}/notifications`);
  }

  getModuleConfig(): Observable<Record<string, unknown>> {
    return this.http.get<any>(`${this.base}/incident-admin/config`);
  }

  getModuleHealth(): Observable<Record<string, unknown>> {
    return this.http.get<any>(`${this.base}/incident-admin/health`);
  }

  getIncidentAnalytics(): Observable<Record<string, unknown>> {
    return this.http.get<any>(`${this.base}/incident-admin/analytics`);
  }

  getActiveIncidents(): Observable<Record<string, unknown>[]> {
    return this.http.get<any[]>(`${this.base}/incident-admin/active`);
  }


  getDiagnostics(): Observable<Record<string, unknown>> {
    return this.http.get<Record<string, unknown>>(`${this.base}/incident/diagnostics`);
  }
}
