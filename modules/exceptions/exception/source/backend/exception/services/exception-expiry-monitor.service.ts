import { safeQuery, safeQueryWithClient, tenantSchema, withTransaction } from '../ports/database.port';
import { getFirstRow as _getFirstRow } from "@dos/db";
import type { ExceptionRecord } from "@dos/types";
import { emitEvent } from '../ports/events.port';
import { swallow, EC } from '@dos/platform-core/resilience';
import { retryWithBackoff, isRetryableError } from "../../../utils/retry.util";
import { ExceptionRepository } from "../repositories/exception.repository";
import { SYSTEM_JOB_ACTOR } from '../ports/platform.port';

// === Types ===

export interface ExpiryAlert {
  alertId: string;
  exceptionId: string;
  controlId: string | null;
  expiryDate: string;
  daysUntilExpiry: number;
  riskImpact: string;
  alertLevel: "info" | "warning" | "critical" | "overdue";
  requestedBy: string;
  approverDesignation: string;
  message: string;
}

export interface GracePeriodRecord {
  exceptionId: string;
  gracePeriodDays: number;
  gracePeriodEndsAt: string;
  grantedBy: string;
  grantedAt: string;
  reason: string;
}

export interface MonitorRunResult {
  tenantId: string;
  runAt: string;
  alertsGenerated: number;
  autoClosedCount: number;
  gracePeriodExpired: number;
  errors: string[];
}

// === Pure Functions ===

export function computeAlertLevel(daysUntilExpiry: number): ExpiryAlert["alertLevel"] {
  if (daysUntilExpiry < 0) return "overdue";
  if (daysUntilExpiry <= 3) return "critical";
  if (daysUntilExpiry <= 14) return "warning";
  return "info";
}

export function buildAlertMessage(
  daysUntilExpiry: number,
  riskImpact: string,
  approverDesignation: string
): string {
  if (daysUntilExpiry < 0) {
    return `Exception is ${Math.abs(daysUntilExpiry)} days overdue. Immediate action required. Approver: ${approverDesignation}.`;
  }
  if (daysUntilExpiry <= 3) {
    return `CRITICAL: Exception expires in ${daysUntilExpiry} day(s). Risk level: ${riskImpact}. Contact ${approverDesignation} immediately.`;
  }
  if (daysUntilExpiry <= 14) {
    return `WARNING: Exception expires in ${daysUntilExpiry} days. Risk level: ${riskImpact}. Initiate renewal with ${approverDesignation}.`;
  }
  return `Exception expires in ${daysUntilExpiry} days. Review renewal options with ${approverDesignation}.`;
}

export function shouldAutoClose(
  daysOverdue: number,
  riskImpact: string,
  hasGracePeriod: boolean
): boolean {
  if (hasGracePeriod) return false;
  const autoCloseThresholds: Record<string, number> = {
    critical: 0,
    high: 3,
    medium: 7,
    low: 14,
  };
  return daysOverdue >= (autoCloseThresholds[riskImpact] ?? 7);
}

export function computeGracePeriodEnd(expiryDate: Date, graceDays: number): Date {
  return new Date(expiryDate.getTime() + graceDays * 24 * 60 * 60 * 1000);
}

// === Row Mapper ===

