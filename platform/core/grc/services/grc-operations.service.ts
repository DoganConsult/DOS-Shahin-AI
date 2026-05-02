import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, of, shareReplay } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { environment } from '@env/environment';
import { OnboardingQuestion, DashboardData } from '../../models/grc.models';
import { MessageResponse } from '../../models/shared.types';
import {
  StartOnboardingAssessmentResultDto,
  CompletePhase1ResultDto,
  IntelligenceReportDto,
  BuildWorkspaceRequest,
  BuildWorkspaceResultDto,
  SaveAssessmentDraftRequest,
  AssessmentDraftDto,
  ConsensusStatusDto,
  DashboardConfigDto,
  KPITrendItemDto,
  DashboardZoneDto,
  AnalyticsKPIDto,
  AnalyticsPredictionDto,
  BenchmarkDto,
  MaturityDto,
  WorkflowListDto,
  CreateWorkflowRequest,
  ExecuteWorkflowRequest,
  ExecuteWorkflowResultDto,
  SimulateWorkflowResultDto,
  WorkflowAnalyticsDto,
  WorkflowExecutionListDto,
  ExecutionDetailDto,
  ExecutionActivityDto,
  WorkflowTemplateDto,
  InstantiateWorkflowTemplateRequest,
  StandupDigestDto,
  TriageProposalDto,
  ResolveTriageProposalRequest,
  WarRoomDto,
  ResolveWarRoomRequest,
  CoDraftSessionDto,
  ResolveCoDraftQuestionRequest,
  RiskPairReviewDto,
  HumanRiskAssessmentRequest,
  ScoreCalibrationDto,
  SubmitCalibrationRequest,
  EvidenceRelayItemDto,
  ReviewEvidenceRelayRequest,
  ApprovalPreScreenDto,
  AuditPrepChecklistDto,
  AddAuditPrepItemRequest,
  UpdateAuditPrepStatusRequest,
  NudgeNegotiationDto,
  CreateNudgeRequest,
  TeamListDto,
  TeamDto,
  CreateTeamRequest,
  UpdateTeamRequest,
  TeamWorkloadDto,
  TeamMemberDto,
  RACIMatrixDto,
  SetRACIRoleRequest,
  TeamRACIScopeDto,
  TeamRACICountDto,
  RaciDashboardDto,
  RaciMatrixEntryDto,
  RaciGapDto,
  AssignRaciRequest,
  AssignEntityOwnerRequest,
  AssignEntityTeamRequest,
  RaciTeamDistributionDto,
  CheckRaciGateRequest,
  CheckRaciGateResultDto,
  EvidenceActionDto,
  CreateEvidenceActionRequest,
  ProcessTaskFilters,
  ProcessTaskListDto,
  ProcessTaskDto,
  SlaByRoleDto,
  WorkItemFilters,
  WorkItemListDto,
  CompleteWorkItemRequest,
  ApprovalListDto,
  ApprovalDto,
  InitiateApprovalRequest,
  AutomationRuleDto,
  CreateAutomationRuleRequest,
  UpdateAutomationRuleRequest,
  AutomationLogDto,
  NotificationListDto,
  NotificationPreferencesDto,
  ChannelListDto,
  CreateChannelRequest,
  ChannelMessageDto,
  SendChannelMessageRequest,
  SendDirectMessageRequest,
  UnreadCountDto,
  UserProfileDto,
  TenantProfileDto,
  UserPermissionsDto,
  RoleListDto,
  RoleStatsDto,
  CreateRoleRequest,
  UpdateRoleRequest,
  RoleProfileDto,
  RoleMatrixDto,
  AssignRoleMatrixRoleRequest,
  RoleFunctionMappingDto,
  FunctionAuthorityDto,
  RoleDetailDto,
  RoleUsersDto,
  RolePermissionsDto,
  RoleTeamsDto,
  RoleDashboardsDto,
  RoleExperienceDto,
  AssignRoleToUserRequest,
  RoleStaffingDto,
  UserDetailDto,
  UserTeamsDto,
  UserTasksDto,
  ActivityListDto,
  RecordActivityRequest,
  InvitationListDto,
  SendRoleInvitationRequest,
  MemberDirectoryDto,
  MemberLifecycleDto,
  MemberProfileDto,
  CreateMemberProfileRequest,
  AgentShadowDto,
  UpsertAgentShadowRequest,
  AgentActivationRuleDto,
  CreateAgentActivationRuleRequest,
  UpdateAgentActivationRuleRequest,
  AdminTenantListDto,
  AdminHealthDto,
  CreateAdminTenantRequest,
  AdminUserListDto,
  WorkspaceListDto,
  CreateWorkspaceRequest,
  UpdateWorkspaceRequest,
  ScopeListDto,
  CreateScopeRequest,
  HomeOverviewDto,
  HomeActivityDto,
  CreateMappingRequest,
  MappingDto,
  RelationshipListDto,
  AssetListDto,
  AssetDto,
  CreateAssetRequest,
  UpdateAssetRequest,
  CommentListDto,
  CreateCommentRequest,
  UpdateCommentRequest,
  ActivityFeedDto,
  EntityLinkListDto,
  CreateEntityLinkRequest,
  GlobalSearchResultDto,
  AuditTrailDto,
  AuditTrailFilters,
  AuditModulesDto,
  ExplainabilityPackDto,
  SimulationDto,
  RedTeamRunDto,
  RedTeamSummaryDto,
  AgentPerformanceDto,
  ReportScenarioDto,
  GenerateReportParams,
  ReportScheduleDto,
  CreateReportScheduleRequest,
  ReportTemplateDto,
  TenantConfigDto,
  TenantRaciDto,
  TierConfigDto,
  TierLimitsDto,
  UpdateTierRequest,
  CadenceTaskDto,
  CadenceOverrideDto,
  ConnectorDto,
  CreateConnectorRequest,
  WebhookDto,
  CreateWebhookRequest,
  IntegrationConfigDto,
  CreateIntegrationConfigRequest,
  UpdateIntegrationConfigRequest,
  OpenClawStatusDto,
  OpenClawToolDto,
  OpenClawResourceDto,
  ExecuteOpenClawToolResultDto,
  ContentPackDto,
  ContentPackManifestDto,
  TimelineDto,
  TaskBoardDto,
  CreateTaskRequest,
  TaskProgressDto,
  ActionItemListDto,
  CreateActionItemRequest,
  UpdateActionItemRequest,
  ActionItemDigestDto,
  DailyQuoteDto,
  NextActionsDto,
  KpiDetailDto,
  KpiCardIndicatorDto,
  KpiItemRequest,
  PublicAgentsDto,
  PublicReportTemplatesDto,
  PublicLandingContentDto,
  PublicCategoryLabelsDto,
  PublicDPIAConfigDto,
  AITriggerConfigDto,
  UpdateAITriggerConfigRequest,
  TrainingStatusDto,
  FoundationHealthDto,
  BulkImportResultDto,
  BulkImportRecord,
  OnboardingResponseItem,
} from './grc-operations.types';

/**
 * GRC Operations sub-service.
 * Covers: Onboarding, Dashboard, Analytics, Workflows, Teams, RACI,
 * Process Tasks, Work Items, Automation, Reports, Notifications, Messaging,
 * Profiles, Roles, Admin, Integrations, and miscellaneous operational APIs.
 */
@Injectable({ providedIn: 'root' })
export class GrcOperationsService {
  private api = environment.apiUrl;
  private publicAgents$: Observable<PublicAgentsDto> | null = null;
  private publicAgentsTs = 0;
  private publicLandingContent$: Observable<PublicLandingContentDto> | null = null;
  private publicLandingContentTs = 0;
  private static readonly CACHE_TTL_MS = 60_000;

  constructor(private http: HttpClient) {}

  private getPublicAgentsCached(): Observable<PublicAgentsDto> {
    if (!this.publicAgents$ || Date.now() - this.publicAgentsTs > GrcOperationsService.CACHE_TTL_MS) {
      this.publicAgentsTs = Date.now();
      this.publicAgents$ = this.http.get<PublicAgentsDto>(`${this.api}/public/agents`).pipe(
        catchError(() => of({ agents: [] } as unknown as PublicAgentsDto)),
        shareReplay({ bufferSize: 1, refCount: true }),
      );
    }
    return this.publicAgents$;
  }

  private getPublicLandingContentCached(): Observable<PublicLandingContentDto> {
    if (!this.publicLandingContent$ || Date.now() - this.publicLandingContentTs > GrcOperationsService.CACHE_TTL_MS) {
      this.publicLandingContentTs = Date.now();
      this.publicLandingContent$ = this.http.get<PublicLandingContentDto>(`${this.api}/public/landing-content`).pipe(
        catchError(() => of({} as PublicLandingContentDto)),
        shareReplay({ bufferSize: 1, refCount: true }),
      );
    }
    return this.publicLandingContent$;
  }

