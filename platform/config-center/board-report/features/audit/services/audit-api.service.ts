import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '@env/environment';

const BASE = `${environment.apiUrl}/audit`;

@Injectable({ providedIn: 'root' })
export class AuditApiService {
  private http = inject(HttpClient);

  // Overview
  getOverview(): Observable<any> { return this.http.get(`${BASE}/overview`); }

  // Engagements
  getEngagements(): Observable<any> { return this.http.get(`${BASE}/engagements`); }
  getEngagement(id: string): Observable<any> { return this.http.get(`${BASE}/engagements/${id}`); }
  createEngagement(data: any): Observable<any> { return this.http.post(`${BASE}/engagements`, data); }
  updateEngagement(id: string, data: any): Observable<any> { return this.http.put(`${BASE}/engagements/${id}`, data); }
  updateEngagementStatus(id: string, status: string): Observable<any> { return this.http.put(`${BASE}/engagements/${id}/status`, { status }); }
  deleteEngagement(id: string): Observable<any> { return this.http.delete(`${BASE}/engagements/${id}`); }

  // Plans
  getPlans(): Observable<any> { return this.http.get(`${BASE}/plans`); }
  getPlan(id: string): Observable<any> { return this.http.get(`${BASE}/plans/${id}`); }
  createPlan(data: any): Observable<any> { return this.http.post(`${BASE}/plans`, data); }
  updatePlan(id: string, data: any): Observable<any> { return this.http.put(`${BASE}/plans/${id}`, data); }
  updatePlanStatus(id: string, status: string): Observable<any> { return this.http.put(`${BASE}/plans/${id}/status`, { status }); }
  deletePlan(id: string): Observable<any> { return this.http.delete(`${BASE}/plans/${id}`); }

  // Findings
  getFindings(auditId?: string): Observable<any> {
    const params = auditId ? `?auditId=${auditId}` : '';
    return this.http.get(`${BASE}/findings${params}`);
  }
  getFinding(id: string): Observable<any> { return this.http.get(`${BASE}/findings/${id}`); }
  createFinding(data: any): Observable<any> { return this.http.post(`${BASE}/findings`, data); }
  updateFinding(id: string, data: any): Observable<any> { return this.http.put(`${BASE}/findings/${id}`, data); }
  deleteFinding(id: string): Observable<any> { return this.http.delete(`${BASE}/findings/${id}`); }

  // Root Causes
  getRootCauses(findingId: string): Observable<any> { return this.http.get(`${BASE}/findings/${findingId}/root-causes`); }
  addRootCause(findingId: string, data: any): Observable<any> { return this.http.post(`${BASE}/findings/${findingId}/root-causes`, data); }

  // Impacts
  getImpacts(findingId: string): Observable<any> { return this.http.get(`${BASE}/findings/${findingId}/impacts`); }
  addImpact(findingId: string, data: any): Observable<any> { return this.http.post(`${BASE}/findings/${findingId}/impacts`, data); }

  // CAPA
  getCapaPlans(): Observable<any> { return this.http.get(`${BASE}/capa`); }
  getCapaPlan(id: string): Observable<any> { return this.http.get(`${BASE}/capa/${id}`); }
  createCapaPlan(data: any): Observable<any> { return this.http.post(`${BASE}/capa`, data); }
  updateCapaPlan(id: string, data: any): Observable<any> { return this.http.put(`${BASE}/capa/${id}`, data); }

  // Validation
  getClosureReviews(): Observable<any> { return this.http.get(`${BASE}/validation`); }
  createClosureReview(data: any): Observable<any> { return this.http.post(`${BASE}/validation`, data); }

  // Reports
  getReport(auditId: string): Observable<any> { return this.http.get(`${BASE}/plans/${auditId}/report`); }

  // Audit Universe
  getUniverseEntities(): Observable<any> { return this.http.get(`${BASE}/universe`); }
  getUniverseEntity(id: string): Observable<any> { return this.http.get(`${BASE}/universe/${id}`); }
  createUniverseEntity(data: any): Observable<any> { return this.http.post(`${BASE}/universe`, data); }
  updateUniverseEntity(id: string, data: any): Observable<any> { return this.http.put(`${BASE}/universe/${id}`, data); }
  deleteUniverseEntity(id: string): Observable<any> { return this.http.delete(`${BASE}/universe/${id}`); }

