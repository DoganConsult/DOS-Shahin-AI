import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '@env/environment';
import { Control, Framework } from '@app/core/models/grc.models';

/**
 * GRC Compliance sub-service.
 * Covers: Controls, Frameworks, Compliance overview, Obligations, Evidence,
 * Evidence Catalog, Control Lifecycle, Gap Analysis, NCA / SAMA assessments,
 * and Assessment Templates.
 */
@Injectable({ providedIn: 'root' })
export class GrcComplianceService {
  private api = environment.apiUrl;

  constructor(private http: HttpClient) {}

  // === Compliance ===
  getComplianceOverview(): Observable<any> { return this.http.get(`${this.api}/compliance/overview`); }
  getFrameworkMapping(id: string): Observable<any> { return this.http.get(`${this.api}/compliance/frameworks/${id}/mapping`); }
  getGapAnalysis(frameworkId: string): Observable<any> { return this.http.get(`${this.api}/compliance/gap-analysis/${frameworkId}`); }
  getRemediations(): Observable<any> { return this.http.get(`${this.api}/compliance/remediations`); }
  createRemediation(data: any): Observable<any> { return this.http.post(`${this.api}/compliance/remediations`, data); }
  getAIGapAnalysis(frameworkId: string): Observable<any> { return this.http.get(`${this.api}/ai/gap-analysis/${frameworkId}`); }

  // === Controls ===
  getControls(): Observable<Control[]> { return this.http.get<Control[]>(`${this.api}/dashboard/controls`); }
  getControlsList(): Observable<any> { return this.http.get(`${this.api}/controls`); }
  createControl(data: any): Observable<any> { return this.http.post(`${this.api}/controls`, data); }
  updateControl(id: string, data: any): Observable<any> { return this.http.put(`${this.api}/controls/${id}`, data); }
  deleteControl(id: string): Observable<any> { return this.http.delete(`${this.api}/controls/${id}`); }
  bulkAssignControlTeam(controlIds: string[], ownerTeamId: string | null): Observable<any> {
    return this.http.post(`${this.api}/controls/bulk-assign-team`, { control_ids: controlIds, owner_team_id: ownerTeamId });
  }
  testControl(id: string, data: any): Observable<any> { return this.http.post(`${this.api}/compliance/controls/${id}/test`, data); }

  // Control Dependency Graph
  getControlDependencyGraph(controlId: string, maxDepth: number = 5): Observable<any> {
    return this.http.get(`${this.api}/compliance/controls/${controlId}/dependency-graph`, {
      params: { maxDepth: maxDepth.toString() }
    });
  }
  getControlDownstream(controlId: string, maxDepth: number = 10): Observable<any> {
    return this.http.get(`${this.api}/compliance/controls/${controlId}/downstream`, {
      params: { maxDepth: maxDepth.toString() }
    });
  }

  // === Control Lifecycle (backend: /api/lifecycle) ===
  getControlLifecycleStates(): Observable<any> { return this.http.get(`${this.api}/lifecycle/states`); }
  getControlLifecycleById(controlId: string): Observable<any> { return this.http.get(`${this.api}/lifecycle/${controlId}`); }
  transitionControlState(controlId: string, data: any): Observable<any> { return this.http.post(`${this.api}/lifecycle/${controlId}/transition`, data); }
  getControlLifecycleHistory(controlId: string): Observable<any> { return this.http.get(`${this.api}/lifecycle/${controlId}/history`); }

  // === Frameworks ===
  getFrameworks(): Observable<Framework[]> { return this.http.get<Framework[]>(`${this.api}/dashboard/frameworks`); }
  createFramework(data: any): Observable<any> { return this.http.post(`${this.api}/frameworks`, data); }
  updateFramework(id: string, data: any): Observable<any> { return this.http.put(`${this.api}/frameworks/${id}`, data); }
  deleteFramework(id: string): Observable<any> { return this.http.delete(`${this.api}/frameworks/${id}`); }

