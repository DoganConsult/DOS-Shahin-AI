/**
 * GRC Governance sub-service DTOs — AGRC-OS
 * Covers: Policies, Procedures, Policy Lifecycle, Committees, Meetings,
 * Decisions, Delegations, SoD Conflicts, Governance AI Engine,
 * and Access Review Campaigns.
 */
import { BaseEntityDto, MessageResponse } from '@app/core/models/shared.types';

// ── Policies ──

export interface PolicyListDto {
  policies: PolicyItemDto[];
  total?: number;
}

export interface PolicyItemDto extends BaseEntityDto {
  title?: string;
  status?: string;
  version?: string;
  owner?: string;
  effectiveDate?: string;
  reviewDate?: string;
  category?: string;
}

export interface CreatePolicyRequest {
  title: string;
  description?: string;
  category?: string;
  [key: string]: unknown;
}

export interface UpdatePolicyRequest {
  title?: string;
  description?: string;
  status?: string;
  category?: string;
  [key: string]: unknown;
}

export interface PolicyVersionDto {
  version: string;
  status: string;
  createdAt: string;
  changedBy?: string;
  summary?: string;
}

export interface GenerateAIPolicyRequest {
  topic: string;
  framework?: string;
  scope?: string;
  [key: string]: unknown;
}

export interface GenerateAIPolicyResultDto {
  policyId?: string;
  title: string;
  content: string;
  sections?: Array<{ heading: string; body: string }>;
}

// ── Procedures ──

export interface ProcedureListDto {
  procedures: ProcedureItemDto[];
  total?: number;
}

export interface ProcedureItemDto extends BaseEntityDto {
  title?: string;
  status?: string;
  policyId?: string;
  version?: string;
  owner?: string;
}

export interface CreateProcedureRequest {
  title: string;
  policyId?: string;
  description?: string;
  [key: string]: unknown;
}

export interface UpdateProcedureRequest {
  title?: string;
  description?: string;
  status?: string;
  [key: string]: unknown;
}

export interface ProcedureVersionDto {
  version: string;
  status: string;
  createdAt: string;
  changedBy?: string;
}

// ── Policy Lifecycle ──

export interface PolicyLifecycleListDto {
  policies: Array<{ id: string; title: string; status: string; currentVersion: string; nextReviewDate?: string }>;
  total?: number;
}

// ── Committees ──

export interface CommitteeListDto {
  committees: CommitteeDto[];
  total?: number;
}

export interface CommitteeDto extends BaseEntityDto {
  name?: string;
  type?: string;
  status?: string;
  chairId?: string;
  description?: string;
  memberCount?: number;
}

export interface CreateCommitteeRequest {
  name: string;
  type?: string;
  description?: string;
  [key: string]: unknown;
}

export interface UpdateCommitteeRequest {
  name?: string;
  type?: string;
  description?: string;
  status?: string;
  [key: string]: unknown;
}

// ── Committee Members ──

export interface CommitteeMemberDto {
  id: string;
  userId: string;
  name?: string;
  email?: string;
  role?: string;
  isChair?: boolean;
  joinedAt?: string;
}

export interface AddCommitteeMemberRequest {
  userId: string;
  role?: string;
  [key: string]: unknown;
}

// ── Meetings ──

export interface MeetingListDto {
  meetings: MeetingDto[];
  total?: number;
}

export interface MeetingDto extends BaseEntityDto {
  title?: string;
  committeeId?: string;
  scheduledAt?: string;
  status?: string;
  location?: string;
  duration?: number;
}

export interface CreateMeetingRequest {
  title: string;
  committeeId: string;
  scheduledAt: string;
  location?: string;
  duration?: number;
  [key: string]: unknown;
}

export interface UpdateMeetingRequest {
  title?: string;
  scheduledAt?: string;
  status?: string;
  location?: string;
  [key: string]: unknown;
}

// ── Meeting Agenda ──

export interface AgendaItemDto {
  id: string;
  meetingId: string;
  title: string;
  description?: string;
  presenter?: string;
  duration?: number;
  order?: number;
}

export interface AddAgendaItemRequest {
  title: string;
  description?: string;
  presenter?: string;
  duration?: number;
  [key: string]: unknown;
}

// ── Decisions + Votes ──

export interface DecisionDto extends BaseEntityDto {
  title?: string;
  description?: string;
  status?: string;
  meetingId?: string;
  outcome?: string;
}

export interface CreateDecisionRequest {
  title: string;
  description?: string;
  meetingId?: string;
  [key: string]: unknown;
}

export interface UpdateDecisionRequest {
  title?: string;
  description?: string;
  status?: string;
  outcome?: string;
  [key: string]: unknown;
}

export interface DecisionVoteDto {
  id: string;
  decisionId: string;
  voterId: string;
  vote: string;
  comment?: string;
  votedAt: string;
}

export interface CastDecisionVoteRequest {
  vote: string;
  comment?: string;
  [key: string]: unknown;
}

// ── Governance Calendar ──

export interface GovernanceCalendarDto {
  events: Array<{
    id: string;
    title: string;
    type: string;
    scheduledAt: string;
    entityType?: string;
    entityId?: string;
  }>;
}

// ── Delegations ──

export interface DelegationFilters {
  status?: string;
  delegator?: string;
  delegate?: string;
}

export interface DelegationListDto {
  delegations: DelegationDto[];
  total?: number;
}

export interface DelegationDto extends BaseEntityDto {
  delegatorId?: string;
  delegateId?: string;
  scope?: string;
  status?: string;
  expiresAt?: string;
  reason?: string;
}