  // Risk Scoring
  getRiskScores(universeId: string): Observable<any> { return this.http.get(`${BASE}/risk-scoring/entity/${universeId}`); }
  upsertRiskScore(data: any): Observable<any> { return this.http.post(`${BASE}/risk-scoring`, data); }
  getRankedList(): Observable<any> { return this.http.get(`${BASE}/risk-scoring/ranked-list`); }
  getWeightedScore(universeId: string): Observable<any> { return this.http.get(`${BASE}/risk-scoring/weighted/${universeId}`); }

  // Schedules
  getSchedules(): Observable<any> { return this.http.get(`${BASE}/schedules`); }
  getDueSchedules(): Observable<any> { return this.http.get(`${BASE}/schedules/due`); }
  createSchedule(data: any): Observable<any> { return this.http.post(`${BASE}/schedules`, data); }
  updateSchedule(id: string, data: any): Observable<any> { return this.http.put(`${BASE}/schedules/${id}`, data); }
  deleteSchedule(id: string): Observable<any> { return this.http.delete(`${BASE}/schedules/${id}`); }
  toggleSchedule(id: string): Observable<any> { return this.http.post(`${BASE}/schedules/${id}/toggle`, {}); }

  // Working Papers
  getWorkingPapers(auditId: string): Observable<any> { return this.http.get(`${BASE}/working-papers/audit/${auditId}`); }
  createWorkingPaper(data: any): Observable<any> { return this.http.post(`${BASE}/working-papers`, data); }
  updateWorkingPaper(id: string, data: any): Observable<any> { return this.http.put(`${BASE}/working-papers/${id}`, data); }
  submitWorkingPaperReview(id: string, reviewerId: string): Observable<any> { return this.http.post(`${BASE}/working-papers/${id}/submit-review`, { reviewerId }); }
  approveWorkingPaper(id: string): Observable<any> { return this.http.post(`${BASE}/working-papers/${id}/approve`, {}); }

  // Team
  getTeamMembers(auditId: string): Observable<any> { return this.http.get(`${BASE}/team/audit/${auditId}`); }
  addTeamMember(data: any): Observable<any> { return this.http.post(`${BASE}/team`, data); }
  removeTeamMember(id: string): Observable<any> { return this.http.delete(`${BASE}/team/${id}`); }
  updateTeamHours(id: string, hoursActual: number): Observable<any> { return this.http.put(`${BASE}/team/${id}/hours`, { hoursActual }); }
  getTeamWorkload(): Observable<any> { return this.http.get(`${BASE}/team/workload`); }

  // Repeat Findings
  getRepeatFindings(): Observable<any> { return this.http.get(`${BASE}/repeat-findings`); }
  linkRepeatFinding(data: any): Observable<any> { return this.http.post(`${BASE}/repeat-findings`, data); }
  getRepeatFindingHistory(findingId: string): Observable<any> { return this.http.get(`${BASE}/repeat-findings/${findingId}/history`); }

  // QA Reviews
  getQaReviews(auditId: string): Observable<any> { return this.http.get(`${BASE}/qa-reviews/audit/${auditId}`); }
  getPendingQaReviews(): Observable<any> { return this.http.get(`${BASE}/qa-reviews/pending`); }
  createQaReview(data: any): Observable<any> { return this.http.post(`${BASE}/qa-reviews`, data); }
  approveQaReview(id: string): Observable<any> { return this.http.put(`${BASE}/qa-reviews/${id}/approve`, {}); }
  rejectQaReview(id: string, comments: string): Observable<any> { return this.http.put(`${BASE}/qa-reviews/${id}/reject`, { comments }); }

  // Finding Trends
  getFindingTrends(startDate?: string, endDate?: string): Observable<any> {
    const params: string[] = [];
    if (startDate) params.push(`startDate=${startDate}`);
    if (endDate) params.push(`endDate=${endDate}`);
    return this.http.get(`${BASE}/finding-trends/trends${params.length ? '?' + params.join('&') : ''}`);
  }
  getFindingAging(): Observable<any> { return this.http.get(`${BASE}/finding-trends/aging`); }
  getFindingSeverityDist(): Observable<any> { return this.http.get(`${BASE}/finding-trends/severity`); }
  getRecurringFindings(limit?: number): Observable<any> { return this.http.get(`${BASE}/finding-trends/recurring${limit ? '?limit=' + limit : ''}`); }