  // === Onboarding ===
  getQuestions(): Observable<{ questions: OnboardingQuestion[]; totalSteps: number }> {
    return this.http.get<{ questions: OnboardingQuestion[]; totalSteps: number }>(`${this.api}/onboarding/questions`);
  }
  startOnboardingAssessment(): Observable<StartOnboardingAssessmentResultDto> { return this.http.post<StartOnboardingAssessmentResultDto>(`${this.api}/onboarding/start-assessment`, {}); }
  completePhase1(assessmentId: string, responses: OnboardingResponseItem[]): Observable<CompletePhase1ResultDto> {
    return this.http.post<CompletePhase1ResultDto>(`${this.api}/onboarding/phase1-complete`, { assessmentId, responses });
  }
  saveAssessmentResponses(assessmentId: string, responses: OnboardingResponseItem[]): Observable<MessageResponse> {
    return this.http.put<MessageResponse>(`${this.api}/maturity/${assessmentId}/respond`, { responses });
  }
  getIntelligenceReport(assessmentId: string): Observable<IntelligenceReportDto> {
    return this.http.get<IntelligenceReportDto>(`${this.api}/maturity/${assessmentId}/intelligence`);
  }
  buildWorkspaceFromAssessment(data: BuildWorkspaceRequest): Observable<BuildWorkspaceResultDto> {
    return this.http.post<BuildWorkspaceResultDto>(`${this.api}/onboarding/build-workspace`, data);
  }
  saveAssessmentDraft(data: SaveAssessmentDraftRequest): Observable<MessageResponse> {
    return this.http.patch<MessageResponse>(`${this.api}/onboarding/save-draft`, data);
  }
  loadAssessmentDraft(): Observable<AssessmentDraftDto> { return this.http.get<AssessmentDraftDto>(`${this.api}/onboarding/load-draft`); }
  submitForConsensus(reviewerUserIds: string[]): Observable<MessageResponse> {
    return this.http.post<MessageResponse>(`${this.api}/onboarding/submit-for-consensus`, { reviewerUserIds });
  }
  submitConsensusDecision(decision: string, comments?: string): Observable<MessageResponse> {
    return this.http.post<MessageResponse>(`${this.api}/onboarding/consensus-decision`, { decision, comments });
  }
  getConsensusStatus(): Observable<ConsensusStatusDto> { return this.http.get<ConsensusStatusDto>(`${this.api}/onboarding/consensus-status`); }

  // === Dashboard ===
  getDashboard(): Observable<DashboardData> { return this.http.get<DashboardData>(`${this.api}/dashboard`); }
  getDashboardConfig(): Observable<DashboardConfigDto> { return this.http.get<DashboardConfigDto>(`${this.api}/analytics/dashboard-config`); }
  saveDashboardConfig(config: Record<string, unknown>): Observable<MessageResponse> { return this.http.post<MessageResponse>(`${this.api}/analytics/dashboard-config`, config); }
  getKPITrends(startDate: string, endDate: string): Observable<KPITrendItemDto[]> {
    return this.http.get<KPITrendItemDto[]>(`${this.api}/analytics/trends?startDate=${startDate}&endDate=${endDate}`);
  }

  // === Dashboard Zones (legacy) ===
  getZoneA(workspaceId: string): Observable<DashboardZoneDto> {
    return this.http.get<DashboardZoneDto>(`${this.api}/workspaces/${workspaceId}/dashboard/zone-a`);
  }
  getZoneB(workspaceId: string, scopeIds?: string[]): Observable<DashboardZoneDto> {
    const params = scopeIds?.length ? '?scopeIds=' + scopeIds.join('&scopeIds=') : '';
    return this.http.get<DashboardZoneDto>(`${this.api}/workspaces/${workspaceId}/dashboard/zone-b${params}`);
  }
  getZoneC(workspaceId: string, scopeIds?: string[]): Observable<DashboardZoneDto> {
    const params = scopeIds?.length ? '?scopeIds=' + scopeIds.join('&scopeIds=') : '';
    return this.http.get<DashboardZoneDto>(`${this.api}/workspaces/${workspaceId}/dashboard/zone-c${params}`);
  }
  getZoneD(workspaceId: string, opts?: { module?: string; limit?: number; offset?: number }): Observable<DashboardZoneDto> {
    const parts: string[] = [];
    if (opts?.module) parts.push(`module=${opts.module}`);
    if (opts?.limit) parts.push(`limit=${opts.limit}`);
    if (opts?.offset) parts.push(`offset=${opts.offset}`);
    const qs = parts.length ? '?' + parts.join('&') : '';
    return this.http.get<DashboardZoneDto>(`${this.api}/workspaces/${workspaceId}/dashboard/zone-d${qs}`);
  }

  // === Analytics (backend: /api/analytics) ===
  getAnalyticsKPIs(): Observable<AnalyticsKPIDto> { return this.http.get<AnalyticsKPIDto>(`${this.api}/analytics/kpis`); }
  getAnalyticsPredictions(): Observable<AnalyticsPredictionDto> { return this.http.get<AnalyticsPredictionDto>(`${this.api}/analytics/predictions`); }
  getAnalyticsBenchmark(): Observable<BenchmarkDto> { return this.http.post<BenchmarkDto>(`${this.api}/analytics/benchmark`, {}); }
  getAnalyticsMaturity(): Observable<MaturityDto> { return this.http.get<MaturityDto>(`${this.api}/analytics/maturity`); }

  // === Workflows ===
  getWorkflows(): Observable<WorkflowListDto> { return this.http.get<WorkflowListDto>(`${this.api}/workflows`); }
  createWorkflow(data: CreateWorkflowRequest): Observable<MessageResponse> { return this.http.post<MessageResponse>(`${this.api}/workflows`, data); }
  executeWorkflow(id: string, data: ExecuteWorkflowRequest): Observable<ExecuteWorkflowResultDto> { return this.http.post<ExecuteWorkflowResultDto>(`${this.api}/workflows/${id}/execute`, data); }
  simulateWorkflow(id: string, testData?: Record<string, unknown>): Observable<SimulateWorkflowResultDto> { return this.http.post<SimulateWorkflowResultDto>(`${this.api}/workflows/${id}/simulate`, { testData: testData || {} }); }
  resumeWorkflow(id: string, executionId: string): Observable<MessageResponse> { return this.http.post<MessageResponse>(`${this.api}/workflows/${id}/resume`, { executionId }); }
  updateWorkflowStatus(id: string, status: string): Observable<MessageResponse> { return this.http.put<MessageResponse>(`${this.api}/workflows/${id}/status`, { status }); }
  getWorkflowAnalytics(id: string): Observable<WorkflowAnalyticsDto> { return this.http.get<WorkflowAnalyticsDto>(`${this.api}/workflows/${id}/analytics`); }
  getWorkflowExecutions(params?: number | { limit?: number }): Observable<WorkflowExecutionListDto> {
    const limit = typeof params === 'number' ? params : (params && typeof params === 'object' ? params.limit : undefined);
    return this.http.get<WorkflowExecutionListDto>(`${this.api}/workflows/executions/list`, { params: { limit: limit || 50 } });
  }
  getExecutionDetail(executionId: string): Observable<ExecutionDetailDto> {
    return this.http.get<ExecutionDetailDto>(`${this.api}/workflows/executions/${executionId}/detail`);
  }
  getExecutionActivity(executionId: string): Observable<ExecutionActivityDto> {
    return this.http.get<ExecutionActivityDto>(`${this.api}/workflows/executions/${executionId}/activity`);
  }
  retryExecution(executionId: string): Observable<MessageResponse> { return this.http.post<MessageResponse>(`${this.api}/workflows/executions/${executionId}/resume`, {}); }
  exportExecutionLog(executionId: string): Observable<Blob> { return this.http.get(`${this.api}/workflows/executions/${executionId}/export`, { responseType: 'blob' }); }
  cancelWorkflowExecution(executionId: string): Observable<MessageResponse> { return this.http.post<MessageResponse>(`${this.api}/workflows/executions/${executionId}/cancel`, {}); }
  bulkCancelWorkflowExecutions(ids: string[]): Observable<MessageResponse> { return this.http.post<MessageResponse>(`${this.api}/workflows/executions/bulk-cancel`, { ids }); }
  getWorkflowAnalyticsAggregate(params?: Record<string, string>): Observable<WorkflowAnalyticsDto> { return this.http.get<WorkflowAnalyticsDto>(`${this.api}/workflow-analytics/aggregate`, { params }); }
  getWorkflowTemplates(): Observable<WorkflowTemplateDto[]> { return this.http.get<WorkflowTemplateDto[]>(`${this.api}/workflow-templates`); }
  instantiateWorkflowFromTemplate(data: InstantiateWorkflowTemplateRequest): Observable<MessageResponse> { return this.http.post<MessageResponse>(`${this.api}/workflow-templates/instantiate`, data); }
  seedWorkflowTemplates(): Observable<MessageResponse> { return this.http.post<MessageResponse>(`${this.api}/workflows/templates/seed`, {}); }
  getWorkflowExtTemplates(): Observable<WorkflowTemplateDto[]> { return this.http.get<WorkflowTemplateDto[]>(`${this.api}/workflow-ext/workflow-templates`); }
  instantiateWorkflowTemplate(data: InstantiateWorkflowTemplateRequest): Observable<MessageResponse> { return this.http.post<MessageResponse>(`${this.api}/workflow-ext/instantiate`, data); }

