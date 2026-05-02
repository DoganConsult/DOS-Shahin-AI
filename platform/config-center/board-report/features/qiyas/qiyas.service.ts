import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '@env/environment';
import {
  QiyasModel, QiyasAssessment, QiyasDashboardSummary, QiyasDomain,
  QiyasRecommendation, QiyasImprovementPath,
  QiyasCalibrationSession, QiyasCalibrationEntry,
  QiyasEvidenceScoringModel, QiyasEvidenceScore, QiyasEvidenceQualityMetric,
  QiyasMaturitySnapshot, QiyasProgressionEntry, QiyasHeatmapCell, QiyasTargetProfile,
  QiyasBenchmarkDataset, QiyasBenchmarkComparison,
  QiyasCertificationGap, QiyasCertificationReadiness,
  QiyasRespondent, QiyasRespondentProgress,
  QiyasScope,
  QiyasQuestion, QiyasQuestionGroup,
  QiyasModelVersion,
  QiyasGrcTrigger, QiyasAutoTask,
} from './qiyas.models';

@Injectable({ providedIn: 'root' })
export class QiyasService {
  private http = inject(HttpClient);
  private base = `${environment.apiUrl}/qiyas`;

  // ═══ Dashboard ═══

  getDashboard(): Observable<QiyasDashboardSummary> {
    return this.http.get<QiyasDashboardSummary>(`${this.base}/dashboard`);
  }

  // ═══ Models CRUD ═══

  listModels(params?: { status?: string; model_type?: string }): Observable<QiyasModel[]> {
    return this.http.get<QiyasModel[]>(`${this.base}/models`, { params: params as any });
  }

  getModel(modelId: string): Observable<QiyasModel> {
    return this.http.get<QiyasModel>(`${this.base}/models/${modelId}`);
  }

  createModel(data: Partial<QiyasModel>): Observable<QiyasModel> {
    return this.http.post<QiyasModel>(`${this.base}/models`, data);
  }

  updateModel(modelId: string, data: Partial<QiyasModel>): Observable<QiyasModel> {
    return this.http.put<QiyasModel>(`${this.base}/models/${modelId}`, data);
  }

  // ═══ Model Domains ═══

  listDomains(modelId: string): Observable<QiyasDomain[]> {
    return this.http.get<QiyasDomain[]>(`${this.base}/models/${modelId}/domains`);
  }

  createDomain(modelId: string, data: Partial<QiyasDomain>): Observable<QiyasDomain> {
    return this.http.post<QiyasDomain>(`${this.base}/models/${modelId}/domains`, data);
  }

  // ═══ Model Versioning ═══

  listModelVersions(modelId: string): Observable<{ versions: QiyasModelVersion[]; count: number }> {
    return this.http.get<{ versions: QiyasModelVersion[]; count: number }>(`${this.base}/models/${modelId}/versions`);
  }

  createModelVersion(modelId: string, data: Partial<QiyasModelVersion>): Observable<QiyasModelVersion> {
    return this.http.post<QiyasModelVersion>(`${this.base}/models/${modelId}/versions`, data);
  }

  publishModelVersion(versionId: string): Observable<QiyasModelVersion> {
    return this.http.post<QiyasModelVersion>(`${this.base}/model-versions/${versionId}/publish`, {});
  }

  // ═══ Assessments CRUD ═══

  listAssessments(params?: { status?: string; model_id?: string }): Observable<QiyasAssessment[]> {
    return this.http.get<QiyasAssessment[]>(`${this.base}/assessments`, { params: params as any });
  }

  getAssessment(id: string): Observable<QiyasAssessment> {
    return this.http.get<QiyasAssessment>(`${this.base}/assessments/${id}`);
  }

  createAssessment(data: Partial<QiyasAssessment>): Observable<QiyasAssessment> {
    return this.http.post<QiyasAssessment>(`${this.base}/assessments`, data);
  }