  // === Obligation Register ===
  getObligations(filters?: { frameworkId?: string; status?: string; ownerId?: string; search?: string; limit?: number; offset?: number }): Observable<{ obligations: unknown[]; total: number }> {
    let params = new HttpParams();
    if (filters?.frameworkId) params = params.set('frameworkId', filters.frameworkId);
    if (filters?.status) params = params.set('status', filters.status);
    if (filters?.ownerId) params = params.set('ownerId', filters.ownerId);
    if (filters?.search) params = params.set('search', filters.search);
    if (filters?.limit) params = params.set('limit', filters.limit.toString());
    if (filters?.offset) params = params.set('offset', filters.offset.toString());
    return this.http.get<{ obligations: unknown[]; total: number }>(`${this.api}/compliance/obligations`, { params });
  }
  getObligationById(obligationId: string): Observable<any> {
    return this.http.get(`${this.api}/compliance/obligations/${obligationId}`);
  }
  createObligation(data: any): Observable<any> {
    return this.http.post(`${this.api}/compliance/obligations`, data);
  }
  updateObligation(obligationId: string, data: any): Observable<any> {
    return this.http.put(`${this.api}/compliance/obligations/${obligationId}`, data);
  }
  deleteObligation(obligationId: string): Observable<any> {
    return this.http.delete(`${this.api}/compliance/obligations/${obligationId}`);
  }
  getObligationControls(obligationId: string): Observable<{ controls: unknown[]; count: number }> {
    return this.http.get<{ controls: unknown[]; count: number }>(`${this.api}/compliance/obligations/${obligationId}/controls`);
  }
  mapControlToObligation(obligationId: string, controlId: string, mappingType: string = 'direct', coveragePercent: number = 100): Observable<any> {
    return this.http.post(`${this.api}/compliance/obligations/${obligationId}/controls/${controlId}`, { mappingType, coveragePercent });
  }
  unmapControlFromObligation(obligationId: string, controlId: string): Observable<any> {
    return this.http.delete(`${this.api}/compliance/obligations/${obligationId}/controls/${controlId}`);
  }
  autoMapObligation(obligationId: string): Observable<{ mapped: number; errors: string[] }> {
    return this.http.post<{ mapped: number; errors: string[] }>(`${this.api}/compliance/obligations/${obligationId}/auto-map`, {});
  }
  autoMapAllObligationsForFramework(frameworkId: string): Observable<{ totalObligations: number; totalMapped: number; errors: string[] }> {
    return this.http.post<{ totalObligations: number; totalMapped: number; errors: string[] }>(`${this.api}/compliance/obligations/framework/${frameworkId}/auto-map-all`, {});
  }

