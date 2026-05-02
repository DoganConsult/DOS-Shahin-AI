import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '@env/environment';

export interface BCPPlanDto {
  id: string;
  title?: string;
  status?: string;
  lastTestedAt?: string;
}

export interface DRTestDto {
  id: string;
  planId: string;
  scheduledDate?: string;
  status?: string;
}

export interface RecoveryDocDto {
  id: string;
  planId: string;
  description?: string;
  recoveredAt?: string;
}

@Injectable({ providedIn: 'root' })
export class BcpApiService {
  private readonly http = inject(HttpClient);
  private readonly base = environment.apiUrl;

  getBCPPlans(): Observable<BCPPlanDto[]> {
    return this.http.get<BCPPlanDto[]>(`${this.base}/bcp`);
  }

  createBCPPlan(data: Record<string, unknown>): Observable<BCPPlanDto> {
    return this.http.post<BCPPlanDto>(`${this.base}/bcp`, data);
  }

  scheduleDRTest(planId: string, data: Record<string, unknown>): Observable<DRTestDto> {
    return this.http.post<DRTestDto>(`${this.base}/bcp/${planId}/dr-test`, data);
  }

  documentRecovery(planId: string, data: Record<string, unknown>): Observable<RecoveryDocDto> {
    return this.http.post<RecoveryDocDto>(`${this.base}/bcp/${planId}/recovery`, data);
  }

  getBIAs(status?: string): Observable<Record<string, unknown>[]> {
    const params = status ? `?status=${status}` : '';
    return this.http.get<any[]>(`${this.base}/bcm-advanced/bia${params}`);
  }

  createBIA(data: Record<string, unknown>): Observable<Record<string, unknown>> {
    return this.http.post<any>(`${this.base}/bcm-advanced/bia`, data);
  }

  getBIAById(biaId: string): Observable<Record<string, unknown>> {
    return this.http.get<any>(`${this.base}/bcm-advanced/bia/${biaId}`);
  }

  calculateBIACriticality(biaId: string): Observable<Record<string, unknown>> {
    return this.http.post<any>(`${this.base}/bcm-advanced/bia/${biaId}/calculate`, {});
  }

  getExercises(status?: string): Observable<Record<string, unknown>[]> {
    const params = status ? `?status=${status}` : '';
    return this.http.get<any[]>(`${this.base}/bcm-advanced/exercises${params}`);
  }

  createExercise(data: Record<string, unknown>): Observable<Record<string, unknown>> {
    return this.http.post<any>(`${this.base}/bcm-advanced/exercises`, data);
  }

  recordExerciseResult(exerciseId: string, data: Record<string, unknown>): Observable<Record<string, unknown>> {
    return this.http.post<any>(`${this.base}/bcm-advanced/exercises/${exerciseId}/results`, data);
  }

  getExerciseGaps(exerciseId: string): Observable<Record<string, unknown>[]> {
    return this.http.get<any[]>(`${this.base}/bcm-advanced/exercises/${exerciseId}/gaps`);
  }

  getCrisisCommPlans(): Observable<Record<string, unknown>[]> {
    return this.http.get<any[]>(`${this.base}/bcm-advanced/crisis-comm`);
  }

  createCrisisCommPlan(data: Record<string, unknown>): Observable<Record<string, unknown>> {
    return this.http.post<any>(`${this.base}/bcm-advanced/crisis-comm`, data);
  }

  activateCrisisComm(planId: string, incidentId?: string): Observable<Record<string, unknown>> {
    return this.http.post<any>(`${this.base}/bcm-advanced/crisis-comm/${planId}/activate`, { incident_id: incidentId });
  }

  getRecoveryStrategies(biaId?: string): Observable<Record<string, unknown>[]> {
    const params = biaId ? `?bia_id=${biaId}` : '';
    return this.http.get<any[]>(`${this.base}/bcm-advanced/recovery-strategies${params}`);
  }

  createRecoveryStrategy(data: Record<string, unknown>): Observable<Record<string, unknown>> {
    return this.http.post<any>(`${this.base}/bcm-advanced/recovery-strategies`, data);
  }

  activateBCPlan(planId: string, reason: string, incidentId?: string): Observable<Record<string, unknown>> {
    return this.http.post<any>(`${this.base}/bcm-advanced/activate`, { plan_id: planId, reason, incident_id: incidentId });
  }

  getBCPActivations(status?: string): Observable<Record<string, unknown>[]> {
    const params = status ? `?status=${status}` : '';
    return this.http.get<any[]>(`${this.base}/bcm-advanced/activations${params}`);
  }

  deactivateBCPlan(activationId: string): Observable<Record<string, unknown>> {
    return this.http.post<any>(`${this.base}/bcm-advanced/deactivate/${activationId}`, {});
  }

  getMaturityHistory(): Observable<Record<string, unknown>[]> {
    return this.http.get<any[]>(`${this.base}/bcm-advanced/maturity/history`);
  }

