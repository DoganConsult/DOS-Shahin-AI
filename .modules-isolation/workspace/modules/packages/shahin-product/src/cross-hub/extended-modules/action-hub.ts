// @ts-nocheck — module-layer imports not yet extracted
import { logger } from '@dos/platform-core/observability';
import { safeQuery } from '@dos/db';
import { tenantSchema } from '@dos/db';
import { Queue } from 'bullmq';
import { getFirstRow } from '@dos/db';
import { eventBus } from '@dos/platform-core/events';
import { SYSTEM_JOB_ACTOR } from '@dos/platform-core/constants';

const slaQueue = new Queue('agrc-action-slas', {
  connection: {
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT || '6379', 10),
  },
});

export interface SLADefinition {
  actionId: string;
  tenantId: string;
  actionType: string;
  priority: 'critical' | 'high' | 'medium' | 'low';
  dueInHours: number;
  assignedTo?: string;
  metadata?: Record<string, unknown>;
}

export interface EscalationConfig {
  escalationLevel: number;
  notifyRoles: string[];
  escalateAfterHours?: number;
}

export interface SLATrackingRecord {
  tracking_id: string;
  action_id: string;
  sla_status: string;
  priority: string;
  sla_hours: number;
  registered_at: string;
  warning_at: string | null;
  breach_at: string | null;
  warning_sent: boolean;
  breached: boolean;
  escalation_level: number;
  resolved_at: string | null;
  resolved_by: string | null;
  bullmq_job_id: string | null;
  bullmq_warn_job_id: string | null;
  metadata: Record<string, unknown>;
}

const PRIORITY_ESCALATION_CHAINS: Record<string, EscalationConfig[]> = {
  critical: [
    { escalationLevel: 1, notifyRoles: ['module_owner', 'team_lead'], escalateAfterHours: 0 },
    { escalationLevel: 2, notifyRoles: ['department_head', 'ciso'], escalateAfterHours: 4 },
    { escalationLevel: 3, notifyRoles: ['cro', 'executive_team'], escalateAfterHours: 12 },
  ],
  high: [
    { escalationLevel: 1, notifyRoles: ['module_owner', 'team_lead'], escalateAfterHours: 0 },
    { escalationLevel: 2, notifyRoles: ['department_head'], escalateAfterHours: 24 },
  ],
  medium: [
    { escalationLevel: 1, notifyRoles: ['module_owner'], escalateAfterHours: 0 },
  ],
  low: [
    { escalationLevel: 1, notifyRoles: ['module_owner'], escalateAfterHours: 0 },
  ],
};

export async function registerActionSLA(definition: SLADefinition): Promise<SLATrackingRecord> {
  const { actionId, tenantId, dueInHours, priority, actionType, assignedTo, metadata } = definition;
  const schema = tenantSchema(tenantId);
  const delayMs = dueInHours * 60 * 60 * 1000;

  const breachAt = new Date(Date.now() + delayMs).toISOString();
  const warningAt = dueInHours > 24
    ? new Date(Date.now() + (dueInHours - 24) * 3600000).toISOString()
    : null;

  logger.info(`[Action-Hub] Registering SLA for action ${actionId} (${dueInHours}h)`, { tenantId, priority });

  const breachJobId = `sla-${actionId}`;
  const warnJobId = dueInHours > 24 ? `sla-warn-${actionId}` : null;

  const result = await safeQuery(
    `INSERT INTO "${schema}".action_sla_tracking
       (action_id, sla_status, priority, sla_hours, breach_at, warning_at, bullmq_job_id, bullmq_warn_job_id, metadata)
     VALUES ($1, 'active', $2, $3, $4, $5, $6, $7, $8::jsonb)
     ON CONFLICT (action_id) WHERE sla_status = 'active'
     DO UPDATE SET sla_hours = $3, breach_at = $4, warning_at = $5, priority = $2,
       bullmq_job_id = $6, bullmq_warn_job_id = $7, metadata = $8::jsonb, updated_at = NOW()
     RETURNING *`,
    [actionId, priority, dueInHours, breachAt, warningAt, breachJobId, warnJobId,
     JSON.stringify({ actionType, assignedTo, ...metadata })],
  );

  const record = getFirstRow(result);

  await slaQueue.add(
    'sla-breach-check',
    { actionId, tenantId, status: 'breached', priority, actionType, assignedTo },
    {
      jobId: breachJobId,
      delay: delayMs,
      removeOnComplete: true,
      attempts: 3,
      backoff: { type: 'exponential', delay: 5000 },
    },
  );

  if (dueInHours > 24) {
    const warningDelayMs = (dueInHours - 24) * 3600000;
    await slaQueue.add(
      'sla-warning',
      { actionId, tenantId, status: 'warning', priority, actionType, assignedTo },
      {
        jobId: warnJobId!,
        delay: warningDelayMs,
        removeOnComplete: true,
      },
    );
  }

  const escalationChain = await loadEscalationChain(tenantId, priority);
  for (const step of escalationChain) {
    if (step.escalateAfterHours && step.escalateAfterHours > 0) {
      const escDelayMs = step.escalateAfterHours * 3600000;
      await slaQueue.add(
        'sla-escalation',
        { actionId, tenantId, escalationLevel: step.escalationLevel, notifyRoles: step.notifyRoles, priority },
        {
          jobId: `sla-esc-${actionId}-L${step.escalationLevel}`,
          delay: escDelayMs,
          removeOnComplete: true,
        },
      );
    }
  }

  await eventBus.publish({
    eventType: 'action.sla_registered',
    tenantId,
    severity: 'info',
    entityType: 'action_item',
    entityId: actionId,
    payload: { priority, dueInHours, breachAt },
  }).catch(() => {});

  return record;
}