  // Ratings
  getAllRatings(): Observable<any> { return this.http.get(`${BASE}/ratings`); }
  getRatings(auditId: string): Observable<any> { return this.http.get(`${BASE}/ratings/audit/${auditId}`); }
  createRating(data: any): Observable<any> { return this.http.post(`${BASE}/ratings`, data); }
  getRatingSummary(): Observable<any> { return this.http.get(`${BASE}/ratings/summary`); }

  // CAPA Effectiveness
  getCapaEffectiveness(capaId: string): Observable<any> { return this.http.get(`${BASE}/capa-effectiveness/capa/${capaId}`); }
  createCapaEffectiveness(data: any): Observable<any> { return this.http.post(`${BASE}/capa-effectiveness`, data); }
  getCapaEffectivenessRate(): Observable<any> { return this.http.get(`${BASE}/capa-effectiveness/rate`); }

  // Committee
  getExecutiveSummary(): Observable<any> { return this.http.get(`${BASE}/committee/executive-summary`); }
  getCommitteeMetrics(): Observable<any> { return this.http.get(`${BASE}/committee/metrics`); }
  getBoardDashboard(): Observable<any> { return this.http.get(`${BASE}/committee/board-dashboard`); }

  // External Coordination
  getExternalCoordinations(): Observable<any> { return this.http.get(`${BASE}/external`); }
  createExternalCoordination(data: any): Observable<any> { return this.http.post(`${BASE}/external`, data); }
  updateExternalCoordination(id: string, data: any): Observable<any> { return this.http.put(`${BASE}/external/${id}`, data); }
  getExternalByAudit(auditId: string): Observable<any> { return this.http.get(`${BASE}/external/audit/${auditId}`); }
  deleteExternalCoordination(id: string): Observable<any> { return this.http.delete(`${BASE}/external/${id}`); }

  // Regulatory
  getRegulatoryTrackings(): Observable<any> { return this.http.get(`${BASE}/regulatory`); }
  createRegulatoryTracking(data: any): Observable<any> { return this.http.post(`${BASE}/regulatory`, data); }
  updateRegulatoryTracking(id: string, data: any): Observable<any> { return this.http.put(`${BASE}/regulatory/${id}`, data); }
  getOverdueRegulatory(): Observable<any> { return this.http.get(`${BASE}/regulatory/overdue`); }
  linkAuditToRegulatory(id: string, auditId: string): Observable<any> { return this.http.post(`${BASE}/regulatory/${id}/link-audit`, { auditId }); }

  // Test Plans
  getTestPlans(auditId: string): Observable<any> { return this.http.get(`${BASE}/test-plans/audit/${auditId}`); }
  createTestPlan(data: any): Observable<any> { return this.http.post(`${BASE}/test-plans`, data); }
  updateTestResult(id: string, data: any): Observable<any> { return this.http.put(`${BASE}/test-plans/${id}/result`, data); }
  getTestCoverage(auditId: string): Observable<any> { return this.http.get(`${BASE}/test-plans/audit/${auditId}/coverage`); }

  // Finding SLAs
  getFindingSlas(): Observable<any> { return this.http.get(`${BASE}/finding-slas`); }
  createFindingSla(data: any): Observable<any> { return this.http.post(`${BASE}/finding-slas`, data); }
  getBreachedSlas(): Observable<any> { return this.http.get(`${BASE}/finding-slas/breached`); }
  getSlaCompliance(): Observable<any> { return this.http.get(`${BASE}/finding-slas/compliance`); }

  // Time Tracking
  getTimeEntries(auditId: string): Observable<any> { return this.http.get(`${BASE}/time-tracking/audit/${auditId}`); }
  createTimeEntry(data: any): Observable<any> { return this.http.post(`${BASE}/time-tracking`, data); }
  getTimeEfficiency(): Observable<any> { return this.http.get(`${BASE}/time-tracking/efficiency`); }
  getTimeUtilization(): Observable<any> { return this.http.get(`${BASE}/time-tracking/utilization`); }

  // Reminders
  getUpcomingReminders(daysAhead?: number): Observable<any> { return this.http.get(`${BASE}/reminders/upcoming${daysAhead ? '?daysAhead=' + daysAhead : ''}`); }
  generateReminders(): Observable<any> { return this.http.post(`${BASE}/reminders/generate`, {}); }