  runMaturityAssessment(data: Record<string, unknown>): Observable<Record<string, unknown>> {
    return this.http.post<any>(`${this.base}/bcm-advanced/maturity`, data);
  }

  // ── Business Services ────────────────────────────────────────────

  getBusinessServices(filters?: Record<string, string>): Observable<any> {
    const params = new URLSearchParams(filters).toString();
    return this.http.get<any>(`${this.base}/business-services${params ? '?' + params : ''}`);
  }

  createBusinessService(data: Record<string, unknown>): Observable<any> {
    return this.http.post<any>(`${this.base}/business-services`, data);
  }

  getServiceById(serviceId: string): Observable<any> {
    return this.http.get<any>(`${this.base}/business-services/${serviceId}`);
  }

  updateBusinessService(serviceId: string, data: Record<string, unknown>): Observable<any> {
    return this.http.put<any>(`${this.base}/business-services/${serviceId}`, data);
  }

  getServiceDependencies(serviceId: string): Observable<any> {
    return this.http.get<any>(`${this.base}/business-services/${serviceId}/dependencies`);
  }

  getServiceImpactSummary(serviceId: string): Observable<any> {
    return this.http.get<any>(`${this.base}/business-services/${serviceId}/impact-summary`);
  }

  // ── Crisis Events ────────────────────────────────────────────────

  getCrisisEvents(filters?: Record<string, string>): Observable<any> {
    const params = new URLSearchParams(filters).toString();
    return this.http.get<any>(`${this.base}/crisis-events${params ? '?' + params : ''}`);
  }

  getActiveCrises(): Observable<any> {
    return this.http.get<any>(`${this.base}/crisis-events/active`);
  }

  getCrisisDashboard(): Observable<any> {
    return this.http.get<any>(`${this.base}/crisis-events/dashboard`);
  }

  getCrisisById(eventId: string): Observable<any> {
    return this.http.get<any>(`${this.base}/crisis-events/${eventId}`);
  }

  declareCrisis(data: Record<string, unknown>): Observable<any> {
    return this.http.post<any>(`${this.base}/crisis-events`, data);
  }

  updateCrisisStatus(eventId: string, status: string, message?: string): Observable<any> {
    return this.http.put<any>(`${this.base}/crisis-events/${eventId}`, { status, message });
  }

  addCrisisTimelineEntry(eventId: string, entry: Record<string, unknown>): Observable<any> {
    return this.http.post<any>(`${this.base}/crisis-events/${eventId}/timeline`, entry);
  }

  resolveCrisis(eventId: string, postCrisisReview?: string): Observable<any> {
    return this.http.post<any>(`${this.base}/crisis-events/${eventId}/resolve`, { post_crisis_review: postCrisisReview });
  }

  // ── BCM Findings ─────────────────────────────────────────────────

  getFindings(filters?: Record<string, string>): Observable<any> {
    const params = new URLSearchParams(filters).toString();
    return this.http.get<any>(`${this.base}/bcm-findings${params ? '?' + params : ''}`);
  }

  getFindingsSummary(): Observable<any> {
    return this.http.get<any>(`${this.base}/bcm-findings/summary`);
  }

  getFindingById(findingId: string): Observable<any> {
    return this.http.get<any>(`${this.base}/bcm-findings/${findingId}`);
  }

  createFinding(data: Record<string, unknown>): Observable<any> {
    return this.http.post<any>(`${this.base}/bcm-findings`, data);
  }

  updateFinding(findingId: string, data: Record<string, unknown>): Observable<any> {
    return this.http.put<any>(`${this.base}/bcm-findings/${findingId}`, data);
  }

  verifyFinding(findingId: string): Observable<any> {
    return this.http.post<any>(`${this.base}/bcm-findings/${findingId}/verify`, {});
  }

  closeFinding(findingId: string): Observable<any> {
    return this.http.post<any>(`${this.base}/bcm-findings/${findingId}/close`, {});
  }

  // ── Recovery Metrics ─────────────────────────────────────────────

  getRecoveryMetrics(): Observable<any> {
    return this.http.get<any>(`${this.base}/bcm-metrics/recovery`);
  }

  getRtoRpoTrend(months?: number): Observable<any> {
    const params = months ? `?months=${months}` : '';
    return this.http.get<any>(`${this.base}/bcm-metrics/rto-rpo-trend${params}`);
  }

  getExerciseEffectiveness(): Observable<any> {
    return this.http.get<any>(`${this.base}/bcm-metrics/exercise-effectiveness`);
  }

  getServiceResilience(): Observable<any> {
    return this.http.get<any>(`${this.base}/bcm-metrics/service-resilience`);
  }

  getRecoveryBenchmarks(): Observable<any> {
    return this.http.get<any>(`${this.base}/bcm-metrics/benchmarks`);
  }


  getDiagnostics(): Observable<Record<string, unknown>> {
    return this.http.get<Record<string, unknown>>(`${this.base}/bcp/diagnostics`);
  }
}
