import { catchHandler, EC } from '@dos/platform-core/resilience';
import { logger } from '../../ports/logger.port';
// ============================================
// Shahin — Engagement OS Orchestrator
// Autonomous 7-step engagement cycle per tenant,
// parallel to the AGRC-OS orchestrator.
// Runs every 15 minutes via job-scheduler.
//
// Steps:
//   1. Scan overdue engagements
//   2. Generate smart reminders
//   3. Escalate SLA breaches
//   4. Compute engagement scores
//   5. Check pending regulator requests
//   6. Alert consultant clients
//   7. Publish events + cycle_completed
//
// Requirements: 10.1–10.9
// ============================================

import { query as _query, safeQuery, tenantSchema } from '../../ports/database.port';
import { eventBus } from '../../ports/events.port';
import { recordAudit } from '../../../audit/services/audit/core/audit-trail.service';
import { generateReminder, sendReminder } from '../../ports/platform.port';
import { computeEngagementScore } from './engagement-score.service';
import { createNotification } from '../../../notification/services/notification.service';
import type { EngagementCycleResult, OverdueItem } from '@dos/types';
import { toErrorMessage } from '@dos/module-sdk';
import { getFirstRow } from '@dos/db';
import type { GenericRow } from '@dos/types';

// ── Circuit breaker: prevent concurrent cycles per tenant ──────────────────

const activeCycles = new Set<string>();

// ── Main orchestration cycle ───────────────────────────────────────────────

export async function runEngagementOSCycle(tenantId: string): Promise<EngagementCycleResult> {
  // Circuit breaker: prevent concurrent cycles for the same tenant
  if (activeCycles.has(tenantId)) {
    logger.warn(`[Engagement-OS] Cycle already running for tenant ${tenantId} — skipping`);
    return {
      tenantId,
      overdueItemsFound: 0,
      remindersSent: 0,
      slaBreachesEscalated: 0,
      scoresComputed: 0,
      regulatorRequestsFlagged: 0,
      consultantAlertsPublished: 0,
      eventsPublished: 0,
      cycleMs: 0,
      completedAt: new Date().toISOString(),
      warnings: ['Skipped: concurrent cycle already running'],
    };
  }

  activeCycles.add(tenantId);
  try {
    return await _runCycleInternal(tenantId);
  } finally {
    activeCycles.delete(tenantId);
  }
}

// ── Internal cycle implementation ──────────────────────────────────────────