  // === Cooperative Workflow Operations ===
  getStandupDigests(params?: Record<string, string>): Observable<StandupDigestDto[]> { return this.http.get<StandupDigestDto[]>(`${this.api}/cooperative-workflows/standup-digests`, { params }); }
  getStandupDigest(id: string): Observable<StandupDigestDto> { return this.http.get<StandupDigestDto>(`${this.api}/cooperative-workflows/standup-digests/${id}`); }
  acknowledgeStandupDigest(id: string): Observable<MessageResponse> { return this.http.post<MessageResponse>(`${this.api}/cooperative-workflows/standup-digests/${id}/acknowledge`, {}); }
  getTriageProposals(params?: Record<string, string>): Observable<TriageProposalDto[]> { return this.http.get<TriageProposalDto[]>(`${this.api}/cooperative-workflows/triage-proposals`, { params }); }
  resolveTriageProposal(id: string, data?: ResolveTriageProposalRequest): Observable<MessageResponse> { return this.http.post<MessageResponse>(`${this.api}/cooperative-workflows/triage-proposals/${id}/resolve`, data ?? {}); }
  getWarRooms(params?: Record<string, string>): Observable<WarRoomDto[]> { return this.http.get<WarRoomDto[]>(`${this.api}/cooperative-workflows/war-rooms`, { params }); }
  getWarRoom(id: string): Observable<WarRoomDto> { return this.http.get<WarRoomDto>(`${this.api}/cooperative-workflows/war-rooms/${id}`); }
  resolveWarRoom(id: string, data?: ResolveWarRoomRequest): Observable<MessageResponse> { return this.http.post<MessageResponse>(`${this.api}/cooperative-workflows/war-rooms/${id}/resolve`, data ?? {}); }
  claimWarRoomTask(id: string): Observable<MessageResponse> { return this.http.post<MessageResponse>(`${this.api}/cooperative-workflows/war-rooms/${id}/claim`, {}); }
  getCoDraftSessions(params?: Record<string, string>): Observable<CoDraftSessionDto[]> { return this.http.get<CoDraftSessionDto[]>(`${this.api}/cooperative-workflows/co-draft-sessions`, { params }); }
  getCoDraftSession(id: string): Observable<CoDraftSessionDto> { return this.http.get<CoDraftSessionDto>(`${this.api}/cooperative-workflows/co-draft-sessions/${id}`); }
  finalizeCoDraftSession(id: string): Observable<MessageResponse> { return this.http.post<MessageResponse>(`${this.api}/cooperative-workflows/co-draft-sessions/${id}/finalize`, {}); }
  resolveCoDraftQuestion(id: string, data?: ResolveCoDraftQuestionRequest): Observable<MessageResponse> { return this.http.post<MessageResponse>(`${this.api}/cooperative-workflows/co-draft-sessions/${id}/resolve-question`, data ?? {}); }
  getRiskPairReviews(params?: Record<string, string>): Observable<RiskPairReviewDto[]> { return this.http.get<RiskPairReviewDto[]>(`${this.api}/cooperative-workflows/risk-pair-reviews`, { params }); }
  getRiskPairReview(id: string): Observable<RiskPairReviewDto> { return this.http.get<RiskPairReviewDto>(`${this.api}/cooperative-workflows/risk-pair-reviews/${id}`); }
  finalizeRiskPairReview(id: string, data?: Record<string, unknown>): Observable<MessageResponse> { return this.http.post<MessageResponse>(`${this.api}/cooperative-workflows/risk-pair-reviews/${id}/finalize`, data ?? {}); }
  submitHumanRiskAssessment(id: string, data: HumanRiskAssessmentRequest): Observable<MessageResponse> { return this.http.post<MessageResponse>(`${this.api}/cooperative-workflows/risk-pair-reviews/${id}/human-assessment`, data); }
  getScoreCalibrations(params?: Record<string, string>): Observable<ScoreCalibrationDto[]> { return this.http.get<ScoreCalibrationDto[]>(`${this.api}/cooperative-workflows/score-calibrations`, { params }); }
  getCalibrationDetail(id: string): Observable<ScoreCalibrationDto> { return this.http.get<ScoreCalibrationDto>(`${this.api}/cooperative-workflows/score-calibrations/${id}`); }
  submitCalibration(id: string, data: SubmitCalibrationRequest): Observable<MessageResponse> { return this.http.post<MessageResponse>(`${this.api}/cooperative-workflows/score-calibrations/${id}/submit`, data); }
  acceptCalibration(id: string): Observable<MessageResponse> { return this.http.post<MessageResponse>(`${this.api}/cooperative-workflows/score-calibrations/${id}/accept`, {}); }
  getEvidenceRelayQueue(params?: Record<string, string>): Observable<EvidenceRelayItemDto[]> { return this.http.get<EvidenceRelayItemDto[]>(`${this.api}/cooperative-workflows/evidence-relay-queue`, { params }); }
  reviewEvidenceRelay(id: string, data: ReviewEvidenceRelayRequest): Observable<MessageResponse> { return this.http.post<MessageResponse>(`${this.api}/cooperative-workflows/evidence-relay-queue/${id}/review`, data); }
  getApprovalPreScreens(params?: Record<string, string>): Observable<ApprovalPreScreenDto[]> { return this.http.get<ApprovalPreScreenDto[]>(`${this.api}/cooperative-workflows/approval-pre-screens`, { params }); }
  getPreScreenDetail(id: string): Observable<ApprovalPreScreenDto> { return this.http.get<ApprovalPreScreenDto>(`${this.api}/cooperative-workflows/approval-pre-screens/${id}`); }
  runPreScreen(id: string): Observable<ApprovalPreScreenDto> { return this.http.post<ApprovalPreScreenDto>(`${this.api}/cooperative-workflows/approval-pre-screens/${id}/run`, {}); }
  getAuditPrepChecklists(params?: Record<string, string>): Observable<AuditPrepChecklistDto[]> { return this.http.get<AuditPrepChecklistDto[]>(`${this.api}/cooperative-workflows/audit-prep-checklists`, { params }); }
  getAuditPrepChecklist(id: string): Observable<AuditPrepChecklistDto> { return this.http.get<AuditPrepChecklistDto>(`${this.api}/cooperative-workflows/audit-prep-checklists/${id}`); }
  addAuditPrepItem(id: string, data: AddAuditPrepItemRequest): Observable<MessageResponse> { return this.http.post<MessageResponse>(`${this.api}/cooperative-workflows/audit-prep-checklists/${id}/items`, data); }
  markAuditPrepItemReady(checklistId: string, itemId: string): Observable<MessageResponse> { return this.http.post<MessageResponse>(`${this.api}/cooperative-workflows/audit-prep-checklists/${checklistId}/items/${itemId}/ready`, {}); }
  updateAuditPrepStatus(id: string, data: UpdateAuditPrepStatusRequest): Observable<MessageResponse> { return this.http.patch<MessageResponse>(`${this.api}/cooperative-workflows/audit-prep-checklists/${id}`, data); }
  getNudgeNegotiations(params?: Record<string, string>): Observable<NudgeNegotiationDto[]> { return this.http.get<NudgeNegotiationDto[]>(`${this.api}/cooperative-workflows/nudge-negotiations`, { params }); }
  createNudge(data: CreateNudgeRequest): Observable<MessageResponse> { return this.http.post<MessageResponse>(`${this.api}/cooperative-workflows/nudge-negotiations`, data); }

  // === Teams ===
  getTeams(): Observable<TeamListDto> { return this.http.get<TeamListDto>(`${this.api}/teams`); }
  getTeamById(id: string): Observable<TeamDto> { return this.http.get<TeamDto>(`${this.api}/teams/${id}`); }
  createTeam(data: CreateTeamRequest): Observable<MessageResponse> { return this.http.post<MessageResponse>(`${this.api}/teams`, data); }
  updateTeam(id: string, data: UpdateTeamRequest): Observable<MessageResponse> { return this.http.put<MessageResponse>(`${this.api}/teams/${id}`, data); }
  deleteTeam(id: string): Observable<MessageResponse> { return this.http.delete<MessageResponse>(`${this.api}/teams/${id}`); }
  linkTeamToWorkflow(teamId: string, workflowIdOrCode: string): Observable<MessageResponse> { return this.http.post<MessageResponse>(`${this.api}/teams/${teamId}/link-workflow`, { workflowIdOrCode }); }
  linkTeamToControls(teamId: string, controlGroupId: string): Observable<MessageResponse> { return this.http.post<MessageResponse>(`${this.api}/teams/${teamId}/link-controls`, { controlGroupId }); }
  getTeamWorkload(teamId: string): Observable<TeamWorkloadDto> { return this.http.get<TeamWorkloadDto>(`${this.api}/teams/${teamId}/workload`); }
  getTeamMembers(): Observable<TeamMemberDto[]> { return this.http.get<TeamMemberDto[]>(`${this.api}/profiles/tenant/members`); }

