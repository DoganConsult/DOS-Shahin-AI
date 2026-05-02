import { randomUUID } from 'node:crypto';
import { safeQuery, tenantSchema } from '@dos/db';
import { logger } from '@dos/platform-core/observability';
import { toErrorMessage } from '@dos/types/errors';

function tbl(tenantId: string, table: string): string {
  return `"${tenantSchema(tenantId)}"."${table}"`;
}

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type SlaStatus = 'active' | 'met' | 'breached' | 'cancelled' | 'paused';

export interface WorkflowSla {
  sla_id: string;
  tenant_id: string;
  instance_id: string;
  step_id: string | null;
  sla_type: string;
  target_hours: number;
  warning_threshold_pct: number;
  status: SlaStatus;
  started_at: string;
  deadline_at: string;
  warning_at: string | null;
  breached_at: string | null;
  resolved_at: string | null;
  paused_at: string | null;
  total_paused_ms: number;
  context: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export interface CreateSlaInput {
  tenantId: string;
  instanceId: string;
  stepId?: string;
  slaType: string;
  targetHours: number;
  warningThresholdPct?: number;
  context?: Record<string, unknown>;
}

export interface SlaBreachSummary {
  sla_id: string;
  instance_id: string;
  step_id: string | null;
  sla_type: string;
  target_hours: number;
  deadline_at: string;
  breached_at: string;
  hours_overdue: number;
}

const SLA_COLUMNS = `sla_id, tenant_id, instance_id, step_id, sla_type, target_hours,
  warning_threshold_pct, status, started_at, deadline_at, warning_at, breached_at,
  resolved_at, paused_at, total_paused_ms, context, created_at, updated_at`;

// ---------------------------------------------------------------------------
// Core CRUD
// ---------------------------------------------------------------------------

export async function getSla(slaId: string, tenantId: string): Promise<WorkflowSla | null> {
  try {
    const result = await safeQuery(
      `SELECT ${SLA_COLUMNS}
       FROM ${tbl(tenantId, 'workflow_slas')}
       WHERE sla_id = $1`,
      [slaId],
    );
    if (result.rows.length === 0) return null;
    return result.rows[0] as WorkflowSla;
  } catch (err) {
    logger.error('[WorkflowSLA] Failed to fetch SLA', { slaId, tenantId, error: toErrorMessage(err) });
    return null;
  }
}

export async function createSla(input: CreateSlaInput): Promise<WorkflowSla> {
  const slaId = randomUUID();
  const warningPct = input.warningThresholdPct ?? 80;
  const context = input.context ? JSON.stringify(input.context) : '{}';
  const targetMs = input.targetHours * 3600 * 1000;
  const warningMs = Math.floor(targetMs * (warningPct / 100));

  try {
    await safeQuery(
      `INSERT INTO ${tbl(input.tenantId, 'workflow_slas')}
         (sla_id, instance_id, step_id, sla_type, target_hours,
          warning_threshold_pct, status, started_at, deadline_at, warning_at,
          total_paused_ms, context, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, 'active',
               NOW(),
               NOW() + INTERVAL '1 millisecond' * $7,
               NOW() + INTERVAL '1 millisecond' * $8,
               0, $9, NOW(), NOW())`,
      [
        slaId,
        input.instanceId,
        input.stepId || null,
        input.slaType,
        input.targetHours,
        warningPct,
        targetMs,
        warningMs,
        context,
      ],
    );

    logger.info('[WorkflowSLA] SLA created', {
      slaId,
      tenantId: input.tenantId,
      instanceId: input.instanceId,
      targetHours: input.targetHours,
    });

    const sla = await getSla(slaId, input.tenantId);
    if (!sla) throw new Error('Failed to retrieve created SLA');
    return sla;
  } catch (err) {
    logger.error('[WorkflowSLA] Failed to create SLA', { tenantId: input.tenantId, error: toErrorMessage(err) });
    throw err;
  }
}

// ---------------------------------------------------------------------------
// SLA status for a workflow instance
// ---------------------------------------------------------------------------

export async function getSlasForInstance(
  instanceId: string,
  tenantId: string,
): Promise<WorkflowSla[]> {
  try {
    const result = await safeQuery(
      `SELECT ${SLA_COLUMNS}
       FROM ${tbl(tenantId, 'workflow_slas')}
       WHERE instance_id = $1
       ORDER BY created_at ASC`,
      [instanceId],
    );
    return result.rows as WorkflowSla[];
  } catch (err) {
    logger.error('[WorkflowSLA] Failed to list SLAs for instance', { instanceId, tenantId, error: toErrorMessage(err) });
    return [];
  }
}

// ---------------------------------------------------------------------------
// Breach detection — scans all active SLAs and marks breaches
// ---------------------------------------------------------------------------

export async function detectBreaches(tenantId: string): Promise<SlaBreachSummary[]> {
  try {
    const table = tbl(tenantId, 'workflow_slas');

    await safeQuery(
      `UPDATE ${table}
       SET status = 'breached', breached_at = NOW(), updated_at = NOW()
       WHERE status = 'active'
         AND deadline_at <= NOW()`,
    );

    const result = await safeQuery(
      `SELECT sla_id, instance_id, step_id, sla_type, target_hours, deadline_at, breached_at,
              EXTRACT(EPOCH FROM (NOW() - deadline_at)) / 3600.0 AS hours_overdue
       FROM ${table}
       WHERE status = 'breached'
         AND breached_at >= NOW() - INTERVAL '5 minutes'
       ORDER BY breached_at DESC`,
    );

    const breaches = result.rows as SlaBreachSummary[];

    if (breaches.length > 0) {
      logger.warn('[WorkflowSLA] SLA breaches detected', {
        count: breaches.length,
        tenantId: tenantId || 'all',
        slaIds: breaches.map((b) => b.sla_id),
      });
    }

    return breaches;
  } catch (err) {
    logger.error('[WorkflowSLA] Failed to detect breaches', { tenantId, error: toErrorMessage(err) });
    return [];
  }
}

// ---------------------------------------------------------------------------
// Warning detection — SLAs approaching deadline
// ---------------------------------------------------------------------------

export async function detectWarnings(tenantId: string): Promise<WorkflowSla[]> {
  try {
    const result = await safeQuery(
      `SELECT ${SLA_COLUMNS}
       FROM ${tbl(tenantId, 'workflow_slas')}
       WHERE status = 'active'
         AND warning_at IS NOT NULL
         AND warning_at <= NOW()
         AND deadline_at > NOW()
       ORDER BY deadline_at ASC`,
    );

    const warnings = result.rows as WorkflowSla[];

    if (warnings.length > 0) {
      logger.warn('[WorkflowSLA] SLA warnings detected', {
        count: warnings.length,
        tenantId: tenantId || 'all',
      });
    }

    return warnings;
  } catch (err) {
    logger.error('[WorkflowSLA] Failed to detect warnings', { tenantId, error: toErrorMessage(err) });
    return [];
  }
}

// ---------------------------------------------------------------------------
// Resolve / cancel / pause / resume
// ---------------------------------------------------------------------------

export async function resolveSla(slaId: string, tenantId: string): Promise<WorkflowSla | null> {
  try {
    const sla = await getSla(slaId, tenantId);
    if (!sla || sla.status !== 'active') return sla;

    await safeQuery(
      `UPDATE ${tbl(tenantId, 'workflow_slas')}
       SET status = 'met', resolved_at = NOW(), updated_at = NOW()
       WHERE sla_id = $1 AND status = 'active'`,
      [slaId],
    );

    logger.info('[WorkflowSLA] SLA resolved (met)', { slaId, tenantId });
    return getSla(slaId, tenantId);
  } catch (err) {
    logger.error('[WorkflowSLA] Failed to resolve SLA', { slaId, tenantId, error: toErrorMessage(err) });
    throw err;
  }
}

export async function cancelSla(slaId: string, tenantId: string): Promise<WorkflowSla | null> {
  try {
    await safeQuery(
      `UPDATE ${tbl(tenantId, 'workflow_slas')}
       SET status = 'cancelled', updated_at = NOW()
       WHERE sla_id = $1 AND status IN ('active', 'paused')`,
      [slaId],
    );

    logger.info('[WorkflowSLA] SLA cancelled', { slaId, tenantId });
    return getSla(slaId, tenantId);
  } catch (err) {
    logger.error('[WorkflowSLA] Failed to cancel SLA', { slaId, tenantId, error: toErrorMessage(err) });
    throw err;
  }
}

export async function pauseSla(slaId: string, tenantId: string): Promise<WorkflowSla | null> {
  try {
    const sla = await getSla(slaId, tenantId);
    if (!sla || sla.status !== 'active') return sla;

    await safeQuery(
      `UPDATE ${tbl(tenantId, 'workflow_slas')}
       SET status = 'paused', paused_at = NOW(), updated_at = NOW()
       WHERE sla_id = $1 AND status = 'active'`,
      [slaId],
    );

    logger.info('[WorkflowSLA] SLA paused', { slaId, tenantId });
    return getSla(slaId, tenantId);
  } catch (err) {
    logger.error('[WorkflowSLA] Failed to pause SLA', { slaId, tenantId, error: toErrorMessage(err) });
    throw err;
  }
}

export async function resumeSla(slaId: string, tenantId: string): Promise<WorkflowSla | null> {
  try {
    const sla = await getSla(slaId, tenantId);
    if (!sla || sla.status !== 'paused' || !sla.paused_at) return sla;

    const pausedMs = Date.now() - new Date(sla.paused_at).getTime();
    const newTotalPausedMs = (sla.total_paused_ms || 0) + pausedMs;

    // Extend deadline by the paused duration
    await safeQuery(
      `UPDATE ${tbl(tenantId, 'workflow_slas')}
       SET status = 'active',
           paused_at = NULL,
           total_paused_ms = $1,
           deadline_at = deadline_at + INTERVAL '1 millisecond' * $2,
           warning_at = CASE WHEN warning_at IS NOT NULL
                             THEN warning_at + INTERVAL '1 millisecond' * $2
                             ELSE NULL END,
           updated_at = NOW()
       WHERE sla_id = $3 AND status = 'paused'`,
      [newTotalPausedMs, pausedMs, slaId],
    );

    logger.info('[WorkflowSLA] SLA resumed', { slaId, tenantId, pausedMs });
    return getSla(slaId, tenantId);
  } catch (err) {
    logger.error('[WorkflowSLA] Failed to resume SLA', { slaId, tenantId, error: toErrorMessage(err) });
    throw err;
  }
}

// ---------------------------------------------------------------------------
// Bulk resolve — when a workflow instance completes, resolve all its active SLAs
// ---------------------------------------------------------------------------

export async function resolveAllForInstance(instanceId: string, tenantId: string): Promise<number> {
  try {
    const result = await safeQuery(
      `UPDATE ${tbl(tenantId, 'workflow_slas')}
       SET status = 'met', resolved_at = NOW(), updated_at = NOW()
       WHERE instance_id = $1 AND status IN ('active', 'paused')`,
      [instanceId],
    );

    const count = result.rowCount || 0;
    if (count > 0) {
      logger.info('[WorkflowSLA] All SLAs resolved for instance', { instanceId, tenantId, count });
    }
    return count;
  } catch (err) {
    logger.error('[WorkflowSLA] Failed to resolve SLAs for instance', { instanceId, tenantId, error: toErrorMessage(err) });
    return 0;
  }
}

// ---------------------------------------------------------------------------
// Export
// ---------------------------------------------------------------------------

export const WorkflowSlaService = {
  getSla,
  createSla,
  getSlasForInstance,
  detectBreaches,
  detectWarnings,
  resolveSla,
  cancelSla,
  pauseSla,
  resumeSla,
  resolveAllForInstance,
};
