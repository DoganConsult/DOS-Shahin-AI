import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '@env/environment';
import {
  PolicyListDto,
  PolicyItemDto,
  CreatePolicyRequest,
  UpdatePolicyRequest,
  PolicyVersionDto,
  GenerateAIPolicyRequest,
  GenerateAIPolicyResultDto,
  ProcedureListDto,
  ProcedureItemDto,
  CreateProcedureRequest,
  UpdateProcedureRequest,
  ProcedureVersionDto,
  PolicyLifecycleListDto,
  CommitteeListDto,
  CommitteeDto,
  CreateCommitteeRequest,
  UpdateCommitteeRequest,
  CommitteeMemberDto,
  AddCommitteeMemberRequest,
  MeetingListDto,
  MeetingDto,
  CreateMeetingRequest,
  UpdateMeetingRequest,
  AgendaItemDto,
  AddAgendaItemRequest,
  DecisionDto,
  CreateDecisionRequest,
  UpdateDecisionRequest,
  DecisionVoteDto,
  CastDecisionVoteRequest,
  GovernanceCalendarDto,
  DelegationFilters,
  DelegationListDto,
  DelegationDto,
  CreateDelegationRequest,
  DelegationConflictDto,
  AccessReviewCampaignListDto,
  CreateAccessReviewCampaignRequest,
  AccessReviewItemDto,
  SubmitAccessReviewDecisionRequest,
  SoDConflictFilters,
  SoDConflictListDto,
  DetectSoDConflictsResultDto,
  ResolveSoDConflictRequest,
  BulkResolveSoDConflictsRequest,
  SoDRemediationSuggestionDto,
  SoDConflictTrendDto,
  SoDConflictPatternDto,
  SoDConflictHistoryEntryDto,
  SoDAssignmentCheckDto,
  GovAIScanResultDto,
  GovAIFullCycleResultDto,
  GovAISignalListDto,
  GovAISignalDto,
  GovAIIssueDto,
  GovAIRecommendationListDto,
  GovAIRecommendationDto,
  GovAIBoardAttentionDto,
  GovAIExecAttentionDto,
  GovAIScoreExplanationDto,
  GovAINarrativeDto,
  GovAIFeedbackRequest,
  GovAIFeedbackStatsDto,
  GovAIRunDto,
  GovAISignalQueryParams,
  GovAIRecommendationQueryParams,
  MessageResponse,
} from './grc-governance.types';

/**
 * GRC Governance sub-service.
 * Covers: Policies, Procedures, Policy Lifecycle, Committees, Meetings,
 * Decisions, Delegations, SoD Conflicts, Governance AI Engine,
 * and Access Review Campaigns.
 */
@Injectable({ providedIn: 'root' })
export class GrcGovernanceService {
  private api = environment.apiUrl;

  constructor(private http: HttpClient) {}

  // === Governance (Policies) ===
  getGovernancePolicies(): Observable<PolicyListDto> { return this.http.get<PolicyListDto>(`${this.api}/policies`); }
  getPolicies(): Observable<PolicyListDto> { return this.http.get<PolicyListDto>(`${this.api}/policies`); }
  createPolicy(data: CreatePolicyRequest): Observable<PolicyItemDto> { return this.http.post<PolicyItemDto>(`${this.api}/policies`, data); }
  updatePolicy(id: string, data: UpdatePolicyRequest): Observable<PolicyItemDto> { return this.http.put<PolicyItemDto>(`${this.api}/policies/${id}`, data); }
  deletePolicy(id: string): Observable<MessageResponse> { return this.http.delete<MessageResponse>(`${this.api}/policies/${id}`); }
  approvePolicy(id: string): Observable<PolicyItemDto> { return this.http.post<PolicyItemDto>(`${this.api}/policies/${id}/approve`, {}); }
  getPolicyVersions(id: string): Observable<PolicyVersionDto[]> { return this.http.get<PolicyVersionDto[]>(`${this.api}/policies/${id}/versions`); }
  rejectPolicy(id: string, reason?: string): Observable<PolicyItemDto> { return this.http.post<PolicyItemDto>(`${this.api}/governance/policies/${id}/reject`, { reason }); }
  publishPolicy(id: string): Observable<PolicyItemDto> { return this.http.post<PolicyItemDto>(`${this.api}/governance/policies/${id}/publish`, {}); }
  generateAIPolicy(data: GenerateAIPolicyRequest): Observable<GenerateAIPolicyResultDto> { return this.http.post<GenerateAIPolicyResultDto>(`${this.api}/ai/generate-policy`, data); }

