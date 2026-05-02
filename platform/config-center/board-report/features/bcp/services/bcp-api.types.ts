/**
 * BCP API Service DTOs — AGRC-OS
 * Type definitions for bcp-api.service.ts endpoints.
 */

// ── BIA (Business Impact Analysis) ──────────────────────────────────

export interface BIADto {
  id?: string;
  processName?: string;
  department?: string;
  criticality?: string;
  rtoHours?: number;
  rpoHours?: number;
  status?: string;
  createdAt?: string;
}

export interface CreateBIARequest {
  processName: string;
  department?: string;
  criticality?: string;
  rtoHours?: number;
  rpoHours?: number;
}

export interface BIACriticalityResultDto {
  biaId?: string;
  criticality?: string;
  score?: number;
}

// ── Exercises ───────────────────────────────────────────────────────

export interface ExerciseDto {
  id?: string;
  title?: string;
  type?: string;
  status?: string;
  scheduledDate?: string;
  completedDate?: string;
  participants?: string[];
}

export interface CreateExerciseRequest {
  title: string;
  type?: string;
  scheduledDate?: string;
  planId?: string;
  participants?: string[];
}

export interface ExerciseResultDto {
  exerciseId?: string;
  outcome?: string;
  score?: number;
  findings?: string[];
  completedAt?: string;
}

export interface ExerciseGapDto {
  id?: string;
  exerciseId?: string;
  description?: string;
  severity?: string;
  status?: string;
  remediation?: string;
}

// ── Crisis Communication ────────────────────────────────────────────

export interface CrisisCommPlanDto {
  id?: string;
  planName?: string;
  status?: string;
  contacts?: Array<{ name: string; role: string; channel: string }>;
  templates?: Array<{ name: string; content: string }>;
  createdAt?: string;
}

export interface CreateCrisisCommPlanRequest {
  planName: string;
  contacts?: Array<{ name: string; role: string; channel: string }>;
  templates?: Array<{ name: string; content: string }>;
}

export interface CrisisCommActivationResultDto {
  success?: boolean;
  activationId?: string;
  message?: string;
}

// ── Recovery Strategies ─────────────────────────────────────────────

export interface RecoveryStrategyDto {
  id?: string;
  biaId?: string;
  strategyType?: string;
  description?: string;
  estimatedCost?: number;
  priority?: string;
  status?: string;
}

export interface CreateRecoveryStrategyRequest {
  biaId?: string;
  strategyType: string;
  description?: string;
  estimatedCost?: number;
  priority?: string;
}

// ── BC Plan Activation ──────────────────────────────────────────────

export interface BCPActivationResultDto {
  success?: boolean;
  activationId?: string;
  message?: string;
}

export interface BCPActivationDto {
  id?: string;
  planId?: string;
  status?: string;
  activatedAt?: string;
  deactivatedAt?: string;
  reason?: string;
}

export interface BCPDeactivationResultDto {
  success?: boolean;
  message?: string;
}

// ── Maturity ────────────────────────────────────────────────────────

export interface BCMMaturityEntryDto {
  id?: string;
  overallScore?: number;
  dimensions?: Array<{ name: string; score: number }>;
  assessedAt?: string;
}

export interface CreateBCMMaturityRequest {
  dimensions?: Array<{ name: string; score: number }>;
  notes?: string;
}

export interface BCMMaturityResultDto {
  id?: string;
  overallScore?: number;
  message?: string;
}

// ── BCP Plan Requests ───────────────────────────────────────────────

export interface CreateBCPPlanRequest {
  title: string;
  description?: string;
  processIds?: string[];
  recoveryObjective?: string;
}

export interface ScheduleDRTestRequest {
  scheduledDate: string;
  testType?: string;
  scope?: string;
}

export interface DocumentRecoveryRequest {
  description: string;
  recoveredAt?: string;
  evidence?: string;
}

// ── Business Services ─────────────────────────────────────────────

export interface BusinessServiceDto {
  service_id?: string;
  service_name?: string;
  service_code?: string;
  description?: string;
  category?: string;
  criticality?: string;
  service_tier?: string;
  rto_hours?: number;
  rpo_hours?: number;
  mtpd_hours?: number;
  status?: string;
  bia_id?: string;
  upstream_services?: string[];
  downstream_services?: string[];
  vendor_dependencies?: string[];
  asset_ids?: string[];
  created_at?: string;
}

// ── Crisis Events ─────────────────────────────────────────────────

export interface CrisisEventDto {
  event_id?: string;
  title?: string;
  description?: string;
  crisis_type?: string;
  severity?: string;
  status?: string;
  declared_at?: string;
  declared_by?: string;
  resolved_at?: string;
  affected_services?: unknown[];
  command_team?: unknown[];
  timeline?: Array<{ timestamp: string; type: string; message: string; by?: string }>;
  post_crisis_review?: string;
  created_at?: string;
}

export interface CrisisDashboardDto {
  activeCrises: number;
  totalEvents: number;
  avgResolutionHours: number | null;
  bySeverity: Record<string, number>;
  byType: Record<string, number>;
  recentEvents: CrisisEventDto[];
}

// ── BCM Findings ──────────────────────────────────────────────────

export interface BCMFindingDto {
  finding_id?: string;
  title?: string;
  description?: string;
  source_type?: string;
  source_id?: string;
  finding_type?: string;
  severity?: string;
  status?: string;
  assigned_to?: string;
  due_date?: string;
  remediation_plan?: string;
  root_cause?: string;
  corrective_action?: string;
  preventive_action?: string;
  verified_by?: string;
  verified_at?: string;
  linked_plan_id?: string;
  created_at?: string;
}

export interface FindingsSummaryDto {
  total: number;
  open: number;
  inProgress: number;
  overdue: number;
  closed: number;
  bySeverity: Record<string, number>;
  bySource: Record<string, number>;
}

// ── Recovery Metrics ──────────────────────────────────────────────

export interface RecoveryMetricsDto {
  readinessScore: number;
  rtoAchievementPct: number;
  rpoAchievementPct: number;
  exercisePassRate: number;
  planCount: number;
  testedPlanCount: number;
}

export interface ServiceResilienceDto {
  serviceId: string;
  serviceName: string;
  criticality: string;
  hasBia: boolean;
  hasRecoveryStrategy: boolean;
  exerciseCount: number;
  resilienceScore: number;
}