  // === Team RACI ===
  getRACIMatrix(scopeType: string, scopeId: string): Observable<RACIMatrixDto> {
    return this.http.get<RACIMatrixDto>(`${this.api}/teams/raci/${scopeType}/${scopeId}`);
  }
  setRACIRole(scopeType: string, scopeId: string, raciRole: string, teamId?: string, platformRole?: string, notes?: string): Observable<MessageResponse> {
    return this.http.post<MessageResponse>(`${this.api}/teams/raci/${scopeType}/${scopeId}`, { raciRole, teamId, platformRole, notes });
  }
  removeRACIRole(raciId: string): Observable<MessageResponse> {
    return this.http.delete<MessageResponse>(`${this.api}/teams/raci/${raciId}`);
  }
  getTeamRACIScopes(teamId: string): Observable<TeamRACIScopeDto> {
    return this.http.get<TeamRACIScopeDto>(`${this.api}/teams/${teamId}/raci`);
  }
  getTeamRACICount(): Observable<TeamRACICountDto> {
    return this.http.get<TeamRACICountDto>(`${this.api}/teams/raci-count`);
  }

  // === GRC RACI Entity-Level (backend: /api/grc-raci) ===
  getRaciDashboard(): Observable<RaciDashboardDto> { return this.http.get<RaciDashboardDto>(`${this.api}/grc-raci/dashboard`); }
  getRaciMatrix(entityType?: string): Observable<RaciMatrixEntryDto[]> { return this.http.get<RaciMatrixEntryDto[]>(`${this.api}/grc-raci/matrix`, { params: entityType ? { entity_type: entityType } : {} }); }
  getRaciGaps(entityType?: string): Observable<RaciGapDto[]> { return this.http.get<RaciGapDto[]>(`${this.api}/grc-raci/gaps`, { params: entityType ? { entity_type: entityType } : {} }); }
  getRaciForEntity(entityType: string, entityId: string): Observable<RaciMatrixEntryDto[]> { return this.http.get<RaciMatrixEntryDto[]>(`${this.api}/grc-raci/entity/${entityType}/${entityId}`); }
  assignRaci(data: AssignRaciRequest): Observable<MessageResponse> { return this.http.post<MessageResponse>(`${this.api}/grc-raci/assign`, data); }
  removeRaciAssignment(assignmentId: string): Observable<MessageResponse> { return this.http.delete<MessageResponse>(`${this.api}/grc-raci/assign/${assignmentId}`); }
  assignEntityOwner(data: AssignEntityOwnerRequest): Observable<MessageResponse> { return this.http.post<MessageResponse>(`${this.api}/grc-raci/owner`, data); }
  assignEntityTeam(data: AssignEntityTeamRequest): Observable<MessageResponse> { return this.http.post<MessageResponse>(`${this.api}/grc-raci/team`, data); }
  getRaciTeamDistribution(entityType: string): Observable<RaciTeamDistributionDto> { return this.http.get<RaciTeamDistributionDto>(`${this.api}/grc-raci/team-distribution/${entityType}`); }
  checkRaciGate(data: CheckRaciGateRequest): Observable<CheckRaciGateResultDto> { return this.http.post<CheckRaciGateResultDto>(`${this.api}/grc-raci/gate`, data); }
  getEvidenceActions(evidenceId: string): Observable<EvidenceActionDto[]> { return this.http.get<EvidenceActionDto[]>(`${this.api}/grc-raci/evidence/${evidenceId}/actions`); }
  createEvidenceAction(evidenceId: string, data: CreateEvidenceActionRequest): Observable<MessageResponse> { return this.http.post<MessageResponse>(`${this.api}/grc-raci/evidence/${evidenceId}/actions`, data); }
  updateEvidenceAction(actionId: string, data: Partial<CreateEvidenceActionRequest>): Observable<MessageResponse> { return this.http.put<MessageResponse>(`${this.api}/grc-raci/evidence-actions/${actionId}`, data); }

  // === Process Tasks ===
  getProcessTasks(filters?: ProcessTaskFilters): Observable<ProcessTaskListDto> {
    const parts: string[] = [];
    if (filters?.status) parts.push(`status=${encodeURIComponent(filters.status)}`);
    if (filters?.teamId) parts.push(`teamId=${encodeURIComponent(filters.teamId)}`);
    if (filters?.assignedTo) parts.push(`assignedTo=${encodeURIComponent(filters.assignedTo)}`);
    if (filters?.priority) parts.push(`priority=${encodeURIComponent(filters.priority)}`);
    if (filters?.role) parts.push(`role=${encodeURIComponent(filters.role)}`);
    const qs = parts.length ? '?' + parts.join('&') : '';
    return this.http.get<ProcessTaskListDto>(`${this.api}/process-tasks${qs}`);
  }
  updateProcessTaskStatus(taskId: string, status: string): Observable<ProcessTaskDto> {
    return this.http.put<ProcessTaskDto>(`${this.api}/process-tasks/${taskId}/status`, { status });
  }
  getProcessTasksSlaByRole(): Observable<SlaByRoleDto[]> {
    return this.http.get<SlaByRoleDto[]>(`${this.api}/process-tasks/sla-by-role`);
  }

  // === Work Items ===
  getMyWorkItems(filters?: WorkItemFilters): Observable<WorkItemListDto> {
    const params = new HttpParams({ fromObject: { ...filters } as Record<string, string> });
    return this.http.get<WorkItemListDto>(`${this.api}/work-items/my-tasks`, { params });
  }
  claimWorkItem(taskId: string): Observable<MessageResponse> {
    return this.http.post<MessageResponse>(`${this.api}/work-items/${taskId}/claim`, {});
  }
  completeWorkItem(taskId: string, body?: CompleteWorkItemRequest): Observable<MessageResponse> {
    return this.http.post<MessageResponse>(`${this.api}/work-items/${taskId}/complete`, body || {});
  }

  // === Approvals ===
  getApprovals(workspaceId: string): Observable<ApprovalListDto> { return this.http.get<ApprovalListDto>(`${this.api}/workflows/approvals?workspace_id=${workspaceId}`); }
  approveItem(approvalId: string, comment: string): Observable<ApprovalDto> { return this.http.put<ApprovalDto>(`${this.api}/workflows/approvals/${approvalId}`, { status: 'approved', decision_comment: comment }); }
  rejectItem(approvalId: string, comment: string): Observable<ApprovalDto> { return this.http.put<ApprovalDto>(`${this.api}/workflows/approvals/${approvalId}`, { status: 'rejected', decision_comment: comment }); }
  getPendingApprovalItems(): Observable<ApprovalListDto> { return this.http.get<ApprovalListDto>(`${this.api}/approvals/pending`); }
  initiateApprovalRequest(data: InitiateApprovalRequest): Observable<MessageResponse> {
    return this.http.post<MessageResponse>(`${this.api}/approvals/initiate`, data);
  }
  getApprovalRequests(entityType?: string, entityId?: string): Observable<ApprovalListDto> {
    const parts: string[] = [];
    if (entityType) parts.push(`entityType=${entityType}`);
    if (entityId) parts.push(`entityId=${entityId}`);
    const qs = parts.length ? '?' + parts.join('&') : '';
    return this.http.get<ApprovalListDto>(`${this.api}/approvals/requests${qs}`);
  }
  submitApprovalDecision(approvalId: string, decision: string, reason?: string): Observable<MessageResponse> {
    return this.http.post<MessageResponse>(`${this.api}/approvals/requests/${approvalId}/decide`, { decision, reason });
  }

  // === Automation Rules ===
  getAutomationRules(module?: string): Observable<AutomationRuleDto[]> {
    const qs = module ? `?module=${module}` : '';
    return this.http.get<AutomationRuleDto[]>(`${this.api}/automation/rules${qs}`);
  }
  createAutomationRule(data: CreateAutomationRuleRequest): Observable<MessageResponse> { return this.http.post<MessageResponse>(`${this.api}/automation/rules`, data); }
  updateAutomationRule(id: string, data: UpdateAutomationRuleRequest): Observable<MessageResponse> { return this.http.put<MessageResponse>(`${this.api}/automation/rules/${id}`, data); }
  deleteAutomationRule(id: string): Observable<MessageResponse> { return this.http.delete<MessageResponse>(`${this.api}/automation/rules/${id}`); }
  getAutomationLog(opts?: { module?: string; limit?: number; offset?: number }): Observable<AutomationLogDto> {
    const parts: string[] = [];
    if (opts?.module) parts.push(`module=${opts.module}`);
    if (opts?.limit) parts.push(`limit=${opts.limit}`);
    if (opts?.offset) parts.push(`offset=${opts.offset}`);
    const qs = parts.length ? '?' + parts.join('&') : '';
    return this.http.get<AutomationLogDto>(`${this.api}/automation/log${qs}`);
  }
  seedAutomationRules(): Observable<MessageResponse> { return this.http.post<MessageResponse>(`${this.api}/automation/seed`, {}); }

  // === Notifications ===
  getNotifications(): Observable<NotificationListDto> { return this.http.get<NotificationListDto>(`${this.api}/notifications`); }
  markNotificationRead(id: string): Observable<MessageResponse> { return this.http.put<MessageResponse>(`${this.api}/notifications/${id}/read`, {}); }
  markAllNotificationsRead(): Observable<MessageResponse> { return this.http.put<MessageResponse>(`${this.api}/notifications/read-all`, {}); }
  deleteNotification(id: string): Observable<MessageResponse> { return this.http.delete<MessageResponse>(`${this.api}/notifications/${id}`); }
  getNotificationPreferences(): Observable<NotificationPreferencesDto> { return this.http.get<NotificationPreferencesDto>(`${this.api}/notifications/preferences`); }
  updateNotificationPreferences(prefs: NotificationPreferencesDto): Observable<MessageResponse> { return this.http.put<MessageResponse>(`${this.api}/notifications/preferences`, prefs); }

