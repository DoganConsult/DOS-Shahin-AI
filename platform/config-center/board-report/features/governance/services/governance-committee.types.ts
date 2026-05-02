/**
 * Governance API DTOs — Committee Sub-Domain
 * Covers: Committees, Meetings, Decisions, Charters, Mandates,
 *         MoM Records, Board Packs, Executive Summaries
 */

// ── Committees ──────────────────────────────────────────────────────

export interface CommitteeDto {
  id: string;
  name: string;
  description?: string;
  chairId?: string;
  status?: string;
}

export interface CreateCommitteeRequest {
  name: string;
  description?: string;
  chairId?: string;
  status?: string;
}

export interface UpdateCommitteeRequest {
  name?: string;
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

export interface AddCommitteeMemberRequest {
  userId: string;
  role?: string;
}

// ── Meetings ────────────────────────────────────────────────────────

export interface MeetingDto {
  id: string;
  committeeId?: string;
  title?: string;
  date?: string;
  status?: string;
}

export interface CreateMeetingRequest {
  committeeId: string;
  title?: string;
  date?: string;
  status?: string;
}

export interface UpdateMeetingRequest {
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

export interface CreateAgendaItemRequest {
  title: string;
  order?: number;
}

// ── Decisions ───────────────────────────────────────────────────────

export interface DecisionDto {
  id: string;
  title?: string;
  status?: string;
  meetingId?: string;
}

export interface CreateDecisionRequest {
  title: string;
  meetingId?: string;
  status?: string;
}

export interface UpdateDecisionRequest {
  title?: string;
  status?: string;
}

export interface DecisionVoteDto {
  id: string;
  decisionId: string;
  userId: string;
  vote: string;
}

export interface CastVoteRequest {
  userId: string;
  vote: string;
}

// ── Charters ────────────────────────────────────────────────────────

export interface CharterDto {
  id: string;
  title?: string;
  committeeId?: string;
  content?: string;
  status?: string;
  version?: number;
  approvedAt?: string;
}

export interface CreateCharterRequest {
  title: string;
  committeeId?: string;
  content?: string;
}

export interface UpdateCharterRequest {
  title?: string;
  content?: string;
  status?: string;
}

// ── Mandates ────────────────────────────────────────────────────────

export interface MandateDto {
  id: string;
  title?: string;
  description?: string;
  status?: string;
  issuedBy?: string;
  effectiveDate?: string;
}

export interface CreateMandateRequest {
  title: string;
  description?: string;
  issuedBy?: string;
  effectiveDate?: string;
}

export interface UpdateMandateRequest {
  title?: string;
  description?: string;
  status?: string;
  issuedBy?: string;
  effectiveDate?: string;
}

export interface MandateSourceDto {
  id: string;
  mandateId: string;
  sourceType?: string;
  sourceId?: string;
  label?: string;
}

export interface AddMandateSourceRequest {
  sourceType: string;
  sourceId?: string;
  label?: string;
}

// ── MoM Records ─────────────────────────────────────────────────────

export interface MomRecordDto {
  id: string;
  meetingId?: string;
  title?: string;
  content?: string;
  status?: string;
  approvedAt?: string;
}

export interface CreateMomRecordRequest {
  meetingId?: string;
  title: string;
  content?: string;
}

// ── Board Packs ─────────────────────────────────────────────────────

export interface BoardPackDto {
  id: string;
  title?: string;
  status?: string;
  meetingDate?: string;
  createdAt?: string;
  publishedAt?: string;
  items?: BoardPackItemDto[];
}

export interface CreateBoardPackRequest {
  title: string;
  meetingDate?: string;
}

export interface UpdateBoardPackRequest {
  title?: string;
  meetingDate?: string;
  status?: string;
}

export interface BoardPackItemDto {
  id: string;
  boardPackId: string;
  type?: string;
  title?: string;
  content?: string;
  order?: number;
}

export interface AddBoardPackItemRequest {
  type: string;
  title: string;
  content?: string;
  order?: number;
}

// ── Executive Summaries ─────────────────────────────────────────────

export interface ExecutiveSummaryDto {
  id: string;
  title?: string;
  content?: string;
  status?: string;
  createdAt?: string;
  publishedAt?: string;
}

export interface CreateExecutiveSummaryRequest {
  title: string;
  content?: string;
}

export interface UpdateExecutiveSummaryRequest {
  title?: string;
  content?: string;
  status?: string;
}
