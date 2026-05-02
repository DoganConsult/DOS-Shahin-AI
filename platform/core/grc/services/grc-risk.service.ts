import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '@env/environment';
import { Risk } from '../../models/grc.models';
import {
  RiskListDto,
  RiskMatrixDto,
  RiskDetailDto,
  RiskItemDto,
  CreateRiskRequest,
  UpdateRiskRequest,
  KRITrendsDto,
  RiskPostureDto,
  RiskScoringModelDto,
  UpdateRiskScoringModelRequest,
  RiskMetricsKPIDto,
  RiskTrendsDto,
  AIRiskAssessmentDto,
  IncidentListDto,
  IncidentItemDto,
  CreateIncidentRequest,
  InvestigateIncidentRequest,
  AIIncidentTriageDto,
  BCPPlanListDto,
  BCPPlanDto,
  CreateBCPPlanRequest,
  ScheduleDRTestRequest,
  DocumentRecoveryRequest,
  BCPAnalyticsDto,
  VendorListDto,
  VendorItemDto,
  CreateVendorRequest,
  VendorSLADto,
  VendorRiskProfileDto,
  CreateVendorRiskAssessmentRequest,
  VendorQuestionnaireDto,
  SendVendorQuestionnaireRequest,
  MessageResponse,
} from './grc-risk.types';

/**
 * GRC Risk sub-service.
 * Covers: Risk Management, Risk Scoring, Risk Metrics, KRI,
 * BCP / DR, Incidents, and Vendor Risk.
 */
@Injectable({ providedIn: 'root' })
export class GrcRiskService {
  private api = environment.apiUrl;

  constructor(private http: HttpClient) {}

  // === Risk Management (extended) ===
  getRisks(): Observable<Risk[]> { return this.http.get<Risk[]>(`${this.api}/dashboard/risks`); }
  getRiskList(): Observable<RiskListDto> { return this.http.get<RiskListDto>(`${this.api}/risks`); }
  getRiskMatrix(): Observable<RiskMatrixDto> { return this.http.get<RiskMatrixDto>(`${this.api}/risks/matrix`); }
  getRiskById(id: string): Observable<RiskDetailDto> { return this.http.get<RiskDetailDto>(`${this.api}/risks/${id}`); }
  createRisk(data: CreateRiskRequest): Observable<RiskItemDto> { return this.http.post<RiskItemDto>(`${this.api}/risks`, data); }
  updateRisk(id: string, data: UpdateRiskRequest): Observable<RiskItemDto> { return this.http.put<RiskItemDto>(`${this.api}/risks/${id}`, data); }
  deleteRisk(id: string): Observable<MessageResponse> { return this.http.delete<MessageResponse>(`${this.api}/risks/${id}`); }
  getKRITrends(id: string): Observable<KRITrendsDto> { return this.http.get<KRITrendsDto>(`${this.api}/risks/${id}/kri`); }

  // === Risk Scoring (backend: /api/risk-scoring) ===
  getRiskPosture(): Observable<RiskPostureDto> { return this.http.get<RiskPostureDto>(`${this.api}/risk-scoring/risk-posture`); }
  getRiskScoringModels(): Observable<RiskScoringModelDto[]> { return this.http.get<RiskScoringModelDto[]>(`${this.api}/risk-scoring/models`); }
  getKRITrendsScoring(): Observable<KRITrendsDto> { return this.http.get<KRITrendsDto>(`${this.api}/risk-scoring/kri-trends`); }
  updateRiskScoringModel(data: UpdateRiskScoringModelRequest): Observable<RiskScoringModelDto> { return this.http.put<RiskScoringModelDto>(`${this.api}/risk-scoring/models`, data); }

  // === Risk Metrics (backend: /api/risk-metrics) ===
  getRiskKPIs(): Observable<RiskMetricsKPIDto> { return this.http.get<RiskMetricsKPIDto>(`${this.api}/risk-metrics/kpis`); }
  getRiskTrends(startDate: string, endDate: string): Observable<RiskTrendsDto> { return this.http.get<RiskTrendsDto>(`${this.api}/risk-metrics/trends?startDate=${startDate}&endDate=${endDate}`); }