  // === Procedures ===
  getProcedures(): Observable<ProcedureListDto> { return this.http.get<ProcedureListDto>(`${this.api}/policy-lifecycle/procedures`); }
  getProcedure(id: string): Observable<ProcedureItemDto> { return this.http.get<ProcedureItemDto>(`${this.api}/policy-lifecycle/procedures/${id}`); }
  createProcedure(data: CreateProcedureRequest): Observable<ProcedureItemDto> { return this.http.post<ProcedureItemDto>(`${this.api}/policy-lifecycle/procedures`, data); }
  updateProcedure(id: string, data: UpdateProcedureRequest): Observable<ProcedureItemDto> { return this.http.put<ProcedureItemDto>(`${this.api}/policy-lifecycle/procedures/${id}`, data); }
  deleteProcedure(id: string): Observable<MessageResponse> { return this.http.delete<MessageResponse>(`${this.api}/policy-lifecycle/procedures/${id}`); }
  approveProcedure(id: string): Observable<ProcedureItemDto> { return this.http.post<ProcedureItemDto>(`${this.api}/policy-lifecycle/procedures/${id}/approve`, {}); }
  getProcedureVersions(id: string): Observable<ProcedureVersionDto[]> { return this.http.get<ProcedureVersionDto[]>(`${this.api}/policy-lifecycle/procedures/${id}/versions`); }
  getPolicyProcedures(policyId: string): Observable<ProcedureListDto> { return this.http.get<ProcedureListDto>(`${this.api}/policy-lifecycle/policies/${policyId}/procedures`); }

  // === Policy Lifecycle (version metadata) ===
  getPolicyLifecycleList(): Observable<PolicyLifecycleListDto> { return this.http.get<PolicyLifecycleListDto>(`${this.api}/policy-lifecycle/policies`); }

  // === Committees ===
  getCommittees(): Observable<CommitteeListDto> { return this.http.get<CommitteeListDto>(`${this.api}/governance/committees`); }
  createCommittee(data: CreateCommitteeRequest): Observable<CommitteeDto> { return this.http.post<CommitteeDto>(`${this.api}/governance/committees`, data); }
  updateCommittee(id: string, data: UpdateCommitteeRequest): Observable<CommitteeDto> { return this.http.put<CommitteeDto>(`${this.api}/governance/committees/${id}`, data); }
  deleteCommittee(id: string): Observable<MessageResponse> { return this.http.delete<MessageResponse>(`${this.api}/governance/committees/${id}`); }

  // === Committee Members ===
  getCommitteeMembers(committeeId: string): Observable<CommitteeMemberDto[]> { return this.http.get<CommitteeMemberDto[]>(`${this.api}/governance/committees/${committeeId}/members`); }
  addCommitteeMember(committeeId: string, data: AddCommitteeMemberRequest): Observable<CommitteeMemberDto> { return this.http.post<CommitteeMemberDto>(`${this.api}/governance/committees/${committeeId}/members`, data); }
  removeCommitteeMember(committeeId: string, memberId: string): Observable<MessageResponse> { return this.http.delete<MessageResponse>(`${this.api}/governance/committees/${committeeId}/members/${memberId}`); }
  setCommitteeChair(committeeId: string, memberId: string): Observable<CommitteeMemberDto> { return this.http.patch<CommitteeMemberDto>(`${this.api}/governance/committees/${committeeId}/members/${memberId}/chair`, {}); }