  updateAssessment(id: string, data: Partial<QiyasAssessment>): Observable<QiyasAssessment> {
    return this.http.put<QiyasAssessment>(`${this.base}/assessments/${id}`, data);
  }

  // ═══ Responses ═══

  listResponses(assessmentId: string): Observable<any[]> {
    return this.http.get<unknown[]>(`${this.base}/assessments/${assessmentId}/responses`);
  }

  saveResponse(assessmentId: string, data: any): Observable<any> {
    return this.http.post<any>(`${this.base}/assessments/${assessmentId}/responses`, data);
  }

  // ═══ Scores ═══

  getScores(assessmentId: string): Observable<any> {
    return this.http.get<any>(`${this.base}/assessments/${assessmentId}/scores`);
  }

  computeScores(assessmentId: string): Observable<{
    overallScore: number;
    maturityLevel: string;
    domainScores: { domainId: string; domainName: string; score: number; weight: number; weightedScore: number }[];
    computedAt: string;
  }> {
    return this.http.post<any>(`${this.base}/assessments/${assessmentId}/compute-scores`, {});
  }

  // ═══ Recommendations ═══

  listRecommendations(assessmentId?: string): Observable<{ recommendations: QiyasRecommendation[]; count: number }> {
    const params: Record<string, string | number | boolean> = {};
    if (assessmentId) params.assessmentId = assessmentId;
    return this.http.get<{ recommendations: QiyasRecommendation[]; count: number }>(`${this.base}/recommendations`, { params });
  }

  createRecommendation(data: Partial<QiyasRecommendation>): Observable<QiyasRecommendation> {
    return this.http.post<QiyasRecommendation>(`${this.base}/recommendations`, data);
  }

  updateRecommendationStatus(id: string, status: string): Observable<QiyasRecommendation> {
    return this.http.put<QiyasRecommendation>(`${this.base}/recommendations/${id}/status`, { status });
  }

  getImprovementPaths(assessmentId: string): Observable<{ paths: QiyasImprovementPath[]; count: number }> {
    return this.http.get<{ paths: QiyasImprovementPath[]; count: number }>(`${this.base}/assessments/${assessmentId}/improvement-paths`);
  }

  // ═══ Calibration ═══

  listCalibrationSessions(assessmentId?: string): Observable<{ sessions: QiyasCalibrationSession[]; count: number }> {
    const params: Record<string, string | number | boolean> = {};
    if (assessmentId) params.assessmentId = assessmentId;
    return this.http.get<{ sessions: QiyasCalibrationSession[]; count: number }>(`${this.base}/calibration-sessions`, { params });
  }

  createCalibrationSession(data: Partial<QiyasCalibrationSession>): Observable<QiyasCalibrationSession> {
    return this.http.post<QiyasCalibrationSession>(`${this.base}/calibration-sessions`, data);
  }

  addCalibrationEntry(sessionId: string, data: Partial<QiyasCalibrationEntry>): Observable<QiyasCalibrationEntry> {
    return this.http.post<QiyasCalibrationEntry>(`${this.base}/calibration-sessions/${sessionId}/entries`, data);
  }

  finalizeCalibration(sessionId: string): Observable<QiyasCalibrationSession> {
    return this.http.post<QiyasCalibrationSession>(`${this.base}/calibration-sessions/${sessionId}/finalize`, {});
  }

  // ═══ Evidence Scoring ═══

  getEvidenceScoringModels(): Observable<{ models: QiyasEvidenceScoringModel[]; count: number }> {
    return this.http.get<{ models: QiyasEvidenceScoringModel[]; count: number }>(`${this.base}/evidence-scoring-models`);
  }

  scoreEvidence(data: { evidence_id: string; scoring_model_id: string; criteria_scores: unknown[] }): Observable<QiyasEvidenceScore> {
    return this.http.post<QiyasEvidenceScore>(`${this.base}/evidence-scores`, data);
  }