export interface CreateDelegationRequest {
  delegateId: string;
  scope: string;
  expiresAt?: string;
  reason?: string;
  [key: string]: unknown;
}

export interface DelegationConflictDto {
  id: string;
  type: string;
  description: string;
  severity: string;
  delegationIds: string[];
}

// ── Access Review Campaigns ──

export interface AccessReviewCampaignListDto {
  campaigns: AccessReviewCampaignDto[];
  total?: number;
}

export interface AccessReviewCampaignDto extends BaseEntityDto {
  name?: string;
  status?: string;
  scope?: string;
  startDate?: string;
  endDate?: string;
  progress?: number;
}

export interface CreateAccessReviewCampaignRequest {
  name: string;
  scope?: string;
  startDate?: string;
  endDate?: string;
  [key: string]: unknown;
}

export interface AccessReviewItemDto {
  id: string;
  campaignId: string;
  userId: string;
  userName?: string;
  accessType: string;
  resourceName?: string;
  decision?: string;
  reviewedBy?: string;
  reviewedAt?: string;
}

export interface SubmitAccessReviewDecisionRequest {
  decision: string;
  reason?: string;
  [key: string]: unknown;
}

// ── SoD Conflict Detection ──

export interface SoDConflictFilters {
  userId?: string;
  conflictType?: string;
  severity?: string;
  limit?: number;
  offset?: number;
}

export interface SoDConflictListDto {
  conflicts: SoDConflictDto[];
  total: number;
}

export interface SoDConflictDto {
  id: string;
  userId?: string;
  conflictType?: string;
  severity?: string;
  description?: string;
  status?: string;
  detectedAt?: string;
  resolvedAt?: string;
  resolvedBy?: string;
  resolutionNote?: string;
}

export interface DetectSoDConflictsResultDto {
  conflicts: SoDConflictDto[];
  totalDetected: number;
  byType: { raci: number; authority: number };
  errors: string[];
}

export interface ResolveSoDConflictRequest {
  status: 'mitigated' | 'accepted' | 'resolved';
  resolvedBy: string;
  resolutionNote?: string;
}

export interface BulkResolveSoDConflictsRequest {
  conflictIds: string[];
  status: 'mitigated' | 'accepted' | 'resolved';
  resolvedBy: string;
  resolutionNote?: string;
}

export interface SoDRemediationSuggestionDto {
  id: string;
  description: string;
  type: string;
  effort?: string;
  impact?: string;
}

export interface SoDConflictTrendDto {
  date: string;
  count: number;
  byType?: Record<string, number>;
}

export interface SoDConflictPatternDto {
  pattern: string;
  count: number;
  severity?: string;
  description?: string;
}

export interface SoDConflictHistoryEntryDto {
  action: string;
  performedBy: string;
  performedAt: string;
  details?: string;
}

export interface SoDAssignmentCheckDto {
  conflictsFound: boolean;
  conflicts: SoDConflictDto[];
  canProceed: boolean;
  warnings?: string[];
}

// ── Governance AI Engine ──

export interface GovAIScanResultDto {
  signalsDetected: number;
  issuesFound: number;
  recommendations: number;
  runId?: string;
}

export interface GovAIFullCycleResultDto {
  runId: string;
  status: string;
  signalsDetected: number;
  issuesCreated: number;
  recommendationsGenerated: number;
}

export interface GovAISignalDto {
  id: string;
  type: string;
  title: string;
  description?: string;
  severity?: string;
  source?: string;
  detectedAt: string;
  status?: string;
}

export interface GovAISignalListDto {
  signals: GovAISignalDto[];
  total?: number;
}

export interface GovAIIssueDto {
  id: string;
  title: string;
  description?: string;
  severity: string;
  status: string;
  signalId?: string;
  createdAt: string;
}

export interface GovAIRecommendationDto {
  id: string;
  title: string;
  description?: string;
  priority: string;
  status: string;
  issueId?: string;
  createdAt: string;
}

export interface GovAIRecommendationListDto {
  recommendations: GovAIRecommendationDto[];
  total?: number;
}

export interface GovAIBoardAttentionDto {
  items: Array<{
    id: string;
    title: string;
    type: string;
    urgency: string;
    description?: string;
  }>;
}

export interface GovAIExecAttentionDto {
  items: Array<{
    id: string;
    title: string;
    type: string;
    urgency: string;
    description?: string;
  }>;
}

export interface GovAIScoreExplanationDto {
  overallScore: number;
  factors: Array<{ name: string; score: number; weight: number; explanation: string }>;
  narrative?: string;
}

export interface GovAINarrativeDto {
  narrative: string;
  generatedAt: string;
  period?: string;
}

export interface GovAIFeedbackRequest {
  targetType: string;
  targetId: string;
  rating: number;
  comment?: string;
  [key: string]: unknown;
}

export interface GovAIFeedbackStatsDto {
  totalFeedback: number;
  averageRating: number;
  byType: Record<string, { count: number; avgRating: number }>;
}

export interface GovAIRunDto {
  id: string;
  status: string;
  startedAt: string;
  completedAt?: string;
  signalsDetected?: number;
  issuesCreated?: number;
  recommendationsGenerated?: number;
}

export interface GovAISignalQueryParams {
  type?: string;
  severity?: string;
  status?: string;
  limit?: number;
  offset?: number;
}

export interface GovAIRecommendationQueryParams {
  status?: string;
  priority?: string;
  limit?: number;
  offset?: number;
}

export { MessageResponse };