  // === Meetings ===
  getCommitteeMeetings(committeeId: string): Observable<MeetingListDto> { return this.http.get<MeetingListDto>(`${this.api}/governance/committees/${committeeId}/meetings`); }
  createMeeting(data: CreateMeetingRequest): Observable<MeetingDto> { return this.http.post<MeetingDto>(`${this.api}/governance/meetings`, data); }
  updateMeeting(id: string, data: UpdateMeetingRequest): Observable<MeetingDto> { return this.http.put<MeetingDto>(`${this.api}/governance/meetings/${id}`, data); }
  deleteMeeting(id: string): Observable<MessageResponse> { return this.http.delete<MessageResponse>(`${this.api}/governance/meetings/${id}`); }

  // === Meeting Agenda ===
  getMeetingAgenda(meetingId: string): Observable<AgendaItemDto[]> { return this.http.get<AgendaItemDto[]>(`${this.api}/governance/meetings/${meetingId}/agenda`); }
  addAgendaItem(meetingId: string, data: AddAgendaItemRequest): Observable<AgendaItemDto> { return this.http.post<AgendaItemDto>(`${this.api}/governance/meetings/${meetingId}/agenda`, data); }
  deleteAgendaItem(id: string): Observable<MessageResponse> { return this.http.delete<MessageResponse>(`${this.api}/governance/agenda/${id}`); }

  // === Decisions + Votes ===
  createDecision(data: CreateDecisionRequest): Observable<DecisionDto> { return this.http.post<DecisionDto>(`${this.api}/governance/decisions`, data); }
  updateDecision(id: string, data: UpdateDecisionRequest): Observable<DecisionDto> { return this.http.put<DecisionDto>(`${this.api}/governance/decisions/${id}`, data); }
  getDecisionVotes(decisionId: string): Observable<DecisionVoteDto[]> { return this.http.get<DecisionVoteDto[]>(`${this.api}/governance/decisions/${decisionId}/votes`); }
  castDecisionVote(decisionId: string, data: CastDecisionVoteRequest): Observable<DecisionVoteDto> { return this.http.post<DecisionVoteDto>(`${this.api}/governance/decisions/${decisionId}/votes`, data); }

  // === Governance Calendar ===
  getGovernanceCalendar(): Observable<GovernanceCalendarDto> { return this.http.get<GovernanceCalendarDto>(`${this.api}/governance/calendar`); }

  // === Governance Delegations ===
  getDelegations(filters?: DelegationFilters): Observable<DelegationListDto> {
    const q = new URLSearchParams();
    if (filters?.status) q.set('status', filters.status);
    if (filters?.delegator) q.set('delegator', filters.delegator);
    if (filters?.delegate) q.set('delegate', filters.delegate);
    const qs = q.toString();
    return this.http.get<DelegationListDto>(`${this.api}/governance/delegations${qs ? '?' + qs : ''}`);
  }
  createDelegation(data: CreateDelegationRequest): Observable<DelegationDto> {
    return this.http.post<DelegationDto>(`${this.api}/governance/delegations`, data);
  }
  revokeDelegation(id: string): Observable<MessageResponse> {
    return this.http.post<MessageResponse>(`${this.api}/governance/delegations/${id}/revoke`, {});
  }
  getExpiringDelegations(days?: number): Observable<DelegationDto[]> {
    return this.http.get<DelegationDto[]>(`${this.api}/governance/delegations/expiring`, { params: { days: String(days || 30) } });
  }
  getDelegationConflicts(): Observable<DelegationConflictDto[]> {
    return this.http.get<DelegationConflictDto[]>(`${this.api}/governance/delegations/conflicts`);
  }