  // === AI Risk Assessment ===
  getAIRiskAssessment(riskId: string): Observable<AIRiskAssessmentDto> { return this.http.get<AIRiskAssessmentDto>(`${this.api}/ai/risk-assessment/${riskId}`); }

  // === Incidents ===
  getIncidents(): Observable<IncidentListDto> { return this.http.get<IncidentListDto>(`${this.api}/incidents`); }
  reportIncident(data: CreateIncidentRequest): Observable<IncidentItemDto> { return this.http.post<IncidentItemDto>(`${this.api}/incidents`, data); }
  investigateIncident(id: string, data: InvestigateIncidentRequest): Observable<IncidentItemDto> { return this.http.put<IncidentItemDto>(`${this.api}/incidents/${id}/investigate`, data); }
  getAIIncidentTriage(incidentId: string): Observable<AIIncidentTriageDto> { return this.http.get<AIIncidentTriageDto>(`${this.api}/ai/triage-incident/${incidentId}`); }

  // === BCP ===
  getBCPPlans(): Observable<BCPPlanListDto> { return this.http.get<BCPPlanListDto>(`${this.api}/bcp`); }
  createBCPPlan(data: CreateBCPPlanRequest): Observable<BCPPlanDto> { return this.http.post<BCPPlanDto>(`${this.api}/bcp`, data); }
  scheduleDRTest(planId: string, data: ScheduleDRTestRequest): Observable<BCPPlanDto> { return this.http.post<BCPPlanDto>(`${this.api}/bcp/${planId}/dr-test`, data); }
  documentRecovery(planId: string, data: DocumentRecoveryRequest): Observable<BCPPlanDto> { return this.http.post<BCPPlanDto>(`${this.api}/bcp/${planId}/recovery`, data); }
  getBCPLeadingIndicators(): Observable<BCPAnalyticsDto> { return this.http.get<BCPAnalyticsDto>(`${this.api}/bcp/analytics/leading-indicators`); }
  getBCPReadiness(): Observable<BCPAnalyticsDto> { return this.http.get<BCPAnalyticsDto>(`${this.api}/bcp/analytics/readiness`); }
  getBCPPredictive(): Observable<BCPAnalyticsDto> { return this.http.get<BCPAnalyticsDto>(`${this.api}/bcp/analytics/predictive`); }

  // === Vendors ===
  getVendors(): Observable<VendorListDto> { return this.http.get<VendorListDto>(`${this.api}/vendors`); }
  createVendor(data: CreateVendorRequest): Observable<VendorItemDto> { return this.http.post<VendorItemDto>(`${this.api}/vendors`, data); }
  getVendorSLA(id: string): Observable<VendorSLADto> { return this.http.get<VendorSLADto>(`${this.api}/vendors/${id}/sla`); }

  // === Vendor Risk Extended (backend: /api/vendor-risk) ===
  getVendorRiskProfiles(): Observable<VendorRiskProfileDto[]> { return this.http.get<VendorRiskProfileDto[]>(`${this.api}/vendor-risk/profiles`); }
  getVendorRiskProfile(vendorId: string): Observable<VendorRiskProfileDto> { return this.http.get<VendorRiskProfileDto>(`${this.api}/vendor-risk/profiles/${vendorId}`); }
  createVendorRiskAssessment(vendorId: string, data: CreateVendorRiskAssessmentRequest): Observable<VendorRiskProfileDto> { return this.http.post<VendorRiskProfileDto>(`${this.api}/vendor-risk/profiles/${vendorId}/assess`, data); }
  getVendorQuestionnaires(): Observable<VendorQuestionnaireDto[]> { return this.http.get<VendorQuestionnaireDto[]>(`${this.api}/vendor-risk/questionnaires`); }
  sendVendorQuestionnaire(data: SendVendorQuestionnaireRequest): Observable<VendorQuestionnaireDto> { return this.http.post<VendorQuestionnaireDto>(`${this.api}/vendor-risk/questionnaires`, data); }
}