  // Templates
  getTemplates(): Observable<any> { return this.http.get(`${BASE}/templates`); }
  getTemplate(id: string): Observable<any> { return this.http.get(`${BASE}/templates/${id}`); }
  createTemplate(data: any): Observable<any> { return this.http.post(`${BASE}/templates`, data); }
  updateTemplate(id: string, data: any): Observable<any> { return this.http.put(`${BASE}/templates/${id}`, data); }
  deleteTemplate(id: string): Observable<any> { return this.http.delete(`${BASE}/templates/${id}`); }
  applyTemplate(templateId: string, auditId: string): Observable<any> { return this.http.post(`${BASE}/templates/${templateId}/apply`, { auditId }); }

  // Cross-Module
  syncFindingToRisk(findingId: string): Observable<any> { return this.http.post(`${BASE}/cross-module/sync-to-risk`, { findingId }); }
  linkFindingToCompliance(findingId: string, violationId: string): Observable<any> { return this.http.post(`${BASE}/cross-module/link-compliance`, { findingId, violationId }); }
  getCrossModuleStatus(): Observable<any> { return this.http.get(`${BASE}/cross-module/status`); }

  // CAPA ↔ Risk Treatments
  linkCapaToRiskTreatment(capaId: string, treatmentId: string): Observable<any> { return this.http.post(`${BASE}/capa/${capaId}/link-treatment`, { treatmentId }); }
  getAvailableRiskTreatments(): Observable<any> { return this.http.get(`${BASE}/risk-treatments`); }

  // Universe ↔ Foundation
  getUniverseWithFoundation(): Observable<any> { return this.http.get(`${BASE}/universe?withFoundation=true`); }
  getFoundationEntities(): Observable<any> { return this.http.get(`${BASE}/universe/foundation-entities`); }
  linkUniverseToFoundation(entityId: string, data: any): Observable<any> { return this.http.post(`${BASE}/universe/${entityId}/link-foundation`, data); }

  // Risk Planning from Register
  getRankedListFromRegister(): Observable<any> { return this.http.get(`${BASE}/risk-scoring/from-register`); }

  // Audit Packages
  getAuditPackages(): Observable<any> { return this.http.get(`${environment.apiUrl}/audit-packages`); }
  getAuditPackage(id: string): Observable<any> { return this.http.get(`${environment.apiUrl}/audit-packages/${id}`); }
  createAuditPackage(data?: Record<string, unknown>): Observable<any> { return this.http.post(`${environment.apiUrl}/audit-packages`, data || {}); }
  finalizeAuditPackage(id: string): Observable<any> { return this.http.post(`${environment.apiUrl}/audit-packages/${id}/finalize`, {}); }
  deleteAuditPackage(id: string): Observable<any> { return this.http.delete(`${environment.apiUrl}/audit-packages/${id}`); }

  // Evidence
  collectEvidence(data: any): Observable<any> { return this.http.post(`${BASE}/evidence`, data); }

  // Evidence Versions
  getEvidenceVersions(evidenceId: string): Observable<any> { return this.http.get(`${BASE}/evidence-versions/evidence/${evidenceId}`); }
  getEvidenceVersion(id: string): Observable<any> { return this.http.get(`${BASE}/evidence-versions/${id}`); }
  getLatestEvidenceVersion(evidenceId: string): Observable<any> { return this.http.get(`${BASE}/evidence-versions/evidence/${evidenceId}/latest`); }

  // ═══ Foundation Lookups ═══
  getFoundationUsers(): Observable<any[]> {
    return this.http.get<unknown[]>(`${environment.apiUrl}/foundation/users`);
  }

  getFoundationTeams(): Observable<any[]> {
    return this.http.get<unknown[]>(`${environment.apiUrl}/foundation/teams`);
  }

  getFoundationUserDetail(userId: string): Observable<any> {
    return this.http.get<unknown>(`${environment.apiUrl}/foundation/users/${userId}`);
  }

  // Finding status history
  getFindingHistory(findingId: string): Observable<any[]> {
    return this.http.get<unknown[]>(`${BASE}/findings/${findingId}/history`);
  }

  // Finding assignment updates
  updateFindingAssignment(findingId: string, data: any): Observable<any> {
    return this.http.put(`${BASE}/findings/${findingId}`, data);
  }
}
