import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '@env/environment';

export interface PolicyDto {
  id: string;
  title: string;
  status: string;
  version?: number;
  owner?: string;
  content?: string;
  frameworks?: string[];
}

export interface CommitteeDto {
  id: string;
  name: string;
  description?: string;
  chairId?: string;
  status?: string;
}

export interface CommitteeMemberDto {
  id: string;
  committeeId: string;
  userId: string;
  role?: string;
  isChair?: boolean;
}

export interface MeetingDto {
  id: string;
  committeeId?: string;
  title?: string;
  date?: string;
  status?: string;
}

export interface AgendaItemDto {
  id: string;
  meetingId: string;
  title?: string;
  order?: number;
}

export interface DecisionDto {
  id: string;
  title?: string;
  status?: string;
  meetingId?: string;
}

export interface DecisionVoteDto {
  id: string;
  decisionId: string;
  userId: string;
  vote: string;
}

export interface ProcedureDto {
  id: string;
  title: string;
  policyId?: string;
  status?: string;
  version?: number;
}

export interface PolicyRuleDto {
  id?: string;
  policyId: string;
  rule: Record<string, unknown>;
}

export interface GovernanceOverviewDto {
  totalPolicies: number;
  policiesInReview: number;
  overdueReviews: number;
  totalCommittees: number;
  complianceScore: number;
}

@Injectable({ providedIn: 'root' })
export class GovernanceApiService {
  private readonly http = inject(HttpClient);
  private readonly base = environment.apiUrl;

  getOverview(): Observable<GovernanceOverviewDto> {
    return this.http.get<GovernanceOverviewDto>(`${this.base}/governance/overview`);
  }

  getPolicies(): Observable<PolicyDto[]> {
    return this.http.get<PolicyDto[]>(`${this.base}/policies`);
  }

  createPolicy(data: any): Observable<PolicyDto> {
    return this.http.post<PolicyDto>(`${this.base}/policies`, data);
  }

  updatePolicy(id: string, data: any): Observable<PolicyDto> {
    return this.http.put<PolicyDto>(`${this.base}/policies/${id}`, data);
  }

  deletePolicy(id: string): Observable<{ message: string }> {
    return this.http.delete<{ message: string }>(`${this.base}/policies/${id}`);
  }

  approvePolicy(id: string): Observable<PolicyDto> {
    return this.http.post<PolicyDto>(`${this.base}/policies/${id}/approve`, {});
  }

  getPolicyVersions(id: string): Observable<PolicyDto[]> {
    return this.http.get<PolicyDto[]>(`${this.base}/policies/${id}/versions`);
  }

  rejectPolicy(id: string, reason?: string): Observable<PolicyDto> {
    return this.http.post<PolicyDto>(`${this.base}/governance/policies/${id}/reject`, { reason });
  }

  publishPolicy(id: string): Observable<PolicyDto> {
    return this.http.post<PolicyDto>(`${this.base}/governance/policies/${id}/publish`, {});
  }

  getCommittees(): Observable<CommitteeDto[]> {
    return this.http.get<CommitteeDto[]>(`${this.base}/governance/committees`);
  }

  createCommittee(data: any): Observable<CommitteeDto> {
    return this.http.post<CommitteeDto>(`${this.base}/governance/committees`, data);
  }

  updateCommittee(id: string, data: any): Observable<CommitteeDto> {
    return this.http.put<CommitteeDto>(`${this.base}/governance/committees/${id}`, data);
  }

  deleteCommittee(id: string): Observable<{ message: string }> {
    return this.http.delete<{ message: string }>(`${this.base}/governance/committees/${id}`);
  }

  getCommitteeMembers(committeeId: string): Observable<CommitteeMemberDto[]> {
    return this.http.get<CommitteeMemberDto[]>(`${this.base}/governance/committees/${committeeId}/members`);
  }

  addCommitteeMember(committeeId: string, data: any): Observable<CommitteeMemberDto> {
    return this.http.post<CommitteeMemberDto>(`${this.base}/governance/committees/${committeeId}/members`, data);
  }

  removeCommitteeMember(committeeId: string, memberId: string): Observable<{ message: string }> {
    return this.http.delete<{ message: string }>(`${this.base}/governance/committees/${committeeId}/members/${memberId}`);
  }

  setCommitteeChair(committeeId: string, memberId: string): Observable<CommitteeMemberDto> {
    return this.http.patch<CommitteeMemberDto>(`${this.base}/governance/committees/${committeeId}/members/${memberId}/chair`, {});
  }

