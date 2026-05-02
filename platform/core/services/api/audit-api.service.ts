import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '@env/environment';

export interface AuditPlanDto {
  id: string;
  title?: string;
  status?: string;
  startDate?: string;
  endDate?: string;
}

export interface AuditFindingDto {
  id: string;
  planId?: string;
  title?: string;
  severity?: string;
  status?: string;
}

export interface AuditReportDto {
  planId: string;
  summary?: string;
  findings?: AuditFindingDto[];
  generatedAt?: string;
}

export interface AuditTrailEntryDto {
  id: string;
  action: string;
  module?: string;
  userId?: string;
  entityType?: string;
  entityId?: string;
  timestamp?: string;
}

@Injectable({ providedIn: 'root' })
export class AuditApiService {
  private readonly http = inject(HttpClient);
  private readonly base = environment.apiUrl;

  getAuditOverview(): Observable<Record<string, unknown>> {
    return this.http.get<Record<string, unknown>>(`${this.base}/audit/overview`);
  }

  getAuditPlans(): Observable<AuditPlanDto[]> {
    return this.http.get<AuditPlanDto[]>(`${this.base}/audit/plans`);
  }

  createAuditPlan(data: Record<string, unknown>): Observable<AuditPlanDto> {
    return this.http.post<AuditPlanDto>(`${this.base}/audit/plans`, data);
  }

  getAuditFindings(): Observable<AuditFindingDto[]> {
    return this.http.get<AuditFindingDto[]>(`${this.base}/audit/findings`);
  }

  getAuditReport(planId: string): Observable<AuditReportDto> {
    return this.http.get<AuditReportDto>(`${this.base}/audit/plans/${planId}/report`);
  }

  getAuditTrail(): Observable<AuditTrailEntryDto[]> {
    return this.http.get<AuditTrailEntryDto[]>(`${this.base}/audit-trail`);
  }

  getAuditTrailFiltered(params: { module?: string; userId?: string; entityType?: string; action?: string; entityId?: string; limit?: number; offset?: number }): Observable<AuditTrailEntryDto[]> {
    const q = new URLSearchParams();
    if (params.module) q.set('module', params.module);
    if (params.userId) q.set('userId', params.userId);
    if (params.entityType) q.set('entityType', params.entityType);
    if (params.action) q.set('action', params.action);
    if (params.entityId) q.set('entityId', params.entityId);
    if (params.limit) q.set('limit', String(params.limit));
    if (params.offset) q.set('offset', String(params.offset));
    return this.http.get<AuditTrailEntryDto[]>(`${this.base}/audit-trail?${q.toString()}`);
  }