  // === Access Review Campaigns ===
  getAccessReviewCampaigns(status?: string): Observable<AccessReviewCampaignListDto> {
    const qs = status ? `?status=${status}` : '';
    return this.http.get<AccessReviewCampaignListDto>(`${this.api}/access-review/campaigns${qs}`);
  }
  createAccessReviewCampaign(data: CreateAccessReviewCampaignRequest): Observable<AccessReviewCampaignListDto> {
    return this.http.post<AccessReviewCampaignListDto>(`${this.api}/access-review/campaigns`, data);
  }
  getAccessReviewItems(campaignId: string): Observable<AccessReviewItemDto[]> {
    return this.http.get<AccessReviewItemDto[]>(`${this.api}/access-review/campaigns/${campaignId}/items`);
  }
  submitAccessReviewDecision(itemId: string, data: SubmitAccessReviewDecisionRequest): Observable<AccessReviewItemDto> {
    return this.http.put<AccessReviewItemDto>(`${this.api}/access-review/items/${itemId}/decision`, data);
  }

  // === SoD Conflict Detection ===
  getSoDConflicts(filters?: SoDConflictFilters): Observable<SoDConflictListDto> {
    let params = new HttpParams();
    if (filters?.userId) params = params.set('userId', filters.userId);
    if (filters?.conflictType) params = params.set('conflictType', filters.conflictType);
    if (filters?.severity) params = params.set('severity', filters.severity);
    if (filters?.limit) params = params.set('limit', filters.limit.toString());
    if (filters?.offset) params = params.set('offset', filters.offset.toString());
    return this.http.get<SoDConflictListDto>(`${this.api}/governance/sod-conflicts`, { params });
  }
  detectSoDConflicts(): Observable<DetectSoDConflictsResultDto> {
    return this.http.post<DetectSoDConflictsResultDto>(`${this.api}/governance/sod-conflicts/detect`, {});
  }
  resolveSoDConflict(conflictId: string, status: 'mitigated' | 'accepted' | 'resolved', resolvedBy: string, resolutionNote?: string): Observable<MessageResponse> {
    return this.http.post<MessageResponse>(`${this.api}/governance/sod-conflicts/${conflictId}/resolve`, { status, resolvedBy, resolutionNote });
  }
  bulkResolveSoDConflicts(conflictIds: string[], status: 'mitigated' | 'accepted' | 'resolved', resolvedBy: string, resolutionNote?: string): Observable<MessageResponse> {
    return this.http.post<MessageResponse>(`${this.api}/governance/sod-conflicts/bulk-resolve`, { conflictIds, status, resolvedBy, resolutionNote });
  }
  getSoDRemediationSuggestions(conflictId: string): Observable<{ suggestions: SoDRemediationSuggestionDto[] }> {
    return this.http.get<{ suggestions: SoDRemediationSuggestionDto[] }>(`${this.api}/governance/sod-conflicts/${conflictId}/suggestions`);
  }
  getSoDConflictTrends(days?: number): Observable<{ trends: SoDConflictTrendDto[]; days: number }> {
    const params = days ? new HttpParams().set('days', days.toString()) : undefined;
    return this.http.get<{ trends: SoDConflictTrendDto[]; days: number }>(`${this.api}/governance/sod-conflicts/trends`, { params });
  }
  getSoDConflictPatterns(): Observable<{ patterns: SoDConflictPatternDto[]; count: number }> {
    return this.http.get<{ patterns: SoDConflictPatternDto[]; count: number }>(`${this.api}/governance/sod-conflicts/patterns`);
  }
  getSoDConflictResolutionHistory(conflictId: string): Observable<{ history: SoDConflictHistoryEntryDto[]; count: number }> {
    return this.http.get<{ history: SoDConflictHistoryEntryDto[]; count: number }>(`${this.api}/governance/sod-conflicts/${conflictId}/history`);
  }
  reopenSoDConflict(conflictId: string, reopenedBy: string, reason: string): Observable<MessageResponse> {
    return this.http.post<MessageResponse>(`${this.api}/governance/sod-conflicts/${conflictId}/reopen`, { reopenedBy, reason });
  }
  checkSoDBeforeAssignment(userId: string, assignment: Record<string, unknown>): Observable<SoDAssignmentCheckDto> {
    return this.http.post<SoDAssignmentCheckDto>(`${this.api}/governance/sod-conflicts/check-before-assignment`, { userId, assignment });
  }
  exportSoDConflicts(format?: 'csv' | 'json'): Observable<string | SoDConflictListDto> {
    const params = format ? new HttpParams().set('format', format) : undefined;
    if (format === 'csv') {
      return this.http.get(`${this.api}/governance/sod-conflicts/export`, { params, responseType: 'text' });
    }
    return this.http.get<SoDConflictListDto>(`${this.api}/governance/sod-conflicts/export`, { params });
  }