  // === Messaging ===
  getChannels(): Observable<ChannelListDto> { return this.http.get<ChannelListDto>(`${this.api}/messaging/channels`); }
  createChannel(data: CreateChannelRequest): Observable<MessageResponse> { return this.http.post<MessageResponse>(`${this.api}/messaging/channels`, data); }
  getChannelMessages(channelId: string): Observable<ChannelMessageDto[]> { return this.http.get<ChannelMessageDto[]>(`${this.api}/messaging/channels/${channelId}/messages`); }
  sendChannelMessage(channelId: string, data: SendChannelMessageRequest): Observable<MessageResponse> { return this.http.post<MessageResponse>(`${this.api}/messaging/channels/${channelId}/messages`, data); }
  sendDirectMessage(data: SendDirectMessageRequest): Observable<MessageResponse> { return this.http.post<MessageResponse>(`${this.api}/messaging/dm`, data); }
  getDirectMessages(userId: string): Observable<ChannelMessageDto[]> { return this.http.get<ChannelMessageDto[]>(`${this.api}/messaging/dm/${userId}`); }
  getUnreadCount(): Observable<UnreadCountDto> { return this.http.get<UnreadCountDto>(`${this.api}/messaging/unread`); }

  // === Profiles ===
  getMyProfile(): Observable<UserProfileDto> { return this.http.get<UserProfileDto>(`${this.api}/profiles/me`); }
  updateMyProfile(data: Partial<UserProfileDto>): Observable<MessageResponse> { return this.http.put<MessageResponse>(`${this.api}/profiles/me`, data); }
  getTenantProfile(): Observable<TenantProfileDto> { return this.http.get<TenantProfileDto>(`${this.api}/profiles/tenant`); }
  getMyPermissions(): Observable<UserPermissionsDto> { return this.http.get<UserPermissionsDto>(`${this.api}/profiles/me/permissions`); }

  // === Roles (DB-driven) ===
  getRoles(): Observable<RoleListDto> { return this.http.get<RoleListDto>(`${this.api}/foundation/roles`); }
  getRoleStats(): Observable<RoleStatsDto> { return this.http.get<RoleStatsDto>(`${this.api}/foundation/roles/stats`); }
  createRole(data: CreateRoleRequest): Observable<MessageResponse> { return this.http.post<MessageResponse>(`${this.api}/foundation/roles`, data); }
  updateRole(id: string, data: UpdateRoleRequest): Observable<MessageResponse> { return this.http.put<MessageResponse>(`${this.api}/foundation/roles/${id}`, data); }
  assignRoleProfile(data: { userId: string; profileId: string }): Observable<MessageResponse> { return this.http.post<MessageResponse>(`${this.api}/profiles/roles/assign`, data); }
  getMyRoleProfile(): Observable<RoleProfileDto> { return this.http.get<RoleProfileDto>(`${this.api}/profiles/me/role-profile`); }

  // === Role Profiles ===
  getRoleProfiles(): Observable<RoleProfileDto[]> { return this.http.get<RoleProfileDto[]>(`${this.api}/profiles/roles`); }
  getRoleProfileByRole(role: string): Observable<RoleProfileDto> { return this.http.get<RoleProfileDto>(`${this.api}/profiles/roles/${role}`); }
  updateRoleProfile(role: string, data: Partial<RoleProfileDto>): Observable<MessageResponse> { return this.http.put<MessageResponse>(`${this.api}/profiles/roles/${role}`, data); }

  // === Role Matrix ===
  getRoleMatrix(userId?: string): Observable<RoleMatrixDto> {
    const query = userId ? `?userId=${encodeURIComponent(userId)}` : '';
    return this.http.get<RoleMatrixDto>(`${this.api}/profiles/role-matrix${query}`);
  }
  getMyRoleMatrix(): Observable<RoleMatrixDto> { return this.http.get<RoleMatrixDto>(`${this.api}/profiles/role-matrix?effective=me`); }
  assignRoleMatrixRole(data: AssignRoleMatrixRoleRequest): Observable<MessageResponse> {
    return this.http.post<MessageResponse>(`${this.api}/profiles/roles/assignments`, data);
  }
  updateRoleFunctions(data: RoleFunctionMappingDto): Observable<MessageResponse> {
    return this.http.put<MessageResponse>(`${this.api}/profiles/roles/functions`, data);
  }
  updateFunctionAuthorities(data: FunctionAuthorityDto): Observable<MessageResponse> {
    return this.http.put<MessageResponse>(`${this.api}/profiles/functions/authorities`, data);
  }

  // === Role Detail ===
  getRoleDetail(roleCode: string): Observable<RoleDetailDto> { return this.http.get<RoleDetailDto>(`${this.api}/roles/${roleCode}/detail`); }
  getRoleUsers(roleCode: string, page = 1, limit = 25): Observable<RoleUsersDto> { return this.http.get<RoleUsersDto>(`${this.api}/roles/${roleCode}/users?page=${page}&limit=${limit}`); }
  getRolePermissions(roleCode: string): Observable<RolePermissionsDto> { return this.http.get<RolePermissionsDto>(`${this.api}/roles/${roleCode}/permissions`); }
  getRoleTeams(roleCode: string): Observable<RoleTeamsDto> { return this.http.get<RoleTeamsDto>(`${this.api}/roles/${roleCode}/teams`); }
  getRoleDashboards(roleCode: string): Observable<RoleDashboardsDto> { return this.http.get<RoleDashboardsDto>(`${this.api}/roles/${roleCode}/dashboards`); }
  getRoleExperience(roleCode: string): Observable<RoleExperienceDto> { return this.http.get<RoleExperienceDto>(`${this.api}/roles/${roleCode}/experience`); }
  assignRoleToUser(roleCode: string, data: AssignRoleToUserRequest): Observable<MessageResponse> { return this.http.post<MessageResponse>(`${this.api}/roles/${roleCode}/assign`, data); }
  unassignRole(assignmentId: string): Observable<MessageResponse> { return this.http.delete<MessageResponse>(`${this.api}/roles/assignments/${assignmentId}`); }

  // === GRC Role Staffing Lookup ===
  getRoleStaffing(rangeCode?: string, sectorCode?: string): Observable<RoleStaffingDto> {
    const q = new URLSearchParams();
    if (rangeCode) q.set('rangeCode', rangeCode);
    if (sectorCode) q.set('sectorCode', sectorCode);
    const qs = q.toString();
    return this.http.get<RoleStaffingDto>(`${this.api}/teams/role-staffing${qs ? '?' + qs : ''}`);
  }

  // === Users ===
  getUserById(userId: string): Observable<UserDetailDto> { return this.http.get<UserDetailDto>(`${this.api}/users/${userId}`); }
  getUserTeams(userId: string): Observable<UserTeamsDto> { return this.http.get<UserTeamsDto>(`${this.api}/users/${userId}/teams`); }
  assignUserToTeam(userId: string, teamId: string, teamRole?: string): Observable<MessageResponse> {
    return this.http.post<MessageResponse>(`${this.api}/users/${userId}/assign-team`, { team_id: teamId, team_role: teamRole || 'member' });
  }
  removeUserFromTeam(userId: string, teamId: string): Observable<MessageResponse> {
    return this.http.delete<MessageResponse>(`${this.api}/users/${userId}/teams/${teamId}`);
  }
  getUserTasks(userId: string): Observable<UserTasksDto> { return this.http.get<UserTasksDto>(`${this.api}/users/${userId}/tasks`); }
  searchUsersForMention(query: string): Observable<{ users: Array<{ userId: string; email: string; name: string }> }> {
    return this.http.get<{ users: Array<{ userId: string; email: string; name: string }> }>(`${this.api}/users/mention-search`, { params: { q: query } });
  }

  // === User Activities ===
  getActivities(opts?: { user_id?: string; limit?: number; offset?: number }): Observable<ActivityListDto> {
    const parts: string[] = [];
    if (opts?.user_id) parts.push(`user_id=${opts.user_id}`);
    if (opts?.limit) parts.push(`limit=${opts.limit}`);
    if (opts?.offset) parts.push(`offset=${opts.offset}`);
    const qs = parts.length ? '?' + parts.join('&') : '';
    return this.http.get<ActivityListDto>(`${this.api}/profiles/tenant/activities${qs}`);
  }
  recordActivity(data: RecordActivityRequest): Observable<MessageResponse> {
    return this.http.post<MessageResponse>(`${this.api}/profiles/activities`, data);
  }

  // === Invitations ===
  getInvitations(filters?: { status?: string }): Observable<InvitationListDto> {
    const qs = filters?.status ? `?status=${filters.status}` : '';
    return this.http.get<InvitationListDto>(`${this.api}/invitations${qs}`);
  }
  revokeInvitation(token: string): Observable<MessageResponse> {
    return this.http.delete<MessageResponse>(`${this.api}/invitations/${token}`);
  }
  revokeInvitationById(invitationId: string): Observable<MessageResponse> {
    return this.http.delete<MessageResponse>(`${this.api}/invitations/by-id/${invitationId}`);
  }
  resendInvitationEmail(invitationId: string): Observable<MessageResponse> {
    return this.http.post<MessageResponse>(`${this.api}/invitations/resend`, { invitationId });
  }
  sendRoleInvitation(data: SendRoleInvitationRequest): Observable<MessageResponse> {
    return this.http.post<MessageResponse>(`${this.api}/invitations`, {
      email: data.email,
      role: data.roleCode,
      entityType: 'role_assignment',
      entityId: data.roleCode,
      metadata: { name: data.name, orgTitle: data.orgTitle, shahinTitle: data.shahinTitle },
    });
  }

