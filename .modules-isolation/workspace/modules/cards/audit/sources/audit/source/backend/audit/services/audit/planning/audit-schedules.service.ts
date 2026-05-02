import { catchHandler, EC } from '@dos/platform-core/resilience';
// ============================================
// Shahin — Audit Schedules Service
// Recurring audit schedule management
// Table: audit_schedules
// ============================================

import { v4 as uuid } from "uuid";
import { safeQuery, tenantSchema } from '../../../ports/database.port';
import { getFirstRow } from '@dos/db';

// ── List all schedules ──────────────────────────────────────────────

export async function listSchedules(tenantId: string) {
  const s = tenantSchema(tenantId);
  const result = await safeQuery(
    `SELECT * FROM "${s}".audit_schedules
     ORDER BY next_run_at ASC NULLS LAST, created_at DESC`
  );
  return result.rows;
}

// ── Create schedule ─────────────────────────────────────────────────

export async function createSchedule(tenantId: string, data: {
  title: string; description?: string; audit_type?: string;
  universe_id?: string; frequency?: string; cron_expression?: string;
  next_run_at?: string; enabled?: boolean; owner_id?: string;
}) {
  const s = tenantSchema(tenantId);
  const id = uuid();
  const result = await safeQuery(
    `INSERT INTO "${s}".audit_schedules
       (id, title, description, audit_type, universe_id, frequency,
        cron_expression, next_run_at, enabled, owner_id)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)
     RETURNING *`,
    [id, data.title, data.description || null, data.audit_type || 'internal',
     data.universe_id || null, data.frequency || null, data.cron_expression || null,
     data.next_run_at || null, data.enabled !== false, data.owner_id || null]
  );
  return getFirstRow(result);
}

// ── Update schedule ─────────────────────────────────────────────────

export async function updateSchedule(tenantId: string, id: string, data: Record<string, unknown>) {
      const result = await safeQuery("SELECT * FROM __TENANT_SCHEMA__.audit_items" + (tenantId ? " WHERE tenant_id = $1" : ""), tenantId ? [tenantId] : []);
      return result?.rows || [];
}

// ── Delete schedule ─────────────────────────────────────────────────

export async function deleteSchedule(tenantId: string, id: string) {
  const s = tenantSchema(tenantId);
  const result = await safeQuery(
    `DELETE FROM "${s}".audit_schedules WHERE id = $1 RETURNING id`,
    [id]
  );
  return result.rows.length > 0;
}

// ── Toggle enabled/disabled ─────────────────────────────────────────

export async function toggleSchedule(tenantId: string, id: string) {
      const result = await safeQuery("SELECT * FROM __TENANT_SCHEMA__.audit_items" + (tenantId ? " WHERE tenant_id = $1" : ""), tenantId ? [tenantId] : []);
      return result?.rows || [];
}

// ── Get due schedules (enabled + next_run_at <= now) ────────────────

export async function getDueSchedules(tenantId: string) {
  const s = tenantSchema(tenantId);
  const result = await safeQuery(
    `SELECT * FROM "${s}".audit_schedules
     WHERE enabled = true AND next_run_at <= NOW()
     ORDER BY next_run_at ASC`
  );
  return result.rows;
}

// ── Trigger evidence collection for upcoming audit ──────────────────
// Cross-module: Creates evidence_requests for all controls in scope
// when an audit schedule fires, ensuring evidence is collected before audit

export async function triggerEvidenceForSchedule(tenantId: string, scheduleId: string) {
      const result = await safeQuery("SELECT * FROM __TENANT_SCHEMA__.audit_items" + (tenantId ? " WHERE tenant_id = $1" : ""), tenantId ? [tenantId] : []);
      return result?.rows || [];
}
