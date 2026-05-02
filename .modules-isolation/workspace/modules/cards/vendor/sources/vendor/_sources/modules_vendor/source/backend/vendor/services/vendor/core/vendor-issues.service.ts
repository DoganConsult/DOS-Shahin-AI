// ============================================
// Shahin — Vendor Issues & Exceptions Service
// Issue tracking, escalation, exception
// request/approval workflow
// ============================================

import { safeQuery, tenantSchema } from '../../../ports/database.port';
import { eventBus } from '../../../ports/events.port';
import { getFirstRow } from '@dos/db';
import type { GenericRow } from '@dos/types';
import { swallow, EC } from '@dos/platform-core/resilience';

// ============================================================
// Issues CRUD
// ============================================================

/**
 * List vendor issues with optional filters and pagination.
 */
export async function getIssues(
  tenantId: string,
  filters?: { vendorId?: string; status?: string; severity?: string; sourceType?: string; page?: number; pageSize?: number }
): Promise<{ rows: GenericRow[]; total: number }> {
  const schema = tenantSchema(tenantId);
  const page = filters?.page ?? 1;
  const pageSize = filters?.pageSize ?? 25;
  const offset = (page - 1) * pageSize;

  let whereClause = 'WHERE i.deleted_at IS NULL';
  const params: unknown[] = [];

  if (filters?.vendorId) {
    params.push(filters.vendorId);
    whereClause += ` AND i.vendor_id = $${params.length}`;
  }
  if (filters?.status) {
    params.push(filters.status);
    whereClause += ` AND i.status = $${params.length}`;
  }
  if (filters?.severity) {
    params.push(filters.severity);
    whereClause += ` AND i.severity = $${params.length}`;
  }
  if (filters?.sourceType) {
    params.push(filters.sourceType);
    whereClause += ` AND i.source_type = $${params.length}`;
  }

  const countRes = await safeQuery(
    `SELECT COUNT(*)::int AS total FROM "${schema}".vendor_issues i ${whereClause}`,
    params
  );
  const total = getFirstRow(countRes)?.total ?? 0;

  params.push(pageSize, offset);
  const dataRes = await safeQuery(
    `SELECT i.*, v.name AS vendor_name
     FROM "${schema}".vendor_issues i
     LEFT JOIN "${schema}".vendors v ON v.vendor_id = i.vendor_id
     ${whereClause}
     ORDER BY
       CASE i.severity WHEN 'critical' THEN 1 WHEN 'high' THEN 2 WHEN 'medium' THEN 3 WHEN 'low' THEN 4 ELSE 5 END,
       i.created_at DESC
     LIMIT $${params.length - 1} OFFSET $${params.length}`,
    params
  );

  return { rows: dataRes.rows, total };
}

/**
 * Get a single issue by ID.
 */
export async function getIssueById(
  tenantId: string,
  issueId: string
): Promise<GenericRow | undefined> {
  const schema = tenantSchema(tenantId);
  return getFirstRow(await safeQuery(
    `SELECT i.*, v.name AS vendor_name
     FROM "${schema}".vendor_issues i
     LEFT JOIN "${schema}".vendors v ON v.vendor_id = i.vendor_id
     WHERE i.issue_id = $1 AND i.deleted_at IS NULL`,
    [issueId]
  ));
}

/**
 * Create a new vendor issue. Increments vendor.active_issues_count.
 */
export async function createIssue(
  tenantId: string,
  data: {
    vendorId: string; sourceType?: string; sourceId?: string; title: string;
    description?: string; severity?: string; assignedTo?: string; dueDate?: string;
    riskImpact?: string; createdBy?: string;
  }
): Promise<GenericRow | undefined> {
  const schema = tenantSchema(tenantId);

  const r = await safeQuery(
    `INSERT INTO "${schema}".vendor_issues
       (vendor_id, source_type, source_id, title, description, severity, assigned_to, due_date, risk_impact, created_by)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) RETURNING *`,
    [
      data.vendorId, data.sourceType || 'manual', data.sourceId || null,
      data.title, data.description || null, data.severity || 'medium',
      data.assignedTo || null, data.dueDate || null, data.riskImpact || null,
      data.createdBy || null,
    ]
  );

  // Increment active issues counter
  await safeQuery(
    `UPDATE "${schema}".vendors
     SET active_issues_count = COALESCE(active_issues_count, 0) + 1, updated_at = NOW()
     WHERE vendor_id = $1`,
    [data.vendorId]
  );

  const issue = getFirstRow(r)!;
  await swallow(EC.EVENT_BUS, eventBus.publish(({
      eventType: 'vendor.issue_created', tenantId, sourceService: 'vendor-issues',
      entityType: 'vendor_issue', entityId: issue?.issue_id, severity: data.severity === 'critical' ? 'critical' : 'info',
      payload: { vendorId: data.vendorId, title: data.title, severity: data.severity },
    } as any)), { tenantId, operation: 'eventBus:vendor.issue_created' });

  return issue;
}