  // === Member Lifecycle ===
  getMemberDirectory(): Observable<MemberDirectoryDto> { return this.http.get<MemberDirectoryDto>(`${this.api}/member-lifecycle/directory`); }
  getMemberLifecycle(userId: string): Observable<MemberLifecycleDto> { return this.http.get<MemberLifecycleDto>(`${this.api}/member-lifecycle/${userId}`); }
  getMemberProfiles(userId: string): Observable<MemberProfileDto[]> { return this.http.get<MemberProfileDto[]>(`${this.api}/member-lifecycle/${userId}/profiles`); }
  createMemberProfile(userId: string, data: CreateMemberProfileRequest): Observable<MessageResponse> { return this.http.post<MessageResponse>(`${this.api}/member-lifecycle/${userId}/profiles`, data); }
  switchMemberProfile(userId: string, profileId: string): Observable<MessageResponse> { return this.http.post<MessageResponse>(`${this.api}/member-lifecycle/${userId}/switch-profile`, { profileId }); }
  updateMemberLifecycleStatus(userId: string, teamId: string, status: string): Observable<MessageResponse> {
    return this.http.put<MessageResponse>(`${this.api}/member-lifecycle/${userId}/lifecycle-status`, { teamId, status });
  }
  setMemberActivationMode(userId: string, teamId: string, mode: string): Observable<MessageResponse> {
    return this.http.put<MessageResponse>(`${this.api}/member-lifecycle/${userId}/activation-mode`, { teamId, mode });
  }
  getMemberAgentShadow(userId: string, teamId?: string): Observable<AgentShadowDto> {
    const qs = teamId ? `?teamId=${teamId}` : '';
    return this.http.get<AgentShadowDto>(`${this.api}/member-lifecycle/${userId}/agent-shadow${qs}`);
  }
  upsertMemberAgentShadow(userId: string, data: UpsertAgentShadowRequest): Observable<MessageResponse> {
    return this.http.put<MessageResponse>(`${this.api}/member-lifecycle/${userId}/agent-shadow`, data);
  }
  getAgentActivationRules(shadowId: string): Observable<AgentActivationRuleDto[]> {
    return this.http.get<AgentActivationRuleDto[]>(`${this.api}/member-lifecycle/agent-shadow/${shadowId}/rules`);
  }
  createAgentActivationRule(shadowId: string, data: CreateAgentActivationRuleRequest): Observable<MessageResponse> {
    return this.http.post<MessageResponse>(`${this.api}/member-lifecycle/agent-shadow/${shadowId}/rules`, data);
  }
  updateAgentActivationRule(ruleId: string, data: UpdateAgentActivationRuleRequest): Observable<MessageResponse> {
    return this.http.put<MessageResponse>(`${this.api}/member-lifecycle/agent-shadow/rules/${ruleId}`, data);
  }
  deleteAgentActivationRule(ruleId: string): Observable<MessageResponse> {
    return this.http.delete<MessageResponse>(`${this.api}/member-lifecycle/agent-shadow/rules/${ruleId}`);
  }
  syncPerformanceScores(): Observable<MessageResponse> {
    return this.http.post<MessageResponse>(`${this.api}/member-lifecycle/sync/performance-scores`, {});
  }
  syncRaciMirrors(): Observable<MessageResponse> {
    return this.http.post<MessageResponse>(`${this.api}/member-lifecycle/sync/raci-mirrors`, {});
  }

  // === Admin Tenant Management ===
  getAdminTenants(): Observable<AdminTenantListDto> { return this.http.get<AdminTenantListDto>(`${this.api}/admin/tenants`); }
  getAdminHealth(): Observable<AdminHealthDto> { return this.http.get<AdminHealthDto>(`${this.api}/admin/health`); }
  createAdminTenant(data: CreateAdminTenantRequest): Observable<MessageResponse> { return this.http.post<MessageResponse>(`${this.api}/admin/tenants`, data); }
  suspendAdminTenant(id: string): Observable<MessageResponse> { return this.http.put<MessageResponse>(`${this.api}/admin/tenants/${id}/suspend`, {}); }
  deleteAdminTenant(id: string): Observable<MessageResponse> { return this.http.delete<MessageResponse>(`${this.api}/admin/tenants/${id}`); }

  // === Admin User Management ===
  getAdminUsers(): Observable<AdminUserListDto> { return this.http.get<AdminUserListDto>(`${this.api}/admin/users`); }
  updateUserRole(userId: string, role: string): Observable<MessageResponse> { return this.http.put<MessageResponse>(`${this.api}/admin/users/${userId}/role`, { role }); }

  // === Password Change ===
  changePassword(data: { currentPassword: string; newPassword: string }): Observable<MessageResponse> {
    return this.http.post<MessageResponse>(`${this.api}/auth/change-password`, data);
  }

  // === Workspaces ===
  getWorkspaces(): Observable<WorkspaceListDto> { return this.http.get<WorkspaceListDto>(`${this.api}/workspaces`); }
  createWorkspace(data: CreateWorkspaceRequest): Observable<MessageResponse> { return this.http.post<MessageResponse>(`${this.api}/workspaces`, data); }
  updateWorkspace(id: string, data: UpdateWorkspaceRequest): Observable<MessageResponse> { return this.http.put<MessageResponse>(`${this.api}/workspaces/${id}`, data); }
  deleteWorkspace(id: string): Observable<MessageResponse> { return this.http.delete<MessageResponse>(`${this.api}/workspaces/${id}`); }

  // === Scope Dimensions ===
  getScopes(workspaceId: string, type?: string): Observable<ScopeListDto> {
    const params = type ? `?type=${type}` : '';
    return this.http.get<ScopeListDto>(`${this.api}/workspaces/${workspaceId}/scopes${params}`);
  }
  createScope(workspaceId: string, data: CreateScopeRequest): Observable<MessageResponse> {
    return this.http.post<MessageResponse>(`${this.api}/workspaces/${workspaceId}/scopes`, data);
  }

  // === Tenant Home ===
  getHomeOverview(workspaceId: string): Observable<HomeOverviewDto> {
    const qs = workspaceId ? `?workspaceId=${workspaceId}` : '';
    return this.http.get<HomeOverviewDto>(`${this.api}/tenant-home/overview${qs}`);
  }
  getHomeActivity(workspaceId: string, opts?: { module?: string; limit?: number; offset?: number }): Observable<HomeActivityDto> {
    const parts: string[] = [];
    if (workspaceId) parts.push(`workspaceId=${workspaceId}`);
    if (opts?.module) parts.push(`module=${opts.module}`);
    if (opts?.limit) parts.push(`limit=${opts.limit}`);
    if (opts?.offset) parts.push(`offset=${opts.offset}`);
    const qs = parts.length ? '?' + parts.join('&') : '';
    return this.http.get<HomeActivityDto>(`${this.api}/tenant-home/activity${qs}`);
  }

  // === Export ===
  exportPDF(module: string): void { window.open(`${this.api}/reports/export/${module}/pdf`, '_blank'); }
  exportExcel(module: string): void { window.open(`${this.api}/reports/export/${module}/excel`, '_blank'); }

  // === Mappings ===
  createMapping(data: CreateMappingRequest): Observable<MappingDto> {
    return this.http.post<MappingDto>(`${this.api}/mappings`, data);
  }
  deleteMapping(id: string): Observable<MessageResponse> { return this.http.delete<MessageResponse>(`${this.api}/mappings/${id}`); }

  // === Relationships ===
  getRelationships(objectType: string, objectId: string): Observable<RelationshipListDto> {
    return this.http.get<RelationshipListDto>(`${this.api}/objects/${objectType}/${objectId}/relationships`);
  }

  // === Assets ===
  getAssets(workspaceId?: string): Observable<AssetListDto> {
    const params = workspaceId ? `?workspace_id=${workspaceId}` : '';
    return this.http.get<AssetListDto>(`${this.api}/assets${params}`);
  }
  getAssetById(id: string): Observable<AssetDto> { return this.http.get<AssetDto>(`${this.api}/assets/${id}`); }
  createAsset(data: CreateAssetRequest): Observable<MessageResponse> { return this.http.post<MessageResponse>(`${this.api}/assets`, data); }
  updateAsset(id: string, data: UpdateAssetRequest): Observable<MessageResponse> { return this.http.put<MessageResponse>(`${this.api}/assets/${id}`, data); }
  deleteAsset(id: string): Observable<MessageResponse> { return this.http.delete<MessageResponse>(`${this.api}/assets/${id}`); }

