import { logger } from '../../modules/governance-os/platform/services/misc/logger.service';
// ============================================
// Evidence Activities
// Per-control evidence lifecycle activities.
// Called by evidence-lifecycle.workflow.ts.
// ============================================

import { query, safeQuery, tenantSchema, assertTenantId } from '@dos/db';
import { createNotification } from '../../modules/notification/services/notification.service';
import { recordAudit } from '../../modules/audit/services/audit/core/audit-trail.service';
import { createTypedTimeout } from '../resilience/activity-timeout';
import { toErrorMessage } from '@dos/platform-core/resilience';
import { findSimilarEvidence } from '../utils/vector-search.util';
import { getFirstRow } from '../../utils/db-utils';
import { SYSTEM_JOB_ACTOR } from '@dos/platform-core/constants';

export interface EvidenceActivities {
  createEvidenceRequest(tenantId: string, controlId: string, scheduleId: string): Promise<string>;
  checkEvidenceStatus(tenantId: string, evidenceId: string): Promise<{ status: string; submittedAt?: string }>;
  sendEvidenceReminder(tenantId: string, evidenceId: string, assignedUserId: string, controlName: string): Promise<void>;
  escalateEvidenceRequest(tenantId: string, evidenceId: string, level: number): Promise<void>;
  escalateOverdueEvidence(tenantId: string, scheduleId: string): Promise<void>;
  markEvidenceExpired(tenantId: string, evidenceId: string): Promise<void>;
  validateEvidence(tenantId: string, evidenceId: string): Promise<{ valid: boolean; issues: string[] }>;
  getNextEvidenceSchedule(tenantId: string, controlId: string): Promise<{ nextDue: string; frequencyDays: number } | null>;
  updateScheduleLastCollected(tenantId: string, scheduleId: string): Promise<void>;
  findSimilarEvidenceItems(tenantId: string, queryText: string, controlId?: string, similarityThreshold?: number, limit?: number): Promise<Array<{ evidenceId: string; controlId: string; similarity: number; title?: string; artifactType?: string }>>;
}

export async function createEvidenceRequest(
  tenantId: string,
  controlId: string,
  scheduleId: string,
): Promise<string> {
  assertTenantId(tenantId);
  const schema = tenantSchema(tenantId);
  const result = await safeQuery(
    `INSERT INTO "${schema}".evidence
       (control_id, schedule_id, status, requested_at, created_at)
     VALUES ($1, $2, 'requested', NOW(), NOW())
     RETURNING evidence_id`,
    [controlId, scheduleId],
  );
  const evidenceId = getFirstRow(result)?.evidence_id;
  await recordAudit({
    tenantId,
    userId: SYSTEM_JOB_ACTOR,
    module: 'evidence',
    action: 'create',
    entityType: 'evidence',
    entityId: evidenceId,
    afterState: { controlId, scheduleId },
  });
  return evidenceId;
}

export async function checkEvidenceStatus(
  tenantId: string,
  evidenceId: string,
): Promise<{ status: string; submittedAt?: string }> {
  assertTenantId(tenantId);
  const schema = tenantSchema(tenantId);
  const result = await safeQuery(
    `SELECT status, submitted_at FROM "${schema}".evidence WHERE evidence_id = $1`,
    [evidenceId],
  );
  const row = getFirstRow(result)!;
  if (!row) return { status: 'not_found' };
  return { status: row.status, submittedAt: row.submitted_at };
}

export async function sendEvidenceReminder(
  tenantId: string,
  evidenceId: string,
  assignedUserId: string,
  controlName: string,
): Promise<void> {
  assertTenantId(tenantId);
  try {
    await safeQuery(
      `UPDATE "${tenantSchema(tenantId)}".evidence SET last_reminded_at = NOW() WHERE evidence_id = $1`,
      [evidenceId],
    );
    await createNotification(tenantId, {
      userId: assignedUserId,
      type: 'evidence_reminder',
      title: 'Evidence Submission Required',
      body: `Evidence is required for control: ${controlName}. Please submit before the deadline.`,
    });
  } catch (err: unknown) {
    logger.warn(`[Evidence] sendReminder non-fatal: ${toErrorMessage(err)}`);
  }
}