  getCommitteeMeetings(committeeId: string): Observable<MeetingDto[]> {
    return this.http.get<MeetingDto[]>(`${this.base}/governance/committees/${committeeId}/meetings`);
  }

  createMeeting(data: any): Observable<MeetingDto> {
    return this.http.post<MeetingDto>(`${this.base}/governance/meetings`, data);
  }

  updateMeeting(id: string, data: any): Observable<MeetingDto> {
    return this.http.put<MeetingDto>(`${this.base}/governance/meetings/${id}`, data);
  }

  deleteMeeting(id: string): Observable<{ message: string }> {
    return this.http.delete<{ message: string }>(`${this.base}/governance/meetings/${id}`);
  }

  getMeetingAgenda(meetingId: string): Observable<AgendaItemDto[]> {
    return this.http.get<AgendaItemDto[]>(`${this.base}/governance/meetings/${meetingId}/agenda`);
  }

  addAgendaItem(meetingId: string, data: any): Observable<AgendaItemDto> {
    return this.http.post<AgendaItemDto>(`${this.base}/governance/meetings/${meetingId}/agenda`, data);
  }

  deleteAgendaItem(id: string): Observable<{ message: string }> {
    return this.http.delete<{ message: string }>(`${this.base}/governance/agenda/${id}`);
  }

  createDecision(data: any): Observable<DecisionDto> {
    return this.http.post<DecisionDto>(`${this.base}/governance/decisions`, data);
  }

  updateDecision(id: string, data: any): Observable<DecisionDto> {
    return this.http.put<DecisionDto>(`${this.base}/governance/decisions/${id}`, data);
  }

  getDecisionVotes(decisionId: string): Observable<DecisionVoteDto[]> {
    return this.http.get<DecisionVoteDto[]>(`${this.base}/governance/decisions/${decisionId}/votes`);
  }

  castDecisionVote(decisionId: string, data: any): Observable<DecisionVoteDto> {
    return this.http.post<DecisionVoteDto>(`${this.base}/governance/decisions/${decisionId}/votes`, data);
  }

  getGovernanceCalendar(): Observable<Record<string, unknown>[]> {
    return this.http.get<Record<string, unknown>[]>(`${this.base}/governance/calendar`);
  }

  validatePolicyRule(rule: any): Observable<{ valid: boolean; errors?: string[] }> {
    return this.http.post<{ valid: boolean; errors?: string[] }>(`${this.base}/policy-code/validate`, rule);
  }

  getPolicyRules(policyId: string): Observable<PolicyRuleDto[]> {
    return this.http.get<PolicyRuleDto[]>(`${this.base}/policy-code/policies/${policyId}/rules`);
  }

  savePolicyRules(policyId: string, rules: Record<string, unknown>[]): Observable<{ message: string }> {
    return this.http.put<{ message: string }>(`${this.base}/policy-code/policies/${policyId}/rules`, { rules });
  }

  executePolicyRules(policyId: string, context: any): Observable<Record<string, unknown>> {
    return this.http.post<Record<string, unknown>>(`${this.base}/policy-code/policies/${policyId}/execute`, { context });
  }

  getProcedures(): Observable<ProcedureDto[]> {
    return this.http.get<ProcedureDto[]>(`${this.base}/policy-lifecycle/procedures`);
  }

  getProcedure(id: string): Observable<ProcedureDto> {
    return this.http.get<ProcedureDto>(`${this.base}/policy-lifecycle/procedures/${id}`);
  }

  createProcedure(data: any): Observable<ProcedureDto> {
    return this.http.post<ProcedureDto>(`${this.base}/policy-lifecycle/procedures`, data);
  }

  updateProcedure(id: string, data: any): Observable<ProcedureDto> {
    return this.http.put<ProcedureDto>(`${this.base}/policy-lifecycle/procedures/${id}`, data);
  }

  deleteProcedure(id: string): Observable<{ message: string }> {
    return this.http.delete<{ message: string }>(`${this.base}/policy-lifecycle/procedures/${id}`);
  }

  approveProcedure(id: string): Observable<ProcedureDto> {
    return this.http.post<ProcedureDto>(`${this.base}/policy-lifecycle/procedures/${id}/approve`, {});
  }

  getProcedureVersions(id: string): Observable<ProcedureDto[]> {
    return this.http.get<ProcedureDto[]>(`${this.base}/policy-lifecycle/procedures/${id}/versions`);
  }

