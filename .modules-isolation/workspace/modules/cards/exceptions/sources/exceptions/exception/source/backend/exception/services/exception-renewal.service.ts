import { safeQuery, safeQueryWithClient, tenantSchema, withTransaction } from '../ports/database.port';
import { getFirstRow } from "@dos/db";
import type { ExceptionRecord } from "@dos/types";
import { emitEvent } from '../ports/events.port';
import { swallow, EC } from '@dos/platform-core/resilience';
import { ExceptionRepository } from "../repositories/exception.repository";

// === Types ===

export type RenewalStatus = "requested" | "under_review" | "approved" | "rejected";

export interface RenewalRequest {
  renewalId: string;
  exceptionId: string;
  requestedBy: string;
  requestedAt: string;
  additionalDays: number;
  justification: string;
  updatedCompensatingControls: string | null;
  status: RenewalStatus;
  reviewedBy: string | null;
  reviewedAt: string | null;
  reviewComments: string | null;
}

export interface AutoRenewalRule {
  ruleId: string;
  exceptionId: string;
  maxAutoRenewals: number;
  renewalDays: number;
  renewedCount: number;
  isActive: boolean;
  conditions: string[];
}

export interface CreateRenewalData {
  exceptionId: string;
  requestedBy: string;
  additionalDays: number;
  justification: string;
  updatedCompensatingControls?: string;
}

// === Pure Functions ===

export function validateRenewalRequest(data: Partial<CreateRenewalData>): string[] {
  const errors: string[] = [];
  if (!data.exceptionId?.trim()) errors.push("exceptionId is required");
  if (!data.requestedBy?.trim()) errors.push("requestedBy is required");
  if (!data.additionalDays || data.additionalDays <= 0) errors.push("additionalDays must be positive");
  if (data.additionalDays && data.additionalDays > 3650) errors.push("additionalDays must not exceed 3650");
  if (!data.justification?.trim()) errors.push("justification is required");
  if (data.justification && data.justification.length > 5000) errors.push("justification must not exceed 5000 characters");
  if (data.updatedCompensatingControls && data.updatedCompensatingControls.length > 5000) errors.push("updatedCompensatingControls must not exceed 5000 characters");
  return errors;
}

export function computeRenewalExpiry(currentExpiry: Date, additionalDays: number): Date {
  return new Date(currentExpiry.getTime() + additionalDays * 24 * 60 * 60 * 1000);
}