export async function clearActionSLA(actionId: string, tenantId?: string, resolvedBy?: string): Promise<boolean> {
  logger.info(`[Action-Hub] Clearing SLA for ${actionId}`);

  const breachJob = await slaQueue.getJob(`sla-${actionId}`);
  if (breachJob) await breachJob.remove();
  const warningJob = await slaQueue.getJob(`sla-warn-${actionId}`);
  if (warningJob) await warningJob.remove();

  for (let level = 1; level <= 5; level++) {
    const escJob = await slaQueue.getJob(`sla-esc-${actionId}-L${level}`);
    if (escJob) await escJob.remove();
  }

  if (tenantId) {
    const schema = tenantSchema(tenantId);
    const result = await safeQuery(
      `UPDATE "${schema}".action_sla_tracking
       SET sla_status = 'resolved', resolved_at = NOW(), resolved_by = $1, updated_at = NOW()
       WHERE action_id = $2 AND sla_status = 'active'
       RETURNING *`,
      [resolvedBy || SYSTEM_JOB_ACTOR, actionId],
    );
    if ((result.rowCount ?? 0) > 0) {
      await eventBus.publish({
        eventType: 'action.sla_resolved',
        tenantId,
        severity: 'info',
        entityType: 'action_item',
        entityId: actionId,
        payload: { resolvedBy },
      }).catch(() => {});
      return true;
    }
    return false;
  }
  return false;
}

export async function pauseActionSLA(tenantId: string, actionId: string, reason: string): Promise<SLATrackingRecord | null> {
  const schema = tenantSchema(tenantId);

  const breachJob = await slaQueue.getJob(`sla-${actionId}`);
  if (breachJob) await breachJob.remove();
  const warningJob = await slaQueue.getJob(`sla-warn-${actionId}`);
  if (warningJob) await warningJob.remove();

  const result = await safeQuery(
    `UPDATE "${schema}".action_sla_tracking
     SET sla_status = 'paused', metadata = metadata || $1::jsonb, updated_at = NOW()
     WHERE action_id = $2 AND sla_status = 'active'
     RETURNING *`,
    [JSON.stringify({ pausedAt: new Date().toISOString(), pauseReason: reason }), actionId],
  );

  const record = getFirstRow(result);
  if (record) {
    logger.info(`[Action-Hub] SLA paused for ${actionId}: ${reason}`, { tenantId });
    await eventBus.publish({
      eventType: 'action.sla_paused',
      tenantId,
      severity: 'info',
      entityType: 'action_item',
      entityId: actionId,
      payload: { reason },
    }).catch(() => {});
  }
  return record;
}