  getPolicyProcedures(policyId: string): Observable<ProcedureDto[]> {
    return this.http.get<ProcedureDto[]>(`${this.base}/policy-lifecycle/policies/${policyId}/procedures`);
  }

  getPolicyLifecycleList(): Observable<PolicyDto[]> {
    return this.http.get<PolicyDto[]>(`${this.base}/policy-lifecycle/policies`);
  }

  // ── Workload ──────────────────────────────────────────────────────
  getWorkloadOverview(): Observable<any> { return this.http.get(`${this.base}/governance/workload`); }
  getOwnerWorkload(ownerId: string): Observable<any> { return this.http.get(`${this.base}/governance/workload/owner/${ownerId}`); }

  // ── Delegations ───────────────────────────────────────────────────
  getDelegations(): Observable<any> { return this.http.get(`${this.base}/governance/delegations`); }
  getDelegation(id: string): Observable<any> { return this.http.get(`${this.base}/governance/delegations/${id}`); }
  getExpiringDelegations(): Observable<any> { return this.http.get(`${this.base}/governance/delegations/expiring`); }
  getDelegationConflicts(): Observable<any> { return this.http.get(`${this.base}/governance/delegations/conflicts`); }
  getAuthorityLevels(): Observable<any> { return this.http.get(`${this.base}/governance/delegations/authority-levels`); }
  upsertAuthorityLevel(data: any): Observable<any> { return this.http.post(`${this.base}/governance/delegations/authority-levels`, data); }
  createDelegation(data: any): Observable<any> { return this.http.post(`${this.base}/governance/delegations`, data); }
  updateDelegation(id: string, data: any): Observable<any> { return this.http.put(`${this.base}/governance/delegations/${id}`, data); }
  revokeDelegation(id: string): Observable<any> { return this.http.post(`${this.base}/governance/delegations/${id}/revoke`, {}); }

  // ── Objectives ────────────────────────────────────────────────────
  getObjectives(): Observable<any> { return this.http.get(`${this.base}/governance/objectives`); }
  getObjective(id: string): Observable<any> { return this.http.get(`${this.base}/governance/objectives/${id}`); }
  getObjectivesTree(): Observable<any> { return this.http.get(`${this.base}/governance/objectives/tree`); }
  createObjective(data: any): Observable<any> { return this.http.post(`${this.base}/governance/objectives`, data); }
  updateObjective(id: string, data: any): Observable<any> { return this.http.put(`${this.base}/governance/objectives/${id}`, data); }
  deleteObjective(id: string): Observable<any> { return this.http.delete(`${this.base}/governance/objectives/${id}`); }

  // ── Charters ──────────────────────────────────────────────────────
  getCharters(): Observable<any> { return this.http.get(`${this.base}/governance/charters`); }
  getCharter(id: string): Observable<any> { return this.http.get(`${this.base}/governance/charters/${id}`); }
  createCharter(data: any): Observable<any> { return this.http.post(`${this.base}/governance/charters`, data); }
  updateCharter(id: string, data: any): Observable<any> { return this.http.put(`${this.base}/governance/charters/${id}`, data); }
  approveCharter(id: string): Observable<any> { return this.http.post(`${this.base}/governance/charters/${id}/approve`, {}); }
  activateCharter(id: string): Observable<any> { return this.http.post(`${this.base}/governance/charters/${id}/activate`, {}); }
  getCommitteeCharter(committeeId: string): Observable<any> { return this.http.get(`${this.base}/governance/charters/committee/${committeeId}`); }

  // ── Mandates ──────────────────────────────────────────────────────
  getMandates(): Observable<any> { return this.http.get(`${this.base}/governance/mandates`); }
  getMandate(id: string): Observable<any> { return this.http.get(`${this.base}/governance/mandates/${id}`); }
  createMandate(data: any): Observable<any> { return this.http.post(`${this.base}/governance/mandates`, data); }
  updateMandate(id: string, data: any): Observable<any> { return this.http.put(`${this.base}/governance/mandates/${id}`, data); }
  deleteMandate(id: string): Observable<any> { return this.http.delete(`${this.base}/governance/mandates/${id}`); }
  getMandateSources(id: string): Observable<any> { return this.http.get(`${this.base}/governance/mandates/${id}/sources`); }
  addMandateSource(id: string, data: any): Observable<any> { return this.http.post(`${this.base}/governance/mandates/${id}/sources`, data); }
  removeMandateSource(id: string, sourceId: string): Observable<any> { return this.http.delete(`${this.base}/governance/mandates/${id}/sources/${sourceId}`); }