/**
 * Update an issue. Handles status transitions: auto-sets resolved_at
 * when status becomes 'resolved' or 'closed'.
 */
export async function updateIssue(
  tenantId: string,
  issueId: string,
  data: Partial<{
    status: string; severity: string; assignedTo: string; dueDate: string;
    resolutionNotes: string; riskImpact: string; description: string;
    metadata: Record<string, unknown>;
  }>
): Promise<GenericRow | undefined> {
  const schema = tenantSchema(tenantId);

  const fieldMap: Record<string, string> = {
    status: 'status', severity: 'severity', assignedTo: 'assigned_to',
    dueDate: 'due_date', resolutionNotes: 'resolution_notes',
    riskImpact: 'risk_impact', description: 'description', metadata: 'metadata',
  };

  const setClauses: string[] = [];
  const params: unknown[] = [];

  for (const [key, col] of Object.entries(fieldMap)) {
    if ((data as Record<string, unknown>)[key] !== undefined) {
      params.push(col === 'metadata' ? JSON.stringify((data as Record<string, unknown>)[key]) : (data as Record<string, unknown>)[key]);
      setClauses.push(`${col} = $${params.length}`);
    }
  }

  // Auto-set resolved_at on terminal statuses
  if (data.status === 'resolved' || data.status === 'closed') {
    setClauses.push('resolved_at = NOW()');
  }

  if (setClauses.length === 0) return getIssueById(tenantId, issueId);

  setClauses.push('updated_at = NOW()');
  params.push(issueId);

  const result = getFirstRow(await safeQuery(
    `UPDATE "${schema}".vendor_issues SET ${setClauses.join(', ')} WHERE issue_id = $${params.length} AND deleted_at IS NULL RETURNING *`,
    params
  ));

  // Decrement active_issues_count when issue is resolved or closed
  if (result && (data.status === 'resolved' || data.status === 'closed')) {
    await safeQuery(
      `UPDATE "${schema}".vendors
       SET active_issues_count = GREATEST(COALESCE(active_issues_count, 0) - 1, 0), updated_at = NOW()
       WHERE vendor_id = $1`,
      [result.vendor_id]
    );
  }

  return result;
}

/**
 * Escalate an issue to a specified user. Sets escalation metadata
 * and transitions status to 'escalated'.
 */
export async function escalateIssue(
  tenantId: string,
  issueId: string,
  escalateTo: string,
  userId: string
): Promise<GenericRow | undefined> {
  const schema = tenantSchema(tenantId);

  const result = getFirstRow(await safeQuery(
    `UPDATE "${schema}".vendor_issues
     SET escalated_to = $1, escalated_at = NOW(), status = 'escalated', updated_at = NOW()
     WHERE issue_id = $2 AND deleted_at IS NULL RETURNING *`,
    [escalateTo, issueId]
  ));

  if (result) {
    await swallow(EC.EVENT_BUS, eventBus.publish(({
          eventType: 'vendor.issue_escalated', tenantId, sourceService: 'vendor-issues',
          entityType: 'vendor_issue', entityId: issueId, severity: 'warning',
          payload: { vendorId: result.vendor_id, escalatedTo: escalateTo, escalatedBy: userId, title: result.title },
        } as any)), { tenantId, operation: 'eventBus:vendor.issue_escalated' });
  }

  return result;
}

// ============================================================
// Exceptions
// ============================================================

/**
 * List vendor exceptions with optional filters.
 */