  // === Comments ===
  getComments(entityType: string, entityId: string): Observable<CommentListDto> { return this.http.get<CommentListDto>(`${this.api}/comments/${entityType}/${entityId}`); }
  createComment(data: CreateCommentRequest): Observable<MessageResponse> { return this.http.post<MessageResponse>(`${this.api}/comments`, data); }
  updateComment(id: string, data: UpdateCommentRequest): Observable<MessageResponse> { return this.http.put<MessageResponse>(`${this.api}/comments/${id}`, data); }
  deleteComment(id: string): Observable<MessageResponse> { return this.http.delete<MessageResponse>(`${this.api}/comments/${id}`); }

  // === Activity Feed ===
  getActivityFeed(module?: string): Observable<ActivityFeedDto> {
    const qs = module ? `?module=${module}` : '';
    return this.http.get<ActivityFeedDto>(`${this.api}/activity-feed${qs}`);
  }

  // === Entity Links ===
  getEntityLinks(entityType: string, entityId: string): Observable<EntityLinkListDto> { return this.http.get<EntityLinkListDto>(`${this.api}/entity-links/${entityType}/${entityId}`); }
  createEntityLink(data: CreateEntityLinkRequest): Observable<MessageResponse> { return this.http.post<MessageResponse>(`${this.api}/entity-links`, data); }
  deleteEntityLink(id: string): Observable<MessageResponse> { return this.http.delete<MessageResponse>(`${this.api}/entity-links/${id}`); }

  // === Global Search ===
  globalSearch(q: string, modules?: string): Observable<GlobalSearchResultDto> {
    const qs = modules ? `&modules=${modules}` : '';
    return this.http.get<GlobalSearchResultDto>(`${this.api}/search?q=${encodeURIComponent(q)}${qs}`);
  }

  // === Audit Trail ===
  getAuditTrail(): Observable<AuditTrailDto> { return this.http.get<AuditTrailDto>(`${this.api}/audit-trail`); }
  getAuditModules(): Observable<AuditModulesDto> { return this.http.get<AuditModulesDto>(`${this.api}/audit-trail/modules`); }
  getAuditTrailFiltered(params: AuditTrailFilters): Observable<AuditTrailDto> {
    const q = new URLSearchParams();
    if (params.module) q.set('module', params.module);
    if (params.userId) q.set('userId', params.userId);
    if (params.entityType) q.set('entityType', params.entityType);
    if (params.action) q.set('action', params.action);
    if (params.entityId) q.set('entityId', params.entityId);
    if (params.startDate) q.set('startDate', params.startDate);
    if (params.endDate) q.set('endDate', params.endDate);
    if (params.limit) q.set('limit', String(params.limit));
    if (params.offset) q.set('offset', String(params.offset));
    return this.http.get<AuditTrailDto>(`${this.api}/audit-trail?${q.toString()}`);
  }

  // === Explainability ===
  getExplainabilityPacks(): Observable<ExplainabilityPackDto[]> { return this.http.get<ExplainabilityPackDto[]>(`${this.api}/explainability`); }
  generateExplainabilityPack(data: Record<string, unknown>): Observable<ExplainabilityPackDto> { return this.http.post<ExplainabilityPackDto>(`${this.api}/explainability`, data); }

  // === Digital Twin ===
  getSimulations(): Observable<SimulationDto[]> { return this.http.get<SimulationDto[]>(`${this.api}/digital-twin`); }
  createSimulation(): Observable<SimulationDto> { return this.http.post<SimulationDto>(`${this.api}/digital-twin`, {}); }

  // === Red Team ===
  getRedTeamRuns(): Observable<RedTeamRunDto[]> { return this.http.get<RedTeamRunDto[]>(`${this.api}/red-team`); }
  getRedTeamSummary(): Observable<RedTeamSummaryDto> { return this.http.get<RedTeamSummaryDto>(`${this.api}/red-team/summary`); }

  // === Agent Performance ===
  getAgentPerformance(agentId?: string): Observable<AgentPerformanceDto[]> {
    const qs = agentId ? `?agentId=${encodeURIComponent(agentId)}` : '';
    return this.http.get<AgentPerformanceDto[]>(`${this.api}/copilot/agent-performance${qs}`);
  }

  // === Report Scenarios ===
  getReportScenarios(): Observable<ReportScenarioDto[]> { return this.http.get<ReportScenarioDto[]>(`${this.api}/report-scenarios`); }
  generateReportScenario(type: string, params: GenerateReportParams): Observable<ReportScenarioDto> { return this.http.post<ReportScenarioDto>(`${this.api}/report-scenarios/${type}/generate`, params); }
  getReportSchedules(): Observable<ReportScheduleDto[]> { return this.http.get<ReportScheduleDto[]>(`${this.api}/report-scenarios/schedules`); }
  createReportSchedule(data: CreateReportScheduleRequest): Observable<MessageResponse> { return this.http.post<MessageResponse>(`${this.api}/report-center/schedules`, data); }

  // === Report Center ===
  getReportCenterTemplates(): Observable<ReportTemplateDto[]> { return this.http.get<ReportTemplateDto[]>(`${this.api}/report-center/templates`); }
  getReportCenterSchedules(): Observable<ReportScheduleDto[]> { return this.http.get<ReportScheduleDto[]>(`${this.api}/report-center/schedules`); }
  generateReportCenter(templateId: string, params: GenerateReportParams): Observable<ReportScenarioDto> { return this.http.post<ReportScenarioDto>(`${this.api}/report-center/generate`, { template_id: templateId, params }); }

  // === Report Extended ===
  getReportExtTemplates(): Observable<ReportTemplateDto[]> { return this.http.get<ReportTemplateDto[]>(`${this.api}/report-ext/templates`); }
  generateExtReport(templateId: string, params: GenerateReportParams): Observable<ReportScenarioDto> { return this.http.post<ReportScenarioDto>(`${this.api}/report-ext/generate/${templateId}`, params); }

  // === Report Templates / Generator ===
  getReportGeneratorTemplates(): Observable<ReportTemplateDto[]> { return this.http.get<ReportTemplateDto[]>(`${this.api}/report-templates`); }
  generateReport(templateId: string, params: GenerateReportParams): Observable<ReportScenarioDto> { return this.http.post<ReportScenarioDto>(`${this.api}/report-templates/${templateId}/generate`, params); }

  // === Tenant Config ===
  getTenantConfig(): Observable<TenantConfigDto> { return this.http.get<TenantConfigDto>(`${this.api}/tenant-config/config`); }
  updateTenantConfig(data: Partial<TenantConfigDto>): Observable<MessageResponse> { return this.http.patch<MessageResponse>(`${this.api}/tenant-config/config`, data); }
  getTenantRaci(): Observable<TenantRaciDto> { return this.http.get<TenantRaciDto>(`${this.api}/tenant-config/raci`); }
  updateTenantRaci(data: TenantRaciDto): Observable<MessageResponse> { return this.http.put<MessageResponse>(`${this.api}/tenant-config/raci`, data); }

  // === Tier Management ===
  getTierConfig(): Observable<TierConfigDto> { return this.http.get<TierConfigDto>(`${this.api}/tier`); }
  getTierLimits(): Observable<TierLimitsDto> { return this.http.get<TierLimitsDto>(`${this.api}/tier/limits`); }
  updateTier(data: UpdateTierRequest): Observable<MessageResponse> { return this.http.put<MessageResponse>(`${this.api}/tier`, data); }

  // === Cadence Calendar ===
  getCadenceTasks(): Observable<CadenceTaskDto[]> { return this.http.get<CadenceTaskDto[]>(`${this.api}/cadence/tasks`); }
  updateCadenceTask(taskId: string, data: Partial<CadenceTaskDto>): Observable<MessageResponse> { return this.http.put<MessageResponse>(`${this.api}/cadence/tasks/${taskId}`, data); }
  getCadenceOverrides(): Observable<CadenceOverrideDto[]> { return this.http.get<CadenceOverrideDto[]>(`${this.api}/cadence/overrides`); }
  saveCadenceOverride(data: Partial<CadenceOverrideDto>): Observable<MessageResponse> { return this.http.post<MessageResponse>(`${this.api}/cadence/overrides`, data); }

  // === Connectors ===
  getConnectors(): Observable<ConnectorDto[]> { return this.http.get<ConnectorDto[]>(`${this.api}/connectors`); }
  createConnector(data: CreateConnectorRequest): Observable<MessageResponse> { return this.http.post<MessageResponse>(`${this.api}/connectors`, data); }
  runConnector(connectorId: string): Observable<MessageResponse> { return this.http.post<MessageResponse>(`${this.api}/connectors/${connectorId}/run`, {}); }
  deleteConnector(connectorId: string): Observable<MessageResponse> { return this.http.delete<MessageResponse>(`${this.api}/connectors/${connectorId}`); }
  testConnector(data: CreateConnectorRequest): Observable<MessageResponse> { return this.http.post<MessageResponse>(`${this.api}/connectors/test`, data); }