async function _runCycleInternal(tenantId: string): Promise<EngagementCycleResult> {
  const startTime = Date.now();
  const schema = tenantSchema(tenantId);
  let overdueItemsFound = 0;
  let remindersSent = 0;
  let slaBreachesEscalated = 0;
  let scoresComputed = 0;
  let regulatorRequestsFlagged = 0;
  let consultantAlertsPublished = 0;
  let eventsPublished = 0;
  const warnings: string[] = [];

  // Collect overdue items for use across steps
  let overdueItems: OverdueItem[] = [];

  // ── Step 1: Scan overdue engagements ─────────────────────────────────────
  try {
    overdueItems = await scanOverdueEngagements(schema);
    overdueItemsFound = overdueItems.length;

    if (overdueItemsFound > 0) {
      await eventBus.publish({
        eventType: 'vendor.questionnaire_overdue' as any,
        tenantId,

        sourceService: 'engagement-os-orchestrator',
        severity: 'warning',
        payload: { overdueCount: overdueItemsFound },
      });
      eventsPublished++;
    }
  } catch (err: unknown) {
    const msg = `[Step 1] Scan overdue engagements failed: ${toErrorMessage(err)}`;
    logger.warn(`[Engagement-OS] ${msg}`);
    warnings.push(msg);
  }

  // ── Step 2: Generate smart reminders ─────────────────────────────────────
  try {
    for (const item of overdueItems) {
      try {
        const { isRateLimited } = await import('../../platform/services/misc/smart-reminder.service.js');
        const limited = await isRateLimited(tenantId, item.itemId, item.itemId);
        if (limited) continue;

        // Fetch vendor name for the reminder
        const vendorName = await getVendorName(schema, item);

        const daysOverdue = Math.max(1, Math.floor(
          (Date.now() - new Date(item.dueDate).getTime()) / (1000 * 60 * 60 * 24),
        ));

        const reminderCandidates = await generateReminder(tenantId, typeof item.itemId === 'string' ? item.itemId : undefined);
        const reminder = reminderCandidates.find(candidate => candidate.sourceId === item.itemId) ?? reminderCandidates[0] ?? null;

        await sendReminder(tenantId, item.itemId, reminder, item.itemId);
        remindersSent++;
      } catch (err: unknown) {
        warnings.push(`[Step 2] Reminder failed for item ${item.itemId}: ${toErrorMessage(err)}`);
      }
    }
  } catch (err: unknown) {
    const msg = `[Step 2] Smart reminder generation failed: ${toErrorMessage(err)}`;
    logger.warn(`[Engagement-OS] ${msg}`);
    warnings.push(msg);
  }

  // ── Step 3: Escalate SLA breaches ────────────────────────────────────────
  try {
    const breaches = await scanSLABreaches(schema);
    for (const breach of breaches) {
      try {
        // Create high-priority task for the breach
        const { createTask } = await import('../../../workflow/services/tasks/task-board.service.js');
        await createTask(tenantId, {
          title: `SLA Breach: ${breach.title}`,
          description: `Vendor engagement SLA breached — ${breach.title} is overdue by ${breach.daysOverdue} day(s).`,
          assignedTo: breach.ownerId || undefined,
          dueDate: new Date().toISOString(),
        });

        // Send notification to risk owner
        if (breach.ownerId) {
          await createNotification.send(tenantId, {
            userId: breach.ownerId,
            type: 'sla_breach',
            title: 'SLA Breach Escalation',
            body: `${breach.title} has breached its SLA deadline.`,
            link: `/vendor-management/${breach.vendorId}`,
          });
        }

        slaBreachesEscalated++;
      } catch (err: unknown) {
        warnings.push(`[Step 3] Escalation failed for breach ${breach.title}: ${toErrorMessage(err)}`);
      }
    }
  } catch (err: unknown) {
    const msg = `[Step 3] SLA breach escalation failed: ${toErrorMessage(err)}`;
    logger.warn(`[Engagement-OS] ${msg}`);
    warnings.push(msg);
  }

  // ── Step 4: Compute engagement scores ────────────────────────────────────
  try {
    const vendorIds = await getActiveVendorIds(schema);
    for (const vendorId of vendorIds) {
      try {
        await computeEngagementScore(tenantId, vendorId);
        scoresComputed++;
      } catch (err: unknown) {
        warnings.push(`[Step 4] Score computation failed for vendor ${vendorId}: ${toErrorMessage(err)}`);
      }
    }
  } catch (err: unknown) {
    const msg = `[Step 4] Engagement score computation failed: ${toErrorMessage(err)}`;
    logger.warn(`[Engagement-OS] ${msg}`);
    warnings.push(msg);
  }

  // ── Step 5: Check pending regulator requests ─────────────────────────────
  try {
    const flagged = await flagApproachingRegulatorDeadlines(schema, tenantId);
    regulatorRequestsFlagged = flagged;
  } catch (err: unknown) {
    const msg = `[Step 5] Regulator request check failed: ${toErrorMessage(err)}`;
    logger.warn(`[Engagement-OS] ${msg}`);
    warnings.push(msg);
  }

  // ── Step 6: Alert consultant clients ─────────────────────────────────────
  try {
    const alerts = await alertConsultantClients(schema, tenantId);
    consultantAlertsPublished = alerts;
  } catch (err: unknown) {
    const msg = `[Step 6] Consultant alert failed: ${toErrorMessage(err)}`;
    logger.warn(`[Engagement-OS] ${msg}`);
    warnings.push(msg);
  }

  // ── Step 7: Publish engagement.cycle_completed ───────────────────────────
  try {
    const cycleMs = Date.now() - startTime;

    await eventBus.publish({
      eventType: 'engagement.cycle_completed' as any,
      tenantId,

      sourceService: 'engagement-os-orchestrator',
      severity: slaBreachesEscalated > 0 ? 'warning' : 'info',
      payload: {
        overdueItemsFound,
        remindersSent,
        slaBreachesEscalated,
        scoresComputed,
        regulatorRequestsFlagged,
        consultantAlertsPublished,
        cycleMs,
        warnings,
      },
    });
    eventsPublished++;
  } catch (err: unknown) {
    const msg = `[Step 7] Event publishing failed: ${toErrorMessage(err)}`;
    logger.warn(`[Engagement-OS] ${msg}`);
    warnings.push(msg);
  }

  const cycleMs = Date.now() - startTime;

  // ── Log cycle to engagement_os_cycle_log ─────────────────────────────────
  await logEngagementCycle(schema, {
    overdueItemsFound,
    remindersSent,
    slaBreachesEscalated,
    scoresComputed,
    regulatorRequestsFlagged,
    consultantAlertsPublished,
    eventsPublished,
    cycleMs,
  });

  // ── Record audit entry ───────────────────────────────────────────────────
  await recordAudit.log(tenantId, {
    userId: 'engagement-os',
    module: 'engagement_os',
    action: 'update',
    entityType: 'engagement_os_cycle',
    entityId: tenantId,
    afterState: {
      overdueItemsFound,
      remindersSent,
      slaBreachesEscalated,
      scoresComputed,
      regulatorRequestsFlagged,
      consultantAlertsPublished,
      eventsPublished,
      cycleMs,
      warnings,
    },
  }).catch(catchHandler(EC.EVENT_BUS, {}));

  if (warnings.length > 0) {
    logger.warn(
      `[Engagement-OS] Cycle completed with ${warnings.length} warning(s) for tenant ${tenantId}: ${warnings.join('; ')}`,
    );
  }

  return {
    tenantId,
    overdueItemsFound,
    remindersSent,
    slaBreachesEscalated,
    scoresComputed,
    regulatorRequestsFlagged,
    consultantAlertsPublished,
    eventsPublished,
    cycleMs,
    completedAt: new Date().toISOString(),
    warnings,
  };
}