export async function resumeActionSLA(tenantId: string, actionId: string): Promise<SLATrackingRecord | null> {
  const schema = tenantSchema(tenantId);

  const trackResult = await safeQuery(
    `SELECT * FROM "${schema}".action_sla_tracking WHERE action_id = $1 AND sla_status = 'paused'`,
    [actionId],
  );
  const existing = getFirstRow(trackResult);
  if (!existing) return null;

  const pausedAt = existing.metadata?.pausedAt ? new Date(existing.metadata.pausedAt) : new Date();
  const pausedDurationMs = Date.now() - pausedAt.getTime();
  const newBreachAt = new Date(new Date(existing.breach_at).getTime() + pausedDurationMs);
  const remainingMs = Math.max(newBreachAt.getTime() - Date.now(), 60000);

  await slaQueue.add(
    'sla-breach-check',
    { actionId, tenantId, status: 'breached', priority: existing.priority },
    {
      jobId: `sla-${actionId}`,
      delay: remainingMs,
      removeOnComplete: true,
      attempts: 3,
      backoff: { type: 'exponential', delay: 5000 },
    },
  );

  const warnRemainingMs = remainingMs - 24 * 3600000;
  if (warnRemainingMs > 0) {
    await slaQueue.add(
      'sla-warning',
      { actionId, tenantId, status: 'warning', priority: existing.priority },
      {
        jobId: `sla-warn-${actionId}`,
        delay: warnRemainingMs,
        removeOnComplete: true,
      },
    );
  }

  const result = await safeQuery(
    `UPDATE "${schema}".action_sla_tracking
     SET sla_status = 'active', breach_at = $1,
       metadata = metadata || $2::jsonb, updated_at = NOW()
     WHERE action_id = $3 AND sla_status = 'paused'
     RETURNING *`,
    [newBreachAt.toISOString(),
     JSON.stringify({ resumedAt: new Date().toISOString(), pauseDurationMs: pausedDurationMs }),
     actionId],
  );

  const record = getFirstRow(result);
  if (record) {
    logger.info(`[Action-Hub] SLA resumed for ${actionId}`, { tenantId });
    await eventBus.publish({
      eventType: 'action.sla_resumed',
      tenantId,
      severity: 'info',
      entityType: 'action_item',
      entityId: actionId,
      payload: { newBreachAt: newBreachAt.toISOString() },
    }).catch(() => {});
  }
  return record;
}

export async function recordSLABreach(tenantId: string, actionId: string): Promise<void> {
  const schema = tenantSchema(tenantId);
  await safeQuery(
    `UPDATE "${schema}".action_sla_tracking
     SET breached = true, sla_status = 'breached', updated_at = NOW()
     WHERE action_id = $1 AND sla_status = 'active'`,
    [actionId],
  );
}

export async function recordSLAWarning(tenantId: string, actionId: string): Promise<void> {
  const schema = tenantSchema(tenantId);
  await safeQuery(
    `UPDATE "${schema}".action_sla_tracking
     SET warning_sent = true, updated_at = NOW()
     WHERE action_id = $1 AND sla_status = 'active'`,
    [actionId],
  );
}

export async function recordEscalation(
  tenantId: string,
  actionId: string,
  escalationLevel: number,
  notifyRoles: string[],
  triggerType: 'breach' | 'warning' | 'scheduled',
  notes?: string,
): Promise<void> {
  const schema = tenantSchema(tenantId);

  const trackResult = await safeQuery(
    `SELECT tracking_id FROM "${schema}".action_sla_tracking WHERE action_id = $1 ORDER BY created_at DESC LIMIT 1`,
    [actionId],
  );
  const tracking = getFirstRow(trackResult);
  if (!tracking) return;

  await safeQuery(
    `INSERT INTO "${schema}".action_sla_escalation_log
       (tracking_id, action_id, escalation_level, escalated_to, trigger_type, notes)
     VALUES ($1, $2, $3, $4::jsonb, $5, $6)`,
    [tracking.tracking_id, actionId, escalationLevel, JSON.stringify(notifyRoles), triggerType, notes || null],
  );

  await safeQuery(
    `UPDATE "${schema}".action_sla_tracking
     SET escalation_level = GREATEST(escalation_level, $1), updated_at = NOW()
     WHERE action_id = $2`,
    [escalationLevel, actionId],
  );

  logger.warn(`[Action-Hub] Escalation L${escalationLevel} for action ${actionId}`, { tenantId, notifyRoles });
}

export async function getSLATracking(tenantId: string, actionId: string): Promise<SLATrackingRecord | null> {
  const schema = tenantSchema(tenantId);
  const result = await safeQuery(
    `SELECT * FROM "${schema}".action_sla_tracking WHERE action_id = $1 ORDER BY created_at DESC LIMIT 1`,
    [actionId],
  );
  return getFirstRow(result);
}

export async function getEscalationHistory(tenantId: string, actionId: string): Promise<Array<Record<string, unknown>>> {
  const schema = tenantSchema(tenantId);
  const result = await safeQuery(
    `SELECT * FROM "${schema}".action_sla_escalation_log WHERE action_id = $1 ORDER BY created_at DESC`,
    [actionId],
  );
  return result.rows;
}