  getEvidenceQualityMetrics(assessmentId?: string): Observable<{ metrics: QiyasEvidenceQualityMetric[]; count: number }> {
    const params: Record<string, string | number | boolean> = {};
    if (assessmentId) params.assessmentId = assessmentId;
    return this.http.get<{ metrics: QiyasEvidenceQualityMetric[]; count: number }>(`${this.base}/evidence-quality-metrics`, { params });
  }

  // ═══ Maturity Analytics ═══

  takeMaturitySnapshot(assessmentId: string): Observable<QiyasMaturitySnapshot> {
    return this.http.post<QiyasMaturitySnapshot>(`${this.base}/assessments/${assessmentId}/snapshot`, {});
  }

  getMaturitySnapshots(limit?: number): Observable<{ snapshots: QiyasMaturitySnapshot[]; count: number }> {
    const params: Record<string, string | number | boolean> = {};
    if (limit) params.limit = limit;
    return this.http.get<{ snapshots: QiyasMaturitySnapshot[]; count: number }>(`${this.base}/maturity-snapshots`, { params });
  }

  getProgressionHistory(domainId?: string): Observable<{ history: QiyasProgressionEntry[]; count: number }> {
    const params: Record<string, string | number | boolean> = {};
    if (domainId) params.domainId = domainId;
    return this.http.get<{ history: QiyasProgressionEntry[]; count: number }>(`${this.base}/progression-history`, { params });
  }

  getMaturityHeatmap(assessmentId: string): Observable<{ cells: QiyasHeatmapCell[]; count: number }> {
    return this.http.get<{ cells: QiyasHeatmapCell[]; count: number }>(`${this.base}/assessments/${assessmentId}/heatmap`);
  }

  getTargetProfiles(): Observable<{ profiles: QiyasTargetProfile[]; count: number }> {
    return this.http.get<{ profiles: QiyasTargetProfile[]; count: number }>(`${this.base}/target-profiles`);
  }

  upsertTargetProfile(data: Partial<QiyasTargetProfile>): Observable<QiyasTargetProfile> {
    return this.http.put<QiyasTargetProfile>(`${this.base}/target-profiles`, data);
  }

  // ═══ Benchmarks ═══

  listBenchmarkDatasets(): Observable<{ datasets: QiyasBenchmarkDataset[]; count: number }> {
    return this.http.get<{ datasets: QiyasBenchmarkDataset[]; count: number }>(`${this.base}/benchmark-datasets`);
  }

  createBenchmarkDataset(data: Partial<QiyasBenchmarkDataset>): Observable<QiyasBenchmarkDataset> {
    return this.http.post<QiyasBenchmarkDataset>(`${this.base}/benchmark-datasets`, data);
  }

  computeBenchmarkComparison(assessmentId: string, datasetId: string): Observable<QiyasBenchmarkComparison[]> {
    return this.http.post<QiyasBenchmarkComparison[]>(`${this.base}/assessments/${assessmentId}/benchmark-compare/${datasetId}`, {});
  }

  getBenchmarks(assessmentId: string): Observable<any[]> {
    return this.http.get<unknown[]>(`${this.base}/assessments/${assessmentId}/benchmarks`);
  }

  getBenchmarkPercentiles(assessmentId: string): Observable<any[]> {
    return this.http.get<unknown[]>(`${this.base}/assessments/${assessmentId}/benchmarks/percentiles`);
  }

  // ═══ Certification Readiness ═══

  getCertification(assessmentId: string): Observable<QiyasCertificationReadiness> {
    return this.http.get<QiyasCertificationReadiness>(`${this.base}/assessments/${assessmentId}/certification`);
  }

  computeCertificationReadiness(assessmentId: string): Observable<QiyasCertificationReadiness> {
    return this.http.post<QiyasCertificationReadiness>(`${this.base}/assessments/${assessmentId}/compute-certification`, {});
  }

  updateCertificationGap(gapId: string, status: string, evidence?: string): Observable<QiyasCertificationGap> {
    return this.http.put<QiyasCertificationGap>(`${this.base}/certification-gaps/${gapId}`, { status, evidence });
  }

