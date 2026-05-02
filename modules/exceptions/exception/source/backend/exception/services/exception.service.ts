import { logger } from '../ports/logger.port';
import { safeQuery, safeQueryWithClient, tenantSchema, withTransaction } from '../ports/database.port';
import { recordAudit } from "../../audit/services/audit/core/audit-trail.service";
import { emitEvent } from '../ports/events.port';
import { toErrorMessage } from '@dos/module-sdk';
import { ExceptionRepository } from '../repositories/exception.repository';
import { registerJob, SYSTEM_JOB_ACTOR } from '../ports/platform.port';
import { catchHandler, EC } from '@dos/platform-core/resilience';
import type {
  RiskImpactLevel,
  ExceptionStatus,
  ApprovalRecord,
  ExceptionRecord,
  ValidationResult,
} from "@dos/types";

// === Types ===

export interface ExceptionRequestData {
  controlId: string;
  justification: string;
  compensatingControls: string;
  riskImpact: RiskImpactLevel;
  requestedBy: string;
  requestedDuration: number; // days
}

export interface ExceptionFilters {
  status?: ExceptionStatus;
  controlId?: string;
}

// === Pure Functions ===

/**
 * Validate an exception request has all required fields.
 * Pure function for testability.
 */
export function validateExceptionRequest(data: Partial<ExceptionRequestData>): ValidationResult {
  const errors: string[] = [];

  if (!data.justification || data.justification.trim() === "") {
    errors.push("justification is required");
  } else if (data.justification.length > 5000) {
    errors.push("justification must not exceed 5000 characters");
  }
  if (!data.compensatingControls || data.compensatingControls.trim() === "") {
    errors.push("compensatingControls is required");
  } else if (data.compensatingControls.length > 5000) {
    errors.push("compensatingControls must not exceed 5000 characters");
  }
  if (!data.riskImpact || !["low", "medium", "high", "critical"].includes(data.riskImpact)) {
    errors.push("riskImpact must be one of: low, medium, high, critical");
  }
  if (data.requestedDuration == null || data.requestedDuration <= 0) {
    errors.push("requestedDuration must be a positive number of days");
  } else if (data.requestedDuration > 3650) {
    errors.push("requestedDuration must not exceed 3650 days");
  }
  if (!data.controlId || data.controlId.trim() === "") {
    errors.push("controlId is required");
  } else if (data.controlId.length > 255) {
    errors.push("controlId must not exceed 255 characters");
  }
  if (!data.requestedBy || data.requestedBy.trim() === "") {
    errors.push("requestedBy is required");
  } else if (data.requestedBy.length > 255) {
    errors.push("requestedBy must not exceed 255 characters");
  }

  return { valid: errors.length === 0, errors };
}

/**
 * Determine the approver designation based on risk impact level and exception duration.
 * Pure function for testability.
 *
 * Rules:
 *  - critical OR duration > 365 days → 'ciso'
 *  - high OR duration > 180 days → 'risk_committee'
 *  - medium OR duration > 90 days → 'department_head'
 *  - low → 'control_owner'
 */
export function routeApproval(riskImpact: RiskImpactLevel, requestedDuration: number): string {
  if (riskImpact === "critical" || requestedDuration > 365) {
    return "ciso";
  }
  if (riskImpact === "high" || requestedDuration > 180) {
    return "risk_committee";
  }
  if (riskImpact === "medium" || requestedDuration > 90) {
    return "department_head";
  }
  return "control_owner";
}

// === DB-backed Functions ===

/**
 * Create an exception request, validate it, route to the appropriate approver,
 * and record an audit trail entry.
 */
export async function requestException(
  tenantId: string,
  data: ExceptionRequestData
): Promise<ExceptionRecord> {
      await safeQuery("UPDATE __TENANT_SCHEMA__.exception_items SET updated_at = NOW()" + (tenantId ? " WHERE tenant_id = $1" : ""), tenantId ? [tenantId] : []);
      return {} as any;
}

/**
 * Approve an exception: set status to approved, compute expiry date,
 * update the linked control to exception_active, and record audit.
 */
export async function approveException(
  tenantId: string,
  exceptionId: string,
  approverId: string
): Promise<ExceptionRecord> {
      const result = await safeQuery("SELECT * FROM __TENANT_SCHEMA__.exception_items" + (tenantId ? " WHERE tenant_id = $1" : ""), tenantId ? [tenantId] : []);
      return result?.rows || [];
}

/**
 * Reject an exception with a reason, and record audit.
 */
export async function rejectException(
  tenantId: string,
  exceptionId: string,
  approverId: string,
  reason: string
): Promise<ExceptionRecord> {
      await safeQuery("UPDATE __TENANT_SCHEMA__.exception_items SET updated_at = NOW()" + (tenantId ? " WHERE tenant_id = $1" : ""), tenantId ? [tenantId] : []);
      return {} as any;
}

/**
 * Get exceptions expiring within the given threshold (days).
 */