export function shouldSendRenewalReminder(expiryDate: Date, now: Date, reminderDays: number[]): boolean {
  const daysUntilExpiry = Math.ceil((expiryDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
  return reminderDays.includes(daysUntilExpiry);
}

// === Row Mapper ===

function mapExceptionRow( r: Record<string, unknown>): ExceptionRecord {
  return {

    exceptionId: r.exception_id,
    controlId: r.control_id,
    justification: r.justification || "",
    compensatingControls: r.compensating_controls || "",
    riskImpact: r.risk_impact || "low",
    requestedBy: r.requested_by || "",
    requestedDuration: r.requested_duration || 0,
    approverDesignation: r.approver_designation || "",

    status: r.status || "pending",
    approvalChain: Array.isArray(r.approval_chain) ? r.approval_chain : JSON.parse((r as any).approval_chain || "[]"),
    expiryDate: r.expiry_date ? new Date((r as any).expiry_date).toISOString() : null,
    createdAt: r.created_at ? new Date((r as any).created_at).toISOString() : new Date().toISOString(),
  };
}

function mapRenewalRow( r: Record<string, unknown>): RenewalRequest {
  return {

    renewalId: r.renewal_id || r.id,

    exceptionId: r.exception_id,

    requestedBy: r.requested_by,

    requestedAt: r.created_at?.toISOString?.() || r.created_at,

    additionalDays: r.additional_days,

    justification: r.justification,

    updatedCompensatingControls: r.updated_compensating_controls || null,

    status: r.status,

    reviewedBy: r.reviewed_by || null,

    reviewedAt: r.reviewed_at?.toISOString?.() || r.reviewed_at || null,

    reviewComments: r.review_comments || null,
  };
}

// === DB Functions ===

export async function requestRenewal(
  tenantId: string,
  data: CreateRenewalData
): Promise<RenewalRequest> {
      const result = await safeQuery("SELECT * FROM __TENANT_SCHEMA__.exception_items" + (tenantId ? " WHERE tenant_id = $1" : ""), tenantId ? [tenantId] : []);
      return result?.rows || [];
}

function validateReviewInput(reviewerId: string, decision: string, comments: string): void {
  const errors: string[] = [];
  if (!reviewerId?.trim()) errors.push("reviewerId is required");
  if (!["approved", "rejected"].includes(decision)) errors.push("decision must be approved or rejected");
  if (comments && comments.length > 5000) errors.push("comments must not exceed 5000 characters");
  if (errors.length > 0) throw Object.assign(new Error(`Invalid review: ${errors.join(", ")}`), { statusCode: 400 });
}

export async function reviewRenewal(
  tenantId: string,
  renewalId: string,
  reviewerId: string,
  decision: "approved" | "rejected",
  comments: string
): Promise<RenewalRequest> {
      const result = await safeQuery("SELECT * FROM __TENANT_SCHEMA__.exception_items" + (tenantId ? " WHERE tenant_id = $1" : ""), tenantId ? [tenantId] : []);
      return result?.rows || [];
}

export async function getRenewalHistory(
  tenantId: string,
  exceptionId: string
): Promise<RenewalRequest[]> {
  const schema = tenantSchema(tenantId);
  const result = await safeQuery(
    `SELECT * FROM "${schema}".exception_renewals WHERE exception_id = $1 ORDER BY created_at DESC`,
    [exceptionId]
  );
  return result.rows.map(mapRenewalRow);
}

export async function setAutoRenewalRule(
  tenantId: string,
  exceptionId: string,
  rule: Omit<AutoRenewalRule, "ruleId" | "renewedCount">
): Promise<AutoRenewalRule> {
  const schema = tenantSchema(tenantId);
  const result = await safeQuery(
    `INSERT INTO "${schema}".exception_auto_renewal_rules
      (exception_id, max_auto_renewals, renewal_days, renewed_count, is_active, conditions)
     VALUES ($1,$2,$3,0,$4,$5)
     ON CONFLICT (exception_id) DO UPDATE
       SET max_auto_renewals = $2, renewal_days = $3, is_active = $4, conditions = $5, updated_at = NOW()
     RETURNING *`,
    [exceptionId, rule.maxAutoRenewals, rule.renewalDays, rule.isActive, JSON.stringify(rule.conditions)]
  );
  const r = getFirstRow(result)!;
  return {
    ruleId: r.rule_id || r.id,
    exceptionId: r.exception_id,
    maxAutoRenewals: r.max_auto_renewals,
    renewalDays: r.renewal_days,
    renewedCount: r.renewed_count,
    isActive: r.is_active,
    conditions: r.conditions || [],
  };
}

export async function getExceptionsNeedingRenewal(
  tenantId: string,
  reminderDays: number[] = [30, 14, 7]
): Promise<Array<ExceptionRecord & { daysUntilExpiry: number }>> {
  const schema = tenantSchema(tenantId);
  const maxDays = Math.max(...reminderDays);
  const thresholdDate = new Date(Date.now() + maxDays * 24 * 60 * 60 * 1000).toISOString();

  const result = await safeQuery(
    `SELECT * FROM "${schema}".exceptions
     WHERE status = 'approved' AND expiry_date IS NOT NULL AND expiry_date <= $1 AND expiry_date > NOW()
     ORDER BY expiry_date ASC`,
    [thresholdDate]
  );

  const now = new Date();
  return result.rows
    .map(mapExceptionRow)
    .map(exc => ({
      ...exc,
      daysUntilExpiry: exc.expiryDate
        ? Math.ceil((new Date((exc as any).expiryDate).getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
        : 0,
    }))
    .filter(exc => reminderDays.includes(exc.daysUntilExpiry));
}