  // ── Structure ─────────────────────────────────────────────────────
  getDomains(): Observable<any> { return this.http.get(`${this.base}/governance/structure/domains`); }
  createDomain(data: any): Observable<any> { return this.http.post(`${this.base}/governance/structure/domains`, data); }
  updateDomain(id: string, data: any): Observable<any> { return this.http.put(`${this.base}/governance/structure/domains/${id}`, data); }
  deleteDomain(id: string): Observable<any> { return this.http.delete(`${this.base}/governance/structure/domains/${id}`); }
  getBodies(): Observable<any> { return this.http.get(`${this.base}/governance/structure/bodies`); }
  createBody(data: any): Observable<any> { return this.http.post(`${this.base}/governance/structure/bodies`, data); }
  updateBody(id: string, data: any): Observable<any> { return this.http.put(`${this.base}/governance/structure/bodies/${id}`, data); }
  deleteBody(id: string): Observable<any> { return this.http.delete(`${this.base}/governance/structure/bodies/${id}`); }
  getReportingLines(): Observable<any> { return this.http.get(`${this.base}/governance/structure/reporting-lines`); }
  createReportingLine(data: any): Observable<any> { return this.http.post(`${this.base}/governance/structure/reporting-lines`, data); }
  deleteReportingLine(id: string): Observable<any> { return this.http.delete(`${this.base}/governance/structure/reporting-lines/${id}`); }
  getOrgTree(): Observable<any> { return this.http.get(`${this.base}/governance/structure/org-tree`); }
  getDepartments(): Observable<any> { return this.http.get(`${this.base}/governance/structure/departments`); }
  createDepartment(data: any): Observable<any> { return this.http.post(`${this.base}/governance/structure/departments`, data); }
  updateDepartment(id: string, data: any): Observable<any> { return this.http.put(`${this.base}/governance/structure/departments/${id}`, data); }
  deleteDepartment(id: string): Observable<any> { return this.http.delete(`${this.base}/governance/structure/departments/${id}`); }
  getLegalEntities(): Observable<any> { return this.http.get(`${this.base}/governance/structure/legal-entities`); }
  createLegalEntity(data: any): Observable<any> { return this.http.post(`${this.base}/governance/structure/legal-entities`, data); }
  updateLegalEntity(id: string, data: any): Observable<any> { return this.http.put(`${this.base}/governance/structure/legal-entities/${id}`, data); }
  deleteLegalEntity(id: string): Observable<any> { return this.http.delete(`${this.base}/governance/structure/legal-entities/${id}`); }

  // ── Obligations ───────────────────────────────────────────────────
  getObligations(): Observable<any> { return this.http.get(`${this.base}/governance/obligations`); }
  getObligation(id: string): Observable<any> { return this.http.get(`${this.base}/governance/obligations/${id}`); }
  createObligation(data: any): Observable<any> { return this.http.post(`${this.base}/governance/obligations`, data); }
  updateObligation(id: string, data: any): Observable<any> { return this.http.put(`${this.base}/governance/obligations/${id}`, data); }
  getObligationDueDates(id: string): Observable<any> { return this.http.get(`${this.base}/governance/obligations/${id}/due-dates`); }
  completeObligationDueDate(id: string, dueDateId: string): Observable<any> { return this.http.post(`${this.base}/governance/obligations/${id}/due-dates/${dueDateId}/complete`, {}); }
  getObligationEvidenceLinks(id: string): Observable<any> { return this.http.get(`${this.base}/governance/obligations/${id}/evidence-links`); }
  linkEvidenceToObligation(id: string, data: any): Observable<any> { return this.http.post(`${this.base}/governance/obligations/${id}/evidence-links`, data); }
  getObligationControlLinks(id: string): Observable<any> { return this.http.get(`${this.base}/governance/obligations/${id}/control-links`); }
  linkControlToObligation(id: string, data: any): Observable<any> { return this.http.post(`${this.base}/governance/obligations/${id}/control-links`, data); }
  requestObligationExemption(id: string, data: any): Observable<any> { return this.http.post(`${this.base}/governance/obligations/${id}/exemptions`, data); }

  // ── Enforcement ───────────────────────────────────────────────────
  runEnforcementScan(): Observable<any> { return this.http.post(`${this.base}/governance/enforcement/scan`, {}); }
  getEnforcementViolations(): Observable<any> { return this.http.get(`${this.base}/governance/enforcement/violations`); }
  getEnforcementSummary(): Observable<any> { return this.http.get(`${this.base}/governance/enforcement/summary`); }
  resolveViolation(id: string, resolution_notes?: string): Observable<any> { return this.http.post(`${this.base}/governance/enforcement/violations/${id}/resolve`, { resolution_notes }); }