  // === Evidence ===
  getEvidence(): Observable<any> { return this.http.get(`${this.api}/evidence`); }
  getEvidenceById(id: string): Observable<any> { return this.http.get(`${this.api}/evidence/control/${id}`); }
  submitEvidence(data: any): Observable<any> { return this.http.post(`${this.api}/evidence`, data); }
  submitEvidenceVersion(evidenceId: string, data: any): Observable<any> { return this.http.post(`${this.api}/evidence/${evidenceId}/version`, data); }
  verifyHashChain(): Observable<any> { return this.http.get(`${this.api}/evidence/verify`); }
  getExpiringEvidence(): Observable<any> { return this.http.get(`${this.api}/evidence/expiring`); }
  getEvidenceConnectors(): Observable<any> { return this.http.get(`${this.api}/evidence/connectors`); }
  getEvidenceStatus(): Observable<any> { return this.http.get(`${this.api}/evidence/status`); }
  collectEvidence(connectorId: string = 'all'): Observable<any> { return this.http.post(`${this.api}/evidence/collect`, { connectorId }); }
  checkEvidencePolicy(controlId: string, requiredTypes: string[]): Observable<any> { return this.http.post(`${this.api}/evidence/policy-check`, { controlId, requiredTypes }); }
  getEvidenceSchedules(): Observable<any> { return this.http.get(`${this.api}/evidence/schedules`); }
  createEvidenceSchedule(data: any): Observable<any> { return this.http.post(`${this.api}/evidence/schedules`, data); }
  updateEvidenceSchedule(id: string, data: any): Observable<any> { return this.http.put(`${this.api}/evidence/schedules/${id}`, data); }
  deleteEvidenceSchedule(id: string): Observable<any> { return this.http.delete(`${this.api}/evidence/schedules/${id}`); }
  uploadEvidenceFile(evidenceId: string, file: File): Observable<any> {
    const fd = new FormData(); fd.append('file', file);
    return this.http.post(`${this.api}/evidence/${evidenceId}/upload`, fd);
  }
  downloadEvidenceFile(evidenceId: string): Observable<Blob> { return this.http.get(`${this.api}/evidence/${evidenceId}/download`, { responseType: 'blob' }); }
  listEvidenceFiles(evidenceId: string): Observable<any> { return this.http.get(`${this.api}/evidence/${evidenceId}/files`); }
  getEvidenceRequirements(params: { controlId?: string; controlCode?: string; framework?: string }): Observable<any> {
    let qs = '';
    if (params.controlId) qs = `?controlId=${encodeURIComponent(params.controlId)}`;
    else if (params.controlCode) qs = `?controlCode=${encodeURIComponent(params.controlCode)}`;
    else if (params.framework) qs = `?framework=${encodeURIComponent(params.framework)}`;
    return this.http.get(`${this.api}/evidence/requirements${qs}`);
  }
  getEvidenceRequirementsSummary(): Observable<any> { return this.http.get(`${this.api}/evidence/requirements/summary`); }
  getEvidenceRequirementsTypes(): Observable<any> { return this.http.get(`${this.api}/evidence/requirements/types`); }
  getEvidenceCoverageDashboard(): Observable<any> { return this.http.get(`${this.api}/evidence/coverage-dashboard`); }
  getEvidenceOverviewStats(): Observable<any> { return this.http.get(`${this.api}/evidence/overview/stats`); }

  // === Evidence Catalog (backend: /api/evidence-catalog) ===
  getEvidenceCatalog(): Observable<any> { return this.http.get(`${this.api}/evidence-catalog`); }
  getEvidenceCatalogByControl(controlId: string): Observable<any> { return this.http.get(`${this.api}/evidence-catalog/catalog/${controlId}`); }
  updateEvidenceRequirement(controlId: string, data: any): Observable<any> { return this.http.put(`${this.api}/evidence-catalog/catalog/${controlId}`, data); }

  // === Remediation Tasks (backend: /api/remediation) ===
  getRemediationTasks(): Observable<any> { return this.http.get(`${this.api}/remediation`); }
  getRemediationTaskById(id: string): Observable<any> { return this.http.get(`${this.api}/remediation/${id}`); }
  createRemediationTask(data: any): Observable<any> { return this.http.post(`${this.api}/remediation`, data); }
  updateRemediationTask(id: string, data: any): Observable<any> { return this.http.put(`${this.api}/remediation/${id}`, data); }
  deleteRemediationTask(id: string): Observable<any> { return this.http.delete(`${this.api}/remediation/${id}`); }
  checkOverdueRemediations(): Observable<any> { return this.http.post(`${this.api}/remediation/check-overdue`, {}); }

  // === Scoring Policies (backend: /api/scoring-policies) ===
  getScoringPolicies(): Observable<any> { return this.http.get(`${this.api}/scoring-policies`); }
  createScoringPolicy(data: any): Observable<any> { return this.http.post(`${this.api}/scoring-policies`, data); }
  applyScoringPolicy(policyId: string, assessmentId: string): Observable<any> { return this.http.post(`${this.api}/scoring-policies/${policyId}/apply/${assessmentId}`, {}); }
  updateScoringPolicy(id: string, data: any): Observable<any> { return this.http.put(`${this.api}/scoring-policies/${id}`, data); }
  deleteScoringPolicy(id: string): Observable<any> { return this.http.delete(`${this.api}/scoring-policies/${id}`); }