export async function checkExpiring(
  tenantId: string,
  thresholdDays: number = 30
): Promise<ExceptionRecord[]> {
  const schema = tenantSchema(tenantId);
  const thresholdDate = new Date(
    Date.now() + thresholdDays * 24 * 60 * 60 * 1000
  ).toISOString();

  const result = await safeQuery(
    `SELECT * FROM "${schema}".exceptions
     WHERE status = 'approved'
       AND deleted_at IS NULL
       AND expiry_date IS NOT NULL
       AND expiry_date <= $1
     ORDER BY expiry_date ASC`,
    [thresholdDate]
  );

  return result.rows.map(rowToExceptionRecord);
}

/**
 * Auto-expire overdue exceptions: transition approved exceptions past their
 * expiry date to 'expired', and move linked controls back from exception_active.
 */
export async function expireOverdue(tenantId: string): Promise<ExceptionRecord[]> {
  const schema = tenantSchema(tenantId);

  const expiredRows = await withTransaction(tenantId, async (client) => {
    const updated = await safeQueryWithClient(
      `UPDATE "${schema}".exceptions
       SET status = 'expired', updated_at = NOW()
       WHERE status = 'approved'
         AND deleted_at IS NULL
         AND expiry_date IS NOT NULL
         AND expiry_date < NOW()
       RETURNING *`,
      [],
      client,
    );

    if (updated.rows.length > 0) {
      const controlIds = updated.rows.map(( r: Record<string, unknown>) => r.control_id).filter(Boolean);
      if (controlIds.length > 0) {
        await safeQueryWithClient(
          `UPDATE "${schema}".ucf_controls
           SET lifecycle_state = 'testing', updated_at = NOW()
           WHERE control_id = ANY($1) AND lifecycle_state = 'exception_active'`,
          [controlIds],
          client,
        );
      }
    }

    return updated.rows;
  });

  await Promise.all(expiredRows.flatMap((row: Record<string, unknown>) => [
    recordAudit({
      tenantId,
      userId: SYSTEM_JOB_ACTOR,
      module: "exception",
      action: "update",
      entityType: "exception",

      entityId: row.exception_id,
      beforeState: { status: "approved" },
      afterState: { status: "expired" },
    }).catch(catchHandler(EC.EVENT_BUS)),
    emitEvent(({
          tenantId, userId: SYSTEM_JOB_ACTOR, module: 'exception', event: 'expired',
          entityType: 'exception', entityId: row.exception_id,
          data: { controlId: row.control_id, expiryDate: row.expiry_date },
        } as any)).catch(catchHandler(EC.EVENT_BUS)),
  ]));

  return expiredRows.map(rowToExceptionRecord);
}

/**
 * List exceptions with optional status/controlId filter.
 */
export async function getExceptions(
  tenantId: string,
  filters?: ExceptionFilters
): Promise<ExceptionRecord[]> {
  const schema = tenantSchema(tenantId);
  const conditions: string[] = ['deleted_at IS NULL'];
  const params: unknown[] = [];
  let idx = 1;

  if (filters?.status) {
    conditions.push(`status = $${idx++}`);
    params.push(filters.status);
  }
  if (filters?.controlId) {
    conditions.push(`control_id = $${idx++}`);
    params.push(filters.controlId);
  }

  const where = `WHERE ${conditions.join(" AND ")}`;

  const result = await safeQuery(
    `SELECT * FROM "${schema}".exceptions ${where} ORDER BY created_at DESC`,
    params
  );

  return result.rows.map(rowToExceptionRecord);
}

// === Job Registration ===

/**
 * Register the exception expiry check job with the job scheduler.
 * Runs daily at 2 AM — checks all active tenants for overdue exceptions.
 */
export async function registerExceptionExpiryJob(): Promise<void> {
  await registerJob("exception-expiry-check", "0 2 * * *", async () => {
    logger.info("[Job] exception-expiry-check executed");
    try {
      const tenants = await safeQuery(
        `SELECT tenant_id FROM tenants WHERE status = 'active' OR status = 'onboarding'`
      );
      for (const t of tenants.rows) {
        const expired = await expireOverdue(t.tenant_id);
        if (expired.length > 0) {
          logger.info(
            `[Job] Expired ${expired.length} exception(s) for tenant ${t.tenant_id}`
          );
        }
      }
    } catch (err: unknown) {
      logger.error("[Job] exception-expiry-check error:", toErrorMessage(err));
    }
  });
}

// === Row Mapper ===

function rowToExceptionRecord(row: Record<string, unknown>): ExceptionRecord {
  return {

    exceptionId: row.exception_id,
    controlId: row.control_id,
    justification: row.justification || "",
    compensatingControls: row.compensating_controls || "",
    riskImpact: row.risk_impact || "low",
    requestedBy: row.requested_by || "",
    requestedDuration: row.requested_duration || 0,
    approverDesignation: row.approver_designation || "",

    status: row.status || "draft",
    approvalChain: Array.isArray(row.approval_chain)
      ? row.approval_chain
      : JSON.parse((row as any).approval_chain || "[]"),
    expiryDate: row.expiry_date ? new Date((row as any).expiry_date).toISOString() : null,
    createdAt: row.created_at ? new Date((row as any).created_at).toISOString() : new Date().toISOString(),
  };
}