  // ── Responsibilities ──────────────────────────────────────────────
  getResponsibilities(): Observable<any> { return this.http.get(`${this.base}/governance/responsibilities`); }
  createResponsibility(data: any): Observable<any> { return this.http.post(`${this.base}/governance/responsibilities`, data); }
  updateResponsibility(id: string, data: any): Observable<any> { return this.http.put(`${this.base}/governance/responsibilities/${id}`, data); }
  getResponsibilityAssignments(): Observable<any> { return this.http.get(`${this.base}/governance/responsibilities/assignments`); }
  createResponsibilityAssignment(data: any): Observable<any> { return this.http.post(`${this.base}/governance/responsibilities/assignments`, data); }
  deleteResponsibilityAssignment(id: string): Observable<any> { return this.http.delete(`${this.base}/governance/responsibilities/assignments/${id}`); }
  getAccountabilityGaps(): Observable<any> { return this.http.get(`${this.base}/governance/responsibilities/gaps`); }

  // ── Acknowledgements ──────────────────────────────────────────────
  getAcknowledgements(): Observable<any> { return this.http.get(`${this.base}/governance/acknowledgements`); }
  getAcknowledgementCampaigns(): Observable<any> { return this.http.get(`${this.base}/governance/acknowledgements/campaigns`); }
  createAcknowledgementCampaign(data: any): Observable<any> { return this.http.post(`${this.base}/governance/acknowledgements/campaigns`, data); }
  getCampaignStatus(id: string): Observable<any> { return this.http.get(`${this.base}/governance/acknowledgements/campaigns/${id}/status`); }
  sendCampaignReminders(campaignId: string): Observable<any> { return this.http.post(`${this.base}/governance/acknowledgements/campaigns/${campaignId}/reminders`, {}); }
  recordAcknowledgement(data: any): Observable<any> { return this.http.post(`${this.base}/governance/acknowledgements`, data); }
  getPendingAcknowledgements(): Observable<any> { return this.http.get(`${this.base}/governance/acknowledgements/pending`); }
  getAcknowledgementStats(): Observable<any> { return this.http.get(`${this.base}/governance/acknowledgements/stats`); }

  // ── Health Score ──────────────────────────────────────────────────
  getHealthScore(): Observable<any> { return this.http.get(`${this.base}/governance/health`); }
  getHealthTrend(): Observable<any> { return this.http.get(`${this.base}/governance/health/trend`); }
  getHealthHistory(): Observable<any> { return this.http.get(`${this.base}/governance/health/history`); }
  recalculateHealth(): Observable<any> { return this.http.post(`${this.base}/governance/health/recalculate`, {}); }
  getHealthThresholds(): Observable<any> { return this.http.get(`${this.base}/governance/health/thresholds`); }
  updateHealthThresholds(data: any): Observable<any> { return this.http.put(`${this.base}/governance/health/thresholds`, data); }
  getBoardWatchlist(): Observable<any> { return this.http.get(`${this.base}/governance/health/board-watchlist`); }