export async function escalateEvidenceRequest(
  tenantId: string,
  evidenceId: string,
  level: number,
): Promise<void> {
  assertTenantId(tenantId);
  try {
    const schema = tenantSchema(tenantId);
    const result = await safeQuery(
      `SELECT e.control_id, c.owner_user_id, c.name
       FROM "${schema}".evidence e
       JOIN "${schema}".ucf_controls c ON e.control_id = c.id
       WHERE e.evidence_id = $1`,
      [evidenceId],
    );
    const row = getFirstRow(result)!;
    if (row?.owner_user_id) {
      await createNotification(tenantId, {
        userId: row.owner_user_id,
        type: 'evidence_escalation',
        title: `Evidence Escalation Level ${level}`,
        body: `Evidence for control "${row.name}" has been escalated to level ${level}.`,
      });
    }
    await recordAudit({
      tenantId,
      userId: SYSTEM_JOB_ACTOR,
      module: 'evidence',
      action: 'update',
      entityType: 'evidence',
      entityId: evidenceId,
      afterState: { escalation_level: level },
    });
  } catch (err: unknown) {
    logger.warn(`[Evidence] escalate non-fatal: ${toErrorMessage(err)}`);
  }
}

export async function escalateOverdueEvidence(
  tenantId: string,
  scheduleId: string,
): Promise<void> {
  assertTenantId(tenantId);
  try {
    const schema = tenantSchema(tenantId);
    const dbTimeout = createTypedTimeout('db', 'escalateOverdue', 45_000);
    const result = await dbTimeout(() => query(
      `SELECT evidence_id FROM "${schema}".evidence
       WHERE schedule_id = $1 AND status = 'requested'
         AND requested_at < NOW() - INTERVAL '7 days'`,
      [scheduleId],
    ));
    for (const row of result.rows) {
      await escalateEvidenceRequest(tenantId, row.evidence_id, 1);
    }
  } catch (err: unknown) {
    logger.warn(`[Evidence] escalateOverdue non-fatal: ${toErrorMessage(err)}`);
  }
}

export async function markEvidenceExpired(tenantId: string, evidenceId: string): Promise<void> {
  assertTenantId(tenantId);
  const schema = tenantSchema(tenantId);
  await safeQuery(
    `UPDATE "${schema}".evidence SET status = 'expired', expired_at = NOW() WHERE evidence_id = $1`,
    [evidenceId],
  );
  await recordAudit({
    tenantId,
    userId: SYSTEM_JOB_ACTOR,
    module: 'evidence',
    action: 'update',
    entityType: 'evidence',
    entityId: evidenceId,
    afterState: { status: 'expired' },
  });
}

export async function validateEvidence(
  tenantId: string,
  evidenceId: string,
): Promise<{ valid: boolean; issues: string[] }> {
  assertTenantId(tenantId);
  const schema = tenantSchema(tenantId);
  const dbTimeout = createTypedTimeout('db', 'validateEvidence');
  const result = await dbTimeout(() => query(
    `SELECT e.*, c.evidence_requirements
     FROM "${schema}".evidence e
     LEFT JOIN "${schema}".ucf_controls c ON e.control_id = c.id
     WHERE e.evidence_id = $1`,
    [evidenceId],
  ));
  const row = getFirstRow(result)!;
  if (!row) return { valid: false, issues: ['Evidence record not found'] };

  const issues: string[] = [];
  if (!row.file_url && !row.content && !row.external_url) {
    issues.push('No evidence file or content attached');
  }
  if (!row.submitted_at) {
    issues.push('Evidence not yet submitted');
  }
  return { valid: issues.length === 0, issues };
}

export async function getNextEvidenceSchedule(
  tenantId: string,
  controlId: string,
): Promise<{ nextDue: string; frequencyDays: number } | null> {
  assertTenantId(tenantId);
  const schema = tenantSchema(tenantId);
  const result = await safeQuery(
    `SELECT next_due_date, frequency_days
     FROM "${schema}".evidence_schedules
     WHERE control_id = $1 AND is_active = TRUE
     ORDER BY next_due_date ASC LIMIT 1`,
    [controlId],
  );
  const row = getFirstRow(result)!;
  if (!row) return null;
  return { nextDue: row.next_due_date, frequencyDays: row.frequency_days || 90 };
}

export async function updateScheduleLastCollected(
  tenantId: string,
  scheduleId: string,
): Promise<void> {
  assertTenantId(tenantId);
  const schema = tenantSchema(tenantId);
  await safeQuery(
    `UPDATE "${schema}".evidence_schedules
     SET last_collected_at = NOW(),
         next_due_date = NOW() + (frequency_days || ' days')::interval
     WHERE schedule_id = $1`,
    [scheduleId],
  );
}

/**
 * Find similar evidence items using vector similarity search.
 * Useful for suggesting existing evidence when creating new requests or finding duplicates.
 */
export async function findSimilarEvidenceItems(
  tenantId: string,
  queryText: string,
  controlId?: string,
  similarityThreshold: number = 0.7,
  limit: number = 10,
): Promise<Array<{
  evidenceId: string;
  controlId: string;
  similarity: number;
  title?: string;
  artifactType?: string;
}>> {
  assertTenantId(tenantId);
  return findSimilarEvidence(tenantId, queryText, controlId, similarityThreshold, limit);
}
