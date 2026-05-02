/**
 * @owner DOS (platform SLA enforcement)
 * @layer temporal-activity
 */
import { logger } from '../../modules/governance-os/platform/services/misc/logger.service';
// ============================================
// SLA Activities
// Timer-based SLA enforcement activities.
// Called by sla-timer.workflow.ts.
// ============================================

import { query, safeQuery, assertTenantId } from '@dos/db';
import { createNotification } from '../../modules/notification/services/notification.service';
import { recordAudit } from '../../modules/audit/services/audit/core/audit-trail.service';
import { createTypedTimeout } from '../resilience/activity-timeout';
import { toErrorMessage } from '@dos/platform-core/resilience';
import { getFirstRow } from '../../utils/db-utils';
import { SYSTEM_JOB_ACTOR } from '@dos/platform-core/constants';

export interface SlaActivities {
  sendSlaWarning(tenantId: string, taskId: string, assignedUserId: string, slaHours: number): Promise<void>;
  markSlaBreached(tenantId: string, taskId: string): Promise<void>;
  escalateTask(tenantId: string, taskId: string, level: number, teamId: string): Promise<void>;
}

export async function sendSlaWarning(
  tenantId: string,
  taskId: string,
  assignedUserId: string,
  slaHours: number,
): Promise<void> {
  assertTenantId(tenantId);
  try {
    const dbTimeout = createTypedTimeout('db', 'slaWarningUpdate');
    await dbTimeout(() => query(
      `UPDATE process_tasks SET sla_warning_sent_at = NOW() WHERE task_id = $1`,
      [taskId],
    ));
    const apiTimeout = createTypedTimeout('api', 'slaWarningNotify');
    await apiTimeout(() => createNotification(tenantId, {
      userId: assignedUserId,
      type: 'sla_warning',
      title: 'SLA Warning',
      body: `Task is approaching its ${slaHours}h SLA deadline (75% elapsed).`,
    }));
  } catch (err: unknown) {
    logger.warn(`[SLA] sendSlaWarning non-fatal: ${toErrorMessage(err)}`);
  }
}

export async function markSlaBreached(tenantId: string, taskId: string): Promise<void> {
  assertTenantId(tenantId);
  try {
    const dbTimeout = createTypedTimeout('db', 'markSlaBreached');
    await dbTimeout(() => query(
      `UPDATE process_tasks
       SET sla_breached = TRUE, sla_breach_level = 1, sla_breached_at = NOW()
       WHERE task_id = $1`,
      [taskId],
    ));
    await recordAudit({
      tenantId,
      userId: SYSTEM_JOB_ACTOR,
      module: 'sla',
      action: 'update',
      entityType: 'task',
      entityId: taskId,
      afterState: { sla_breached: true, level: 1 },
    });
  } catch (err: unknown) {
    logger.warn(`[SLA] markSlaBreached non-fatal: ${toErrorMessage(err)}`);
  }
}

export async function escalateTask(
  tenantId: string,
  taskId: string,
  level: number,
  teamId: string,
): Promise<void> {
  assertTenantId(tenantId);
  try {
    const dbTimeout = createTypedTimeout('db', 'escalateTask');
    await dbTimeout(() => query(
      `UPDATE process_tasks
       SET sla_breach_level = $2, escalation_level = $2, last_escalation_at = NOW()
       WHERE task_id = $1`,
      [taskId, level],
    ));
    const teamResult = await safeQuery(
      `SELECT manager_user_id FROM teams WHERE team_id = $1 LIMIT 1`,
      [teamId],
    );
    const managerId = getFirstRow(teamResult)?.manager_user_id;
    if (managerId) {
      await createNotification(tenantId, {
        userId: managerId,
        type: 'sla_escalation',
        title: `SLA Escalation Level ${level}`,
        body: `Task has been escalated to level ${level} due to SLA breach.`,
      });
    }
    await recordAudit({
      tenantId,
      userId: SYSTEM_JOB_ACTOR,
      module: 'sla',
      action: 'update',
      entityType: 'task',
      entityId: taskId,
      afterState: { escalation_level: level },
    });
  } catch (err: unknown) {
    logger.warn(`[SLA] escalateTask non-fatal: ${toErrorMessage(err)}`);
  }
}