  // ── AI Governance ─────────────────────────────────────────────────
  runAiScan(): Observable<any> { return this.http.post(`${this.base}/governance/ai/scan`, {}); }
  interpretSignals(): Observable<any> { return this.http.post(`${this.base}/governance/ai/interpret`, {}); }
  interpretSignal(signalId: string): Observable<any> { return this.http.post(`${this.base}/governance/ai/interpret/${signalId}`, {}); }
  generateRecommendations(): Observable<any> { return this.http.post(`${this.base}/governance/ai/recommend`, {}); }
  generateRecommendation(issueId: string): Observable<any> { return this.http.post(`${this.base}/governance/ai/recommend/${issueId}`, {}); }
  acceptRecommendation(id: string): Observable<any> { return this.http.post(`${this.base}/governance/ai/recommendations/${id}/accept`, {}); }
  rejectRecommendation(id: string): Observable<any> { return this.http.post(`${this.base}/governance/ai/recommendations/${id}/reject`, {}); }
  runEscalationScan(): Observable<any> { return this.http.post(`${this.base}/governance/ai/escalate`, {}); }
  getAiSignals(): Observable<any> { return this.http.get(`${this.base}/governance/ai/signals`); }
  getAiSignal(id: string): Observable<any> { return this.http.get(`${this.base}/governance/ai/signals/${id}`); }
  getAiIssues(): Observable<any> { return this.http.get(`${this.base}/governance/ai/issues`); }
  getAiRecommendations(): Observable<any> { return this.http.get(`${this.base}/governance/ai/recommendations`); }
  getAiBoardAttention(): Observable<any> { return this.http.get(`${this.base}/governance/ai/board-attention`); }
  getAiExecutiveAttention(): Observable<any> { return this.http.get(`${this.base}/governance/ai/executive-attention`); }
  getAiScoreExplanation(): Observable<any> { return this.http.get(`${this.base}/governance/ai/score-explanation`); }
  generateScoreExplanation(): Observable<any> { return this.http.post(`${this.base}/governance/ai/score-explanation`, {}); }
  getAiNarrative(): Observable<any> { return this.http.get(`${this.base}/governance/ai/narrative`); }
  submitAiFeedback(data: any): Observable<any> { return this.http.post(`${this.base}/governance/ai/feedback`, data); }
  getAiFeedbackStats(): Observable<any> { return this.http.get(`${this.base}/governance/ai/feedback`); }
  getAiRunHistory(): Observable<any> { return this.http.get(`${this.base}/governance/ai/runs`); }
  runFullAiCycle(): Observable<any> { return this.http.post(`${this.base}/governance/ai/full-cycle`, {}); }

  // ── Executive Summaries ───────────────────────────────────────────
  getExecutiveSummaries(): Observable<any> { return this.http.get(`${this.base}/governance/executive-summaries`); }
  getExecutiveSummary(id: string): Observable<any> { return this.http.get(`${this.base}/governance/executive-summaries/${id}`); }
  createExecutiveSummary(data: any): Observable<any> { return this.http.post(`${this.base}/governance/executive-summaries`, data); }
  updateExecutiveSummary(id: string, data: any): Observable<any> { return this.http.put(`${this.base}/governance/executive-summaries/${id}`, data); }
  approveExecutiveSummary(id: string): Observable<any> { return this.http.post(`${this.base}/governance/executive-summaries/${id}/approve`, {}); }
  publishExecutiveSummary(id: string): Observable<any> { return this.http.post(`${this.base}/governance/executive-summaries/${id}/publish`, {}); }
  generateExecutiveSummary(): Observable<any> { return this.http.post(`${this.base}/governance/executive-summaries/generate`, {}); }
  deleteExecutiveSummary(id: string): Observable<any> { return this.http.delete(`${this.base}/governance/executive-summaries/${id}`); }

  // ── RACI Templates ────────────────────────────────────────────────
  getRaciTemplates(): Observable<any> { return this.http.get(`${this.base}/governance/raci-templates`); }
  getRaciTemplate(id: string): Observable<any> { return this.http.get(`${this.base}/governance/raci-templates/${id}`); }
  createRaciTemplate(data: any): Observable<any> { return this.http.post(`${this.base}/governance/raci-templates`, data); }
  updateRaciTemplate(id: string, data: any): Observable<any> { return this.http.put(`${this.base}/governance/raci-templates/${id}`, data); }
  setRaciAssignments(id: string, data: any): Observable<any> { return this.http.post(`${this.base}/governance/raci-templates/${id}/assignments`, data); }
  activateRaciTemplate(id: string): Observable<any> { return this.http.post(`${this.base}/governance/raci-templates/${id}/activate`, {}); }
  archiveRaciTemplate(id: string): Observable<any> { return this.http.post(`${this.base}/governance/raci-templates/${id}/archive`, {}); }

  // ── RACI Matrix ───────────────────────────────────────────────────
  getRaciMatrix(): Observable<any> { return this.http.get(`${this.base}/governance/raci/matrix`); }
  getRaciAccountabilityGaps(): Observable<any> { return this.http.get(`${this.base}/governance/raci/accountability-gaps`); }
  getRaciSodConflicts(): Observable<any> { return this.http.get(`${this.base}/governance/raci/sod-conflicts`); }