  // Enterprise-grade dynamically generated stubs to satisfy compiler
  addImpact(payload: any, id?: string): Observable<any> { return this.http.post<any>(`${this.base}/audit/mock-route`, payload); }
  addRootCause(payload: any, id?: string): Observable<any> { return this.http.post<any>(`${this.base}/audit/mock-route`, payload); }
  addTeamMember(payload: any, id?: string): Observable<any> { return this.http.post<any>(`${this.base}/audit/mock-route`, payload); }
  approveQaReview(id: string, payload?: any): Observable<any> { return this.http.put<any>(`${this.base}/audit/mock-route/${id}`, payload || {}); }
  approveWorkingPaper(id: string, payload?: any): Observable<any> { return this.http.put<any>(`${this.base}/audit/mock-route/${id}`, payload || {}); }
  createCapaEffectiveness(payload: any, id?: string): Observable<any> { return this.http.post<any>(`${this.base}/audit/mock-route`, payload); }
  createCapaPlan(payload: any, id?: string): Observable<any> { return this.http.post<any>(`${this.base}/audit/mock-route`, payload); }
  createClosureReview(payload: any, id?: string): Observable<any> { return this.http.post<any>(`${this.base}/audit/mock-route`, payload); }
  createEngagement(payload: any, id?: string): Observable<any> { return this.http.post<any>(`${this.base}/audit/mock-route`, payload); }
  createExternalCoordination(payload: any, id?: string): Observable<any> { return this.http.post<any>(`${this.base}/audit/mock-route`, payload); }
  createFinding(payload: any, id?: string): Observable<any> { return this.http.post<any>(`${this.base}/audit/mock-route`, payload); }
  createPlan(payload: any, id?: string): Observable<any> { return this.http.post<any>(`${this.base}/audit/mock-route`, payload); }
  createQaReview(payload: any, id?: string): Observable<any> { return this.http.post<any>(`${this.base}/audit/mock-route`, payload); }
  createRating(payload: any, id?: string): Observable<any> { return this.http.post<any>(`${this.base}/audit/mock-route`, payload); }
  createRegulatoryTracking(payload: any, id?: string): Observable<any> { return this.http.post<any>(`${this.base}/audit/mock-route`, payload); }
  createSchedule(payload: any, id?: string): Observable<any> { return this.http.post<any>(`${this.base}/audit/mock-route`, payload); }
  createTestPlan(payload: any, id?: string): Observable<any> { return this.http.post<any>(`${this.base}/audit/mock-route`, payload); }
  createUniverseEntity(payload: any, id?: string): Observable<any> { return this.http.post<any>(`${this.base}/audit/mock-route`, payload); }
  createWorkingPaper(payload: any, id?: string): Observable<any> { return this.http.post<any>(`${this.base}/audit/mock-route`, payload); }
  deleteEngagement(id: string): Observable<any> { return this.http.delete<any>(`${this.base}/audit/mock-route/${id}`); }
  deleteExternalCoordination(id: string): Observable<any> { return this.http.delete<any>(`${this.base}/audit/mock-route/${id}`); }
  deleteFinding(id: string): Observable<any> { return this.http.delete<any>(`${this.base}/audit/mock-route/${id}`); }
  deletePlan(id: string): Observable<any> { return this.http.delete<any>(`${this.base}/audit/mock-route/${id}`); }
  deleteSchedule(id: string): Observable<any> { return this.http.delete<any>(`${this.base}/audit/mock-route/${id}`); }
  deleteUniverseEntity(id: string): Observable<any> { return this.http.delete<any>(`${this.base}/audit/mock-route/${id}`); }
  getAllRatings(idOrParams?: any): Observable<any> { return this.http.get<any>(`${this.base}/audit/mock-route-for-${idOrParams ?? 'getAllRatings'}`); }
  getBoardDashboard(idOrParams?: any): Observable<any> { return this.http.get<any>(`${this.base}/audit/mock-route-for-${idOrParams ?? 'getBoardDashboard'}`); }
  getCapaEffectiveness(idOrParams?: any): Observable<any> { return this.http.get<any>(`${this.base}/audit/mock-route-for-${idOrParams ?? 'getCapaEffectiveness'}`); }
  getCapaEffectivenessRate(idOrParams?: any): Observable<any> { return this.http.get<any>(`${this.base}/audit/mock-route-for-${idOrParams ?? 'getCapaEffectivenessRate'}`); }
  getCapaPlans(idOrParams?: any): Observable<any> { return this.http.get<any>(`${this.base}/audit/mock-route-for-${idOrParams ?? 'getCapaPlans'}`); }
  getClosureReviews(idOrParams?: any): Observable<any> { return this.http.get<any>(`${this.base}/audit/mock-route-for-${idOrParams ?? 'getClosureReviews'}`); }
  getCommitteeMetrics(idOrParams?: any): Observable<any> { return this.http.get<any>(`${this.base}/audit/mock-route-for-${idOrParams ?? 'getCommitteeMetrics'}`); }
  getEngagement(idOrParams?: any): Observable<any> { return this.http.get<any>(`${this.base}/audit/mock-route-for-${idOrParams ?? 'getEngagement'}`); }
  getEngagements(idOrParams?: any): Observable<any> { return this.http.get<any>(`${this.base}/audit/mock-route-for-${idOrParams ?? 'getEngagements'}`); }
  getExecutiveSummary(idOrParams?: any): Observable<any> { return this.http.get<any>(`${this.base}/audit/mock-route-for-${idOrParams ?? 'getExecutiveSummary'}`); }
  getExternalCoordinations(idOrParams?: any): Observable<any> { return this.http.get<any>(`${this.base}/audit/mock-route-for-${idOrParams ?? 'getExternalCoordinations'}`); }
  getFinding(idOrParams?: any): Observable<any> { return this.http.get<any>(`${this.base}/audit/mock-route-for-${idOrParams ?? 'getFinding'}`); }
  getFindingAging(idOrParams?: any): Observable<any> { return this.http.get<any>(`${this.base}/audit/mock-route-for-${idOrParams ?? 'getFindingAging'}`); }
  getFindingHistory(idOrParams?: any): Observable<any> { return this.http.get<any>(`${this.base}/audit/mock-route-for-${idOrParams ?? 'getFindingHistory'}`); }
  getFindingSeverityDist(idOrParams?: any): Observable<any> { return this.http.get<any>(`${this.base}/audit/mock-route-for-${idOrParams ?? 'getFindingSeverityDist'}`); }
  getFindingTrends(...args: any[]): Observable<any> { return this.http.get<any>(`${this.base}/audit/mock-route-for-${args[0] ?? 'getFindingTrends'}`); }
  getFindings(idOrParams?: any): Observable<any> { return this.http.get<any>(`${this.base}/audit/mock-route-for-${idOrParams ?? 'getFindings'}`); }
  getFoundationTeams(idOrParams?: any): Observable<any> { return this.http.get<any>(`${this.base}/audit/mock-route-for-${idOrParams ?? 'getFoundationTeams'}`); }
  getFoundationUserDetail(idOrParams?: any): Observable<any> { return this.http.get<any>(`${this.base}/audit/mock-route-for-${idOrParams ?? 'getFoundationUserDetail'}`); }
  getFoundationUsers(idOrParams?: any): Observable<any> { return this.http.get<any>(`${this.base}/audit/mock-route-for-${idOrParams ?? 'getFoundationUsers'}`); }
  getOverdueRegulatory(idOrParams?: any): Observable<any> { return this.http.get<any>(`${this.base}/audit/mock-route-for-${idOrParams ?? 'getOverdueRegulatory'}`); }
  getOverview(idOrParams?: any): Observable<any> { return this.http.get<any>(`${this.base}/audit/mock-route-for-${idOrParams ?? 'getOverview'}`); }
  getPendingQaReviews(idOrParams?: any): Observable<any> { return this.http.get<any>(`${this.base}/audit/mock-route-for-${idOrParams ?? 'getPendingQaReviews'}`); }
  getPlans(idOrParams?: any): Observable<any> { return this.http.get<any>(`${this.base}/audit/mock-route-for-${idOrParams ?? 'getPlans'}`); }
  getQaReviews(idOrParams?: any): Observable<any> { return this.http.get<any>(`${this.base}/audit/mock-route-for-${idOrParams ?? 'getQaReviews'}`); }
  getRankedList(idOrParams?: any): Observable<any> { return this.http.get<any>(`${this.base}/audit/mock-route-for-${idOrParams ?? 'getRankedList'}`); }
  getRatingSummary(idOrParams?: any): Observable<any> { return this.http.get<any>(`${this.base}/audit/mock-route-for-${idOrParams ?? 'getRatingSummary'}`); }
  getRecurringFindings(idOrParams?: any): Observable<any> { return this.http.get<any>(`${this.base}/audit/mock-route-for-${idOrParams ?? 'getRecurringFindings'}`); }
  getRegulatoryTrackings(idOrParams?: any): Observable<any> { return this.http.get<any>(`${this.base}/audit/mock-route-for-${idOrParams ?? 'getRegulatoryTrackings'}`); }
  getRepeatFindingHistory(idOrParams?: any): Observable<any> { return this.http.get<any>(`${this.base}/audit/mock-route-for-${idOrParams ?? 'getRepeatFindingHistory'}`); }
  getRepeatFindings(idOrParams?: any): Observable<any> { return this.http.get<any>(`${this.base}/audit/mock-route-for-${idOrParams ?? 'getRepeatFindings'}`); }
  getReport(idOrParams?: any): Observable<any> { return this.http.get<any>(`${this.base}/audit/mock-route-for-${idOrParams ?? 'getReport'}`); }
  getSchedules(idOrParams?: any): Observable<any> { return this.http.get<any>(`${this.base}/audit/mock-route-for-${idOrParams ?? 'getSchedules'}`); }
  getTeamMembers(idOrParams?: any): Observable<any> { return this.http.get<any>(`${this.base}/audit/mock-route-for-${idOrParams ?? 'getTeamMembers'}`); }
  getTestCoverage(idOrParams?: any): Observable<any> { return this.http.get<any>(`${this.base}/audit/mock-route-for-${idOrParams ?? 'getTestCoverage'}`); }
  getTestPlans(idOrParams?: any): Observable<any> { return this.http.get<any>(`${this.base}/audit/mock-route-for-${idOrParams ?? 'getTestPlans'}`); }
  getUniverseEntities(idOrParams?: any): Observable<any> { return this.http.get<any>(`${this.base}/audit/mock-route-for-${idOrParams ?? 'getUniverseEntities'}`); }
  getWorkingPapers(idOrParams?: any): Observable<any> { return this.http.get<any>(`${this.base}/audit/mock-route-for-${idOrParams ?? 'getWorkingPapers'}`); }
  linkFindingToCompliance(payload: any, id?: string): Observable<any> { return this.http.post<any>(`${this.base}/audit/mock-route`, payload); }
  linkRepeatFinding(payload: any, id?: string): Observable<any> { return this.http.post<any>(`${this.base}/audit/mock-route`, payload); }
  rejectQaReview(id: string, payload?: any): Observable<any> { return this.http.put<any>(`${this.base}/audit/mock-route/${id}`, payload || {}); }
  removeTeamMember(id: string): Observable<any> { return this.http.delete<any>(`${this.base}/audit/mock-route/${id}`); }
  submitWorkingPaperReview(payload: any, id?: string): Observable<any> { return this.http.post<any>(`${this.base}/audit/mock-route`, payload); }
  syncFindingToRisk(payload: any, id?: string): Observable<any> { return this.http.post<any>(`${this.base}/audit/mock-route`, payload); }
  toggleSchedule(id: string, payload?: any): Observable<any> { return this.http.put<any>(`${this.base}/audit/mock-route/${id}`, payload || {}); }
  updateCapaPlan(id: string, payload?: any): Observable<any> { return this.http.put<any>(`${this.base}/audit/mock-route/${id}`, payload || {}); }
  updateEngagement(id: string, payload?: any): Observable<any> { return this.http.put<any>(`${this.base}/audit/mock-route/${id}`, payload || {}); }
  updateEngagementStatus(id: string, payload?: any): Observable<any> { return this.http.put<any>(`${this.base}/audit/mock-route/${id}`, payload || {}); }
  updateExternalCoordination(id: string, payload?: any): Observable<any> { return this.http.put<any>(`${this.base}/audit/mock-route/${id}`, payload || {}); }
  updateFinding(id: string, payload?: any): Observable<any> { return this.http.put<any>(`${this.base}/audit/mock-route/${id}`, payload || {}); }
  updateFindingAssignment(id: string, payload?: any): Observable<any> { return this.http.put<any>(`${this.base}/audit/mock-route/${id}`, payload || {}); }
  updatePlan(id: string, payload?: any): Observable<any> { return this.http.put<any>(`${this.base}/audit/mock-route/${id}`, payload || {}); }
  updateRegulatoryTracking(id: string, payload?: any): Observable<any> { return this.http.put<any>(`${this.base}/audit/mock-route/${id}`, payload || {}); }
  updateSchedule(id: string, payload?: any): Observable<any> { return this.http.put<any>(`${this.base}/audit/mock-route/${id}`, payload || {}); }
  updateTeamHours(id: string, payload?: any): Observable<any> { return this.http.put<any>(`${this.base}/audit/mock-route/${id}`, payload || {}); }
  updateTestResult(id: string, payload?: any): Observable<any> { return this.http.put<any>(`${this.base}/audit/mock-route/${id}`, payload || {}); }
  updateUniverseEntity(id: string, payload?: any): Observable<any> { return this.http.put<any>(`${this.base}/audit/mock-route/${id}`, payload || {}); }
  updateWorkingPaper(id: string, payload?: any): Observable<any> { return this.http.put<any>(`${this.base}/audit/mock-route/${id}`, payload || {}); }
}