// ── Step helpers ───────────────────────────────────────────────────────────

/**
 * Step 1: Scan overdue questionnaires, action items, and evidence requests.
 */
async function scanOverdueEngagements(schema: string): Promise<OverdueItem[]> {
  const items: OverdueItem[] = [];
  const now = new Date().toISOString();

  // Overdue questionnaires
  try {
    const qResult = await safeQuery(
      `SELECT questionnaire_id, title, framework_refs, due_date
       FROM "${schema}".questionnaires
       WHERE status IN ('distributed', 'in_progress')
         AND due_date IS NOT NULL
         AND due_date < $1`,
      [now],
    );
    for (const row of qResult.rows) {
      items.push({
        itemId: row.questionnaire_id,
        itemType: 'questionnaire',
        title: row.title,
        frameworkRef: Array.isArray(row.framework_refs) && row.framework_refs.length > 0
          ? row.framework_refs[0]
          : null,
        dueDate: row.due_date instanceof Date ? row.due_date.toISOString() : String(row.due_date),
      });
    }
  } catch { /* table may not exist yet */ }

  // Overdue action items
  try {
    const aiResult = await safeQuery(
      `SELECT action_item_id, title, due_date
       FROM "${schema}".action_items
       WHERE status NOT IN ('completed', 'resolved')
         AND due_date IS NOT NULL
         AND due_date < $1`,
      [now],
    );
    for (const row of aiResult.rows) {
      items.push({
        itemId: row.action_item_id,
        itemType: 'action_item',
        title: row.title || 'Action Item',
        frameworkRef: null,
        dueDate: row.due_date instanceof Date ? row.due_date.toISOString() : String(row.due_date),
      });
    }
  } catch { /* table may not exist yet */ }

  // Overdue evidence requests
  try {
    const evResult = await safeQuery(
      `SELECT evidence_id, title, due_date
       FROM "${schema}".evidence
       WHERE status NOT IN ('approved', 'completed')
         AND due_date IS NOT NULL
         AND due_date < $1`,
      [now],
    );
    for (const row of evResult.rows) {
      items.push({
        itemId: row.evidence_id,
        itemType: 'evidence_request',
        title: row.title || 'Evidence Request',
        frameworkRef: null,
        dueDate: row.due_date instanceof Date ? row.due_date.toISOString() : String(row.due_date),
      });
    }
  } catch { /* table may not exist yet */ }

  return items;
}

/**
 * Get vendor name for a given overdue item (best-effort lookup).
 */
async function getVendorName(schema: string, item: OverdueItem): Promise<string> {
  try {
    if (item.itemType === 'questionnaire') {
      const result = await safeQuery(
        `SELECT v.name FROM "${schema}".vendors v
         JOIN "${schema}".questionnaires q ON q.vendor_id = v.vendor_id
         WHERE q.questionnaire_id = $1`,
        [item.itemId],
      );
      return getFirstRow(result)?.name || 'Vendor';
    }
  } catch { /* fallback */ }
  return 'Vendor';
}

/**
 * Step 3: Scan for SLA breaches — items significantly overdue.
 */
async function scanSLABreaches(schema: string): Promise<Array<{
  title: string;
  vendorId: string;
  ownerId: string | null;
  daysOverdue: number;
}>> {
  const breaches: Array<{
    title: string;
    vendorId: string;
    ownerId: string | null;
    daysOverdue: number;
  }> = [];

  try {
    // Questionnaires overdue by more than 7 days = SLA breach
    const result = await safeQuery(
      `SELECT questionnaire_id, title, vendor_id, due_date, created_by
       FROM "${schema}".questionnaires
       WHERE status IN ('distributed', 'in_progress')
         AND due_date IS NOT NULL
         AND due_date < NOW() - INTERVAL '7 days'`,
    );
    for (const row of result.rows) {
      const daysOverdue = Math.floor(
        (Date.now() - new Date(row.due_date).getTime()) / (1000 * 60 * 60 * 24),
      );
      breaches.push({
        title: row.title,
        vendorId: row.vendor_id,
        ownerId: row.created_by || null,
        daysOverdue,
      });
    }
  } catch { /* table may not exist yet */ }

  return breaches;
}