  // === NCA ECC Self-Assessment ===
  getNCAStructure(): Observable<any> { return this.http.get(`${this.api}/nca-assessment/structure`); }
  listNCAAssessments(): Observable<any> { return this.http.get(`${this.api}/nca-assessment`); }
  createNCAAssessment(data?: { title?: string }): Observable<any> { return this.http.post(`${this.api}/nca-assessment`, data || {}); }
  getNCAAssessment(id: string): Observable<any> { return this.http.get(`${this.api}/nca-assessment/${id}`); }
  updateNCAItems(id: string, updates: unknown[]): Observable<any> { return this.http.put(`${this.api}/nca-assessment/${id}/items`, { updates }); }
  deleteNCAAssessment(id: string): Observable<any> { return this.http.delete(`${this.api}/nca-assessment/${id}`); }
  exportNCAAssessment(id: string, format: 'pdf' | 'excel' | 'html', lang?: string): string {
    const langParam = format === 'pdf' && lang ? `?lang=${lang}` : '';
    return `${this.api}/nca-assessment/${id}/export/${format}${langParam}`;
  }

  // === SAMA CSF Self-Assessment ===
  getSAMAStructure(): Observable<any> { return this.http.get(`${this.api}/sama-assessment/structure`); }
  listSAMAAssessments(): Observable<any> { return this.http.get(`${this.api}/sama-assessment`); }
  createSAMAAssessment(data?: { title?: string }): Observable<any> { return this.http.post(`${this.api}/sama-assessment`, data || {}); }
  getSAMAAssessment(id: string): Observable<any> { return this.http.get(`${this.api}/sama-assessment/${id}`); }
  updateSAMAItems(id: string, updates: unknown[]): Observable<any> { return this.http.put(`${this.api}/sama-assessment/${id}/items`, { updates }); }
  deleteSAMAAssessment(id: string): Observable<any> { return this.http.delete(`${this.api}/sama-assessment/${id}`); }
  exportSAMAAssessment(id: string, format: 'pdf' | 'excel' | 'html', lang?: string): string {
    const langParam = format === 'pdf' && lang ? `?lang=${lang}` : '';
    return `${this.api}/sama-assessment/${id}/export/${format}${langParam}`;
  }

  // === Assessment Templates (backend: /api/assessment-templates) ===
  getAssessmentTemplates(filters?: { category?: string; industry?: string; difficulty?: string; search?: string; sector?: string }): Observable<any> {
    let params = new HttpParams();
    if (filters) {
      if (filters.category) params = params.set('category', filters.category);
      if (filters.industry) params = params.set('industry', filters.industry);
      if (filters.difficulty) params = params.set('difficulty', filters.difficulty);
      if (filters.search) params = params.set('search', filters.search);
      if (filters.sector) params = params.set('sector', filters.sector);
    }
    return this.http.get(`${this.api}/assessment-templates`, { params });
  }
  getAssessmentTemplateById(id: string): Observable<any> { return this.http.get(`${this.api}/assessment-templates/${id}`); }
  getAssessmentTemplateDetail(id: string): Observable<any> { return this.http.get(`${this.api}/assessment-templates/${id}/detail`); }
  getAssessmentTemplateQuestions(id: string): Observable<any> { return this.http.get(`${this.api}/assessment-templates/${id}/questions`); }
  getAssessmentTemplateCategories(): Observable<any> { return this.http.get(`${this.api}/assessment-templates/categories`); }
  getQuestionAIGuide(templateId: string, questionId: string): Observable<any> { return this.http.get(`${this.api}/assessment-templates/${templateId}/ai-guide/${questionId}`); }
  startAssessmentFromTemplate(templateId: string, title?: string): Observable<any> { return this.http.post(`${this.api}/assessment-templates/${templateId}/start`, { title }); }
  getAssessmentProgress(assessmentId: string): Observable<any> { return this.http.get(`${this.api}/assessment-templates/assessment/${assessmentId}/progress`); }
  getAssessmentAISummary(assessmentId: string): Observable<any> { return this.http.get(`${this.api}/assessment-templates/assessment/${assessmentId}/ai-summary`); }
  saveAssessmentResponse(assessmentId: string, questionId: string, answer: unknown, score: number): Observable<any> { return this.http.put(`${this.api}/assessment-templates/assessment/${assessmentId}/respond`, { questionId, answer, score }); }
  getTenantTemplateConfig(): Observable<any> { return this.http.get(`${this.api}/assessment-templates/tenant-config`); }
  updateTenantTemplateConfig(configs: { templateId: string; enabled: boolean }[]): Observable<any> { return this.http.put(`${this.api}/assessment-templates/tenant-config`, { configs }); }
  createAssessmentTemplate(data: any): Observable<any> { return this.http.post(`${this.api}/assessment-templates`, data); }
  updateAssessmentTemplate(id: string, data: any): Observable<any> { return this.http.put(`${this.api}/assessment-templates/${id}`, data); }
  deleteAssessmentTemplate(id: string): Observable<any> { return this.http.delete(`${this.api}/assessment-templates/${id}`); }

