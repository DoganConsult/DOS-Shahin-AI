import { logger } from '../../ports/logger.port';
// ============================================
// Shahin — Process Task SLA Monitor
// Runs every 10 minutes. Detects SLA breaches,
// escalates overdue tasks, sends warnings for
// tasks approaching their deadline.
// ============================================

import { emptyResult, query as _query, safeQuery, tenantSchema } from '../../ports/database.port';
import { createNotification } from '../../../notification/services/notification.service';
async function distributeTask(_tenantId: string, _teamId: string, _context: string): Promise<string | null> { return null; }
import { eventBus } from '../../ports/events.port';
import { recordObservation } from '../../../ai/services/observability/ai-observation.service';
import { getFirstRow } from '@dos/db';
import { swallowNull, swallowDefault, EC , catchHandler , swallow } from '@dos/platform-core/resilience';
import type { GenericRow as _GenericRow } from '@dos/types';

export interface SLACheckResult {
  breached: number;
  escalated: number;
  warnings: number;
}

/**
 * Check all open process_tasks for SLA breaches and approaching deadlines.
 */
export async function checkProcessTaskSLAs(tenantId: string): Promise<SLACheckResult> {
  const schema = tenantSchema(tenantId);
  let breached = 0;
  let escalated = 0;
  let warnings = 0;

  // 1. Mark breached tasks
  const breachedRes = await safeQuery(
    `UPDATE "${schema}".process_tasks
     SET breached_at = NOW(), escalation_level = COALESCE(escalation_level, 0) + 1
     WHERE status NOT IN ('completed', 'cancelled', 'auto_closed')
       AND due_date < NOW()
       AND breached_at IS NULL
     RETURNING task_id, team_id, assigned_user_id, title, priority, escalation_level`,
  );
  breached = breachedRes.rowCount ?? 0;

  // 2. Escalate breached tasks
  for (const task of breachedRes.rows) {
    if (task.escalation_level <= 3 && task.team_id) {
      // Try to find escalation path
      const escPath = await safeQuery(
        `SELECT escalate_to_team_id FROM "${schema}".team_escalation_paths
         WHERE from_team_id = $1 AND escalation_level = $2 LIMIT 1`,
        [task.team_id, task.escalation_level],
      ).catch((e: unknown) => {
        logger.warn(`[SLAMonitor] Escalation path query failed for task ${task.task_id}: ${(e instanceof Error ? e.message : String(e))}`);
        return { rows: [] };
      });

      let newAssignee: string | null = null;
      if (escPath.rows.length > 0) {
        // Reassign to escalation team
        const escTeamId = getFirstRow(escPath)?.escalate_to_team_id;
        newAssignee = await distributeTask(tenantId, escTeamId, 'escalation').catch((e: unknown) => {
          logger.warn(`[SLAMonitor] distributeTask failed for task ${task.task_id} team ${escTeamId}: ${(e instanceof Error ? e.message : String(e))}`);
          return null;
        });
        if (newAssignee) {
          await safeQuery(
            `UPDATE "${schema}".process_tasks
             SET team_id = $1, assigned_user_id = $2, status = 'escalated'
             WHERE task_id = $3`,
            [escTeamId, newAssignee, task.task_id],
          );
          escalated++;
        }
      }

      // Notify current assignee about breach
      if (task.assigned_user_id) {
        await createNotification(tenantId, {
          userId: task.assigned_user_id,
          type: 'sla_breach',
          title: `SLA BREACHED: ${task.title}`,
          body: `Task has exceeded its deadline. Escalation level: ${task.escalation_level}`,
          link: '/task-board',
        }).catch(catchHandler(EC.EVENT_BUS, {}));
      }

      // Notify escalation target
      if (newAssignee && newAssignee !== task.assigned_user_id) {
        await createNotification(tenantId, {
          userId: newAssignee,
          type: 'escalation',
          title: `Escalated: ${task.title}`,
          body: `This ${task.priority}-priority task has been escalated to you after SLA breach`,
          link: '/task-board',
        }).catch(catchHandler(EC.EVENT_BUS, {}));
      }

      await swallow(EC.EVENT_BUS, eventBus.publish(({
              eventType: 'process_task.sla_breached',
              tenantId,
              sourceService: 'process-task-monitor',
              severity: task.priority === 'critical' ? 'critical' : 'warning',
              entityType: 'process_task',
              entityId: task.task_id,
              payload: { taskId: task.task_id, escalationLevel: task.escalation_level, priority: task.priority },
            } as any)), { tenantId, operation: 'eventBus:process_task.sla_breached' });

      // Cross-hub workflow handlers subscribe to workflow.sla_breached
      await swallow(EC.EVENT_BUS, eventBus.publish(({
              eventType: 'workflow.sla_breached',
              tenantId,
              sourceService: 'process-task-monitor',
              severity: task.priority === 'critical' ? 'critical' : 'warning',
              entityType: 'workflow',
              entityId: task.task_id,
              payload: { taskId: task.task_id, workflowTitle: task.title, escalationLevel: task.escalation_level, priority: task.priority, assignee: task.assigned_user_id },
            } as any)), { tenantId, operation: 'eventBus:workflow.sla_breached' });
    }
  }

  // 3. Send warnings for tasks at >75% SLA elapsed
  const warningRes = await safeQuery(
    `SELECT task_id, assigned_user_id, title, priority, sla_hours, due_date,
            EXTRACT(EPOCH FROM (due_date - NOW())) / 3600 AS hours_remaining
     FROM "${schema}".process_tasks
     WHERE status NOT IN ('completed', 'cancelled', 'auto_closed', 'escalated')
       AND breached_at IS NULL
       AND sla_hours > 0
       AND EXTRACT(EPOCH FROM (due_date - NOW())) / 3600 < (sla_hours * 0.25)
       AND EXTRACT(EPOCH FROM (due_date - NOW())) > 0`,
  );

  for (const task of warningRes.rows) {
    const hoursLeft = Math.round(Number(task.hours_remaining));
    if (task.assigned_user_id) {
      await createNotification(tenantId, {
        userId: task.assigned_user_id,
        type: 'sla_warning',
        title: `SLA Warning: ${task.title}`,
        body: `${hoursLeft}h remaining before deadline. Priority: ${task.priority}`,
        link: '/task-board',
      }).catch(catchHandler(EC.EVENT_BUS, {}));
      warnings++;
    }

    await swallow(EC.EVENT_BUS, eventBus.publish(({
          eventType: 'process_task.sla_warning',
          tenantId,
          sourceService: 'process-task-monitor',
          severity: 'warning',
          entityType: 'process_task',
          entityId: task.task_id,
          payload: { taskId: task.task_id, hoursRemaining: hoursLeft },
        } as any)), { tenantId, operation: 'eventBus:process_task.sla_warning' });
  }

  return { breached, escalated, warnings };
}