function mapRow( r: Record<string, unknown>): ExceptionRecord {
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

// === DB Functions ===

export async function generateExpiryAlerts(
  tenantId: string,
  alertThresholdDays: number[] = [30, 14, 7, 3, 1]
): Promise<ExpiryAlert[]> {
  const schema = tenantSchema(tenantId);
  const maxDays = Math.max(...alertThresholdDays);
  const threshold = new Date(Date.now() + maxDays * 24 * 60 * 60 * 1000).toISOString();
  const now = new Date();

  const result = await safeQuery(
    `SELECT * FROM "${schema}".exceptions
     WHERE status = 'approved' AND expiry_date IS NOT NULL AND expiry_date <= $1
     ORDER BY expiry_date ASC`,
    [threshold]
  );

  const alerts: ExpiryAlert[] = [];
  for (const row of result.rows) {
    const expiry = new Date(row.expiry_date);
    const daysUntilExpiry = Math.ceil((expiry.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

    if (!alertThresholdDays.some(d => Math.abs(daysUntilExpiry - d) <= 1) && daysUntilExpiry >= 0) continue;

    alerts.push({
      alertId: `alert_${row.exception_id}_${daysUntilExpiry}`,
      exceptionId: row.exception_id,
      controlId: row.control_id || null,
      expiryDate: expiry.toISOString(),
      daysUntilExpiry,
      riskImpact: row.risk_impact,
      alertLevel: computeAlertLevel(daysUntilExpiry),
      requestedBy: row.requested_by,
      approverDesignation: row.approver_designation,
      message: buildAlertMessage(daysUntilExpiry, row.risk_impact, row.approver_designation),
    });
  }

  return alerts;
}

export async function autoCloseExpiredExceptions(
  tenantId: string
): Promise<ExceptionRecord[]> {
  const schema = tenantSchema(tenantId);
  const now = new Date().toISOString();

  const overdue = await safeQuery(
    `SELECT * FROM "${schema}".exceptions
     WHERE status = 'approved' AND expiry_date IS NOT NULL AND expiry_date < $1`,
    [now]
  );

  const repo = new ExceptionRepository(tenantId);
  const closed: ExceptionRecord[] = [];
  for (const row of overdue.rows) {
    const expiry = new Date(row.expiry_date);
    const daysOverdue = Math.abs(Math.ceil((expiry.getTime() - Date.now()) / (1000 * 60 * 60 * 24)));

    if (!shouldAutoClose(daysOverdue, row.risk_impact, false)) continue;

    const updatedRow = await withTransaction(tenantId, async (client) => {
      const locked = await repo.findByIdForUpdateSkipLocked(row.exception_id, 'approved', client);
      if (!locked) return null;

      const updated = await repo.update(locked.exception_id, { status: 'expired' }, client);

      if (locked.control_id) {
        await safeQueryWithClient(
          `UPDATE "${schema}".ucf_controls
           SET lifecycle_state = 'testing', updated_at = NOW()
           WHERE control_id = $1 AND lifecycle_state = 'exception_active'`,
          [locked.control_id],
          client,
        );
      }

      return updated;
    });

    if (updatedRow) {
      closed.push(mapRow(updatedRow));
      swallow(EC.EVENT_BUS, emitEvent(({
              tenantId, userId: SYSTEM_JOB_ACTOR, module: 'exception', event: 'auto_closed',
              entityType: 'exception', entityId: row.exception_id,
              data: { controlId: row.control_id, expiryDate: row.expiry_date },
            } as any)));
    }
  }

  return closed;
}

function validateGracePeriodInput(exceptionId: string, graceDays: number, grantedBy: string, reason: string): void {
  const errors: string[] = [];
  if (!exceptionId?.trim()) errors.push('exceptionId is required');
  if (!graceDays || graceDays <= 0) errors.push('graceDays must be positive');
  if (graceDays > 365) errors.push('graceDays must not exceed 365');
  if (!grantedBy?.trim()) errors.push('grantedBy is required');
  if (!reason?.trim()) errors.push('reason is required');
  if (reason && reason.length > 2000) errors.push('reason must not exceed 2000 characters');
  if (errors.length > 0) throw Object.assign(new Error(`Invalid grace period: ${errors.join(', ')}`), { statusCode: 400 });
}

export async function grantGracePeriod(
  tenantId: string,
  exceptionId: string,
  graceDays: number,
  grantedBy: string,
  reason: string
): Promise<GracePeriodRecord> {
  validateGracePeriodInput(exceptionId, graceDays, grantedBy, reason);
  const schema = tenantSchema(tenantId);

  const result = await withTransaction(tenantId, async (client) => {
    const exc = await safeQueryWithClient(
      `SELECT exception_id, expiry_date, status FROM "${schema}".exceptions WHERE exception_id = $1 FOR UPDATE`,
      [exceptionId],
      client,
    );
    const row = exc.rows[0];
    if (!row) throw Object.assign(new Error('Exception not found'), { statusCode: 404 });
    if (row.status !== 'approved') throw Object.assign(new Error('Grace period can only be granted to approved exceptions'), { statusCode: 400 });

    const currentExpiry = row.expiry_date ? new Date(row.expiry_date) : new Date();
    const gracePeriodEnd = computeGracePeriodEnd(currentExpiry, graceDays);

    await safeQueryWithClient(
      `UPDATE "${schema}".exceptions SET expiry_date = $1, grace_period_days = COALESCE(grace_period_days, 0) + $2, grace_period_granted_by = $3, grace_period_reason = $4, updated_at = NOW() WHERE exception_id = $5`,
      [gracePeriodEnd.toISOString(), graceDays, grantedBy, reason, exceptionId],
      client,
    );

    return {
      exceptionId,
      gracePeriodDays: graceDays,
      gracePeriodEndsAt: gracePeriodEnd.toISOString(),
      grantedBy,
      grantedAt: new Date().toISOString(),
      reason,
    };
  });

  swallow(EC.EVENT_BUS, emitEvent(({
    tenantId, userId: grantedBy, module: 'exception', event: 'grace_period_granted',
    entityType: 'exception', entityId: exceptionId,
    data: result,
  } as any)));

  return result;
}

const MONITOR_RETRY_OPTS = { maxRetries: 2, initialDelay: 500, shouldRetry: isRetryableError };

export async function runExpiryMonitor(tenantId: string): Promise<MonitorRunResult> {
  const errors: string[] = [];
  let alertsGenerated = 0;
  let autoClosedCount = 0;
  let gracePeriodExpired = 0;

  try {
    const alerts = await retryWithBackoff(() => generateExpiryAlerts(tenantId), MONITOR_RETRY_OPTS);
    alertsGenerated = alerts.length;
  } catch (err: unknown) {
    errors.push(`Alert generation failed: ${err instanceof Error ? err.message : String(err)}`);
  }

  try {
    const closed = await retryWithBackoff(() => autoCloseExpiredExceptions(tenantId), MONITOR_RETRY_OPTS);
    autoClosedCount = closed.length;
  } catch (err: unknown) {
    errors.push(`Auto-close failed: ${err instanceof Error ? err.message : String(err)}`);
  }

  return {
    tenantId,
    runAt: new Date().toISOString(),
    alertsGenerated,
    autoClosedCount,
    gracePeriodExpired,
    errors,
  };
}

export async function getOverdueExceptions(tenantId: string): Promise<Array<ExceptionRecord & { daysOverdue: number }>> {
  const schema = tenantSchema(tenantId);
  const now = new Date();

  const result = await safeQuery(
    `SELECT * FROM "${schema}".exceptions
     WHERE status = 'approved' AND expiry_date IS NOT NULL AND expiry_date < $1
     ORDER BY expiry_date ASC`,
    [now.toISOString()]
  );

  return result.rows.map(mapRow).map(exc => ({
    ...exc,
    daysOverdue: exc.expiryDate
      ? Math.ceil((now.getTime() - new Date((exc as any).expiryDate).getTime()) / (1000 * 60 * 60 * 24))
      : 0,
  }));
}
