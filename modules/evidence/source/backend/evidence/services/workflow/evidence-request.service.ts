// ============================================
// Evidence Requests
// ============================================

import { safeQuery, tenantSchema } from '../../ports/database.port';
import { eventBus } from '../../ports/events.port';
import { resolveFoundationOwnership } from "../core/evidence-lifecycle.service";
import { getFirstRow } from '@dos/db';
import type { GenericRow as _GenericRow } from '@dos/types';

export async function getEvidenceRequests(tenantId: string, filters?: {
  status?: string; overdue?: boolean; assignedTeamId?: string;
  department_id?: string; business_unit_id?: string;
}): Promise<Record<string, unknown>[]> {
  const schema = tenantSchema(tenantId);
  let sql = `SELECT request_id, control_id, framework_code, evidence_type,
                    requesting_team_id, assigned_team_id, due_date, status,
                    request_details, submitted_at, submitted_by, created_by,
                    priority, tags, created_at, department_id, business_unit_id
             FROM "${schema}".evidence_requests
             WHERE 1=1`;
  const vals: unknown[] = [];
  let idx = 1;
  if (filters?.status) { sql += ` AND status = $${idx++}`; vals.push(filters.status); }
  if (filters?.overdue) { sql += ` AND due_date < NOW() AND status NOT IN ('approved','cancelled','rejected')`; }
  if (filters?.assignedTeamId) { sql += ` AND assigned_team_id = $${idx++}`; vals.push(filters.assignedTeamId); }
  if (filters?.department_id) { sql += ` AND department_id = $${idx++}`; vals.push(filters.department_id); }
  if (filters?.business_unit_id) { sql += ` AND business_unit_id = $${idx++}`; vals.push(filters.business_unit_id); }
  sql += ` ORDER BY due_date ASC`;
  const result = await safeQuery(sql, vals);
  return result.rows;
}

export async function createEvidenceRequest(tenantId: string, data: {
  controlId?: string; frameworkCode?: string; evidenceType: string;
  assignedTeamId?: string; requestDetails?: string; dueDate: string;
  priority?: string; createdBy: string;
  department_id?: string; business_unit_id?: string;
}): Promise<unknown> {
  const schema = tenantSchema(tenantId);

  // Auto-inherit foundation from control if not provided
  let deptId = data.department_id || null;
  let buId = data.business_unit_id || null;
  if (data.controlId && !deptId) {
    try {
      const ownership = await resolveFoundationOwnership(tenantId, data.controlId);
      deptId = deptId || ownership.departmentId;
      buId = buId || ownership.businessUnitId;
    } catch { /* best-effort */ }
  }

  const result = await safeQuery(
    `INSERT INTO "${schema}".evidence_requests
       (control_id, framework_code, evidence_type, assigned_team_id, request_details,
        due_date, priority, status, created_by, department_id, business_unit_id)
     VALUES ($1, $2, $3, $4, $5, $6, $7, 'pending', $8, $9, $10)
     RETURNING *`,
    [data.controlId || null, data.frameworkCode || null, data.evidenceType,
     data.assignedTeamId || null, data.requestDetails || null,
     data.dueDate, data.priority || 'medium', data.createdBy,
     deptId, buId]
  );
  return getFirstRow(result);
}

export async function getEvidenceRequestById(tenantId: string, requestId: string): Promise<unknown> {
  const schema = tenantSchema(tenantId);
  const result = await safeQuery(
    `SELECT * FROM "${schema}".evidence_requests WHERE request_id = $1`, [requestId]
  );
  return getFirstRow(result) || null;
}

export async function updateEvidenceRequest(tenantId: string, requestId: string, data: {
  status?: string; submissionNotes?: string; submittedBy?: string;
}): Promise<unknown> {
      const result = await safeQuery("SELECT * FROM __TENANT_SCHEMA__.evidence_items" + (tenantId ? " WHERE tenant_id = $1" : ""), tenantId ? [tenantId] : []);
      return result?.rows || [];
}