  // ═══ Respondent Management ═══

  listRespondents(assessmentId: string): Observable<{ respondents: QiyasRespondent[]; count: number }> {
    return this.http.get<{ respondents: QiyasRespondent[]; count: number }>(`${this.base}/assessments/${assessmentId}/respondents`);
  }

  assignRespondent(assessmentId: string, data: Partial<QiyasRespondent>): Observable<QiyasRespondent> {
    return this.http.post<QiyasRespondent>(`${this.base}/assessments/${assessmentId}/respondents`, data);
  }

  removeRespondent(respondentId: string): Observable<{ deleted: boolean }> {
    return this.http.delete<{ deleted: boolean }>(`${this.base}/respondents/${respondentId}`);
  }

  getRespondentProgress(assessmentId: string): Observable<QiyasRespondentProgress> {
    return this.http.get<QiyasRespondentProgress>(`${this.base}/assessments/${assessmentId}/respondent-progress`);
  }

  // ═══ Assessment Scoping ═══

  listScopes(assessmentId: string): Observable<{ scopes: QiyasScope[]; count: number }> {
    return this.http.get<{ scopes: QiyasScope[]; count: number }>(`${this.base}/assessments/${assessmentId}/scopes`);
  }

  addScope(assessmentId: string, data: Partial<QiyasScope>): Observable<QiyasScope> {
    return this.http.post<QiyasScope>(`${this.base}/assessments/${assessmentId}/scopes`, data);
  }

  removeScope(scopeId: string): Observable<{ deleted: boolean }> {
    return this.http.delete<{ deleted: boolean }>(`${this.base}/scopes/${scopeId}`);
  }

  // ═══ Question Bank ═══

  listQuestions(params?: { domainId?: string; groupId?: string }): Observable<{ questions: QiyasQuestion[]; count: number }> {
    return this.http.get<{ questions: QiyasQuestion[]; count: number }>(`${this.base}/questions`, { params: params as any });
  }

  createQuestion(data: Partial<QiyasQuestion>): Observable<QiyasQuestion> {
    return this.http.post<QiyasQuestion>(`${this.base}/questions`, data);
  }

  updateQuestion(questionId: string, data: Partial<QiyasQuestion>): Observable<QiyasQuestion> {
    return this.http.put<QiyasQuestion>(`${this.base}/questions/${questionId}`, data);
  }

  deleteQuestion(questionId: string): Observable<{ deleted: boolean }> {
    return this.http.delete<{ deleted: boolean }>(`${this.base}/questions/${questionId}`);
  }

  listQuestionGroups(modelId?: string): Observable<{ groups: QiyasQuestionGroup[]; count: number }> {
    const params: Record<string, string | number | boolean> = {};
    if (modelId) params.modelId = modelId;
    return this.http.get<{ groups: QiyasQuestionGroup[]; count: number }>(`${this.base}/question-groups`, { params });
  }

  // ═══ Cross-module: GRC Triggers ═══

  getGrcTriggers(limit?: number): Observable<{ triggers: QiyasGrcTrigger[]; count: number }> {
    const params: Record<string, string | number | boolean> = {};
    if (limit) params.limit = limit;
    return this.http.get<{ triggers: QiyasGrcTrigger[]; count: number }>(`${this.base}/grc-triggers`, { params });
  }

  getAutoTasks(limit?: number): Observable<{ tasks: QiyasAutoTask[]; count: number }> {
    const params: Record<string, string | number | boolean> = {};
    if (limit) params.limit = limit;
    return this.http.get<{ tasks: QiyasAutoTask[]; count: number }>(`${this.base}/auto-tasks`, { params });
  }

  getMaturitySync(limit?: number): Observable<{ syncs: unknown[]; count: number }> {
    const params: Record<string, string | number | boolean> = {};
    if (limit) params.limit = limit;
    return this.http.get<{ syncs: unknown[]; count: number }>(`${this.base}/maturity-sync`, { params });
  }
}
