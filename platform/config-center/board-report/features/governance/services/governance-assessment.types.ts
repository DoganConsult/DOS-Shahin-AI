/**
 * Governance API DTOs — Assessment & Compliance Sub-Domain
 * Covers: Obligations, Enforcement, Health Score, Reviews,
 *         Workload, Calendar
 */

// ── Obligations ─────────────────────────────────────────────────────

export interface ObligationDto {
  id: string;
  title?: string;
  description?: string;
  source?: string;
  status?: string;
  ownerId?: string;
  dueDate?: string;
}

export interface CreateObligationRequest {
  title: string;
  description?: string;
  source?: string;
  ownerId?: string;
  dueDate?: string;
}

export interface UpdateObligationRequest {
  title?: string;
  description?: string;
  source?: string;
  status?: string;
  ownerId?: string;
  dueDate?: string;
}

export interface ObligationDueDateDto {
  id: string;
  obligationId: string;
  dueDate: string;
  status?: string;
  completedAt?: string;
}

export interface ObligationEvidenceLinkDto {
  id: string;
  obligationId: string;
  evidenceId: string;
  label?: string;
}

export interface LinkEvidenceToObligationRequest {
  evidenceId: string;
  label?: string;
}

export interface ObligationControlLinkDto {
  id: string;
  obligationId: string;
  controlId: string;
  label?: string;
}

export interface LinkControlToObligationRequest {
  controlId: string;
  label?: string;
}

export interface ObligationExemptionRequest {
  reason: string;
  expiresAt?: string;
  approvedBy?: string;
}

export interface ObligationExemptionDto {
  id: string;
  obligationId: string;
  reason: string;
  status?: string;
  expiresAt?: string;
}

// ── Enforcement ─────────────────────────────────────────────────────

export interface EnforcementScanResultDto {
  scannedAt: string;
  violationsFound: number;
  newViolations: number;
}

export interface EnforcementViolationDto {
  id: string;
  type?: string;
  description?: string;
  severity?: string;
  status?: string;
  detectedAt?: string;
  resolvedAt?: string;
}

export interface EnforcementSummaryDto {
  totalViolations: number;
  openViolations: number;
  resolvedViolations: number;
  bySeverity?: Record<string, number>;
}

// ── Health Score ────────────────────────────────────────────────────

export interface HealthScoreDto {
  overallScore: number;
  dimensions: Array<{ name: string; score: number; weight: number }>;
  grade?: string;
  calculatedAt?: string;
}

export interface HealthTrendDto {
  dataPoints: Array<{ date: string; score: number }>;
}

export interface HealthHistoryDto {
  entries: Array<{ date: string; score: number; grade?: string; dimensions?: Record<string, number> }>;
}

export interface HealthThresholdsDto {
  thresholds: Array<{ dimension: string; warning: number; critical: number }>;
}

export interface UpdateHealthThresholdsRequest {
  thresholds: Array<{ dimension: string; warning: number; critical: number }>;
}

export interface BoardWatchlistItemDto {
  id: string;
  title: string;
  type: string;
  severity: string;
  description?: string;
}

// ── Reviews ─────────────────────────────────────────────────────────

export interface ReviewDto {
  id: string;
  title?: string;
  type?: string;
  status?: string;
  reviewerId?: string;
  dueDate?: string;
  completedAt?: string;
}

export interface CreateReviewRequest {
  title: string;
  type?: string;
  reviewerId?: string;
  dueDate?: string;
}

export interface UpdateReviewRequest {
  title?: string;
  type?: string;
  status?: string;
  reviewerId?: string;
  dueDate?: string;
}

// ── Calendar ────────────────────────────────────────────────────────

export interface GovernanceCalendarEventDto {
  id: string;
  title?: string;
  date?: string;
  type?: string;
  entityId?: string;
}

// ── Workload ────────────────────────────────────────────────────────

export interface WorkloadOverviewDto {
  totalItems: number;
  overdueItems: number;
  owners: Array<{ ownerId: string; name?: string; assignedCount: number; overdueCount: number }>;
}

export interface OwnerWorkloadDto {
  ownerId: string;
  name?: string;
  items: Array<{ id: string; title: string; type: string; dueDate?: string; status: string }>;
}