  // === Integrations Hub ===
  getWebhooks(): Observable<WebhookDto[]> { return this.http.get<WebhookDto[]>(`${this.api}/integrations/webhooks`); }
  createWebhook(data: CreateWebhookRequest): Observable<MessageResponse> { return this.http.post<MessageResponse>(`${this.api}/integrations/webhooks`, data); }
  deleteWebhook(id: string): Observable<MessageResponse> { return this.http.delete<MessageResponse>(`${this.api}/integrations/webhooks/${id}`); }
  getIntegrationConfigs(): Observable<IntegrationConfigDto[]> { return this.http.get<IntegrationConfigDto[]>(`${this.api}/integrations/configs`); }
  createIntegrationConfig(data: CreateIntegrationConfigRequest): Observable<MessageResponse> { return this.http.post<MessageResponse>(`${this.api}/integrations/configs`, data); }
  updateIntegrationConfig(id: string, data: UpdateIntegrationConfigRequest): Observable<MessageResponse> { return this.http.put<MessageResponse>(`${this.api}/integrations/configs/${id}`, data); }
  deleteIntegrationConfig(id: string): Observable<MessageResponse> { return this.http.delete<MessageResponse>(`${this.api}/integrations/configs/${id}`); }

  // === OpenClaw Integration ===
  getOpenClawStatus(): Observable<OpenClawStatusDto> { return this.http.get<OpenClawStatusDto>(`${this.api}/integrations/openclaw/status`); }
  getOpenClawTools(): Observable<OpenClawToolDto[]> { return this.http.get<OpenClawToolDto[]>(`${this.api}/integrations/openclaw/tools`); }
  getOpenClawResources(uri?: string): Observable<OpenClawResourceDto[]> {
    const params = uri ? `?uri=${encodeURIComponent(uri)}` : '';
    return this.http.get<OpenClawResourceDto[]>(`${this.api}/integrations/openclaw/resources${params}`);
  }
  executeOpenClawTool(toolName: string, args: Record<string, unknown>): Observable<ExecuteOpenClawToolResultDto> {
    return this.http.post<ExecuteOpenClawToolResultDto>(`${this.api}/integrations/openclaw/tools/${toolName}/execute`, args);
  }
  testOpenClaw(): Observable<MessageResponse> { return this.http.post<MessageResponse>(`${this.api}/integrations/openclaw/test`, {}); }

  // === Content Packs ===
  getInstalledPacks(): Observable<ContentPackDto[]> { return this.http.get<ContentPackDto[]>(`${this.api}/content-packs/installed`); }
  installContentPack(manifest: ContentPackManifestDto): Observable<MessageResponse> { return this.http.post<MessageResponse>(`${this.api}/content-packs/install`, manifest); }
  upgradeContentPack(packId: string, manifest: ContentPackManifestDto): Observable<MessageResponse> { return this.http.post<MessageResponse>(`${this.api}/content-packs/upgrade`, { packId, manifest }); }
  rollbackContentPack(packId: string, targetVersion: string): Observable<MessageResponse> { return this.http.post<MessageResponse>(`${this.api}/content-packs/rollback`, { packId, targetVersion }); }

  // === Activity Stream / Timeline ===
  getTimeline(opts?: { module?: string; limit?: number; offset?: number }): Observable<TimelineDto> {
    const parts: string[] = [];
    if (opts?.module) parts.push(`module=${opts.module}`);
    if (opts?.limit) parts.push(`limit=${opts.limit}`);
    if (opts?.offset) parts.push(`offset=${opts.offset}`);
    const qs = parts.length ? '?' + parts.join('&') : '';
    return this.http.get<TimelineDto>(`${this.api}/timeline${qs}`);
  }
  getEntityTimeline(entityType: string, entityId: string): Observable<TimelineDto> {
    return this.http.get<TimelineDto>(`${this.api}/timeline/${entityType}/${entityId}`);
  }

  // === Task Board ===
  getTaskBoard(): Observable<TaskBoardDto> { return this.http.get<TaskBoardDto>(`${this.api}/task-board`); }
  createTask(data: CreateTaskRequest): Observable<MessageResponse> { return this.http.post<MessageResponse>(`${this.api}/task-board/tasks`, data); }
  updateTaskStatus(taskId: string, status: string): Observable<MessageResponse> { return this.http.put<MessageResponse>(`${this.api}/task-board/tasks/${taskId}/status`, { status }); }
  getTaskProgress(entityType: string, entityId: string): Observable<TaskProgressDto> { return this.http.get<TaskProgressDto>(`${this.api}/task-board/progress/${entityType}/${entityId}`); }

  // === Action Items ===
  getActionItems(opts?: { status?: string; sourceType?: string }): Observable<ActionItemListDto> {
    const parts: string[] = [];
    if (opts?.status) parts.push(`status=${opts.status}`);
    if (opts?.sourceType) parts.push(`sourceType=${opts.sourceType}`);
    const qs = parts.length ? '?' + parts.join('&') : '';
    return this.http.get<ActionItemListDto>(`${this.api}/action-items${qs}`);
  }
  createActionItem(data: CreateActionItemRequest): Observable<MessageResponse> { return this.http.post<MessageResponse>(`${this.api}/action-items`, data); }
  updateActionItem(id: string, data: UpdateActionItemRequest): Observable<MessageResponse> { return this.http.put<MessageResponse>(`${this.api}/action-items/${id}`, data); }
  getActionItemDigest(): Observable<ActionItemDigestDto> { return this.http.get<ActionItemDigestDto>(`${this.api}/action-items/digest`); }

  // === Quote of the Day ===
  getDailyQuote(): Observable<DailyQuoteDto> { return this.http.get<DailyQuoteDto>(`${this.api}/quotes/daily`); }

  // === Next Actions ===
  getNextActions(): Observable<NextActionsDto> {
    return this.http.get<NextActionsDto>(`${this.api}/next-actions`);
  }

  // === KPI Detail ===
  getKpiDetail(key: string): Observable<KpiDetailDto> { return this.http.get<KpiDetailDto>(`${this.api}/kpi/${key}/detail`); }
  getKpiCardIndicators(): Observable<KpiCardIndicatorDto[]> { return this.http.get<KpiCardIndicatorDto[]>(`${this.api}/kpi/card-indicators`); }
  createKpiItem(key: string, data: KpiItemRequest): Observable<MessageResponse> { return this.http.post<MessageResponse>(`${this.api}/kpi/${key}/items`, data); }
  updateKpiItem(key: string, itemId: string, data: KpiItemRequest): Observable<MessageResponse> { return this.http.put<MessageResponse>(`${this.api}/kpi/${key}/items/${itemId}`, data); }
  updateKpiItemStatus(key: string, itemId: string, status: string): Observable<MessageResponse> { return this.http.put<MessageResponse>(`${this.api}/kpi/${key}/items/${itemId}/status`, { status }); }
  deleteKpiItem(key: string, itemId: string): Observable<MessageResponse> { return this.http.delete<MessageResponse>(`${this.api}/kpi/${key}/items/${itemId}`); }

  // === Public Content (no auth) ===
  getPublicAgents(): Observable<PublicAgentsDto> { return this.getPublicAgentsCached(); }
  getPublicReportTemplates(): Observable<PublicReportTemplatesDto> { return this.http.get<PublicReportTemplatesDto>(`${this.api}/public/report-templates`); }
  getPublicLandingContent(): Observable<PublicLandingContentDto> { return this.getPublicLandingContentCached(); }
  getPublicCategoryLabels(): Observable<PublicCategoryLabelsDto> { return this.http.get<PublicCategoryLabelsDto>(`${this.api}/public/category-labels`); }
  getPublicDPIAConfig(): Observable<PublicDPIAConfigDto> { return this.http.get<PublicDPIAConfigDto>(`${this.api}/public/dpia-config`); }

  // === AI Triggers ===
  getAITriggerConfig(): Observable<AITriggerConfigDto> { return this.http.get<AITriggerConfigDto>(`${this.api}/ai-triggers/config`); }
  updateAITriggerConfig(data: UpdateAITriggerConfigRequest): Observable<MessageResponse> { return this.http.put<MessageResponse>(`${this.api}/ai-triggers/config`, data); }

  // === Training Data ===
  loadTrainingData(volume: string): Observable<MessageResponse> { return this.http.post<MessageResponse>(`${this.api}/training/load`, { volume }); }
  purgeTrainingData(): Observable<MessageResponse> { return this.http.delete<MessageResponse>(`${this.api}/training/purge`); }
  getTrainingStatus(): Observable<TrainingStatusDto> { return this.http.get<TrainingStatusDto>(`${this.api}/training/status`); }

  // === Foundation Governance Extended ===
  getFoundationHealth(): Observable<FoundationHealthDto> { return this.http.get<FoundationHealthDto>(`${this.api}/foundation-governance/health`); }
  getEntityAudit(entityType: string, entityId: string): Observable<AuditTrailDto> {
    return this.http.get<AuditTrailDto>(`${this.api}/audit-trail`, { params: { entityType, entityId, limit: '50' } });
  }
  foundationBulkImport(entityType: string, records: BulkImportRecord[]): Observable<BulkImportResultDto> {
    return this.http.post<BulkImportResultDto>(`${this.api}/foundation-governance/bulk-import`, { entity_type: entityType, records });
  }
  foundationBulkImportUsers(records: BulkImportRecord[]): Observable<BulkImportResultDto> {
    return this.http.post<BulkImportResultDto>(`${this.api}/users/bulk-import`, { users: records });
  }
  initiateRecertification(): Observable<MessageResponse> {
    return this.http.post<MessageResponse>(`${this.api}/foundation-governance/recertification/initiate`, {});
  }
}