export async function getActiveSLAs(tenantId: string, status?: string): Promise<SLATrackingRecord[]> {
  const schema = tenantSchema(tenantId);
  const statusFilter = status || 'active';
  const result = await safeQuery(
    `SELECT * FROM "${schema}".action_sla_tracking WHERE sla_status = $1 ORDER BY breach_at ASC`,
    [statusFilter],
  );
  return result.rows;
}

export async function getBreachingSoon(tenantId: string, withinHours: number = 24): Promise<SLATrackingRecord[]> {
  const schema = tenantSchema(tenantId);
  const result = await safeQuery(
    `SELECT * FROM "${schema}".action_sla_tracking
     WHERE sla_status = 'active'
       AND breached = false
       AND breach_at BETWEEN NOW() AND NOW() + INTERVAL '1 hour' * $1
     ORDER BY breach_at ASC`,
    [withinHours],
  );
  return result.rows;
}

export async function getSLAComplianceSummary(tenantId: string, periodDays: number = 30): Promise<{
  totalTracked: number;
  resolved: number;
  breached: number;
  active: number;
  paused: number;
  avgResolutionHours: number;
  complianceRate: number;
  breachesByPriority: Record<string, number>;
  escalationsByLevel: Array<{ level: number; count: number }>;
}> {
  const schema = tenantSchema(tenantId);
  const [summaryResult, avgResult, byPriorityResult, escResult] = await Promise.all([
    safeQuery(
      `SELECT
         COUNT(*)::int AS total,
         COUNT(*) FILTER (WHERE sla_status = 'resolved')::int AS resolved,
         COUNT(*) FILTER (WHERE breached = true)::int AS breached,
         COUNT(*) FILTER (WHERE sla_status = 'active')::int AS active,
         COUNT(*) FILTER (WHERE sla_status = 'paused')::int AS paused
       FROM "${schema}".action_sla_tracking
       WHERE registered_at >= NOW() - INTERVAL '1 day' * $1`,
      [periodDays],
    ),
    safeQuery(
      `SELECT COALESCE(AVG(EXTRACT(EPOCH FROM (resolved_at - registered_at)) / 3600), 0)::float AS avg_hours
       FROM "${schema}".action_sla_tracking
       WHERE sla_status = 'resolved' AND registered_at >= NOW() - INTERVAL '1 day' * $1`,
      [periodDays],
    ),
    safeQuery(
      `SELECT priority, COUNT(*)::int AS cnt
       FROM "${schema}".action_sla_tracking
       WHERE breached = true AND registered_at >= NOW() - INTERVAL '1 day' * $1
       GROUP BY priority`,
      [periodDays],
    ),
    safeQuery(
      `SELECT escalation_level AS level, COUNT(*)::int AS cnt
       FROM "${schema}".action_sla_escalation_log
       WHERE created_at >= NOW() - INTERVAL '1 day' * $1
       GROUP BY escalation_level ORDER BY escalation_level`,
      [periodDays],
    ),
  ]);

  const summary = getFirstRow(summaryResult);
  const avg = getFirstRow(avgResult);
  const total = summary?.total ?? 0;
  const resolved = summary?.resolved ?? 0;
  const breached = summary?.breached ?? 0;
  const breachesByPriority: Record<string, number> = {};
  for (const row of byPriorityResult.rows) {
    breachesByPriority[row.priority] = row.cnt;
  }

  return {
    totalTracked: total,
    resolved,
    breached,
    active: summary?.active ?? 0,
    paused: summary?.paused ?? 0,
    avgResolutionHours: Math.round((avg?.avg_hours ?? 0) * 100) / 100,
    complianceRate: total > 0 ? Math.round(((total - breached) / total) * 10000) / 100 : 100,
    breachesByPriority,
    escalationsByLevel: escResult.rows,
  };
}

async function loadEscalationChain(tenantId: string, priority: string): Promise<EscalationConfig[]> {
  const schema = tenantSchema(tenantId);
  try {
    const result = await safeQuery(
      `SELECT escalation_level, notify_roles, escalate_after_hours
       FROM "${schema}".action_escalation_chains
       WHERE priority = $1 AND enabled = true
       ORDER BY escalation_level ASC`,
      [priority],
    );
    if (result.rows.length > 0) {
      return result.rows.map(( r: Record<string, unknown>) => ({
        escalationLevel: r.escalation_level,
        notifyRoles: Array.isArray(r.notify_roles) ? r.notify_roles : JSON.parse(r.notify_roles || '[]'),
        escalateAfterHours: r.escalate_after_hours,
      }));
    }
  } catch {
    // table may not exist yet
  }
  return PRIORITY_ESCALATION_CHAINS[priority] || PRIORITY_ESCALATION_CHAINS.medium;
}

export { slaQueue };