  // === Exceptions ===
  getExceptions(workspaceId: string): Observable<any> { return this.http.get(`${this.api}/exceptions?workspace_id=${workspaceId}`); }
  getExceptionById(id: string): Observable<any> { return this.http.get(`${this.api}/exceptions/${id}`); }
  createException(data: any): Observable<any> { return this.http.post(`${this.api}/exceptions`, data); }
  updateException(id: string, data: any): Observable<any> { return this.http.put(`${this.api}/exceptions/${id}`, data); }
  deleteException(id: string): Observable<any> { return this.http.delete(`${this.api}/exceptions/${id}`); }

  // === Exception Governance (backend: /api/exception-governance) ===
  getExceptionGovernanceRules(): Observable<any> { return this.http.get(`${this.api}/exception-governance/rules`); }
  getExceptionGovernanceById(id: string): Observable<any> { return this.http.get(`${this.api}/exception-governance/${id}`); }
  createExceptionGovernance(data: any): Observable<any> { return this.http.post(`${this.api}/exception-governance`, data); }
  updateExceptionGovernance(id: string, data: any): Observable<any> { return this.http.put(`${this.api}/exception-governance/${id}`, data); }
  approveException(id: string, data: any): Observable<any> { return this.http.post(`${this.api}/exception-governance/${id}/approve`, data); }

  // === Findings ===
  getFindings(workspaceId: string): Observable<any> { return this.http.get(`${this.api}/findings?workspace_id=${workspaceId}`); }
  getFindingById(id: string): Observable<any> { return this.http.get(`${this.api}/findings/${id}`); }
  createFinding(data: any): Observable<any> { return this.http.post(`${this.api}/findings`, data); }
  updateFinding(id: string, data: any): Observable<any> { return this.http.put(`${this.api}/findings/${id}`, data); }
  deleteFinding(id: string): Observable<any> { return this.http.delete(`${this.api}/findings/${id}`); }

  // === Audit ===
  getAuditPlans(): Observable<any> { return this.http.get(`${this.api}/audit/plans`); }
  createAuditPlan(data: any): Observable<any> { return this.http.post(`${this.api}/audit/plans`, data); }
  getAuditFindings(): Observable<any> { return this.http.get(`${this.api}/audit/findings`); }
  getAuditReport(planId: string): Observable<any> { return this.http.get(`${this.api}/audit/plans/${planId}/report`); }
  getAIAuditPrep(frameworkId: string): Observable<any> { return this.http.get(`${this.api}/ai/audit-prep/${frameworkId}`); }