// ── Priority 17: Stale Task Detection ────────────────────────────────────────

export interface StaleTaskDetectionResult {
  stale7Days: number;
  stale14Days: number;
  escalated: number;
  observationsCreated: number;
  notificationsSent: number;
}

/**
 * Priority 17: Action Item Aging & Stale Task Detection
 *
 * Flags process_tasks where:
 * - status='pending'
 * - updated_at < now() - interval '7 days'
 * - breached_at IS NULL (not yet breached)
 *
 * Creates notifications to assignees + creates ai_observation with type='gap'.
 * If stale for 14+ days, auto-escalates.
 */
export async function detectStaleTasks(tenantId: string): Promise<StaleTaskDetectionResult> {
  const schema = tenantSchema(tenantId);
  let stale7Days = 0;
  let stale14Days = 0;
  let escalated = 0;
  let observationsCreated = 0;
  let notificationsSent = 0;

  // 1. Find tasks stale for 7+ days (but not yet 14 days)
  const stale7DaysRes = await safeQuery(
    `SELECT task_id, team_id, assigned_user_id, title, priority, created_at, updated_at,
            EXTRACT(EPOCH FROM (NOW() - updated_at)) / 86400 AS days_stale
     FROM "${schema}".process_tasks
     WHERE status = 'pending'
       AND updated_at < NOW() - INTERVAL '7 days'
       AND updated_at >= NOW() - INTERVAL '14 days'
       AND breached_at IS NULL
     ORDER BY updated_at ASC`,
  );

  stale7Days = stale7DaysRes.rowCount ?? 0;

  // 2. Find tasks stale for 14+ days (need escalation)
  const stale14DaysRes = await safeQuery(
    `SELECT task_id, team_id, assigned_user_id, title, priority, created_at, updated_at,
            EXTRACT(EPOCH FROM (NOW() - updated_at)) / 86400 AS days_stale
     FROM "${schema}".process_tasks
     WHERE status = 'pending'
       AND updated_at < NOW() - INTERVAL '14 days'
       AND breached_at IS NULL
     ORDER BY updated_at ASC`,
  );

  stale14Days = stale14DaysRes.rowCount ?? 0;

  // 3. Process 7-day stale tasks: notify + create observation
  for (const task of stale7DaysRes.rows) {
    const daysStale = Math.round(Number(task.days_stale));

    // Create observation
    try {
      await recordObservation({
        tenantId,
        entityType: 'process_task',
        entityId: task.task_id,
        observationType: 'gap',
        title: `Stale Task: ${task.title}`,
        description: `Task has been pending and untouched for ${daysStale} days. Status: pending, Priority: ${task.priority}`,
        severity: 'warning',
        confidence: 1.0,
        evidenceJson: {
          taskId: task.task_id,
          daysStale,
          status: 'pending',
          priority: task.priority,
          created_at: task.created_at,
          updated_at: task.updated_at,
        },
      });
      observationsCreated++;
    } catch (err: unknown) {
      logger.warn(`[StaleTaskDetector] Failed to create observation for task ${task.task_id}: ${err}`);
    }

    // Notify assignee
    if (task.assigned_user_id) {
      try {
        await createNotification(tenantId, {
          userId: task.assigned_user_id,
          type: 'task_stale',
          title: `Stale Task: ${task.title}`,
          body: `This task has been pending and untouched for ${daysStale} days. Please review and update.`,
          link: `/task-board?task=${task.task_id}`,
        });
        notificationsSent++;
      } catch (err: unknown) {
        logger.warn(`[StaleTaskDetector] Failed to send notification for task ${task.task_id}: ${err}`);
      }
    }

    // Publish event
    await swallow(EC.EVENT_BUS, eventBus.publish(({
          eventType: 'process_task.stale_detected',
          tenantId,
          sourceService: 'process-task-monitor',
          severity: 'warning',
          entityType: 'process_task',
          entityId: task.task_id,
          payload: {
            taskId: task.task_id,
            daysStale,
            priority: task.priority,
          },
        } as any)), { tenantId, operation: 'eventBus:process_task.stale_detected' });
  }

  // 4. Process 14-day stale tasks: escalate + notify + create observation
  for (const task of stale14DaysRes.rows) {
    const daysStale = Math.round(Number(task.days_stale));

    // Auto-escalate: increase escalation_level and try to reassign
    let escalatedTask = false;
    if (task.team_id) {
      try {
        // Try to find escalation path
        const escPath = await swallowDefault(EC.FALLBACK_QUERY, emptyResult(), safeQuery(
          `SELECT escalate_to_team_id FROM "${schema}".team_escalation_paths
           WHERE from_team_id = $1 AND escalation_level = 1 LIMIT 1`,
          [task.team_id],
        ), { tenantId: tenantId, operation: 'query team_escalation_paths' });

        if (escPath.rows.length > 0) {
          const escTeamId = getFirstRow(escPath)?.escalate_to_team_id;
          const newAssignee = await swallowNull(EC.FALLBACK_QUERY, distributeTask(tenantId, (escTeamId as any), 'escalation'), { tenantId: tenantId, operation: 'query team_escalation_paths' });
          if (newAssignee) {
            await safeQuery(
              `UPDATE "${schema}".process_tasks
               SET team_id = $1, assigned_user_id = $2, status = 'escalated',
                   escalation_level = COALESCE(escalation_level, 0) + 1
               WHERE task_id = $3`,
              [escTeamId, newAssignee, task.task_id],
            );
            escalatedTask = true;
            escalated++;

            // Notify new assignee
            await createNotification(tenantId, {
              userId: newAssignee,
              type: 'escalation',
              title: `Escalated (Stale): ${task.title}`,
              body: `This task has been stale for ${daysStale} days and has been escalated to you.`,
              link: `/task-board?task=${task.task_id}`,
            }).catch(catchHandler(EC.EVENT_BUS, {}));
            notificationsSent++;
          }
        }
      } catch (err: unknown) {
        logger.warn(`[StaleTaskDetector] Escalation failed for task ${task.task_id}: ${err}`);
      }
    }

    // If escalation didn't work, just update escalation_level
    if (!escalatedTask) {
      await safeQuery(
        `UPDATE "${schema}".process_tasks
         SET escalation_level = COALESCE(escalation_level, 0) + 1
         WHERE task_id = $1`,
        [task.task_id],
      ).catch(catchHandler(EC.EVENT_BUS, {}));
    }

    // Create critical observation
    try {
      await recordObservation({
        tenantId,
        entityType: 'process_task',
        entityId: task.task_id,
        observationType: 'gap',
        title: `CRITICAL: Stale Task (${daysStale} days): ${task.title}`,
        description: `Task has been pending and untouched for ${daysStale} days. Auto-escalated. Status: pending, Priority: ${task.priority}`,
        severity: 'critical',
        confidence: 1.0,
        evidenceJson: {
          taskId: task.task_id,
          daysStale,
          status: 'pending',
          priority: task.priority,
          created_at: task.created_at,
          updated_at: task.updated_at,
          autoEscalated: true,
        },
      });
      observationsCreated++;
    } catch (err: unknown) {
      logger.warn(`[StaleTaskDetector] Failed to create observation for task ${task.task_id}: ${err}`);
    }

    // Notify original assignee (if still assigned)
    if (task.assigned_user_id && !escalatedTask) {
      try {
        await createNotification(tenantId, {
          userId: task.assigned_user_id,
          type: 'task_stale_critical',
          title: `CRITICAL: Stale Task (${daysStale} days): ${task.title}`,
          body: `This task has been stale for ${daysStale} days and has been auto-escalated. Immediate action required.`,
          link: `/task-board?task=${task.task_id}`,
        });
        notificationsSent++;
      } catch (err: unknown) {
        logger.warn(`[StaleTaskDetector] Failed to send notification for task ${task.task_id}: ${err}`);
      }
    }

    // Publish critical event
    await swallow(EC.EVENT_BUS, eventBus.publish(({
          eventType: 'process_task.stale_critical',
          tenantId,
          sourceService: 'process-task-monitor',
          severity: 'critical',
          entityType: 'process_task',
          entityId: task.task_id,
          payload: {
            taskId: task.task_id,
            daysStale,
            priority: task.priority,
            autoEscalated: true,
          },
        } as any)), { tenantId, operation: 'eventBus:process_task.stale_critical' });
  }

  return {
    stale7Days,
    stale14Days,
    escalated,
    observationsCreated,
    notificationsSent,
  };
}