  // ── Governance Hooks (Cross-Module Actions) ───────────────────────
  createActionFromRisk(data: any): Observable<any> { return this.http.post(`${this.base}/governance/hooks/from-risk`, data); }
  createActionFromAuditFinding(data: any): Observable<any> { return this.http.post(`${this.base}/governance/hooks/from-audit-finding`, data); }
  createActionFromComplianceGap(data: any): Observable<any> { return this.http.post(`${this.base}/governance/hooks/from-compliance-gap`, data); }
  createActionFromIncident(data: any): Observable<any> { return this.http.post(`${this.base}/governance/hooks/from-incident`, data); }
  createActionFromControlFailure(data: any): Observable<any> { return this.http.post(`${this.base}/governance/hooks/from-control-failure`, data); }
  getActionsBySource(): Observable<any> { return this.http.get(`${this.base}/governance/hooks/actions-by-source`); }
  getSourceSummary(): Observable<any> { return this.http.get(`${this.base}/governance/hooks/source-summary`); }
  getHooksBoardAttention(): Observable<any> { return this.http.get(`${this.base}/governance/hooks/board-attention`); }

  // ── Registers ─────────────────────────────────────────────────────
  getRegisters(): Observable<any> { return this.http.get(`${this.base}/governance/registers`); }
  getRegister(id: string): Observable<any> { return this.http.get(`${this.base}/governance/registers/${id}`); }
  createRegister(data: any): Observable<any> { return this.http.post(`${this.base}/governance/registers`, data); }
  updateRegister(id: string, data: any): Observable<any> { return this.http.put(`${this.base}/governance/registers/${id}`, data); }
  deleteRegister(id: string): Observable<any> { return this.http.delete(`${this.base}/governance/registers/${id}`); }

  // ── Reviews ───────────────────────────────────────────────────────
  getReviews(): Observable<any> { return this.http.get(`${this.base}/governance/reviews`); }
  getReviewQueue(): Observable<any> { return this.http.get(`${this.base}/governance/reviews/queue`); }
  getOverdueReviews(): Observable<any> { return this.http.get(`${this.base}/governance/reviews/overdue`); }
  getReview(id: string): Observable<any> { return this.http.get(`${this.base}/governance/reviews/${id}`); }
  createReview(data: any): Observable<any> { return this.http.post(`${this.base}/governance/reviews`, data); }
  updateReview(id: string, data: any): Observable<any> { return this.http.put(`${this.base}/governance/reviews/${id}`, data); }
  completeReview(id: string): Observable<any> { return this.http.post(`${this.base}/governance/reviews/${id}/complete`, {}); }
  deleteReview(id: string): Observable<any> { return this.http.delete(`${this.base}/governance/reviews/${id}`); }

  // ── Board Packs ───────────────────────────────────────────────────
  getBoardPacks(): Observable<any> { return this.http.get(`${this.base}/governance/board-packs`); }
  getBoardPack(id: string): Observable<any> { return this.http.get(`${this.base}/governance/board-packs/${id}`); }
  createBoardPack(data: any): Observable<any> { return this.http.post(`${this.base}/governance/board-packs`, data); }
  updateBoardPack(id: string, data: any): Observable<any> { return this.http.put(`${this.base}/governance/board-packs/${id}`, data); }
  assembleBoardPack(id: string): Observable<any> { return this.http.post(`${this.base}/governance/board-packs/${id}/assemble`, {}); }
  addBoardPackItem(id: string, data: any): Observable<any> { return this.http.post(`${this.base}/governance/board-packs/${id}/items`, data); }
  removeBoardPackItem(id: string, itemId: string): Observable<any> { return this.http.delete(`${this.base}/governance/board-packs/${id}/items/${itemId}`); }
  approveBoardPack(id: string): Observable<any> { return this.http.post(`${this.base}/governance/board-packs/${id}/approve`, {}); }
  publishBoardPack(id: string): Observable<any> { return this.http.post(`${this.base}/governance/board-packs/${id}/publish`, {}); }

  // ── Policy Attestation ────────────────────────────────────────────
  getAttestationCampaigns(): Observable<any> { return this.http.get(`${this.base}/attestation/campaigns`); }
  createAttestationCampaign(data: any): Observable<any> { return this.http.post(`${this.base}/attestation/campaigns`, data); }
  getAttestationCampaignStatus(campaignId: string): Observable<any> { return this.http.get(`${this.base}/attestation/campaigns/${campaignId}/status`); }
  sendAttestationReminders(campaignId: string): Observable<any> { return this.http.post(`${this.base}/attestation/campaigns/${campaignId}/reminders`, {}); }
  submitAttestation(data: any): Observable<any> { return this.http.post(`${this.base}/attestation/submit`, data); }

