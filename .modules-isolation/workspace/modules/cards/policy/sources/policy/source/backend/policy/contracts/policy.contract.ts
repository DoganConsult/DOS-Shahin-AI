/**
 * Policy Module -- API Contracts
 *
 * Typed request/response shapes for the module's public API.
 * Covers list/detail responses, full entity contracts, lifecycle
 * transitions, import/export, error shapes, and dashboard widgets.
 *
 * @owner policy
 * @module policy
 */

import type { PolicyStatus } from '../types/policy.types';

// ── Existing Contracts (preserved) ──────────────────────────────

export interface PolicyListParams {
  tenantId: string;
  page?: number;
  limit?: number;
  status?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  category?: string;
  owner?: string;
  search?: string;
}

export interface PolicyListResponse {
  success: boolean;
  data: unknown[];
  total: number;
  page: number;
  limit: number;
}

export interface PolicyDetailResponse {
  success: boolean;
  data: unknown;
}

export interface PolicyMutationResponse {
  success: boolean;
  id?: string;
  message?: string;
}

// ── Request/Response Envelopes ──────────────────────────────────

export interface PolicyApiResponse<T> {
  success: boolean;
  data: T;
  meta?: { page: number; pageSize: number; total: number };
  correlationId?: string;
}

// ── Full Entity Contract ────────────────────────────────────────

export interface PolicyContract {
  id: string;
  tenantId: string;
  title: string;
  description: string;
  category: string;
  status: PolicyStatus;
  version: number;
  effectiveDate: string;
  expiryDate?: string;
  ownerId: string;
  ownerName: string;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
  reviewDueDate?: string;
  approvedBy?: string;
  approvedAt?: string;
  publishedAt?: string;
  retiredAt?: string;
  tags: string[];
  frameworkMappings: string[];
  controlLinks: string[];
  acknowledgementRate: number;
  activeExceptions: number;
}

// ── Lifecycle Transition Contracts ──────────────────────────────

export interface PolicyTransitionRequest {
  fromStatus: string;
  toStatus: string;
  comment?: string;
  evidence?: string[];
  approverIds?: string[];
}

export interface PolicyTransitionResult {
  success: boolean;
  entityId: string;
  previousStatus: string;
  newStatus: string;
  transitionedBy: string;
  transitionedAt: string;
  requiresApproval: boolean;
  approvalId?: string;
}

// ── Import Row Contract ─────────────────────────────────────────

export interface PolicyImportRow {
  title: string;
  description?: string;
  category?: string;
  status?: string;
  externalId?: string;
  metadata?: Record<string, unknown>;
}

// ── Import/Export Contracts ──────────────────────────────────────

export interface PolicyImportContract {
  format: 'csv' | 'json' | 'xlsx';
  data: PolicyImportRow[];
  options: {
    skipDuplicates: boolean;
    validateOnly: boolean;
    overwriteExisting: boolean;
  };
}

export interface PolicyExportContract {
  format: 'csv' | 'json' | 'xlsx' | 'pdf';
  filters: PolicyListParams;
  includeVersionHistory: boolean;
  includeAcknowledgements: boolean;
  redactSensitive: boolean;
}

// ── Error Shape Contract ────────────────────────────────────────

export interface PolicyErrorResponse {
  success: false;
  error: {
    code: string;
    message: string;
    field?: string;
    details?: unknown;
  };
  correlationId?: string;
}

// ── Dashboard Widget Data Contract ──────────────────────────────

export interface PolicyDashboardWidgetData {
  widgetType: 'kpi' | 'chart' | 'table' | 'status';
  title: string;
  data: unknown;
  refreshedAt: string;
}

// ── Acknowledgement Contract ────────────────────────────────────

export interface PolicyAcknowledgementContract {
  policyId: string;
  userId: string;
  acknowledgedAt?: string;
  status: 'pending' | 'acknowledged' | 'expired';
  comments?: string;
}

// ── Exception Request Contract ──────────────────────────────────

export interface PolicyExceptionContract {
  id: string;
  policyId: string;
  requestedBy: string;
  reason: string;
  compensatingControls?: string;
  status: 'requested' | 'under_review' | 'approved' | 'rejected' | 'expired';
  requestedDurationDays?: number;
  expiryDate?: string;
  reviewedBy?: string;
  reviewedAt?: string;
  reviewComments?: string;
}

// ── Review Cycle Contract ───────────────────────────────────────

export interface PolicyReviewCycleContract {
  id: string;
  policyId: string;
  reviewType: string;
  status: string;
  startedAt?: string;
  completedAt?: string;
  nextReviewDate?: string;
  reviewers: string[];
  findings?: string;
}