/**
 * Step 4: Get all active vendor IDs for score computation.
 */
async function getActiveVendorIds(schema: string): Promise<string[]> {
  try {
    const result = await safeQuery(
      `SELECT DISTINCT vendor_id FROM "${schema}".vendors
       WHERE status = 'active' OR status IS NULL
       LIMIT 500`,
    );
    return result.rows.map((r: GenericRow) => r.vendor_id);
  } catch {
    return [];
  }
}

/**
 * Step 5: Flag regulator requests approaching their deadlines.
 */
async function flagApproachingRegulatorDeadlines(
  schema: string,
  tenantId: string,
): Promise<number> {
  let flagged = 0;
  try {
    // Flag pending requests older than 5 days (approaching response deadline)
    const result = await safeQuery(
      `SELECT request_id, subject, regulator_user_id
       FROM "${schema}".regulator_requests
       WHERE status = 'pending'
         AND created_at < NOW() - INTERVAL '5 days'`,
    );

    for (const row of result.rows) {
      await eventBus.publish({
        eventType: 'regulator.deadline_approaching' as any,
        tenantId,

        sourceService: 'engagement-os-orchestrator',
        entityType: 'regulator_request',
        entityId: row.request_id,
        severity: 'warning',
        payload: {
          requestId: row.request_id,
          subject: row.subject,
          regulatorUserId: row.regulator_user_id,
        },
      });
      flagged++;
    }
  } catch { /* table may not exist yet */ }

  return flagged;
}

/**
 * Step 6: Alert consultant clients with new findings or status changes.
 */
async function alertConsultantClients(
  schema: string,
  tenantId: string,
): Promise<number> {
  let alerts = 0;
  try {
    // Find recent findings (last 15 minutes) that consultants should know about
    const result = await safeQuery(
      `SELECT finding_id, title, severity, client_tenant_id
       FROM "${schema}".findings
       WHERE created_at >= NOW() - INTERVAL '15 minutes'`,
    );

    for (const row of result.rows) {
      await eventBus.publish({
        eventType: 'consultant.finding_added' as any,
        tenantId,

        sourceService: 'engagement-os-orchestrator',
        entityType: 'finding',
        entityId: row.finding_id,
        severity: 'info',
        payload: {
          findingId: row.finding_id,
          title: row.title,
          severity: row.severity,
        },
      });
      alerts++;
    }
  } catch { /* table may not exist yet */ }

  return alerts;
}

// ── Cycle log ──────────────────────────────────────────────────────────────

async function logEngagementCycle(
  schema: string,
  data: {
    overdueItemsFound: number;
    remindersSent: number;
    slaBreachesEscalated: number;
    scoresComputed: number;
    regulatorRequestsFlagged: number;
    consultantAlertsPublished: number;
    eventsPublished: number;
    cycleMs: number;
  },
): Promise<void> {
  try {
    await safeQuery(`
      CREATE TABLE IF NOT EXISTS "${schema}".engagement_os_cycle_log (
        cycle_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        overdue_items_found INT DEFAULT 0,
        reminders_sent INT DEFAULT 0,
        sla_breaches_escalated INT DEFAULT 0,
        scores_computed INT DEFAULT 0,
        regulator_requests_flagged INT DEFAULT 0,
        consultant_alerts_published INT DEFAULT 0,
        events_published INT DEFAULT 0,
        cycle_ms INT NOT NULL,
        executed_at TIMESTAMPTZ DEFAULT NOW()
      )
    `);

    await safeQuery(
      `INSERT INTO "${schema}".engagement_os_cycle_log
         (overdue_items_found, reminders_sent, sla_breaches_escalated,
          scores_computed, regulator_requests_flagged, consultant_alerts_published,
          events_published, cycle_ms)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
      [
        data.overdueItemsFound,
        data.remindersSent,
        data.slaBreachesEscalated,
        data.scoresComputed,
        data.regulatorRequestsFlagged,
        data.consultantAlertsPublished,
        data.eventsPublished,
        data.cycleMs,
      ],
    );
  } catch (err: unknown) {
    logger.error(`[Engagement-OS] Failed to log cycle: ${toErrorMessage(err)}`);
  }
}