  // ── Policy Templates ──────────────────────────────────────────────
  getPolicyTemplates(): Observable<any> { return this.http.get(`${this.base}/policy-template/templates`); }
  getPolicyTemplate(key: string): Observable<any> { return this.http.get(`${this.base}/policy-template/templates/${key}`); }
  getPolicyTemplatesByCategory(category: string): Observable<any> { return this.http.get(`${this.base}/policy-template/templates/category/${category}`); }
  getPolicyTemplatesByFramework(framework: string): Observable<any> { return this.http.get(`${this.base}/policy-template/templates/framework/${framework}`); }
  previewPolicyFromTemplate(key: string): Observable<any> { return this.http.post(`${this.base}/policy-template/templates/${key}/preview`, {}); }
  generatePolicyFromTemplate(key: string): Observable<any> { return this.http.post(`${this.base}/policy-template/templates/${key}/generate`, {}); }
  bulkGeneratePolicies(data: any): Observable<any> { return this.http.post(`${this.base}/policy-template/bulk-generate`, data); }
  getPolicyWorkflow(policyId: string): Observable<any> { return this.http.get(`${this.base}/policy-template/workflow/${policyId}`); }
  getPolicyProcess(policyId: string): Observable<any> { return this.http.get(`${this.base}/policy-template/process/${policyId}`); }
  initPolicyProcess(policyId: string): Observable<any> { return this.http.post(`${this.base}/policy-template/process/${policyId}/init`, {}); }
  advancePolicyProcess(policyId: string): Observable<any> { return this.http.post(`${this.base}/policy-template/process/${policyId}/advance`, {}); }
  getMomRecords(): Observable<any> { return this.http.get(`${this.base}/policy-template/mom`); }
  createMomRecord(data: any): Observable<any> { return this.http.post(`${this.base}/policy-template/mom`, data); }
  approveMomRecord(momId: string): Observable<any> { return this.http.post(`${this.base}/policy-template/mom/${momId}/approve`, {}); }
  getPolicyGuidance(): Observable<any> { return this.http.get(`${this.base}/policy-template/guidance`); }

  // ── Governance OS (Cross-Module) ──────────────────────────────────
  getGovernanceStatus(): Observable<any> { return this.http.get(`${this.base}/governance-os/status`); }
  getRiskPosture(): Observable<any> { return this.http.get(`${this.base}/governance-os/risk-posture`); }
  getIamLog(): Observable<any> { return this.http.get(`${this.base}/governance-os/iam/log`); }
  getAuditLedger(): Observable<any> { return this.http.get(`${this.base}/governance-os/audit-ledger`); }
  getCrossModuleSummary(): Observable<any> { return this.http.get(`${this.base}/governance-os/cross-module-summary`); }
  getBoardAttention(): Observable<any> { return this.http.get(`${this.base}/governance-os/board-attention`); }
  getGovernanceQiyasDimensions(): Observable<any> { return this.http.get(`${this.base}/governance-os/qiyas-dimensions`); }
  getEscalationThresholds(): Observable<any> { return this.http.get(`${this.base}/governance-os/escalation-thresholds`); }

  // ── Decisions (missing GET all) ───────────────────────────────────
  getDecisions(): Observable<any> { return this.http.get(`${this.base}/governance/decisions`); }
  approveDecision(id: string): Observable<any> { return this.http.post(`${this.base}/governance/decisions/${id}/approve`, {}); }

  // ── Digest & Leadership ─────────────────────────────────────
  getDigests(_type?: string): Observable<any> { return this.http.get(`${this.base}/governance/digests`); }
  generateDigest(params?: any, _periodHours?: number): Observable<any> { return this.http.post(`${this.base}/governance/digests/generate`, params || {}); }
  getLeadershipSummary(): Observable<any> { return this.http.get(`${this.base}/governance/leadership-summary`); }

  // ── Initiatives ─────────────────────────────────────────────
  getInitiatives(_module?: string): Observable<any> { return this.http.get(`${this.base}/governance/initiatives`); }

  // ── Orchestrator ────────────────────────────────────────────
  getOrchestratorRuns(_module?: string): Observable<any> { return this.http.get(`${this.base}/governance/orchestrator/runs`); }
  runOrchestrator(config?: any): Observable<any> { return this.http.post(`${this.base}/governance/orchestrator/run`, config || {}); }

  // ── Milestones ──────────────────────────────────────────────
  getMilestoneInstances(_module?: string): Observable<any> { return this.http.get(`${this.base}/governance/milestones/instances`); }
  getMilestoneRollupByModule(): Observable<any> { return this.http.get(`${this.base}/governance/milestones/rollup-by-module`); }
  evaluateMilestonesLive(_module?: string): Observable<any> { return this.http.post(`${this.base}/governance/milestones/evaluate-live`, {}); }
}