  // === Regulation Compiler (backend: /api/regulation-compiler) ===
  compileRegulation(instrumentId: string): Observable<any> { return this.http.get(`${this.api}/regulation-compiler/${instrumentId}`); }

  // === Registry ===
  getRegulators(): Observable<any> { return this.http.get(`${this.api}/registry/regulators`); }
  getSectors(): Observable<any> { return this.http.get(`${this.api}/registry/sectors`); }
  getFrameworkHierarchy(id: string): Observable<any> { return this.http.get(`${this.api}/registry/frameworks/${id}/hierarchy`); }

  // === KSA Hub (Heatmap, Framework Mapping, DPIA) ===
  getKSAHeatmap(): Observable<any> { return this.http.get(`${this.api}/ksa/heatmap`); }
  getKSAFrameworkMapping(): Observable<any> { return this.http.get(`${this.api}/ksa/framework-mapping`); }
  listDPIAs(): Observable<any> { return this.http.get(`${this.api}/ksa/dpia`); }
  createDPIA(data: any): Observable<any> { return this.http.post(`${this.api}/ksa/dpia`, data); }
  getDPIA(id: string): Observable<any> { return this.http.get(`${this.api}/ksa/dpia/${id}`); }
  updateDPIA(id: string, data: any): Observable<any> { return this.http.put(`${this.api}/ksa/dpia/${id}`, data); }
  deleteDPIA(id: string): Observable<any> { return this.http.delete(`${this.api}/ksa/dpia/${id}`); }

  // === Policy-as-Code (backend: /api/policy-code) ===
  validatePolicyRule(rule: any): Observable<any> { return this.http.post(`${this.api}/policy-code/validate`, rule); }
  getPolicyRules(policyId: string): Observable<any> { return this.http.get(`${this.api}/policy-code/policies/${policyId}/rules`); }
  savePolicyRules(policyId: string, rules: unknown[]): Observable<any> { return this.http.put(`${this.api}/policy-code/policies/${policyId}/rules`, { rules }); }
  executePolicyRules(policyId: string, context: any): Observable<any> { return this.http.post(`${this.api}/policy-code/policies/${policyId}/execute`, { context }); }

  // === Maturity Assessment ===
  getMaturityQuestions(category?: string): Observable<any> { return this.http.get(`${this.api}/maturity/questions${category ? '?category=' + category : ''}`); }
  getMaturityCategories(): Observable<any> { return this.http.get(`${this.api}/maturity/categories`); }
  startMaturityAssessment(): Observable<any> { return this.http.post(`${this.api}/maturity/start`, {}); }
  getLatestMaturity(): Observable<any> { return this.http.get(`${this.api}/maturity/latest`); }
  saveMaturityResponses(id: string, responses: unknown[]): Observable<any> { return this.http.put(`${this.api}/maturity/${id}/respond`, { responses }); }
  getMaturityScore(id: string): Observable<any> { return this.http.get(`${this.api}/maturity/${id}/score`); }
  autoDeployMaturity(id: string): Observable<any> { return this.http.post(`${this.api}/maturity/${id}/auto-deploy`, {}); }

  // === Privacy Operations (backend: /api/privacy-ops) ===
  getPrivacyRopa(): Observable<any> { return this.http.get(`${this.api}/privacy-ops/ropa`); }
  getPrivacyDSRs(): Observable<any> { return this.http.get(`${this.api}/privacy-ops/dsr`); }
  createPrivacyDSR(data: any): Observable<any> { return this.http.post(`${this.api}/privacy-ops/dsr`, data); }
  getPrivacyConsent(): Observable<any> { return this.http.get(`${this.api}/privacy-ops/consent`); }
  getPrivacyBreaches(): Observable<any> { return this.http.get(`${this.api}/privacy-ops/breaches`); }
  getPrivacyRetention(): Observable<any> { return this.http.get(`${this.api}/privacy-ops/retention`); }
}
