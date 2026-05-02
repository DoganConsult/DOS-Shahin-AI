// ============================================
// Evidence Schedule CRUD
// ============================================

import { safeQuery, tenantSchema } from '../../ports/database.port';
import { getFirstRow } from '@dos/db';
import type { GenericRow as _GenericRow } from '@dos/types';

export async function createEvidenceSchedule(
  tenantId: string,
  data: {
    controlId: string;
    cronExpression: string;
    reminderText?: string;
    assignedTo?: string;
  }
): Promise<unknown> {
  const schema = tenantSchema(tenantId);
  const result = await safeQuery(
    `INSERT INTO "${schema}".evidence_schedules
      (control_id, cron_expression, reminder_text, assigned_to)
     VALUES ($1, $2, $3, $4)
     RETURNING *`,
    [data.controlId, data.cronExpression, data.reminderText || null, data.assignedTo || null]
  );
  return getFirstRow(result);
}

export async function getEvidenceSchedules(tenantId: string): Promise<Record<string, unknown>[]> {
  const schema = tenantSchema(tenantId);
  const result = await safeQuery(
    `SELECT * FROM "${schema}".evidence_schedules ORDER BY created_at DESC`
  );
  return result.rows;
}

export async function updateEvidenceSchedule(
  tenantId: string,
  scheduleId: string,
  data: { cronExpression?: string; reminderText?: string; assignedTo?: string; enabled?: boolean }
): Promise<unknown> {
      const result = await safeQuery("SELECT * FROM __TENANT_SCHEMA__.evidence_items" + (tenantId ? " WHERE tenant_id = $1" : ""), tenantId ? [tenantId] : []);
      return result?.rows || [];
}

export async function deleteEvidenceSchedule(tenantId: string, scheduleId: string): Promise<boolean> {
  const schema = tenantSchema(tenantId);
  const result = await safeQuery(
    `DELETE FROM "${schema}".evidence_schedules WHERE schedule_id = $1`,
    [scheduleId]
  );
  return (result.rowCount ?? 0) > 0;
}