  // === Governance AI Engine ===
  govAiScan(): Observable<GovAIScanResultDto> { return this.http.post<GovAIScanResultDto>(`${this.api}/governance/ai/scan`, {}); }
  govAiFullCycle(): Observable<GovAIFullCycleResultDto> { return this.http.post<GovAIFullCycleResultDto>(`${this.api}/governance/ai/full-cycle`, {}); }
  govAiInterpret(): Observable<GovAIScanResultDto> { return this.http.post<GovAIScanResultDto>(`${this.api}/governance/ai/interpret`, {}); }
  govAiRecommend(): Observable<GovAIScanResultDto> { return this.http.post<GovAIScanResultDto>(`${this.api}/governance/ai/recommend`, {}); }
  govAiEscalate(): Observable<GovAIScanResultDto> { return this.http.post<GovAIScanResultDto>(`${this.api}/governance/ai/escalate`, {}); }
  govAiSignals(params?: GovAISignalQueryParams): Observable<GovAISignalListDto> { return this.http.get<GovAISignalListDto>(`${this.api}/governance/ai/signals`, { params: params as Record<string, string> }); }
  govAiSignalDetail(id: string): Observable<GovAISignalDto> { return this.http.get<GovAISignalDto>(`${this.api}/governance/ai/signals/${id}`); }
  govAiIssues(): Observable<GovAIIssueDto[]> { return this.http.get<GovAIIssueDto[]>(`${this.api}/governance/ai/issues`); }
  govAiRecommendations(params?: GovAIRecommendationQueryParams): Observable<GovAIRecommendationListDto> { return this.http.get<GovAIRecommendationListDto>(`${this.api}/governance/ai/recommendations`, { params: params as Record<string, string> }); }
  govAiAcceptRec(id: string): Observable<GovAIRecommendationDto> { return this.http.post<GovAIRecommendationDto>(`${this.api}/governance/ai/recommendations/${id}/accept`, {}); }
  govAiRejectRec(id: string, reason: string): Observable<GovAIRecommendationDto> { return this.http.post<GovAIRecommendationDto>(`${this.api}/governance/ai/recommendations/${id}/reject`, { reason }); }
  govAiBoardAttention(): Observable<GovAIBoardAttentionDto> { return this.http.get<GovAIBoardAttentionDto>(`${this.api}/governance/ai/board-attention`); }
  govAiExecAttention(): Observable<GovAIExecAttentionDto> { return this.http.get<GovAIExecAttentionDto>(`${this.api}/governance/ai/executive-attention`); }
  govAiScoreExplanation(): Observable<GovAIScoreExplanationDto> { return this.http.get<GovAIScoreExplanationDto>(`${this.api}/governance/ai/score-explanation`); }
  govAiGenerateScoreExplanation(): Observable<GovAIScoreExplanationDto> { return this.http.post<GovAIScoreExplanationDto>(`${this.api}/governance/ai/score-explanation`, {}); }
  govAiNarrative(): Observable<GovAINarrativeDto> { return this.http.get<GovAINarrativeDto>(`${this.api}/governance/ai/narrative`); }
  govAiSubmitFeedback(data: GovAIFeedbackRequest): Observable<MessageResponse> { return this.http.post<MessageResponse>(`${this.api}/governance/ai/feedback`, data); }
  govAiFeedbackStats(): Observable<GovAIFeedbackStatsDto> { return this.http.get<GovAIFeedbackStatsDto>(`${this.api}/governance/ai/feedback`); }
  govAiRuns(): Observable<GovAIRunDto[]> { return this.http.get<GovAIRunDto[]>(`${this.api}/governance/ai/runs`); }
}