export async function getExceptions(
  tenantId: string,
  filters?: { vendorId?: string; status?: string; type?: string }
): Promise<GenericRow[]> {
  const schema = tenantSchema(tenantId);
  let sql = `SELECT ex.*, v.name AS vendor_name
     FROM "${schema}".vendor_exceptions ex
     LEFT JOIN "${schema}".vendors v ON v.vendor_id = ex.vendor_id
     WHERE 1=1`;
  const params: unknown[] = [];

  if (filters?.vendorId) {
    params.push(filters.vendorId);
    sql += ` AND ex.vendor_id = $${params.length}`;
  }
  if (filters?.status) {
    params.push(filters.status);
    sql += ` AND ex.status = $${params.length}`;
  }
  if (filters?.type) {
    params.push(filters.type);
    sql += ` AND ex.exception_type = $${params.length}`;
  }

  sql += ` ORDER BY ex.created_at DESC`;
  return (await safeQuery(sql, params)).rows;
}

/**
 * Create an exception request for a vendor.
 */
export async function createException(
  tenantId: string,
  data: {
    vendorId: string; issueId?: string; exceptionType?: string; title: string;
    justification: string; riskAssessment?: string; compensatingControls?: string;
    validFrom?: string; validUntil?: string; requestedBy: string;
  }
): Promise<GenericRow | undefined> {
  const schema = tenantSchema(tenantId);

  const r = await safeQuery(
    `INSERT INTO "${schema}".vendor_exceptions
       (vendor_id, issue_id, exception_type, title, justification, risk_assessment,
        compensating_controls, valid_from, valid_until, requested_by, status)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,'pending_approval') RETURNING *`,
    [
      data.vendorId, data.issueId || null, data.exceptionType || 'risk_acceptance',
      data.title, data.justification, data.riskAssessment || null,
      data.compensatingControls || null, data.validFrom || null,
      data.validUntil || null, data.requestedBy,
    ]
  );

  const exception = getFirstRow(r)!;
  await swallow(EC.EVENT_BUS, eventBus.publish(({
      eventType: 'vendor.exception_requested', tenantId, sourceService: 'vendor-issues',
      entityType: 'vendor_exception', entityId: exception?.exception_id, severity: 'info',
      payload: { vendorId: data.vendorId, title: data.title, requestedBy: data.requestedBy },
    } as any)), { tenantId, operation: 'eventBus:vendor.exception_requested' });

  return exception;
}

/**
 * Approve an exception. Sets approved_by, approved_at, status='approved',
 * and increments vendor.exception_count.
 */
export async function approveException(
  tenantId: string,
  exceptionId: string,
  approverId: string,
  notes?: string
): Promise<GenericRow | undefined> {
  const schema = tenantSchema(tenantId);

  const r = getFirstRow(await safeQuery(
    `UPDATE "${schema}".vendor_exceptions
     SET status = 'approved', approved_by = $1, approved_at = NOW(),
         approval_notes = COALESCE($2, approval_notes), updated_at = NOW()
     WHERE exception_id = $3 RETURNING *`,
    [approverId, notes || null, exceptionId]
  ));

  if (r) {
    // Increment exception counter on the vendor
    await safeQuery(
      `UPDATE "${schema}".vendors
       SET exception_count = COALESCE(exception_count, 0) + 1, updated_at = NOW()
       WHERE vendor_id = $1`,
      [r.vendor_id]
    );

    await swallow(EC.EVENT_BUS, eventBus.publish(({
          eventType: 'vendor.exception_approved', tenantId, sourceService: 'vendor-issues',
          entityType: 'vendor_exception', entityId: exceptionId, severity: 'info',
          payload: { vendorId: r.vendor_id, approvedBy: approverId },
        } as any)), { tenantId, operation: 'eventBus:vendor.exception_approved' });
  }

  return r;
}

/**
 * Reject an exception. Sets status='rejected' with optional notes.
 */
export async function rejectException(
  tenantId: string,
  exceptionId: string,
  approverId: string,
  notes?: string
): Promise<GenericRow | undefined> {
  const schema = tenantSchema(tenantId);

  const r = getFirstRow(await safeQuery(
    `UPDATE "${schema}".vendor_exceptions
     SET status = 'rejected', approved_by = $1, approved_at = NOW(),
         approval_notes = COALESCE($2, approval_notes), updated_at = NOW()
     WHERE exception_id = $3 RETURNING *`,
    [approverId, notes || null, exceptionId]
  ));

  if (r) {
    await swallow(EC.EVENT_BUS, eventBus.publish(({
          eventType: 'vendor.exception_rejected', tenantId, sourceService: 'vendor-issues',
          entityType: 'vendor_exception', entityId: exceptionId, severity: 'info',
          payload: { vendorId: r.vendor_id, rejectedBy: approverId },
        } as any)), { tenantId, operation: 'eventBus:vendor.exception_rejected' });
  }

  return r;
}
