/**
 * GRC Operations — Workflow & Cooperative Workflow DTOs
 */
import { BaseEntityDto } from '../../models/shared.types';

// ── Workflows ──

export interface WorkflowListDto {
  workflows: WorkflowItemDto[];
  total?: number;
}

export interface WorkflowItemDto extends BaseEntityDto {
  name?: string;
  status?: string;
  description?: string;
  triggerType?: string;
  stepsCount?: number;
}

export interface CreateWorkflowRequest {
  name: string;
  description?: string;
  triggerType?: string;
  steps?: Array<Record<string, unknown>>;
  [key: string]: unknown;
}

export interface ExecuteWorkflowRequest {
  inputs?: Record<string, unknown>;
  triggerSource?: string;
  [key: string]: unknown;
}

export interface ExecuteWorkflowResultDto {
  executionId: string;
  status: string;
  startedAt?: string;
}

export interface SimulateWorkflowResultDto {
  result: string;
  steps: Array<{ stepId: string; status: string; output?: Record<string, unknown> }>;
}

export interface WorkflowAnalyticsDto {
  executionCount: number;
  avgDuration: number;
  successRate: number;
  recentExecutions: Array<{ id: string; status: string; duration: number }>;
}

export interface WorkflowExecutionListDto {
  executions: WorkflowExecutionItemDto[];
  total?: number;
}

export interface WorkflowExecutionItemDto {
  id: string;
  workflowId: string;
  status: string;
  startedAt: string;
  completedAt?: string;
  duration?: number;
}

export interface ExecutionDetailDto {
  execution: WorkflowExecutionItemDto;
  definition: Record<string, unknown>;
  mermaid: string;
  steps: Array<{ id: string; name: string; status: string; startedAt?: string; completedAt?: string; output?: Record<string, unknown> }>;
}

export interface ExecutionActivityDto {
  activities: Array<{ id: string; type: string; message: string; timestamp: string; data?: Record<string, unknown> }>;
}

export interface WorkflowTemplateDto extends BaseEntityDto {
  name?: string;
  description?: string;
  category?: string;
  steps?: Array<{ id: string; type: string; name: string }>;
}

export interface InstantiateWorkflowTemplateRequest {
  templateId: string;
  name?: string;
  config?: Record<string, unknown>;
  [key: string]: unknown;
}

export interface WorkflowAnalyticsAggregateParams {
  dateRange?: string;
  workflowId?: string;
  status?: string;
}

// ── Cooperative Workflow Operations ──

export interface StandupDigestDto extends BaseEntityDto {
  title?: string;
  status?: string;
  summary?: string;
  items?: Array<{ id: string; type: string; description: string }>;
  acknowledgedAt?: string;
}

export interface TriageProposalDto extends BaseEntityDto {
  title?: string;
  status?: string;
  severity?: string;
  entityType?: string;
  entityId?: string;
  proposal?: string;
}

export interface ResolveTriageProposalRequest {
  decision?: string;
  reason?: string;
  [key: string]: unknown;
}

export interface WarRoomDto extends BaseEntityDto {
  title?: string;
  status?: string;
  severity?: string;
  description?: string;
  participants?: Array<{ userId: string; role: string }>;
  tasks?: Array<{ id: string; title: string; status: string; assignedTo?: string }>;
}

export interface ResolveWarRoomRequest {
  outcome?: string;
  summary?: string;
  [key: string]: unknown;
}

export interface CoDraftSessionDto extends BaseEntityDto {
  title?: string;
  status?: string;
  entityType?: string;
  entityId?: string;
  questions?: Array<{ id: string; text: string; resolved: boolean }>;
}

export interface ResolveCoDraftQuestionRequest {
  questionId?: string;
  answer?: string;
  [key: string]: unknown;
}

export interface RiskPairReviewDto extends BaseEntityDto {
  title?: string;
  status?: string;
  riskId?: string;
  aiAssessment?: Record<string, unknown>;
  humanAssessment?: Record<string, unknown>;
}

export interface HumanRiskAssessmentRequest {
  likelihood: number;
  impact: number;
  notes?: string;
  [key: string]: unknown;
}

export interface ScoreCalibrationDto extends BaseEntityDto {
  entityType?: string;
  entityId?: string;
  currentScore?: number;
  proposedScore?: number;
  status?: string;
  reason?: string;
}

export interface SubmitCalibrationRequest {
  proposedScore: number;
  justification?: string;
  [key: string]: unknown;
}

export interface EvidenceRelayItemDto extends BaseEntityDto {
  evidenceId?: string;
  status?: string;
  fromAgent?: string;
  toReviewer?: string;
  notes?: string;
}

export interface ReviewEvidenceRelayRequest {
  decision: string;
  comments?: string;
  [key: string]: unknown;
}

export interface ApprovalPreScreenDto extends BaseEntityDto {
  entityType?: string;
  entityId?: string;
  status?: string;
  checks?: Array<{ name: string; passed: boolean; message?: string }>;
}

export interface AuditPrepChecklistDto extends BaseEntityDto {
  title?: string;
  status?: string;
  items?: Array<{ id: string; title: string; ready: boolean; assignedTo?: string }>;
}

export interface AddAuditPrepItemRequest {
  title: string;
  assignedTo?: string;
  [key: string]: unknown;
}

export interface UpdateAuditPrepStatusRequest {
  status: string;
  [key: string]: unknown;
}

export interface NudgeNegotiationDto extends BaseEntityDto {
  targetUserId?: string;
  type?: string;
  status?: string;
  message?: string;
  entityType?: string;
  entityId?: string;
}

export interface CreateNudgeRequest {
  targetUserId: string;
  type: string;
  message?: string;
  entityType?: string;
  entityId?: string;
  [key: string]: unknown;
}
